import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RequestStatus, ItemStatus } from '@prisma/client';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { z } from 'zod';

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
  statusId: z.string().or(z.enum([RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.REJECTED, RequestStatus.COMPLETED])),
  validUntil: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Valid until must be a valid date"
  }).optional().nullable(),
  notes: z.string().optional().nullable()
});

// Helper function to extract status value from ID
function extractStatusFromId(statusId: string): RequestStatus {
  if (typeof statusId !== 'string') return statusId as RequestStatus;
  
  // If in format like "calibration_PENDING", extract the part after underscore
  const parts = statusId.split('_');
  if (parts.length > 1) {
    const statusValue = parts[parts.length - 1];
    if (Object.values(RequestStatus).includes(statusValue as RequestStatus)) {
      return statusValue as RequestStatus;
    }
  }
  
  // Return as is if no underscore or not a valid enum value
  return statusId as RequestStatus;
}

// GET all calibrations for admin
export async function GET(request: Request) {
  try {
    // Get user from session and verify admin status
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse URL parameters
    const { searchParams } = new URL(request.url);
    const statusId = searchParams.get('statusId');
    const vendorId = searchParams.get('vendorId');
    const itemSerial = searchParams.get('itemSerial');
    
    // Build where conditions
    const where: Record<string, any> = {};
    
    if (statusId) {
      // Extract status from ID format (e.g., "calibration_PENDING" -> "PENDING")
      let status = statusId;
      if (statusId.includes('_')) {
        const parts = statusId.split('_');
        status = parts[parts.length - 1];
      }
      
      if (Object.values(RequestStatus).includes(status as RequestStatus)) {
        where.status = status as RequestStatus;
      }
    }
    
    if (vendorId) {
      where.vendorId = vendorId;
    }
    
    if (itemSerial) {
      where.itemSerial = itemSerial;
    }
    
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
      }
    });
    
    return NextResponse.json(calibrations);
  } catch (error) {
    console.error('Error fetching calibrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calibrations' },
      { status: 500 }
    );
  }
}

// POST to approve a calibration
export async function POST(request: Request) {
  try {
    // Get user from session and verify admin status
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
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
    
    // Ensure the calibration is in PENDING state
    if (calibration.status !== RequestStatus.PENDING) {
      return NextResponse.json(
        { error: `Cannot approve calibration with status ${calibration.status}` },
        { status: 400 }
      );
    }
    
    // Update the calibration to APPROVED
    const updatedCalibration = await prisma.calibration.update({
      where: { id },
        data: {
        status: RequestStatus.APPROVED,
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
    
    // Create status log
    await prisma.calibrationStatusLog.create({
        data: {
        calibrationId: id,
        status: RequestStatus.APPROVED,
        notes: notes || 'Calibration approved by admin',
        userId: user.id
      }
    });
    
    // Create certificate URL (if needed)
    // This would typically generate a PDF and store the URL
    
    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: calibration.userId,
        type: 'CALIBRATION_STATUS_CHANGE',
        title: 'Calibration Approved',
        message: `Your calibration for ${calibration.item.name} has been approved`,
        isRead: false
      }
    });
    
    // Create activity log
    await prisma.activityLog.create({
        data: {
        userId: user.id,
        action: 'APPROVED_CALIBRATION',
        details: `Approved calibration for ${calibration.item.name}`,
        itemSerial: calibration.itemSerial
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
    // Get user from session and verify admin status
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
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
    
    // Prepare update data
    const updateData: Record<string, any> = {
      status
    };
    
    // Add validUntil if provided
    if (validUntil) {
      updateData.validUntil = new Date(validUntil);
    }
    
    // If rejecting, update item status back to AVAILABLE
    if (status === RequestStatus.REJECTED && calibration.status !== RequestStatus.REJECTED) {
      await prisma.item.update({
        where: { serialNumber: calibration.itemSerial },
        data: { status: ItemStatus.AVAILABLE }
      });
    }
    
    // If completing, update item status back to AVAILABLE (although this should be done by user)
    if (status === RequestStatus.COMPLETED && calibration.status !== RequestStatus.COMPLETED) {
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
        status,
        notes: notes || `Calibration status updated to ${status} by admin`,
        userId: user.id
      }
    });
    
    // Create notification for the user
    const statusMap: Record<string, string> = {
      [RequestStatus.PENDING]: 'updated to pending',
      [RequestStatus.APPROVED]: 'approved',
      [RequestStatus.REJECTED]: 'rejected',
      [RequestStatus.COMPLETED]: 'completed'
    };
    
      await prisma.notification.create({
        data: {
        userId: calibration.userId,
        type: 'CALIBRATION_STATUS_CHANGE',
        title: `Calibration ${statusMap[status] || 'Updated'}`,
        message: `Your calibration for ${calibration.item.name} has been ${statusMap[status] || 'updated'}`,
          isRead: false
        }
      });
      
    // Create activity log
    const actionMap: Record<string, string> = {
      [RequestStatus.PENDING]: 'UPDATED_CALIBRATION',
      [RequestStatus.APPROVED]: 'APPROVED_CALIBRATION',
      [RequestStatus.REJECTED]: 'REJECTED_CALIBRATION',
      [RequestStatus.COMPLETED]: 'COMPLETED_CALIBRATION'
    };
    
      await prisma.activityLog.create({
        data: {
        userId: user.id,
        action: actionMap[status] || 'UPDATED_CALIBRATION',
        details: `Updated calibration for ${calibration.item.name} to ${status}`,
        itemSerial: calibration.itemSerial
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