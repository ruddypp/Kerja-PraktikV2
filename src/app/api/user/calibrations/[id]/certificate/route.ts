import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { RequestStatus } from '@prisma/client';

// GET endpoint untuk mendownload sertifikat kalibrasi
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const calibrationId = params.id;
    
    // Verifikasi session user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch calibration data
    const calibration = await prisma.calibration.findUnique({
      where: { id: calibrationId },
      include: {
        item: true,
        vendor: true,
            user: {
              select: {
                id: true,
            name: true
          }
        }
      }
    });
    
    if (!calibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }
    
    // Verify user has access to this calibration
    if (calibration.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You do not have permission to access this certificate' },
        { status: 403 }
      );
    }
    
    // Check if calibration is completed
    if (calibration.status !== RequestStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'Certificate is only available for completed calibrations' },
        { status: 400 }
      );
    }
    
    // Generate certificate data
    // In a real app, you might fetch this from storage or generate a PDF
    const certificate = {
      id: calibration.id,
      certificateNumber: `CAL-${calibration.id.slice(0, 8).toUpperCase()}`,
      calibrationDate: calibration.calibrationDate,
      validUntil: calibration.validUntil || new Date(new Date(calibration.calibrationDate).getTime() + 365*24*60*60*1000).toISOString(), // Default to 1 year if not set
      item: {
        name: calibration.item.name,
        serialNumber: calibration.item.serialNumber,
        partNumber: calibration.item.partNumber,
        description: calibration.item.description || 'Not specified'
      },
      vendor: calibration.vendor ? {
        name: calibration.vendor.name,
        contactPerson: calibration.vendor.contactName,
        contactPhone: calibration.vendor.contactPhone
      } : null,
      calibratedBy: calibration.vendor?.name || 'Internal Calibration',
      approvedBy: 'Quality Control Department',
      notes: 'This certificate confirms that the equipment has been calibrated according to appropriate standards.'
    };
    
    // Log the certificate access
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'ACCESSED_CERTIFICATE',
        details: `Certificate for ${calibration.item.name} was accessed`,
        ...(calibration.itemSerial ? { itemSerial: calibration.itemSerial } : {})
      }
    });
    
    return NextResponse.json(certificate);
  } catch (error) {
    console.error('Error fetching calibration certificate:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificate' },
      { status: 500 }
    );
  }
} 