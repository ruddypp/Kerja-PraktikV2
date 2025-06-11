import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RequestStatus, RequestType, ActivityType } from '@prisma/client';
import { getUserFromRequest, isManager } from '@/lib/auth';

// GET all requests
export async function GET(request: NextRequest) {
  try {
    // Verify manager
    const user = await getUserFromRequest(request);
    if (!isManager(user)) {
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
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

// POST create a new request
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only manager can create requests for others
    const isManagerUser = isManager(user);
    
    const data = await request.json();

    // Validate required fields
    if (!data.title || !data.type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If userId is provided and not the current user, verify manager rights
    if (data.userId && data.userId !== user.id && !isManagerUser) {
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
    // Verify manager
    const user = await getUserFromRequest(request);
    if (!isManager(user)) {
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

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

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
      { status: 500 }
    );
  }
} 