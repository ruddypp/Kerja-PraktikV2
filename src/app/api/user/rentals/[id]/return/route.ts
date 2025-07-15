import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { RequestStatus, ItemStatus, ActivityType } from '@prisma/client';
import { logRentalActivity } from '@/lib/activity-logger';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get parameters
    const userId = user.id;
    // Properly await params before accessing its properties
    const { id: rentalId } = await params;
    const { notes, returnCondition } = await req.json();

    // Find the rental
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: {
        item: true,
        user: true
      }
    });

    // Validate rental exists
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

    // Update the rental status - change to PENDING for admin approval
    const updatedRental = await prisma.rental.update({
      where: { id: rentalId },
      data: {
        status: RequestStatus.PENDING, 
        returnDate: new Date(),
        returnCondition: returnCondition || null
      },
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Don't update the item status yet - it remains RENTED until admin approves
    
    // Create rental status log
    await prisma.rentalStatusLog.create({
      data: {
        rentalId: rentalId,
        status: RequestStatus.PENDING,
        notes: notes || 'Return requested by user',
        userId: user.id
      }
    });
    
    // Log activity
    await logRentalActivity(
      user.id,
      ActivityType.RENTAL_UPDATED,
      rentalId,
      updatedRental.itemSerial,
      `User ${user.name} requested return for item ${updatedRental.item.name}`
    );
    
    // Return the updated rental
    return NextResponse.json(updatedRental);
  } catch (error) {
    console.error('Error returning rental:', error);
    return NextResponse.json(
      { error: 'Failed to return rental' },
      { status: 500 }
    );
  }
} 