import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { RequestStatus, ActivityType, NotificationType } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const rentalId = params.id;
    const { notes } = await req.json();

    // Find the rental
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: {
        item: true,
        user: true
      }
    });

    if (!rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Verify that the rental belongs to the user
    if (rental.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify that the rental is in APPROVED status
    if (rental.status !== RequestStatus.APPROVED) {
      return NextResponse.json(
        { error: 'Only approved rentals can be returned' },
        { status: 400 }
      );
    }

    // Update the rental status to indicate return request
    // We'll create a temporary status to indicate that the return is pending admin verification
    const updatedRental = await prisma.rental.update({
      where: { id: rentalId },
      data: {
        returnDate: new Date(), // Record when the user initiated the return
      },
      include: {
        item: true
      }
    });

    // Create rental status log
    await prisma.rentalStatusLog.create({
      data: {
        rentalId,
        status: RequestStatus.APPROVED, // Status remains APPROVED until admin verifies
        userId,
        notes: `User initiated return: ${notes || 'No notes provided'}`
      }
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        type: ActivityType.RENTAL_UPDATED,
        action: `Initiated return of ${rental.item.name}`,
        userId,
        itemSerial: rental.itemSerial,
        rentalId
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
            title: 'Rental Return Request',
            message: `${user.name} has initiated a return for ${rental.item.name}`,
            type: NotificationType.RENTAL_STATUS_CHANGE,
            relatedId: rentalId
          }
        })
      )
    );

    return NextResponse.json(updatedRental);
  } catch (error) {
    console.error('Error processing rental return:', error);
    return NextResponse.json(
      { error: 'Failed to process rental return' },
      { status: 500 }
    );
  }
} 