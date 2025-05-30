import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { RequestStatus, ItemStatus, ActivityType } from '@prisma/client';

// POST - Process a rental return request
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = user.id;
    // Properly await params in Next.js 15
    const { id: rentalId } = await params;
    const { notes, verificationNotes } = await req.json();

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

    // Verify rental status - should be PENDING with returnDate set (return requested)
    if (rental.status !== RequestStatus.PENDING || !rental.returnDate) {
      return NextResponse.json(
        { error: `Cannot verify return for rental with status ${rental.status}` },
        { status: 400 }
      );
    }

    // Update rental status
    const updatedRental = await prisma.rental.update({
      where: { id: rentalId },
      data: {
        status: RequestStatus.COMPLETED
      },
      include: {
        item: true,
        user: true
      }
    });

    // Update item status
    await prisma.item.update({
      where: { serialNumber: rental.itemSerial },
      data: { status: ItemStatus.AVAILABLE }
    });

    // Create rental status log with verification notes
    await prisma.rentalStatusLog.create({
      data: {
        rentalId,
        status: RequestStatus.COMPLETED,
        userId: adminId,
        notes: verificationNotes || notes || 'Return verified by admin'
      }
    });

    // Update item history
    await prisma.itemHistory.updateMany({
      where: {
        itemSerial: rental.itemSerial,
        action: 'RENTED',
        relatedId: rentalId,
        endDate: null
      },
      data: {
        endDate: new Date()
      }
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        type: ActivityType.RENTAL_UPDATED,
        action: `Return verified by ${user.name}`,
        userId: adminId,
        itemSerial: rental.itemSerial,
        rentalId
      }
    });

    return NextResponse.json(updatedRental);
  } catch (error) {
    console.error('Error processing rental return verification:', error);
    return NextResponse.json(
      { error: 'Failed to process return verification' },
      { status: 500 }
    );
  }
} 