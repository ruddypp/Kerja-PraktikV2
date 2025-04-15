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

// GET a single calibration by ID
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Check if user is admin
    const isAdmin = await isAdminUser(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use params asynchronously as required by Next.js App Router
    const { id: calibrationIdString } = context.params;
    const id = parseInt(calibrationIdString);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid calibration ID' },
        { status: 400 }
      );
    }
    
    const calibration = await prisma.calibration.findUnique({
      where: { id },
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
      }
    });
    
    if (!calibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
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

// PATCH update a calibration
export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Check if user is admin
    const isAdmin = await isAdminUser(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use params asynchronously as required by Next.js App Router
    const { id: calibrationIdString } = context.params;
    const id = parseInt(calibrationIdString);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid calibration ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { vendorId, calibrationDate, result, certificateUrl, statusId, completed } = body;
    
    // Verify calibration exists
    const existingCalibration = await prisma.calibration.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            item: true,
            user: true
          }
        }
      }
    });
    
    if (!existingCalibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }
    
    // If the calibration is marked as completed
    if (completed) {
      // Get COMPLETED status for calibration
      let completedStatus = await prisma.status.findFirst({
        where: {
          name: {
            mode: 'insensitive',
            contains: 'completed'
          },
          type: 'calibration'
        }
      });
      
      if (!completedStatus) {
        completedStatus = await prisma.status.create({
          data: {
            name: 'completed',
            type: 'calibration'
          }
        });
      }
      
      // Get AVAILABLE status for item
      let availableStatus = await prisma.status.findFirst({
        where: {
          name: {
            mode: 'insensitive',
            contains: 'available'
          },
          type: 'item'
        }
      });
      
      if (!availableStatus) {
        availableStatus = await prisma.status.create({
          data: {
            name: 'available',
            type: 'item'
          }
        });
      }
      
      // Update item status to AVAILABLE
      await prisma.item.update({
        where: { id: existingCalibration.request.itemId },
        data: { 
          statusId: availableStatus.id,
          lastVerifiedDate: new Date()
        }
      });
      
      // Create item history entry for completed calibration
      await prisma.itemHistory.create({
        data: {
          itemId: existingCalibration.request.itemId,
          activityType: 'calibration',
          relatedRequestId: existingCalibration.request.id,
          description: `Calibration completed for ${existingCalibration.request.item.name}`,
          performedBy: 1, // Admin ID
          date: new Date()
        }
      });
      
      // Notify user
      await prisma.notification.create({
        data: {
          userId: existingCalibration.request.userId,
          message: `Your calibration for ${existingCalibration.request.item.name} has been completed`,
          isRead: false
        }
      });
      
      // Update calibration with COMPLETED status
      const updatedCalibration = await prisma.calibration.update({
        where: { id },
        data: {
          vendorId: vendorId ? parseInt(vendorId) : undefined,
          calibrationDate: calibrationDate ? new Date(calibrationDate) : undefined,
          result,
          certificateUrl,
          statusId: completedStatus.id
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
      
      return NextResponse.json(updatedCalibration);
    }
    
    // Normal update without completion
    const updatedCalibration = await prisma.calibration.update({
      where: { id },
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
    
    return NextResponse.json(updatedCalibration);
  } catch (error) {
    console.error('Error updating calibration:', error);
    return NextResponse.json(
      { error: 'Failed to update calibration' },
      { status: 500 }
    );
  }
}

// DELETE calibration
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid calibration ID' },
        { status: 400 }
      );
    }

    // Check if the calibration exists
    const calibration = await prisma.calibration.findUnique({
      where: { id },
      include: {
        request: true
      }
    });

    if (!calibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }

    // Delete the calibration
    const deletedCalibration = await prisma.calibration.delete({
      where: { id }
    });

    return NextResponse.json({
      message: 'Calibration deleted successfully',
      data: deletedCalibration
    });
  } catch (error) {
    console.error('Error deleting calibration:', error);
    return NextResponse.json(
      { error: `Failed to delete calibration: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 