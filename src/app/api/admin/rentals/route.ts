import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Use consistent import
import { RentalStatus } from '@prisma/client'; // Import from Prisma instead of redefining

// Interface for the rental response
interface RentalResponse {
  id: string;
  userId: string;
  itemId: string;
  startDate: Date;
  endDate: Date;
  requestDate: Date;
  status: RentalStatus;
  reason: string | null;
  actualReturnDate: Date | null;
  approvedById: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  item: {
    id: string;
    name: string;
    serialNumber: string | null;
  };
  approvedBy?: {
    id: string;
    name: string;
  } | null;
}

// GET rental requests with optional status filter
export async function GET(req: NextRequest) {
  try {
    // Get the status filter from URL params if provided
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    // Build the query with filters if provided
    const whereClause: any = {};
    
    if (status && status !== 'ALL') {
      whereClause.status = status as RentalStatus;
    }
    
    if (userId) {
      whereClause.userId = parseInt(userId);
    }

    // Fetch rental requests with related user and item data
    const rentalRequests = await prisma.rentalRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        requestDate: 'desc',
      },
    });
    
    // Format the response to ensure consistent types
    const formattedRentals: RentalResponse[] = rentalRequests.map(rental => ({
      id: rental.id.toString(),
      userId: rental.userId.toString(),
      itemId: rental.itemId.toString(),
      startDate: rental.startDate,
      endDate: rental.endDate,
      requestDate: rental.requestDate,
      status: rental.status,
      reason: rental.reason,
      actualReturnDate: rental.actualReturnDate,
      approvedById: rental.approvedById?.toString() || null,
      user: {
        id: rental.user.id.toString(),
        name: rental.user.name,
        email: rental.user.email
      },
      item: {
        id: rental.item.id.toString(),
        name: rental.item.name,
        serialNumber: rental.item.serialNumber
      },
      approvedBy: rental.approvedBy ? {
        id: rental.approvedBy.id.toString(),
        name: rental.approvedBy.name
      } : null
    }));

    return NextResponse.json(formattedRentals);
  } catch (error) {
    console.error('Error fetching rental requests:', error);
    // Return empty array to prevent UI crash
    return NextResponse.json([], { status: 500 });
  }
}

// POST endpoint to create a new rental request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required fields
    const { userId, itemId, startDate, endDate, reason } = body;
    
    if (!userId || !itemId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if item is available
    const item = await prisma.item.findUnique({
      where: { id: parseInt(itemId) }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Create new rental request
    const rentalRequest = await prisma.rentalRequest.create({
      data: {
        userId: parseInt(userId),
        itemId: parseInt(itemId),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status: RentalStatus.PENDING
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
          },
        },
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: parseInt(userId),
        activity: `Created rental request for item: ${item.name}`
      }
    });
    
    // Format the response
    const formattedRental = {
      id: rentalRequest.id.toString(),
      userId: rentalRequest.userId.toString(),
      itemId: rentalRequest.itemId.toString(),
      startDate: rentalRequest.startDate,
      endDate: rentalRequest.endDate,
      requestDate: rentalRequest.requestDate,
      status: rentalRequest.status,
      reason: rentalRequest.reason,
      actualReturnDate: rentalRequest.actualReturnDate,
      user: {
        id: rentalRequest.user.id.toString(),
        name: rentalRequest.user.name,
        email: rentalRequest.user.email
      },
      item: {
        id: rentalRequest.item.id.toString(),
        name: rentalRequest.item.name,
        serialNumber: rentalRequest.item.serialNumber
      }
    };

    return NextResponse.json(formattedRental, { status: 201 });
  } catch (error) {
    console.error('Error creating rental request:', error);
    return NextResponse.json(
      { error: 'Failed to create rental request' },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update a rental request status
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, userId } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update the rental request status
    const updatedRental = await prisma.rentalRequest.update({
      where: { id: parseInt(id) },
      data: {
        status: status as RentalStatus,
        ...(status === RentalStatus.APPROVED && userId
          ? { approvedById: parseInt(userId) }
          : {}),
        ...(status === RentalStatus.RETURNED
          ? { actualReturnDate: new Date() }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // Update the item status based on the rental status
    if (status === RentalStatus.APPROVED) {
      await prisma.item.update({
        where: { id: updatedRental.itemId },
        data: { status: 'IN_RENTAL' }
      });
      
      // Create activity log for approval
      await prisma.activityLog.create({
        data: {
          userId: parseInt(userId),
          activity: `Approved rental request for item: ${updatedRental.item.name}`
        }
      });
    } else if (status === RentalStatus.RETURNED) {
      await prisma.item.update({
        where: { id: updatedRental.itemId },
        data: { status: 'AVAILABLE' }
      });
      
      // Create activity log for return
      await prisma.activityLog.create({
        data: {
          userId: parseInt(userId) || updatedRental.userId,
          activity: `Marked rental as returned for item: ${updatedRental.item.name}`
        }
      });
    }
    
    // Format the response
    const formattedRental = {
      id: updatedRental.id.toString(),
      userId: updatedRental.userId.toString(),
      itemId: updatedRental.itemId.toString(),
      startDate: updatedRental.startDate,
      endDate: updatedRental.endDate,
      requestDate: updatedRental.requestDate,
      status: updatedRental.status,
      reason: updatedRental.reason,
      actualReturnDate: updatedRental.actualReturnDate,
      approvedById: updatedRental.approvedById?.toString() || null,
      user: {
        id: updatedRental.user.id.toString(),
        name: updatedRental.user.name,
        email: updatedRental.user.email
      },
      item: {
        id: updatedRental.item.id.toString(),
        name: updatedRental.item.name,
        serialNumber: updatedRental.item.serialNumber
      },
      approvedBy: updatedRental.approvedBy ? {
        id: updatedRental.approvedBy.id.toString(),
        name: updatedRental.approvedBy.name
      } : null
    };

    return NextResponse.json(formattedRental);
  } catch (error) {
    console.error('Error updating rental request:', error);
    return NextResponse.json(
      { error: 'Failed to update rental request' },
      { status: 500 }
    );
  }
} 