import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { RequestStatus, ItemStatus, ActivityType, NotificationType } from '@prisma/client';

// GET - Get all rentals with optional filters
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build the where clause
    const whereClause: any = {};
    
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    
    if (userId) {
      whereClause.userId = userId;
    }

    // Date range filter
    if (startDate && endDate) {
      whereClause.startDate = {
        gte: new Date(startDate)
      };
      whereClause.endDate = {
        lte: new Date(endDate)
      };
    } else if (startDate) {
      whereClause.startDate = {
        gte: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.endDate = {
        lte: new Date(endDate)
      };
    }
    
    // Get total count for pagination
    const totalCount = await prisma.rental.count({ where: whereClause });
    const totalPages = Math.ceil(totalCount / limit);

    // Get rentals with related data
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
        },
        statusLogs: {
          include: {
            changedBy: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
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

// PATCH - Update rental status
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = user.id;
    const { id, status, notes } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the current rental state
    const currentRental = await prisma.rental.findUnique({
      where: { id },
      include: {
        item: true,
        user: true
      }
    });

    if (!currentRental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Perform different actions based on the requested status change
    let updatedRental;
    
    // Start a transaction to ensure all updates are atomic
    await prisma.$transaction(async (tx) => {
      // Update the rental status
      updatedRental = await tx.rental.update({
        where: { id },
        data: {
          status: status as RequestStatus,
          // If completing a rental, set the returnDate if not already set
          ...(status === RequestStatus.COMPLETED && !currentRental.returnDate
            ? { returnDate: new Date() }
            : {})
        },
        include: {
          item: true,
          user: true
        }
      });

      // Create a status log
      await tx.rentalStatusLog.create({
        data: {
          rentalId: id,
          status: status as RequestStatus,
          userId: adminId,
          notes: notes || `Status changed to ${status}`
        }
      });

      // Update item status based on rental status
      let newItemStatus: ItemStatus | undefined;
      
      if (status === RequestStatus.APPROVED) {
        newItemStatus = ItemStatus.RENTED;
      } else if (status === RequestStatus.COMPLETED) {
        newItemStatus = ItemStatus.AVAILABLE;
      } else if (status === RequestStatus.REJECTED) {
        // If rejected, ensure item remains AVAILABLE
        newItemStatus = ItemStatus.AVAILABLE;
      }

      // Update the item status if needed
      if (newItemStatus) {
        await tx.item.update({
          where: { serialNumber: currentRental.itemSerial },
          data: { status: newItemStatus }
        });
      }

      // Create activity log
      await tx.activityLog.create({
        data: {
          type: ActivityType.RENTAL_UPDATED,
          action: `Updated rental status to ${status}`,
          userId: adminId,
          itemSerial: currentRental.itemSerial,
          rentalId: id,
          affectedUserId: currentRental.userId
        }
      });

      // Create notification for the user
      await tx.notification.create({
        data: {
          userId: currentRental.userId,
          title: 'Rental Status Updated',
          message: `Your rental for ${currentRental.item.name} has been ${status.toLowerCase()}`,
          type: NotificationType.RENTAL_STATUS_CHANGE,
          relatedId: id
        }
      });
    });

    return NextResponse.json(updatedRental);
  } catch (error) {
    console.error('Error updating rental status:', error);
    return NextResponse.json(
      { error: 'Failed to update rental status' },
      { status: 500 }
    );
  }
} 