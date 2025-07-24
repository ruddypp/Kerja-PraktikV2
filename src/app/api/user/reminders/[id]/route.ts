import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { markReminderAcknowledged } from '@/lib/reminder-service';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure params is fully resolved before using its properties
    const { id } = params;
    
    const reminder = await prisma.reminder.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        item: true,
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
        inventoryCheck: true,
      },
    });
    
    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }
    
    return NextResponse.json({ reminder });
  } catch (error) {
    console.error('Error fetching reminder:', error);
    return NextResponse.json({ error: 'Failed to fetch reminder' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure params is fully resolved before using its properties
    const { id } = params;
    
    const reminder = await prisma.reminder.findUnique({
      where: {
        id,
        userId: user.id,
      },
    });
    
    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }
    
    const body = await request.json();
    
    if (body.status === 'ACKNOWLEDGED') {
      const updatedReminder = await markReminderAcknowledged(id);
      return NextResponse.json({ reminder: updatedReminder });
    }
    
    const updatedReminder = await prisma.reminder.update({
      where: { id },
      data: body,
    });
    
    return NextResponse.json({ reminder: updatedReminder });
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  }
} 