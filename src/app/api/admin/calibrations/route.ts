import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decodeToken } from '@/lib/auth';

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
    // Check if user is admin
    const isAdmin = await isAdminUser(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { requestId, vendorId, calibrationDate, result, certificateUrl, statusId } = body;
    
    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }
    
    // Check if request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id: parseInt(requestId) },
      include: { item: true }
    });
    
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    // Check if calibration already exists for this request
    const existingCalibration = await prisma.calibration.findUnique({
      where: { requestId: parseInt(requestId) }
    });
    
    // Get appropriate status
    let calibrationStatus = await prisma.status.findFirst({
      where: {
        name: 'IN_PROGRESS',
        type: 'calibration'
      }
    });
    
    // If status doesn't exist, create it
    if (!calibrationStatus) {
      calibrationStatus = await prisma.status.create({
        data: {
          name: 'IN_PROGRESS',
          type: 'calibration'
        }
      });
    }
    
    // Get IN_CALIBRATION status for the item
    let itemCalibrationStatus = await prisma.status.findFirst({
      where: {
        name: 'IN_CALIBRATION',
        type: 'item'
      }
    });
    
    // If status doesn't exist, create it
    if (!itemCalibrationStatus) {
      itemCalibrationStatus = await prisma.status.create({
        data: {
          name: 'IN_CALIBRATION',
          type: 'item'
        }
      });
    }
    
    // Update item status to IN_CALIBRATION
    await prisma.item.update({
      where: { id: existingRequest.itemId },
      data: { statusId: itemCalibrationStatus.id }
    });
    
    // Update or create calibration
    let calibration;
    if (existingCalibration) {
      calibration = await prisma.calibration.update({
        where: { id: existingCalibration.id },
        data: {
          vendorId: vendorId ? parseInt(vendorId) : undefined,
          calibrationDate: calibrationDate ? new Date(calibrationDate) : undefined,
          result,
          certificateUrl,
          statusId: statusId ? parseInt(statusId) : calibrationStatus.id
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
    } else {
      calibration = await prisma.calibration.create({
        data: {
          requestId: parseInt(requestId),
          vendorId: vendorId ? parseInt(vendorId) : null,
          calibrationDate: calibrationDate ? new Date(calibrationDate) : new Date(),
          result,
          certificateUrl,
          statusId: statusId ? parseInt(statusId) : calibrationStatus.id
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
      
      // Create item history entry
      await prisma.itemHistory.create({
        data: {
          itemId: existingRequest.itemId,
          activityType: 'calibration',
          relatedRequestId: existingRequest.id,
          description: `Calibration started for ${existingRequest.item.name}`,
          performedBy: 1, // Admin ID
          date: new Date()
        }
      });
      
      // Notify user
      await prisma.notification.create({
        data: {
          userId: existingRequest.userId,
          message: `Your calibration request for ${existingRequest.item.name} has been approved and started`,
          isRead: false
        }
      });
    }
    
    return NextResponse.json(calibration, { status: existingCalibration ? 200 : 201 });
  } catch (error) {
    console.error('Error managing calibration:', error);
    return NextResponse.json(
      { error: 'Failed to manage calibration' },
      { status: 500 }
    );
  }
} 