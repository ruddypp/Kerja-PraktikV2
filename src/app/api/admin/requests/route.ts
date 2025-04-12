import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all requests with user, item, and status details
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestType = searchParams.get('requestType');
    const statusId = searchParams.get('statusId');
    const search = searchParams.get('search');
    
    // Build where conditions
    const where: Record<string, unknown> = {};
    
    if (requestType) {
      where.requestType = requestType;
    }
    
    if (statusId) {
      where.statusId = parseInt(statusId);
    }
    
    // For search, we need to use OR conditions on related entities
    if (search) {
      where.OR = [
        // Search by item name
        {
          item: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        // Search by user name or email
        {
          user: {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive'
                }
              }
            ]
          }
        }
      ];
    }
    
    const requests = await prisma.request.findMany({
      where: where as any, // Type assertion needed for complex nested conditions
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        item: {
          select: {
            id: true,
            name: true,
            serialNumber: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        status: true
      },
      orderBy: {
        requestDate: 'desc'
      }
    });
    
    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

// POST update request status (approve, reject, complete)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, statusId, approvedBy } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }
    
    if (!statusId) {
      return NextResponse.json(
        { error: 'Status ID is required' },
        { status: 400 }
      );
    }
    
    // Check if request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id: parseInt(id) },
      include: {
        item: true
      }
    });
    
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    // Check if status exists
    const status = await prisma.status.findFirst({
      where: { 
        id: parseInt(statusId),
        type: 'request'
      }
    });
    
    if (!status) {
      return NextResponse.json(
        { error: 'Invalid status for request' },
        { status: 400 }
      );
    }
    
    // Update request
    const updatedRequest = await prisma.request.update({
      where: { id: parseInt(id) },
      data: {
        statusId: parseInt(statusId),
        approvedBy: approvedBy ? parseInt(approvedBy) : null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        item: {
          select: {
            id: true,
            name: true,
            serialNumber: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        status: true
      }
    });
    
    // If approving, update the item status if needed (for rental or calibration)
    if (status.name === 'APPROVED') {
      if (existingRequest.requestType === 'rental') {
        // Get "In Use" status ID
        const inUseStatus = await prisma.status.findFirst({
          where: {
            name: 'In Use',
            type: 'item'
          }
        });
        
        if (inUseStatus) {
          await prisma.item.update({
            where: { id: existingRequest.itemId },
            data: {
              statusId: inUseStatus.id
            }
          });
        }
      } else if (existingRequest.requestType === 'calibration') {
        // Get "In Calibration" status ID
        const inCalibrationStatus = await prisma.status.findFirst({
          where: {
            name: 'In Calibration',
            type: 'item'
          }
        });
        
        if (inCalibrationStatus) {
          await prisma.item.update({
            where: { id: existingRequest.itemId },
            data: {
              statusId: inCalibrationStatus.id
            }
          });
        }
      }
    }
    
    // If completing, update the item status back to available
    if (status.name === 'COMPLETED') {
      // Get "Available" status ID
      const availableStatus = await prisma.status.findFirst({
        where: {
          name: 'Available',
          type: 'item'
        }
      });
      
      if (availableStatus) {
        await prisma.item.update({
          where: { id: existingRequest.itemId },
          data: {
            statusId: availableStatus.id
          }
        });
      }
    }
    
    // Create an activity log entry
    await prisma.activityLog.create({
      data: {
        userId: approvedBy ? parseInt(approvedBy) : 1, // Default to admin if no approver
        activity: `Request ${id} status updated to ${status.name}`
      }
    });
    
    // Create a notification for the user
    await prisma.notification.create({
      data: {
        userId: existingRequest.userId,
        message: `Your request for ${existingRequest.item.name} has been ${status.name.toLowerCase()}`
      }
    });
    
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    );
  }
} 