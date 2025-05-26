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

    // Verify rental status
    if (rental.status !== RequestStatus.APPROVED) {
      return NextResponse.json(
        { error: `Cannot return rental with status ${rental.status}` },
        { status: 400 }
      );
    }

    // Update rental status
    const updatedRental = await prisma.rental.update({
      where: { id: rentalId },
      data: {
        status: RequestStatus.COMPLETED,
        returnDate: new Date()
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

    // Create rental status log
    await prisma.rentalStatusLog.create({
      data: {
        rentalId,
        status: RequestStatus.COMPLETED,
        userId: adminId,
        notes: notes || 'Item returned'
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
        action: 'Item returned',
        userId: adminId,
        itemSerial: rental.itemSerial,
        rentalId
      }
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