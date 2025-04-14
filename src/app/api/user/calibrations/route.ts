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
    const { itemId, reason, vendorId } = body;
    
    // Get user ID from auth token
    const userId = await getUserId(request) || 2; // Default to user ID 2 if not found
    
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
    const availableNames = ['Available', 'AVAILABLE', 'available'];
    if (!availableNames.includes(item.status.name)) {
      return NextResponse.json(
        { error: 'Item is not available for calibration. Current status: ' + item.status.name },
        { status: 400 }
      );
    }
    
    // Get or create PENDING status for requests
    let pendingStatus = await prisma.status.findFirst({
      where: {
        name: 'PENDING',
        type: 'request'
      }
    });
    
    // If PENDING status doesn't exist, create it
    if (!pendingStatus) {
      pendingStatus = await prisma.status.create({
        data: {
          name: 'PENDING',
          type: 'request',
        }
      });
    }
    
    // Get or create PENDING status for calibration
    let pendingCalibrationStatus = await prisma.status.findFirst({
      where: {
        name: 'PENDING',
        type: 'calibration'
      }
    });
    
    // If PENDING calibration status doesn't exist, create it
    if (!pendingCalibrationStatus) {
      pendingCalibrationStatus = await prisma.status.create({
        data: {
          name: 'PENDING',
          type: 'calibration',
        }
      });
    }
    
    // Get or create IN_CALIBRATION status for items
    let inCalibrationStatus = await prisma.status.findFirst({
      where: {
        name: 'IN_CALIBRATION',
        type: 'item'
      }
    });
    
    if (!inCalibrationStatus) {
      inCalibrationStatus = await prisma.status.create({
        data: {
          name: 'IN_CALIBRATION',
          type: 'item'
        }
      });
    }
    
    // Create the request with type 'calibration'
    const newRequest = await prisma.request.create({
      data: {
        userId: userId,
        itemId: parseInt(itemId),
        requestType: 'calibration',
        reason: reason || 'Routine calibration',
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
    
    // Create a calibration record immediately
    const calibration = await prisma.calibration.create({
      data: {
        requestId: newRequest.id,
        vendorId: vendorId ? parseInt(vendorId) : null,
        calibrationDate: new Date(),
        statusId: pendingCalibrationStatus.id
      }
    });
    
    // Update item status to IN_CALIBRATION
    await prisma.item.update({
      where: { id: parseInt(itemId) },
      data: { statusId: inCalibrationStatus.id }
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
        message: `New calibration request from user ID ${userId} for item ${item.name}${vendorId ? ` with preferred vendor ID ${vendorId}` : ''}`,
        isRead: false
      }
    });
    
    // Return the calibration data with request included
    const fullCalibration = await prisma.calibration.findUnique({
      where: { id: calibration.id },
      include: {
        request: {
          include: {
            item: true,
            status: true
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