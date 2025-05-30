import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ActivityType } from '@prisma/client';
import { getUserFromRequest, isManager } from '@/lib/auth';

// GET a specific request by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify manager
    const user = await getUserFromRequest(request);
    if (!isManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the request ID from params
    const paramsData = await params;
    const requestId = paramsData.id;

    // Find the request with related data
    const requestItem = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
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
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(requestItem);
  } catch (error) {
    console.error('Error fetching request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    );
  }
}

// PUT update a request
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify manager
    const user = await getUserFromRequest(request);
    if (!isManager(user)) {
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

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

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
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
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

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    );
  }
}

// DELETE a request
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify manager
    const user = await getUserFromRequest(request);
    if (!isManager(user)) {
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
