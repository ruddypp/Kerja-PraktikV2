import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ActivityType } from '@prisma/client';

// Define interfaces for the entry types
interface GasEntry {
  gasType: string;
  gasConcentration: string;
  gasBalance: string;
  gasBatchNumber: string;
}

interface TestEntry {
  testSensor: string;
  testSpan: string;
  testResult: string;
}

// GET untuk mengakses sertifikat kalibrasi (proxy ke endpoint user)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verifikasi session manager
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Di Next.js 15, params adalah objek yang harus diawait
    const { id: calibrationId } = await params;
    console.log('Accessing certificate for calibration ID:', calibrationId, 'User:', user.id);
    
    // Ambil data kalibrasi untuk memastikan ada
    const calibration = await prisma.calibration.findUnique({
      where: { id: calibrationId },
      include: {
        certificate: {
          include: {
            gasEntries: true,
            testEntries: true
          }
        } // Include certificate dengan gas dan test entries
      }
    });
    
    if (!calibration) {
      console.log('Calibration not found for ID:', calibrationId);
      return NextResponse.json(
        { error: 'Kalibrasi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Log untuk debugging
    console.log('Calibration found, status:', calibration.status);
    console.log('Certificate exists:', !!calibration.certificate);
    
    // Periksa apakah sertifikat ada
    if (!calibration.certificate) {
      console.log('WARNING: Certificate missing for calibration:', calibrationId);
      // Lanjutkan karena kita masih bisa mengakses endpoint user yang mungkin akan
      // memberikan pesan error yang lebih jelas
    }
    
    // Buat URL ke endpoint certificate user
    const certificateUrl = new URL(`/api/user/calibrations/${calibrationId}/certificate`, request.url);
    
    // Forward request ke endpoint user dengan menambahkan header  manager jika user adalah manager
    console.log('Forwarding request to user certificate endpoint');
    const headers: HeadersInit = {
        'Cookie': request.headers.get('cookie') || '',
    };
    
    if (user.role === 'MANAGER') {
      headers['x-manager-access'] = 'true';
      }
    
    const response = await fetch(certificateUrl.toString(), { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      console.log('Error from user certificate endpoint:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Gagal mengambil sertifikat' },
        { status: response.status }
      );
    }
    
    // Jika response adalah PDF, teruskan ke client
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
      console.log('Received PDF response from user certificate endpoint');
      const data = await response.arrayBuffer();
      
      return new NextResponse(data, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="calibration_certificate_${calibrationId}.pdf"`
        }
      });
    }
    
    // Jika response adalah JSON, teruskan ke client
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching calibration certificate:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil sertifikat kalibrasi' },
      { status: 500 }
    );
  }
}

// PATCH untuk mengedit sertifikat kalibrasi
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verifikasi session manager
    const user = await getUserFromRequest(request);
    
    if (!user || !isManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Di Next.js 15, params adalah objek yang harus diawait
    const { id: calibrationId } = await params;
    
    // Ambil data kalibrasi untuk memastikan ada
    const calibration = await prisma.calibration.findUnique({
      where: { id: calibrationId },
      include: {
        certificate: true
      }
    });
    
    if (!calibration) {
      return NextResponse.json(
        { error: 'Kalibrasi tidak ditemukan' },
        { status: 404 }
      );
    }
    
    if (!calibration.certificate) {
      return NextResponse.json(
        { error: 'Sertifikat kalibrasi tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      // Legacy fields, masih disimpan untuk backwards compatibility
      gasType, 
      gasConcentration, 
      gasBalance, 
      gasBatchNumber,
      testSensor,
      testSpan,
      testResult,
      // Instrument details
      instrumentName,
      modelNumber,
      configuration,
      approvedBy,
      // Certificate information
      certificateNumber,
      calibrationDate,
      validUntil,
      // Arrays of entries - stored as JSON strings
      allGasEntries,
      allTestEntries
    } = body;
    
    // Parse gas entries and test entries from JSON strings
    let gasEntriesData: GasEntry[] = [];
    let testEntriesData: TestEntry[] = [];

    try {
      if (allGasEntries) {
        gasEntriesData = JSON.parse(allGasEntries);
      } else if (gasType) {
        // Create a single entry from legacy fields
        gasEntriesData = [{
          gasType,
          gasConcentration,
          gasBalance,
          gasBatchNumber
        }];
      }
    } catch (e) {
      console.error('Error parsing gas entries:', e);
    }

    try {
      if (allTestEntries) {
        testEntriesData = JSON.parse(allTestEntries);
      } else if (testSensor) {
        // Create a single entry from legacy fields
        testEntriesData = [{
          testSensor,
          testSpan,
          testResult
        }];
      }
    } catch (e) {
      console.error('Error parsing test entries:', e);
    }
    
    // Update certificate in a transaction
    await prisma.$transaction(async (tx) => {
      // Update certificate with basic details
      await tx.calibrationCertificate.update({
        where: { id: calibration.certificate!.id },
        data: {
          instrumentName: instrumentName || undefined,
          modelNumber: modelNumber || undefined,
          configuration: configuration || undefined,
          approvedBy: approvedBy || undefined
        }
      });
      
      // Update main calibration record with certificate number and dates
      if (certificateNumber || calibrationDate || validUntil) {
        await tx.calibration.update({
          where: { id: calibrationId },
          data: {
            certificateNumber: certificateNumber || undefined,
            calibrationDate: calibrationDate ? new Date(calibrationDate) : undefined,
            validUntil: validUntil ? new Date(validUntil) : undefined
          }
        });
      }
      
      // Delete existing entries if we have new ones
      if (gasEntriesData.length > 0) {
        await tx.gasCalibrationEntry.deleteMany({
          where: { certificateId: calibration.certificate!.id }
        });
        
        // Create new gas entries
        for (const entry of gasEntriesData) {
          await tx.gasCalibrationEntry.create({
            data: {
              certificateId: calibration.certificate!.id,
              gasType: entry.gasType || '',
              gasConcentration: entry.gasConcentration || '',
              gasBalance: entry.gasBalance || '',
              gasBatchNumber: entry.gasBatchNumber || ''
            }
          });
        }
      }
      
      if (testEntriesData.length > 0) {
        await tx.testResultEntry.deleteMany({
          where: { certificateId: calibration.certificate!.id }
        });
        
        // Create new test entries
        for (const entry of testEntriesData) {
          await tx.testResultEntry.create({
            data: {
              certificateId: calibration.certificate!.id,
              testSensor: entry.testSensor || '',
              testSpan: entry.testSpan || '',
              testResult: entry.testResult || 'Pass'
            }
          });
        }
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'EDITED_CERTIFICATE',
        details: `Edited calibration certificate data for calibration ID: ${calibrationId}`,
        itemSerial: calibration.itemSerial,
        type: ActivityType.CALIBRATION_UPDATED
      }
    });
    
    // Fetch and return the updated certificate with all entries
    const updatedCalibration = await prisma.calibration.findUnique({
      where: { id: calibrationId },
      include: {
        certificate: {
          include: {
            gasEntries: true,
            testEntries: true
          }
        }
      }
    });
    
    return NextResponse.json(updatedCalibration);
    
  } catch (error) {
    console.error('Error updating calibration certificate:', error);
    return NextResponse.json(
      { error: 'Gagal mengupdate sertifikat kalibrasi' },
      { status: 500 }
    );
  }
}