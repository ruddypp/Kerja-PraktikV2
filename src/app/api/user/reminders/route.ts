import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', reminders: [] }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    
    const where: any = {
      userId: user.id,
    };
    
    if (type) {
      where.type = type;
    }
    
    if (status) {
      where.status = status;
    }
    
    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { reminderDate: 'asc' },
      ],
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
            serialNumber: true,
            name: true,
          },
        },
        calibration: {
          include: {
            item: true,
            customer: true,
          },
        },
        rental: {
          include: {
            item: true,
            customer: true,
          },
        },
        maintenance: {
          include: {
            item: true,
          },
        },
        inventoryCheck: true,
      },
    });
    
    return NextResponse.json({ reminders: reminders || [] });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json({ error: 'Failed to fetch reminders', reminders: [] }, { status: 500 });
  }
} 