<<<<<<< HEAD
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RequestStatus, RequestType, ActivityType } from '@prisma/client';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

// GET all requests
export async function GET(request: NextRequest) {
  try {
    // Verify admin
    const user = await getUserFromRequest(request);
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const status = searchParams.get('status') as RequestStatus | null;
    const type = searchParams.get('type') as RequestType | null;
    const search = searchParams.get('search');

    // Build where clause
    let whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.request.count({
      where: whereClause
    });

    // Find requests with related data
    const requests = await prisma.request.findMany({
      where: whereClause,
=======
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
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    return NextResponse.json({
      items: requests,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
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
      },
      orderBy: {
        requestDate: 'desc'
      }
    });
    
    return NextResponse.json(requests);
>>>>>>> 0989372 (add fitur inventory dan history)
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

<<<<<<< HEAD
// POST create a new request
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can create requests for others
    const isAdminUser = isAdmin(user);
    
    const data = await request.json();

    // Validate required fields
    if (!data.title || !data.type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If userId is provided and not the current user, verify admin rights
    if (data.userId && data.userId !== user.id && !isAdminUser) {
      return NextResponse.json(
        { error: 'Not authorized to create requests for other users' },
        { status: 403 }
      );
    }

    // Create the request
    const newRequest = await prisma.request.create({
      data: {
        title: data.title,
        description: data.description || null,
        type: data.type,
        status: RequestStatus.PENDING,
        userId: data.userId || user.id,
        // Create initial status log
        statusLogs: {
          create: {
            status: RequestStatus.PENDING,
            notes: 'Request created',
            changedById: user.id
          }
        }
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

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        type: ActivityType.REQUEST_CREATED,
        action: 'CREATE_REQUEST',
        details: `Created request: ${data.title}`,
        requestId: newRequest.id
      }
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating request:', error);
    return NextResponse.json(
      { error: 'Failed to create request' },
      { status: 500 }
    );
  }
}

// PATCH update request status
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin
    const user = await getUserFromRequest(request);
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.id || !data.status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id: data.id }
    });

=======
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
    
>>>>>>> 0989372 (add fitur inventory dan history)
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
<<<<<<< HEAD

    // Update request status
    const updatedRequest = await prisma.request.update({
      where: { id: data.id },
      data: {
        status: data.status,
        // Add status log
        statusLogs: {
          create: {
            status: data.status,
            notes: data.notes || null,
            changedById: user.id
          }
        }
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

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        type: ActivityType.REQUEST_UPDATED,
        action: 'UPDATE_REQUEST_STATUS',
        details: `Updated request ${data.id} status to ${data.status}`,
        requestId: data.id
      }
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating request status:', error);
    return NextResponse.json(
      { error: 'Failed to update request status' },
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
    
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'Failed to update request' },
>>>>>>> 0989372 (add fitur inventory dan history)
      { status: 500 }
    );
  }
} 