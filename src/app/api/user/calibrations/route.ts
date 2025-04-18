import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RequestStatus, ItemStatus } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for creating calibration
const createCalibrationSchema = z.object({
  itemSerial: z.string().min(1, "Item serial number is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  notes: z.string().optional().nullable()
});

// GET all calibrations for current user
export async function GET(request: Request) {
  try {
    // Verifikasi session user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const itemSerial = searchParams.get('itemSerial');
    
    // Build where conditions
    const where: Record<string, any> = {
      userId: user.id
    };
    
    if (status) {
      where.status = status as RequestStatus;
    }
    
    if (itemSerial) {
      where.itemSerial = itemSerial;
    }
    
    // Get calibrations for user
    const calibrations = await prisma.calibration.findMany({
      where,
      include: {
        item: true,
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
    console.error('Error fetching user calibrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calibrations' },
      { status: 500 }
    );
  }
}

// POST create a new calibration directly
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = createCalibrationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { itemSerial, vendorId, notes } = validation.data;
    
    // Verifikasi session user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify if the item exists and is available
    const item = await prisma.item.findUnique({
      where: { serialNumber: itemSerial }
    });
    
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    // If item is not available, reject calibration
    if (item.status !== ItemStatus.AVAILABLE) {
      return NextResponse.json(
        { error: `Item is not available for calibration. Current status: ${item.status}` },
        { status: 400 }
      );
    }
    
    // Create calibration record directly with PENDING status
    const calibration = await prisma.calibration.create({
      data: {
        userId: user.id,
        itemSerial: itemSerial,
        status: RequestStatus.PENDING,
        calibrationDate: new Date(),
        vendorId
      }
    });
    
    // Update item status to IN_CALIBRATION
    await prisma.item.update({
      where: { serialNumber: itemSerial },
      data: { status: ItemStatus.IN_CALIBRATION }
    });
    
    // Create status log with notes if provided
    await prisma.calibrationStatusLog.create({
      data: {
        calibrationId: calibration.id,
        status: RequestStatus.PENDING,
        notes: notes ? `Calibration initiated: ${notes}` : "Calibration initiated",
        userId: user.id
      }
    });
    
    // Create activity log entry
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'INITIATED_CALIBRATION',
        details: `New calibration initiated for item ${item.name}${notes ? `: ${notes}` : ''}`,
        itemSerial
      }
    });
    
    // Create item history record
    await prisma.itemHistory.create({
      data: {
        itemSerial,
        action: 'CALIBRATED',
        details: `Sent for calibration${notes ? `: ${notes}` : ''}`,
        relatedId: calibration.id,
        startDate: new Date()
      }
    });
    
    // Get an admin user for notification
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    // Notify admin if found
    if (admin) {
    await prisma.notification.create({
      data: {
          userId: admin.id,
          type: 'CALIBRATION_STATUS_CHANGE',
          title: 'New Calibration Initiated',
          message: `New calibration initiated by ${user.name} for item ${item.name}`,
        isRead: false
      }
    });
    }
    
    // Return full calibration data
    const fullCalibration = await prisma.calibration.findUnique({
      where: { id: calibration.id },
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
      }
    });
    
    return NextResponse.json(fullCalibration, { status: 201 });
  } catch (error) {
    console.error('Error creating calibration:', error);
    return NextResponse.json(
      { error: 'Failed to create calibration' },
      { status: 500 }
    );
  }
}

// PATCH untuk mengupdate status kalibrasi (dari USER)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, completeCalibration } = body;
    
    // Verifikasi session user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!id) {
      return NextResponse.json({ error: 'Calibration ID is required' }, { status: 400 });
    }
    
    // Cek apakah kalibrasi ada
    const existingCalibration = await prisma.calibration.findUnique({
      where: { id },
      include: { item: true }
    });
    
    if (!existingCalibration) {
      return NextResponse.json({ error: 'Calibration not found' }, { status: 404 });
    }
    
    // Verifikasi apakah kalibrasi milik user ini
    if (existingCalibration.userId !== user.id) {
      return NextResponse.json({ error: 'You do not have permission to update this calibration' }, { status: 403 });
    }
    
    // Verifikasi status sekarang harus APPROVED
    if (existingCalibration.status !== RequestStatus.APPROVED) {
      return NextResponse.json(
        { error: `Cannot complete calibration with current status: ${existingCalibration.status}` },
        { status: 400 }
      );
    }
    
    // Update status ke COMPLETED
    const updatedCalibration = await prisma.calibration.update({
      where: { id },
      data: { status: RequestStatus.COMPLETED },
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true
          }
        },
        vendor: true
      }
    });
    
    // Catat status log
    await prisma.calibrationStatusLog.create({
      data: {
        calibration: { connect: { id } },
        status: RequestStatus.COMPLETED,
        notes: "Calibration completed by user",
        changedBy: { connect: { id: user.id } }
      }
    });
    
    // Update item status kembali menjadi AVAILABLE
    await prisma.item.update({
      where: { serialNumber: existingCalibration.itemSerial },
      data: { status: ItemStatus.AVAILABLE }
    });
    
    // Update item history
    await prisma.itemHistory.updateMany({
      where: {
        itemSerial: existingCalibration.itemSerial,
        action: 'CALIBRATED',
        relatedId: id,
        endDate: null
      },
      data: {
        endDate: new Date()
      }
    });
    
    // Buat log aktivitas
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'COMPLETED_CALIBRATION',
        details: `Completed calibration for ${existingCalibration.item.name}`,
        itemSerial: existingCalibration.itemSerial
      }
    });
    
    // Notifikasi admin
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (admin) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'CALIBRATION_STATUS_CHANGE',
          title: 'Calibration Completed',
          message: `Calibration for ${existingCalibration.item.name} has been marked as completed by ${user.name}`,
          isRead: false
        }
      });
    }
    
    return NextResponse.json(updatedCalibration);
  } catch (error) {
    console.error('Error updating calibration status:', error);
    return NextResponse.json(
      { error: 'Failed to update calibration status' },
      { status: 500 }
    );
  }
} 