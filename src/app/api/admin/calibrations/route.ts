import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decodeToken } from '@/lib/auth';

// Helper function to check if a status ID corresponds to a completed status
async function isCompletedStatus(statusId: number): Promise<boolean> {
  const status = await prisma.status.findUnique({
    where: { id: statusId }
  });
  
  return status?.name?.toLowerCase().includes('completed') || false;
}

// Helper function to get admin status
async function isAdminUser(request: Request): Promise<boolean> {
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
      if (userData?.role === 'Admin') {
        return true;
      }
    }
  } catch (authError) {
    console.error('Error getting user from token:', authError);
  }
  
  return false;
}

// GET all calibrations (for admin)
export async function GET(request: Request) {
  try {
    // Check if user is admin
    const isAdmin = await isAdminUser(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const statusId = searchParams.get('statusId');
    const vendorId = searchParams.get('vendorId');
    const itemId = searchParams.get('itemId');
    const requestId = searchParams.get('requestId');
    
    // Build where clause
    const where: Record<string, any> = {};
    
    if (statusId) {
      where.statusId = parseInt(statusId);
    }
    
    if (vendorId) {
      where.vendorId = parseInt(vendorId);
    }
    
    if (itemId) {
      where.request = {
        itemId: parseInt(itemId)
      };
    }
    
    if (requestId) {
      where.requestId = parseInt(requestId);
    }
    
    const calibrations = await prisma.calibration.findMany({
      where,
      include: {
        request: {
          include: {
            item: {
              include: {
                category: true
              }
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            status: true
          }
        },
        status: true,
        vendor: true
      },
      orderBy: {
        calibrationDate: 'desc'
      }
    });
    
    return NextResponse.json(calibrations);
  } catch (error) {
    console.error('Error fetching calibrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calibrations' },
      { status: 500 }
    );
  }
}

// POST create or update a calibration (for admin)
export async function POST(request: Request) {
  try {
    // Check admin authorization
    const isAdmin = await isAdminUser(request);
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, vendorId, calibrationDate, result } = body;

    // Validate request ID
    if (!requestId) {
      return NextResponse.json({ message: 'Request ID is required' }, { status: 400 });
    }

    // Parse IDs to integers
    const requestIdInt = parseInt(requestId);
    const vendorIdInt = vendorId ? parseInt(vendorId) : null;

    // Check if the request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id: requestIdInt },
      include: { item: true, user: true }
    });

    if (!existingRequest) {
      return NextResponse.json({ message: 'Request not found' }, { status: 404 });
    }

    // Find in-progress status for calibration
    let inProgressStatus = await prisma.status.findFirst({
      where: {
        name: { contains: 'progress', mode: 'insensitive' },
        type: 'CALIBRATION'
      }
    });

    if (!inProgressStatus) {
      inProgressStatus = await prisma.status.create({
        data: {
          name: 'IN_PROGRESS',
          type: 'CALIBRATION'
        }
      });
    }

    // Check if a calibration already exists for this request
    const existingCalibration = await prisma.calibration.findFirst({
      where: { requestId: requestIdInt }
    });

    let calibration;

    if (existingCalibration) {
      // Update existing calibration
      calibration = await prisma.calibration.update({
        where: { id: existingCalibration.id },
        data: {
          vendorId: vendorIdInt,
          calibrationDate: new Date(calibrationDate),
          result,
          statusId: inProgressStatus.id
        },
        include: {
          status: true,
          request: {
            include: {
              user: true,
              item: true
            }
          }
        }
      });
    } else {
      // Create new calibration
      calibration = await prisma.calibration.create({
        data: {
          requestId: requestIdInt,
          vendorId: vendorIdInt,
          calibrationDate: new Date(calibrationDate),
          result,
          statusId: inProgressStatus.id
        },
        include: {
          status: true,
          request: {
            include: {
              user: true,
              item: true
            }
          }
        }
      });
    }

    // Find or create in-progress request status
    let inProgressRequestStatus = await prisma.status.findFirst({
      where: {
        name: { contains: 'progress', mode: 'insensitive' },
        type: 'REQUEST'
      }
    });

    if (!inProgressRequestStatus) {
      inProgressRequestStatus = await prisma.status.create({
        data: {
          name: 'IN_PROGRESS',
          type: 'REQUEST'
        }
      });
    }

    // Update the request status to in-progress
    await prisma.request.update({
      where: { id: requestIdInt },
      data: { statusId: inProgressRequestStatus.id }
    });

    // Find or create in-calibration item status
    let inCalibrationItemStatus = await prisma.status.findFirst({
      where: {
        name: { contains: 'calibration', mode: 'insensitive' },
        type: 'ITEM'
      }
    });

    if (!inCalibrationItemStatus) {
      inCalibrationItemStatus = await prisma.status.create({
        data: {
          name: 'IN_CALIBRATION',
          type: 'ITEM'
        }
      });
    }

    // Update the item status to in calibration
    await prisma.item.update({
      where: { id: existingRequest.itemId },
      data: { statusId: inCalibrationItemStatus.id }
    });

    return NextResponse.json(
      { 
        message: 'Calibration started successfully', 
        calibration 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in calibration approval process:', error);
    return NextResponse.json(
      { message: 'Error in calibration approval process', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // Check if user is admin
    const isAdmin = await isAdminUser(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { id, vendorId, calibrationDate, result, certificateUrl, statusId } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Calibration ID is required' },
        { status: 400 }
      );
    }
    
    // Check if calibration exists
    const existingCalibration = await prisma.calibration.findUnique({
      where: { id: parseInt(id) },
      include: {
        request: {
          include: {
            item: true,
            user: true
          }
        },
        status: true
      }
    });
    
    if (!existingCalibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }
    
    // Check if the status is being changed to completed
    const isCompletingCalibration = statusId && 
      existingCalibration.statusId !== parseInt(statusId) &&
      await isCompletedStatus(parseInt(statusId));
    
    // Update calibration
    const updatedCalibration = await prisma.calibration.update({
      where: { id: parseInt(id) },
      data: {
        vendorId: vendorId ? parseInt(vendorId) : undefined,
        calibrationDate: calibrationDate ? new Date(calibrationDate) : undefined,
        result,
        certificateUrl,
        statusId: statusId ? parseInt(statusId) : undefined
      },
      include: {
        request: {
          include: {
            item: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        status: true,
        vendor: true
      }
    });
    
    // If calibration is now marked as completed
    if (isCompletingCalibration) {
      // Get COMPLETED status for requests
      let completedRequestStatus = await prisma.status.findFirst({
        where: {
          name: {
            mode: 'insensitive',
            contains: 'completed'
          },
          type: 'request'
        }
      });
      
      // If completed status doesn't exist, create it
      if (!completedRequestStatus) {
        completedRequestStatus = await prisma.status.create({
          data: {
            name: 'completed',
            type: 'request'
          }
        });
      }
      
      // Update the original request status to completed
      await prisma.request.update({
        where: { id: existingCalibration.requestId },
        data: { statusId: completedRequestStatus.id }
      });
      
      // Get available status for items
      let availableItemStatus = await prisma.status.findFirst({
        where: {
          name: {
            mode: 'insensitive',
            contains: 'available'
          },
          type: 'item'
        }
      });
      
      // Update item status to available
      if (availableItemStatus) {
        await prisma.item.update({
          where: { id: existingCalibration.request.itemId },
          data: { statusId: availableItemStatus.id }
        });
      }
      
      // Create notification for user
      await prisma.notification.create({
        data: {
          userId: existingCalibration.request.userId,
          message: `Calibration for ${existingCalibration.request.item.name} has been completed`,
          isRead: false
        }
      });
      
      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: 1, // Admin ID
          activity: `Calibration #${id} for ${existingCalibration.request.item.name} marked as completed`
        }
      });
    }
    
    return NextResponse.json(updatedCalibration);
  } catch (error) {
    console.error('Error updating calibration:', error);
    return NextResponse.json(
      { error: 'Failed to update calibration' },
      { status: 500 }
    );
  }
} 