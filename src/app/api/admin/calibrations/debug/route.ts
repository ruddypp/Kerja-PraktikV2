import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

// Debug endpoint untuk memeriksa dan memperbaiki data sertifikat
export async function GET(request: NextRequest) {
  try {
    // Verifikasi admin
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    // Parse parameter
    const { searchParams } = new URL(request.url);
    const calibrationId = searchParams.get('id');
    const fix = searchParams.get('fix') === 'true';
    
    // Jika ada ID spesifik, periksa sertifikat itu saja
    if (calibrationId) {
      const calibration = await prisma.calibration.findUnique({
        where: { id: calibrationId },
        include: {
          item: true,
          vendor: true,
          certificate: true
        }
      });
      
      if (!calibration) {
        return NextResponse.json({ error: 'Calibration not found' }, { status: 404 });
      }
      
      // Periksa apakah sertifikat ada
      const hasCertificate = !!calibration.certificate;
      
      // Jika kalibrasi selesai tapi tidak ada sertifikat dan fix=true
      if (calibration.status === 'COMPLETED' && !hasCertificate && fix) {
        // Coba buat sertifikat kosong jika belum ada
        const certificate = await prisma.calibrationCertificate.create({
          data: {
            calibrationId: calibration.id,
            gasType: 'Tidak tersedia - dibuat ulang',
            gasConcentration: 'Tidak tersedia - dibuat ulang',
            gasBalance: 'Tidak tersedia - dibuat ulang',
            gasBatchNumber: 'Tidak tersedia - dibuat ulang',
            testSensor: 'Tidak tersedia - dibuat ulang',
            testSpan: 'Tidak tersedia - dibuat ulang',
            testResult: 'Pass',
            manufacturer: calibration.item.name || 'Tidak tersedia',
            instrumentName: calibration.item.partNumber || 'Tidak tersedia',
            modelNumber: calibration.item.sensor || 'Tidak tersedia',
            configuration: 'Tidak tersedia - dibuat ulang',
            approvedBy: 'Admin',
            vendorAddress: calibration.vendor?.address || null,
            vendorPhone: calibration.vendor?.contactPhone || null
          }
        });
        
        return NextResponse.json({
          message: 'Certificate created successfully',
          calibration,
          certificate
        });
      }
      
      return NextResponse.json({
        calibration,
        hasCertificate,
        certificate: calibration.certificate
      });
    }
    
    // Jika tidak ada ID, tampilkan semua kalibrasi yang mungkin bermasalah
    const completedCalibrations = await prisma.calibration.findMany({
      where: { status: 'COMPLETED' },
      include: {
        certificate: {
          select: { id: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    const problematicCalibrations = completedCalibrations.filter(
      calib => !calib.certificate
    );
    
    return NextResponse.json({
      totalCompleted: completedCalibrations.length,
      totalProblematic: problematicCalibrations.length,
      problematicCalibrations
    });
    
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { error: 'Server error', details: (error as Error).message },
      { status: 500 }
    );
  }
} 