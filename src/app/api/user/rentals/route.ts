import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { RequestStatus, ItemStatus, ActivityType, NotificationType } from '@prisma/client';

// GET - Get user's rentals
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '6');
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = { userId };
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Get total count for pagination
    const totalCount = await prisma.rental.count({ where: whereClause });
    const totalPages = Math.ceil(totalCount / limit);

    // Get user's rentals with pagination
    const rentals = await prisma.rental.findMany({
      where: whereClause,
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    // Return data with pagination metadata
    return NextResponse.json({
      data: rentals,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching rentals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rentals' },
      { status: 500 }
    );
  }
}

// POST - Create a new rental request
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const { itemSerial, startDate, endDate, poNumber, doNumber } = await req.json();

    // Validate required fields
    if (!itemSerial || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if item exists and is available
    const item = await prisma.item.findUnique({
      where: { serialNumber: itemSerial }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (item.status !== ItemStatus.AVAILABLE) {
      return NextResponse.json(
        { error: 'Item is not available for rental' },
        { status: 400 }
      );
    }

    // Create rental request
    const rental = await prisma.rental.create({
      data: {
        itemSerial,
        userId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        poNumber,
        doNumber,
        status: RequestStatus.PENDING
      },
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Create rental status log
    await prisma.rentalStatusLog.create({
      data: {
        rentalId: rental.id,
        status: RequestStatus.PENDING,
        userId,
        notes: 'Rental request created'
      }
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        type: ActivityType.RENTAL_CREATED,
        action: `Created rental request for ${item.name}`,
        userId,
        itemSerial,
        rentalId: rental.id
      }
    });

    // Create notification for admins
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      }
    });

    // Create notifications for all admins
    await Promise.all(
      admins.map(admin =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'New Rental Request',
            message: `${user.name} has requested to rent ${item.name}`,
            type: NotificationType.RENTAL_REQUEST,
            relatedId: rental.id
          }
        })
      )
    );

    return NextResponse.json(rental, { status: 201 });
  } catch (error) {
    console.error('Error creating rental request:', error);
    return NextResponse.json(
      { error: 'Failed to create rental request' },
      { status: 500 }
    );
  }
} 