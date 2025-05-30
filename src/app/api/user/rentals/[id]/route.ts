import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { RequestStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    // Properly await params before accessing its properties
    const { id: rentalId } = await params;

    // Find the rental with all details including status logs
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
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

    // Return the rental with all details
    return NextResponse.json(rental);
  } catch (error) {
    console.error('Error fetching rental details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rental details' },
      { status: 500 }
    );
  }
}