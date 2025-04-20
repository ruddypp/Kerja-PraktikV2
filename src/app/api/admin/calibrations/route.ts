import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ItemStatus, RequestStatus } from '@prisma/client';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { z } from 'zod';
import { format } from 'date-fns';

// Nilai-nilai status sebagai string
const IN_PROGRESS = 'IN_PROGRESS';
const COMPLETED = 'COMPLETED';
const CANCELLED = 'CANCELLED';

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
  if (typeof statusId !== 'string') return statusId as unknown as string;
  
  // If in format like "calibration_IN_PROGRESS", extract the part after underscore
  const parts = statusId.split('_');
  if (parts.length > 1) {
    const statusValue = parts[parts.length - 1];
    if (statusValue === 'IN_PROGRESS') return IN_PROGRESS;
    if (statusValue === 'COMPLETED') return COMPLETED;
    if (statusValue === 'CANCELLED') return CANCELLED;
  }
  
  // For backward compatibility
  if (statusId === 'IN_PROGRESS') return IN_PROGRESS;
  if (statusId === 'COMPLETED') return COMPLETED;
  if (statusId === 'CANCELLED') return CANCELLED;
  
  // Default to IN_PROGRESS if not recognized
  return IN_PROGRESS;
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
      // Extract status from ID format (e.g., "calibration_IN_PROGRESS" -> "IN_PROGRESS")
      let status = extractStatusFromId(statusId);
      where.status = status;
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
    
    // Create status log
    await prisma.calibrationStatusLog.create({
        data: {
        calibrationId: id,
        status: COMPLETED as RequestStatus,
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
    
    // Ensure the calibration is not already completed
    if (String(calibration.status) === COMPLETED) {
      return NextResponse.json(
        { error: `Cannot modify a calibration that is already completed` },
        { status: 400 }
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
      
      // Add reminder notification for H-30 before validUntil
      if (validUntil) {
        const validUntilDate = new Date(validUntil);
        const reminderDate = new Date(validUntilDate);
        reminderDate.setDate(reminderDate.getDate() - 30);
        
        // Only create reminder if the date is in the future
        if (reminderDate > new Date()) {
          // Get an admin user for notifications
          const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
          });
          
          if (!adminUser) {
            console.error('No admin user found for sending notification');
          } else {
            // Create reminder notification for the user
            await prisma.notification.create({
              data: {
                userId: calibration.userId,
                type: 'CALIBRATION_REMINDER',
                title: 'Calibration Expiring Soon',
                message: `Your calibration for ${calibration.item.name} will expire in 30 days (on ${format(validUntilDate, 'dd/MM/yyyy')})`,
                isRead: false
              }
            });
            
            // Create reminder notification for admin
            await prisma.notification.create({
              data: {
                userId: adminUser.id,
                type: 'CALIBRATION_REMINDER',
                title: 'Calibration Expiring Soon',
                message: `Calibration for ${calibration.item.name} (User: ${calibration.user.name}) will expire in 30 days`,
                isRead: false
              }
            });
          }
        }
      }
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
        notes: notes || `Calibration status updated to ${status} by admin`,
        userId: user.id
      }
    });
    
    // Create notification for the user
    const statusMap: Record<string, string> = {
      [IN_PROGRESS]: 'updated to in progress',
      [COMPLETED]: 'completed',
      [CANCELLED]: 'cancelled'
    };
    
    // Get an admin user for notifications
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    // Send notification to user about status change
    await prisma.notification.create({
      data: {
        userId: calibration.userId,
        type: 'CALIBRATION_STATUS_CHANGE',
        title: `Calibration ${statusMap[status] || 'Updated'}`,
        message: `Your calibration for ${calibration.item.name} has been ${statusMap[status] || 'updated'}`,
        isRead: false
      }
    });
    
    // Create reminder notification if completing calibration and validUntil is set
    if (status === COMPLETED && validUntil && adminUser) {
      const validUntilDate = new Date(validUntil);
      const reminderDate = new Date(validUntilDate);
      reminderDate.setDate(reminderDate.getDate() - 30);
      
      // Only create reminder if the date is in the future
      if (reminderDate > new Date()) {
        // Notification for user
      await prisma.notification.create({
        data: {
            userId: calibration.userId,
            type: 'CALIBRATION_REMINDER',
            title: 'Calibration Expiring Soon',
            message: `Your calibration for ${calibration.item.name} will expire in 30 days (on ${format(validUntilDate, 'dd/MM/yyyy')})`,
          isRead: false
        }
      });
      
        // Notification for admin
        await prisma.notification.create({
        data: {
            userId: adminUser.id,
            type: 'CALIBRATION_REMINDER',
            title: 'Calibration Expiring Soon',
            message: `Calibration for ${calibration.item.name} (User: ${calibration.user.name}) will expire in 30 days`,
            isRead: false
        }
      });
    }
    }
    
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