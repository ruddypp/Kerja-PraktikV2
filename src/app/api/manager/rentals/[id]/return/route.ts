import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isManager } from '@/lib/auth';
import { RequestStatus, ItemStatus, ActivityType, NotificationType } from '@prisma/client';

// POST - Process a rental return request
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user || !isManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const managerId = user.id;
    const rentalId = params.id;
    const { approved, notes } = await req.json();

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

    // Check if the rental has a return date (return request initiated by user)
    if (!rental.returnDate) {
      return NextResponse.json(
        { error: 'No return request found for this rental' },
        { status: 400 }
      );
    }

    // Check if the rental is in APPROVED status
    if (rental.status !== RequestStatus.APPROVED) {
      return NextResponse.json(
        { error: 'Only approved rentals can be processed for return' },
        { status: 400 }
      );
    }

    // Process the return request in a transaction
    const updatedRental = await prisma.$transaction(async (tx) => {
      // If return is approved, complete the rental
      const newStatus = approved ? RequestStatus.COMPLETED : RequestStatus.APPROVED;
      
      // Update the rental
      const updated = await tx.rental.update({
        where: { id: rentalId },
        data: {
          status: newStatus,
          // If return is rejected, clear the return date
          returnDate: approved ? rental.returnDate : null
        },
        include: {
          item: true,
          user: true
        }
      });

      // Create rental status log
      await tx.rentalStatusLog.create({
        data: {
          rentalId,
          status: newStatus,
          userId: managerId,
          notes: notes || (approved 
            ? 'Return request approved and completed' 
            : 'Return request rejected')
        }
      });

      // If approved, update item status to AVAILABLE
      if (approved) {
        await tx.item.update({
          where: { serialNumber: rental.itemSerial },
          data: { status: ItemStatus.AVAILABLE }
        });
      }

      // Create activity log
      const action = approved 
        ? `Approved return request and completed rental for ${rental.item.name}` 
        : `Rejected return request for ${rental.item.name}`;
      
      await tx.activityLog.create({
        data: {
          type: ActivityType.RENTAL_UPDATED,
          action,
          userId: managerId,
          itemSerial: rental.itemSerial,
          rentalId,
          affectedUserId: rental.userId
        }
      });

      // Create notification for the user
      const message = approved 
        ? `Your return request for ${rental.item.name} has been approved` 
        : `Your return request for ${rental.item.name} has been rejected`;
      
      await tx.notification.create({
        data: {
          userId: rental.userId,
          title: 'Return Request Processed',
          message,
          type: NotificationType.RENTAL_STATUS_CHANGE,
          relatedId: rentalId
        }
      });

      return updated;
    });

    return NextResponse.json(updatedRental);
  } catch (error) {
    console.error('Error processing rental return:', error);
    return NextResponse.json(
      { error: 'Failed to process rental return' },
      { status: 500 }
    );
  }
} 