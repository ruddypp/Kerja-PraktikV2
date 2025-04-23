import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET untuk mengakses sertifikat kalibrasi (proxy ke endpoint user)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verifikasi session admin
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const calibrationId = params.id;
    console.log('Admin accessing certificate for calibration ID:', calibrationId);
    
    // Ambil data kalibrasi untuk memastikan ada
    const calibration = await prisma.calibration.findUnique({
      where: { id: calibrationId },
      include: {
        certificate: true // Include certificate untuk debugging
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
    
    // Forward request ke endpoint user dengan menambahkan header admin
    console.log('Forwarding request to user certificate endpoint with admin access');
    const response = await fetch(certificateUrl.toString(), {
      headers: {
        'x-admin-access': 'true',
        'Cookie': request.headers.get('cookie') || '',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
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
    // Verifikasi session admin
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const calibrationId = params.id;
    
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
      gasType, 
      gasConcentration, 
      gasBalance, 
      gasBatchNumber,
      testSensor,
      testSpan,
      testResult
    } = body;
    
    // Update sertifikat kalibrasi
    const updatedCertificate = await prisma.calibrationCertificate.update({
      where: { 
        calibrationId 
      },
      data: {
        gasType: gasType || undefined,
        gasConcentration: gasConcentration || undefined,
        gasBalance: gasBalance || undefined,
        gasBatchNumber: gasBatchNumber || undefined,
        testSensor: testSensor || undefined,
        testSpan: testSpan || undefined,
        testResult: testResult || undefined
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'EDITED_CERTIFICATE',
        details: `Edited calibration certificate gas data and test results for calibration ID: ${calibrationId}`,
        itemSerial: calibration.itemSerial
      }
    });
    
    return NextResponse.json(updatedCertificate);
    
  } catch (error) {
    console.error('Error updating calibration certificate:', error);
    return NextResponse.json(
      { error: 'Gagal mengupdate sertifikat kalibrasi' },
      { status: 500 }
    );
  }
} 