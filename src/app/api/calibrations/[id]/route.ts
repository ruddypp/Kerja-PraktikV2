import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { Calibration } from '@/lib/types';
import { Customer } from '@/lib/types';
import { logCalibrationActivity } from '@/lib/activity-logger';
import { ItemStatus } from '@prisma/client';

// GET a single calibration by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('GET /api/calibrations/[id] - Request received');
    
    // Pastikan params diawait terlebih dahulu
    const { id } = await params;
    
    console.log(`[GET /api/calibrations/${id}] Memulai request`);
    
    // Get user from request
    console.log(`[GET /api/calibrations/${id}] Mencoba mendapatkan user dari request`);
    const user = await getUserFromRequest(request);
    
    if (!user) {
      console.log(`[GET /api/calibrations/${id}] Unauthorized: user not found`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log(`[GET /api/calibrations/${id}] User authenticated: ${user.id}, role: ${user.role}`);
    
    if (!id) {
      console.log(`[GET /api/calibrations/${id}] Invalid calibration ID`);
      return NextResponse.json(
        { error: 'Invalid calibration ID' },
        { status: 400 }
      );
    }
    
    console.log(`[GET /api/calibrations/${id}] Fetching calibration data`);
    
    try {
      console.log(`[GET /api/calibrations/${id}] Querying database for calibration`);
      const calibration = await prisma.calibration.findUnique({
        where: { id },
        include: {
          item: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          statusLogs: true,
          certificate: {
            include: {
              gasEntries: true,
              testEntries: true
            }
          }
        }
      });
      
      if (!calibration) {
        console.log(`[GET /api/calibrations/${id}] Calibration not found`);
        return NextResponse.json(
          { error: 'Calibration not found' },
          { status: 404 }
        );
      }
      
      console.log(`[GET /api/calibrations/${id}] Calibration found: ${calibration.id}`);
      
      // Fetch customer data separately if needed
      let customer = null;
      if (calibration.customerId) {
        try {
          console.log(`[GET /api/calibrations/${id}] Fetching customer data for ID: ${calibration.customerId}`);
          customer = await prisma.customer.findUnique({
            where: { id: calibration.customerId }
          });
          console.log(`[GET /api/calibrations/${id}] Customer found: ${customer?.id || 'null'}`);
        } catch (customerError) {
          console.error(`[GET /api/calibrations/${id}] Error fetching customer:`, customerError);
          // Continue without customer data
        }
      }
      
      // Verifikasi akses - user harus memiliki akses ke kalibrasi ini
      const isOwner = calibration.userId === user.id;
      const userIsAdmin = isAdmin(user);
      
      console.log(`[GET /api/calibrations/${id}] Access check: isOwner=${isOwner}, isAdmin=${userIsAdmin}`);
      
      if (!isOwner && !userIsAdmin) {
        console.log(`[GET /api/calibrations/${id}] Access denied for user ${user.id}`);
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses ke data kalibrasi ini' },
          { status: 403 }
        );
      }
      
      // Buat objek response dengan data yang sudah diambil
      const responseData = {
        ...calibration,
        customer
      };
      
      console.log(`[GET /api/calibrations/${id}] Successfully returning calibration data`);
      return NextResponse.json(responseData);
    } catch (dbError) {
      console.error(`[GET /api/calibrations/${id}] Database error:`, dbError);
      return NextResponse.json(
        { error: 'Database error when fetching calibration' },
        { status: 500 }
      );
    }
  } catch (error) {
    // Ambil ID dari params untuk logging, dengan penanganan error
    let id = 'unknown';
    try {
      id = (await params).id;
    } catch {}
    
    console.error(`[GET /api/calibrations/${id}] Unhandled error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch calibration' },
      { status: 500 }
    );
  }
}

// PATCH update a calibration
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Pastikan params diawait terlebih dahulu
    const { id } = await params;
    
    // Get user from request
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!id) {
      return NextResponse.json(
        { error: 'Invalid calibration ID' },
        { status: 400 }
      );
    }
    
    // Verify calibration exists
    const existingCalibration = await prisma.calibration.findUnique({
      where: { id },
      include: {
        item: true
      }
    });
    
    if (!existingCalibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }
    
    // Verifikasi akses - user harus memiliki akses ke kalibrasi ini
    const isOwner = existingCalibration.userId === user.id;
    const userIsAdmin = isAdmin(user);
    
    if (!isOwner && !userIsAdmin) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses untuk mengubah data kalibrasi ini' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Determine which fields can be updated based on user role
    const updateData: Record<string, any> = {};
    
    if (userIsAdmin) {
      // Admin can update more fields
      const allowedFields = [
        'notes', 'status', 'certificateNumber', 'validUntil', 
        'calibrationDate', 'customerId'
      ];
      
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }
    } else {
      // Regular users can only update limited fields
      if (body.notes !== undefined) {
        updateData.notes = body.notes;
      }
    }
    
    // Update the calibration
    const updatedCalibration = await prisma.calibration.update({
      where: { id },
      data: updateData,
      include: {
        item: true,
        user: true,
        statusLogs: true,
        certificate: true,
        activityLogs: true
      }
    });
    
    // Tidak perlu assign updatedCalibration.customer manual jika tidak di-include
    
    // Log the update activity
    await logCalibrationActivity(
      user.id,
      'CALIBRATION_UPDATED',
      id,
      updatedCalibration.itemSerial,
      `Updated calibration details`
    );
    
    return NextResponse.json(updatedCalibration);
  } catch (error) {
    console.error('Error updating calibration:', error);
    return NextResponse.json(
      { error: 'Failed to update calibration' },
      { status: 500 }
    );
  }
}

// DELETE a calibration - admin only
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Pastikan params diawait terlebih dahulu
    const { id } = await params;
    
    // Get user from request
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only admin can delete calibrations
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Only admin can delete calibrations' },
        { status: 403 }
      );
    }
    
    if (!id) {
      return NextResponse.json(
        { error: 'Invalid calibration ID' },
        { status: 400 }
      );
    }
    
    // Verify calibration exists
    const existingCalibration = await prisma.calibration.findUnique({
      where: { id },
      include: {
        item: true
      }
    });
    
    if (!existingCalibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }
    
    // Log the delete activity SEBELUM data dihapus
    await logCalibrationActivity(
      user.id,
      'CALIBRATION_DELETED',
      id,
      existingCalibration.itemSerial,
      `Deleted calibration`
    );
    // Hapus semua relasi sebelum menghapus calibration
    await prisma.calibrationStatusLog.deleteMany({ where: { calibrationId: id } });
    const cert = await prisma.calibrationCertificate.findUnique({ where: { calibrationId: id } });
    if (cert) {
      await prisma.gasCalibrationEntry.deleteMany({ where: { certificateId: cert.id } });
      await prisma.testResultEntry.deleteMany({ where: { certificateId: cert.id } });
      await prisma.calibrationCertificate.delete({ where: { id: cert.id } });
    }
    await prisma.calibration.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calibration:', error);
    return NextResponse.json(
      { error: 'Failed to delete calibration' },
      { status: 500 }
    );
  }
} 