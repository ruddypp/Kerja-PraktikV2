<<<<<<< HEAD
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ActivityType } from '@prisma/client';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

// GET a specific request by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin
    const user = await getUserFromRequest(request);
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the request ID from params
    const paramsData = await params;
    const requestId = paramsData.id;

    // Find the request with related data
    const requestItem = await prisma.request.findUnique({
      where: { id: requestId },
=======
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
  id: string;
}

// GET specific request by ID
export async function GET(
  request: Request, 
  { params }: { params: Params }
) {
  try {
    // Ensure we await the params object to resolve
    await Promise.resolve();
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }
    
    const requestData = await prisma.request.findUnique({
      where: { id },
>>>>>>> 0989372 (add fitur inventory dan history)
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
<<<<<<< HEAD
        statusLogs: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            changedBy: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!requestItem) {
=======
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
    
    if (!requestData) {
>>>>>>> 0989372 (add fitur inventory dan history)
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
<<<<<<< HEAD

    return NextResponse.json(requestItem);
=======
    
    return NextResponse.json(requestData);
>>>>>>> 0989372 (add fitur inventory dan history)
  } catch (error) {
    console.error('Error fetching request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    );
  }
}

<<<<<<< HEAD
// PUT update a request
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin
    const user = await getUserFromRequest(request);
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the request ID from params
    const paramsData = await params;
    const requestId = paramsData.id;
    
    const data = await request.json();

    // Validate required fields
    if (!data.title || !data.type || !data.status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id: requestId }
    });

=======
// PATCH update request status
export async function PATCH(
  request: Request, 
  { params }: { params: Params }
) {
  try {
    // Ensure we await the params object to resolve
    await Promise.resolve();
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { statusId, approvedBy } = body;
    
    if (!statusId) {
      return NextResponse.json(
        { error: 'Status ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Updating request ${id} to status ${statusId}`);
    
    // Check if request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id },
      include: {
        item: true
      }
    });
    
>>>>>>> 0989372 (add fitur inventory dan history)
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
<<<<<<< HEAD

    // Check if status is changing
    const statusChanged = existingRequest.status !== data.status;

    // Update the request
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        status: data.status
=======
    
    // Check if status exists
    const status = await prisma.status.findFirst({
      where: { 
        id: parseInt(statusId),
        type: 'request'
      }
    });
    
    if (!status) {
      return NextResponse.json(
        { error: `Invalid status for request. Status ID ${statusId} not found with type 'request'` },
        { status: 400 }
      );
    }
    
    console.log(`Found status: ${status.name} (ID: ${status.id})`);
    
    // Update request
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: {
        statusId: parseInt(statusId),
        approvedBy: approvedBy ? parseInt(approvedBy) : null
>>>>>>> 0989372 (add fitur inventory dan history)
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
<<<<<<< HEAD
        statusLogs: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            changedBy: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // If status changed, add status log
    if (statusChanged) {
      await prisma.requestStatusLog.create({
        data: {
          requestId: requestId,
          status: data.status,
          notes: data.notes || `Status updated to ${data.status}`,
          changedById: user.id
        }
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        type: ActivityType.REQUEST_UPDATED,
        action: 'UPDATE_REQUEST',
        details: `Updated request: ${data.title}`,
        requestId: requestId
      }
    });

=======
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
    
>>>>>>> 0989372 (add fitur inventory dan history)
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    );
  }
<<<<<<< HEAD
}

// DELETE a request
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin
    const user = await getUserFromRequest(request);
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the request ID from params
    const paramsData = await params;
    const requestId = paramsData.id;

    // Verify request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id: requestId }
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Delete related status logs first
    await prisma.requestStatusLog.deleteMany({
      where: { requestId: requestId }
    });

    // Delete the request
    await prisma.request.delete({
      where: { id: requestId }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        type: ActivityType.REQUEST_DELETED,
        action: 'DELETE_REQUEST',
        details: `Deleted request: ${existingRequest.title}`,
        requestId: requestId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting request:', error);
    return NextResponse.json(
      { error: 'Failed to delete request' },
      { status: 500 }
    );
  }
}
=======
} 
>>>>>>> 0989372 (add fitur inventory dan history)
