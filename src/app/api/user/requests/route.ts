import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RequestStatus, RequestType, ActivityType } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

// GET user's requests
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const status = searchParams.get('status') as RequestStatus | null;
    const type = searchParams.get('type') as RequestType | null;

    // Build where clause - only show user's own requests
    let whereClause: any = {
      userId: user.id // Filter to user's own requests
    };

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    // Get total count for pagination
    const totalCount = await prisma.request.count({
      where: whereClause
    });

    // Find requests with related data
    const requests = await prisma.request.findMany({
      where: whereClause,
      include: {
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

    const data = await request.json();

    // Validate required fields
    if (!data.title || !data.type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the request - user can only create requests for themselves
    const newRequest = await prisma.request.create({
      data: {
        title: data.title,
        description: data.description || null,
        type: data.type,
        status: RequestStatus.PENDING,
        userId: user.id,
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
        details: `Created request: ${data.title}`
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

// PATCH cancel a request
export async function PATCH(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Verify request exists and belongs to the user
    const existingRequest = await prisma.request.findFirst({
      where: { 
        id: data.id,
        userId: user.id
      }
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found or you do not have permission to modify it' },
        { status: 404 }
      );
    }

    // Only pending requests can be cancelled by the user
    if (existingRequest.status !== RequestStatus.PENDING) {
      return NextResponse.json(
        { error: 'Only pending requests can be cancelled' },
        { status: 400 }
      );
    }

    // Update request status to cancelled
    const updatedRequest = await prisma.request.update({
      where: { id: data.id },
      data: {
        status: RequestStatus.CANCELLED,
        // Add status log
        statusLogs: {
          create: {
            status: RequestStatus.CANCELLED,
            notes: data.notes || 'Request cancelled by user',
            changedById: user.id
          }
        }
      },
      include: {
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
        action: 'CANCEL_REQUEST',
        details: `Cancelled request: ${existingRequest.title}`
      }
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error cancelling request:', error);
    return NextResponse.json(
      { error: 'Failed to cancel request' },
      { status: 500 }
    );
  }
}
