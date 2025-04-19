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
    
    // Ambil data kalibrasi untuk memastikan ada
    const calibration = await prisma.calibration.findUnique({
      where: { id: calibrationId }
    });
    
    if (!calibration) {
      return NextResponse.json(
        { error: 'Kalibrasi tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Buat URL ke endpoint certificate user
    const certificateUrl = new URL(`/api/user/calibrations/${calibrationId}/certificate`, request.url);
    
    // Forward request ke endpoint user dengan menambahkan header admin
    const response = await fetch(certificateUrl.toString(), {
      headers: {
        'x-admin-access': 'true',
        'Cookie': request.headers.get('cookie') || '',
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Gagal mengambil sertifikat' },
        { status: response.status }
      );
    }
    
    // Jika response adalah PDF, teruskan ke client
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
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