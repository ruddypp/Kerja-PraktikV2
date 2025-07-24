import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { RequestStatus } from '@prisma/client';
import { monthToRoman } from '@/lib/report-number-generator';

// POST untuk menghasilkan nomor sertifikat untuk kalibrasi yang sudah selesai
export async function POST(request: Request) {
  try {
    // Verifikasi user adalah admin
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Ambil semua kalibrasi yang sudah selesai tapi belum memiliki nomor sertifikat
    const calibrationsWithoutCertificateNumber = await prisma.calibration.findMany({
      where: {
        status: RequestStatus.COMPLETED,
        certificateNumber: null
      },
      orderBy: {
        calibrationDate: 'asc'
      }
    });
    
    if (calibrationsWithoutCertificateNumber.length === 0) {
      return NextResponse.json({ 
        message: 'No calibrations found that need certificate numbers',
        updated: 0
      });
    }
    
    // Generate certificate numbers
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const romanMonth = monthToRoman(month);
    
    // Hitung jumlah kalibrasi yang sudah selesai tahun ini
    const calibrationCount = await prisma.calibration.count({
      where: {
        status: RequestStatus.COMPLETED,
        certificateNumber: {
          not: null
        },
        updatedAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      }
    });
    
    // Update kalibrasi dengan nomor sertifikat baru
    let startNumber = calibrationCount + 1;
    const updatedCalibrations = [];
    
    for (const calibration of calibrationsWithoutCertificateNumber) {
      const certificateNumber = `${startNumber}/CAL-PBI/${romanMonth}/${year}`;
      
      await prisma.calibration.update({
        where: { id: calibration.id },
        data: { certificateNumber }
      });
      
      updatedCalibrations.push({
        id: calibration.id,
        certificateNumber
      });
      
      startNumber++;
    }
    
    return NextResponse.json({
      message: `Generated certificate numbers for ${updatedCalibrations.length} calibrations`,
      updated: updatedCalibrations.length,
      calibrations: updatedCalibrations
    });
    
  } catch (error) {
    console.error('Error generating certificate numbers:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificate numbers' },
      { status: 500 }
    );
  }
} 