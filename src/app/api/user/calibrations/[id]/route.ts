import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

// GET a single calibration by ID for user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user from request
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Await params to get id
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Invalid calibration ID' },
        { status: 400 }
      );
    }
    
    const calibration = await prisma.calibration.findUnique({
      where: { id },
      include: {
        item: true,
        user: true,
        vendor: true,
        statusLogs: true,
        certificate: {
          include: {
            gasEntries: true,
            testEntries: true
          }
        },
        activityLogs: true
      }
    });
    
    if (!calibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }
    
    // More permissive access control - any authenticated user can access any calibration
    console.log('Allowing access to calibration. User ID:', user.id, 'Calibration user ID:', calibration.userId);
    
    // Pastikan user hanya bisa melihat calibration miliknya sendiri
    if (calibration.userId !== user.id) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke data kalibrasi ini' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(calibration);
  } catch (error) {
    console.error('Error fetching calibration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calibration' },
      { status: 500 }
    );
  }
}

// PATCH update a calibration (limited capabilities for user)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user from request
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Await params to get id
    const { id } = await params;
    
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
    
    // More permissive access control - any authenticated user can update notes
    console.log('Allowing update to calibration. User ID:', user.id, 'Calibration user ID:', existingCalibration.userId);
    
    // Pastikan user hanya bisa mengupdate calibration miliknya sendiri
    if (existingCalibration.userId !== user.id) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses untuk mengubah data kalibrasi ini' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { notes } = body;
    
    // Users can only update limited fields like notes
    const updatedCalibration = await prisma.calibration.update({
      where: { id },
      data: {
        notes
      },
      include: {
        item: true,
        user: true,
        vendor: true,
        statusLogs: true,
        certificate: true,
        activityLogs: true
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