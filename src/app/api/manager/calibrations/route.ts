import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ItemStatus, RequestStatus, ActivityType } from '@prisma/client';
import { getUserFromRequest, isManager } from '@/lib/auth';
import { z } from 'zod';
import { format } from 'date-fns';

// Constants for calibration status
const PENDING = RequestStatus.PENDING;
const IN_PROGRESS = RequestStatus.IN_PROGRESS;
const COMPLETED = RequestStatus.COMPLETED;
const CANCELLED = RequestStatus.CANCELLED;

// Schema for validating calibration approval
const approveCalibrationSchema = z.object({
  id: z.string().min(1, "Calibration ID is required"),
  validUntil: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Valid until must be a valid date"
  }),
  notes: z.string().optional().nullable()
});

// Schema for updating calibration
const updateCalibrationSchema = z.object({
  id: z.string().min(1, "Calibration ID is required"),
  statusId: z.string().or(z.enum([IN_PROGRESS, COMPLETED, CANCELLED])),
  validUntil: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Valid until must be a valid date"
  }).optional().nullable(),
  notes: z.string().optional().nullable()
});

// Helper function to extract status value from ID
function extractStatusFromId(statusId: string | RequestStatus): string {
  if (typeof statusId === 'string' && statusId.includes('_')) {
    return statusId.split('_')[1];
  }
  return statusId as string;
}

// GET all calibrations for manager
export async function GET(request: Request) {
  try {
    // Get user from session and verify manager status
    const user = await getUserFromRequest(request);
    if (!user || !isManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse URL parameters
    const { searchParams } = new URL(request.url);
    const statusId = searchParams.get('statusId');
    const vendorId = searchParams.get('vendorId');
    const itemSerial = searchParams.get('itemSerial');
    
    // Tambahkan parameter pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Build where conditions
    const where: Record<string, unknown> = {};
    
    if (statusId) {
      // Extract status from ID format (e.g., "calibration_IN_PROGRESS" -> "IN_PROGRESS")
      const status = extractStatusFromId(statusId);
      where.status = status;
    }
    
    if (vendorId) {
      where.vendorId = vendorId;
    }
    
    if (itemSerial) {
      where.itemSerial = itemSerial;
    }
    
    // Hitung total items untuk pagination
    const total = await prisma.calibration.count({ where });
    
    // Fetch all calibrations with filter
    const calibrations = await prisma.calibration.findMany({
      where,
      include: {
        item: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
        vendor: true,
        statusLogs: {
          include: {
            changedBy: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });
    
    // Kembalikan hasil dengan informasi pagination
    return NextResponse.json({
      items: calibrations,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching calibrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calibrations' },
      { status: 500 }
    );
  }
}

// POST - Create new calibration and approve it
export async function POST(request: Request) {
  try {
    // Get user from session and verify manager status
    const user = await getUserFromRequest(request);
    if (!user || !isManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate the request body
    const body = await request.json();
    const validation = approveCalibrationSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { id, validUntil, notes } = validation.data;
    
    // Find the calibration to ensure it exists
    const calibration = await prisma.calibration.findUnique({
      where: { id },
      include: {
        item: true,
        user: true
      }
    });
    
    if (!calibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }
    
    // Ensure the calibration is in IN_PROGRESS state
    if (String(calibration.status) !== IN_PROGRESS) {
      return NextResponse.json(
        { error: `Cannot approve calibration with status ${calibration.status}` },
        { status: 400 }
      );
    }
    
    // Update the calibration to COMPLETED
    const updatedCalibration = await prisma.calibration.update({
      where: { id },
        data: {
        status: COMPLETED as RequestStatus,
        validUntil: new Date(validUntil)
        },
        include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        vendor: true
      }
    });
    
    // Update the item status to IN_CALIBRATION
    await prisma.item.update({
      where: { serialNumber: calibration.itemSerial },
      data: { status: ItemStatus.IN_CALIBRATION }
    });
    
    // Create certificate URL (if needed)
    // This would typically generate a PDF and store the URL
    
    // Create activity log
    await prisma.activityLog.create({
        data: {
        userId: user.id,
        action: 'APPROVED_CALIBRATION',
        details: `Approved calibration for ${calibration.item.name}`,
        itemSerial: calibration.itemSerial,
        type: ActivityType.CALIBRATION_UPDATED
      }
    });
    
    return NextResponse.json(updatedCalibration);
  } catch (error) {
    console.error('Error approving calibration:', error);
    return NextResponse.json(
      { error: 'Failed to approve calibration' },
      { status: 500 }
    );
  }
}

// PATCH to update a calibration status
export async function PATCH(request: Request) {
  try {
    // Get user from session and verify manager status
    const user = await getUserFromRequest(request);
    if (!user || !isManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate the request body
    const body = await request.json();
    const validation = updateCalibrationSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { id, statusId, validUntil, notes } = validation.data;
    
    // Extract actual status value from format statusType_STATUSVALUE
    const status = extractStatusFromId(statusId);
    
    // Find the calibration to ensure it exists
    const calibration = await prisma.calibration.findUnique({
      where: { id },
          include: {
            item: true,
            user: true
      }
    });
    
    if (!calibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }
    
    // Ensure the calibration is not already completed
    if (String(calibration.status) === COMPLETED) {
      return NextResponse.json(
        { error: `Cannot modify a calibration that is already completed` },
        { status: 400 }
      );
    }
    
    // Prepare update data
    const updateData: Record<string, unknown> = {
      status
    };
    
    // Add validUntil if provided
    if (validUntil) {
      updateData.validUntil = new Date(validUntil);
    }
    
    // If completing, update item status back to AVAILABLE
    if (status === COMPLETED && String(calibration.status) !== COMPLETED) {
      await prisma.item.update({
        where: { serialNumber: calibration.itemSerial },
        data: { status: ItemStatus.AVAILABLE }
      });
      
      // Update item history
      await prisma.itemHistory.updateMany({
        where: {
          itemSerial: calibration.itemSerial,
          action: 'CALIBRATED',
          relatedId: id,
          endDate: null
        },
        data: {
          endDate: new Date()
        }
      });
    }
    
    // Update the calibration
    const updatedCalibration = await prisma.calibration.update({
      where: { id },
      data: updateData,
          include: {
            item: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
          }
        },
        vendor: true
      }
    });
    
    // Create status log
    await prisma.calibrationStatusLog.create({
          data: {
        calibrationId: id,
        status: status as RequestStatus,
        notes: notes || `Calibration status updated to ${status} by manager`,
        userId: user.id
      }
    });
    
    // Create activity log
    const actionMap: Record<string, string> = {
      [IN_PROGRESS]: 'UPDATED_CALIBRATION',
      [COMPLETED]: 'COMPLETED_CALIBRATION',
      [CANCELLED]: 'CANCELLED_CALIBRATION'
    };
    
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: actionMap[status] || 'UPDATED_CALIBRATION',
        details: `Updated calibration for ${calibration.item.name} to ${status}`,
        itemSerial: calibration.itemSerial,
        type: ActivityType.CALIBRATION_UPDATED
      }
    });
    
    return NextResponse.json(updatedCalibration);
  } catch (error) {
    console.error('Error updating calibration:', error);
    return NextResponse.json(
      { error: 'Failed to update calibration' },
      { status: 500 }
    );
  }
} 