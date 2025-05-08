import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decodeToken } from '@/lib/auth';

// Helper function to get user ID from token
async function getUserId(request: Request): Promise<string | null> {
  try {
    // Get token from cookies manually
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [name, ...value] = c.split('=');
        return [name, value.join('=')];
      })
    );
    
    const token = cookies['auth_token'] || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (token) {
      const userData = decodeToken(token);
      if (userData?.id) {
        return userData.id;
      }
    }
  } catch (authError) {
    console.error('Error getting user from token:', authError);
  }
  
  return null;
}

// GET a single calibration by ID for user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user ID from token
    const userId = await getUserId(request);
    if (!userId) {
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
        certificate: true,
        activityLogs: true
      }
    });
    
    if (!calibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }
    
    // Verify this calibration belongs to the user
    if (calibration.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    // Get user ID from token
    const userId = await getUserId(request);
    if (!userId) {
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
    
    // Verify calibration exists and belongs to this user
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
    
    // Verify this calibration belongs to the user
    if (existingCalibration.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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