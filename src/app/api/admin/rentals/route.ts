import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { RequestStatus, ItemStatus, ActivityType } from '@prisma/client';

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
      whereClause.status = status as RequestStatus;
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

    // Check if rental exists
    const currentRental = await prisma.rental.findUnique({
      where: { id },
      include: { item: true }
    });

    if (!currentRental) {
      return NextResponse.json(
        { error: 'Rental not found' },
        { status: 404 }
      );
    }

    // Start a transaction to ensure all updates are atomic
    const updatedRental = await prisma.$transaction(async (tx) => {
      // Update rental status
      const updated = await tx.rental.update({
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

      return updated;
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

// POST - Create a new rental request by admin
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemSerial, startDate, endDate, poNumber, doNumber, targetUserId } = await req.json();

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

    // Check if the target user exists (if provided)
    const userId = targetUserId || user.id;
    
    if (targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId }
      });
      
      if (!targetUser) {
        return NextResponse.json(
          { error: 'Target user not found' },
          { status: 404 }
        );
      }
    }

    // Start a transaction to ensure all updates are atomic
    const rental = await prisma.$transaction(async (tx) => {
      // Create a new rental (APPROVED by default when admin creates it)
      const newRental = await tx.rental.create({
        data: {
          itemSerial,
          userId: userId, // Use the target user or admin as fallback
          status: RequestStatus.APPROVED, // Auto-approve admin rentals
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          poNumber,
          doNumber
        },
        include: {
          item: true,
          user: true
        }
      });

      // Create a status log
      await tx.rentalStatusLog.create({
        data: {
          rentalId: newRental.id,
          status: RequestStatus.APPROVED,
          userId: user.id, // Admin is the one changing the status
          notes: 'Rental created and approved by admin'
        }
      });

      // Update the item status to RENTED
      await tx.item.update({
        where: { serialNumber: itemSerial },
        data: { status: ItemStatus.RENTED }
      });

      // Create activity log
      await tx.activityLog.create({
        data: {
          type: ActivityType.RENTAL_CREATED,
          action: `Created new rental for ${item.name}${targetUserId ? ` on behalf of user` : ''}`,
          userId: user.id,
          itemSerial,
          rentalId: newRental.id,
          affectedUserId: userId
        }
      });

      return newRental;
    });

    return NextResponse.json(rental);
  } catch (error) {
    console.error('Error creating rental:', error);
    return NextResponse.json(
      { error: 'Failed to create rental' },
      { status: 500 }
    );
  }
} 