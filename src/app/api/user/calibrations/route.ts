import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decodeToken } from '@/lib/auth';

// Helper function to get user ID from request
async function getUserId(request: Request): Promise<number | null> {
  try {
    // Get token from cookies manually
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [name, ...value] = c.split('=');
        return [name, value.join('=')];
      })
    );
    
    const token = cookies['auth_token'];
    
    if (token) {
      const userData = decodeToken(token);
      if (userData?.id) {
        return userData.id;
      }
    }
  } catch (authError) {
    console.error('Error getting user from token:', authError);
  }
  
  return null; // Return null if no valid user found
}

// GET all calibrations for current user
export async function GET(request: Request) {
  try {
    // Get user ID from auth token
    const userId = await getUserId(request) || 2; // Default to user ID 2 if not found
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const statusId = searchParams.get('statusId');
    const itemId = searchParams.get('itemId');
    
    // Build where conditions
    const whereCalibration: Record<string, any> = {};
    const whereRequest: Record<string, any> = {
      userId,
      requestType: 'calibration'
    };
    
    if (statusId) {
      whereCalibration.statusId = parseInt(statusId);
    }
    
    if (itemId) {
      whereRequest.itemId = parseInt(itemId);
    }
    
    // Get calibrations for user's requests
    const calibrations = await prisma.calibration.findMany({
      where: {
        ...whereCalibration,
        request: whereRequest
      },
      include: {
        request: {
          include: {
            item: {
              include: {
                category: true
              }
            },
            status: true
          }
        },
        status: true,
        vendor: {
          select: {
            id: true,
            name: true,
            contactPerson: true
          }
        }
      },
      orderBy: {
        calibrationDate: 'desc'
      }
    });
    
    return NextResponse.json(calibrations);
  } catch (error) {
    console.error('Error fetching user calibrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calibrations' },
      { status: 500 }
    );
  }
}

// POST create a new calibration request
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, vendorId, reason } = body;
    
    // Get user ID from auth token
    const userId = await getUserId(request) || 2; // Default to mock user ID
    
    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }
    
    // Verify if the item exists and is available
    const item = await prisma.item.findUnique({
      where: { id: parseInt(itemId) },
      include: { status: true }
    });
    
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    // If item is not available, reject request
    // Use case-insensitive check for item availability
    const availableNames = ['available', 'Available', 'AVAILABLE'];
    if (!availableNames.some(name => item.status.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json(
        { error: 'Item is not available for calibration. Current status: ' + item.status.name },
        { status: 400 }
      );
    }
    
    // Get or create PENDING status for requests
    let pendingStatus = await prisma.status.findFirst({
      where: {
        name: {
          mode: 'insensitive',
          equals: 'pending'
        },
        type: 'request'
      }
    });
    
    // If PENDING status doesn't exist, create it (with lowercase standardized name)
    if (!pendingStatus) {
      console.log('Creating pending status for requests');
      pendingStatus = await prisma.status.create({
        data: {
          name: 'pending',
          type: 'request',
        }
      });
    }
    
    // Create the request
    const newRequest = await prisma.request.create({
      data: {
        userId: userId,
        itemId: parseInt(itemId),
        requestType: 'calibration',
        reason: reason || null,
        requestDate: new Date(),
        statusId: pendingStatus.id
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            serialNumber: true
          }
        },
        status: true
      }
    });
    
    // Get or create PENDING status for calibrations
    let pendingCalibrationStatus = await prisma.status.findFirst({
      where: {
        name: {
          mode: 'insensitive',
          equals: 'pending'
        },
        type: 'calibration'
      }
    });
    
    // If calibration PENDING status doesn't exist, create it (with lowercase standardized name)
    if (!pendingCalibrationStatus) {
      console.log('Creating pending status for calibrations');
      pendingCalibrationStatus = await prisma.status.create({
        data: {
          name: 'pending',
          type: 'calibration',
        }
      });
    }
    
    // Create calibration record
    const calibration = await prisma.calibration.create({
      data: {
        requestId: newRequest.id,
        vendorId: vendorId ? parseInt(vendorId) : null,
        calibrationDate: new Date(),
        statusId: pendingCalibrationStatus.id
      }
    });
    
    // Create an activity log entry
    await prisma.activityLog.create({
      data: {
        userId: userId,
        activity: `New calibration request created for item ${item.name}`
      }
    });
    
    // Notify admin
    await prisma.notification.create({
      data: {
        userId: 1, // Admin user ID
        message: `New calibration request from user ID ${userId} for item ${item.name}`,
        isRead: false
      }
    });
    
    // Return full calibration data with request included
    const fullCalibration = await prisma.calibration.findUnique({
      where: { id: calibration.id },
      include: {
        request: {
          include: {
            item: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        status: true,
        vendor: true
      }
    });
    
    return NextResponse.json(fullCalibration, { status: 201 });
  } catch (error) {
    console.error('Error creating calibration request:', error);
    return NextResponse.json(
      { error: 'Failed to create calibration request' },
      { status: 500 }
    );
  }
} 