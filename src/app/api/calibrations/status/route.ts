import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { RequestStatus, ActivityType } from '@prisma/client';
import { z } from 'zod';

// Schema untuk validasi perubahan status
const updateStatusSchema = z.object({
  id: z.string().min(1, "Calibration ID is required"),
  status: z.enum([
    RequestStatus.PENDING, 
    RequestStatus.APPROVED, 
    RequestStatus.REJECTED, 
    RequestStatus.COMPLETED, 
    RequestStatus.CANCELLED
  ]),
  notes: z.string().optional().nullable()
});

// PATCH untuk mengubah status kalibrasi (admin only)
export async function PATCH(request: Request) {
  try {
    // Verifikasi user adalah admin
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Parse dan validasi request body
    const body = await request.json();
    const validation = updateStatusSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { id, status, notes } = validation.data;
    
    // Cek apakah kalibrasi ada
    const calibration = await prisma.calibration.findUnique({
      where: { id },
      include: { item: true }
    });
    
    if (!calibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }
    
    // Update status kalibrasi
    const updatedCalibration = await prisma.calibration.update({
      where: { id },
      data: { status }
    });
    
    // Buat log status
    await prisma.calibrationStatusLog.create({
      data: {
        calibrationId: id,
        status,
        notes: notes || `Status changed to ${status} by admin`,
        userId: user.id
      }
    });
    
    // Jika status COMPLETED, update status item menjadi AVAILABLE
    if (status === RequestStatus.COMPLETED && calibration.item) {
      await prisma.item.update({
        where: { serialNumber: calibration.item.serialNumber },
        data: { status: 'AVAILABLE' }
      });
    }
    
    // Jika status CANCELLED, update status item menjadi AVAILABLE
    if (status === RequestStatus.CANCELLED && calibration.item) {
      await prisma.item.update({
        where: { serialNumber: calibration.item.serialNumber },
        data: { status: 'AVAILABLE' }
      });
      
      // Update item history jika ada
      await prisma.itemHistory.updateMany({
        where: {
          itemSerial: calibration.item.serialNumber,
          action: 'CALIBRATED',
          relatedId: id,
          endDate: null
        },
        data: {
          endDate: new Date(),
          details: `Calibration cancelled by admin: ${notes || 'No reason provided'}`
        }
      });
    }
    
    // Buat activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        type: ActivityType.CALIBRATION_UPDATED,
        action: `STATUS_CHANGED_TO_${status}`,
        details: notes || `Status changed to ${status} by admin`,
        calibrationId: id,
        itemSerial: calibration.itemSerial
      }
    });
    
    return NextResponse.json({
      message: `Calibration status updated to ${status}`,
      calibration: updatedCalibration
    });
    
  } catch (error) {
    console.error('Error updating calibration status:', error);
    return NextResponse.json(
      { error: 'Failed to update calibration status' },
      { status: 500 }
    );
  }
} 