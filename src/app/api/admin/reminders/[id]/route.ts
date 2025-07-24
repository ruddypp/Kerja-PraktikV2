import { NextResponse } from 'next/server';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { markReminderAcknowledged } from '@/lib/reminder-service';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure params is fully resolved before using its properties
    const { id } = params;
    
    const reminder = await prisma.reminder.findUnique({
      where: { id },
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
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure params is fully resolved before using its properties
    const { id } = params;
    
    const body = await request.json();
    
    if (body.status === 'ACKNOWLEDGED') {
      const updatedReminder = await markReminderAcknowledged(id);
      return NextResponse.json({ reminder: updatedReminder });
    }
    
    const reminder = await prisma.reminder.update({
      where: { id },
      data: {
        status: body.status,
        emailSent: body.emailSent,
        acknowledgedAt: body.status === 'ACKNOWLEDGED' ? new Date() : undefined,
      },
    });
    
    return NextResponse.json({ success: true, reminder });
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure params is fully resolved before using its properties
    const { id } = params;
    
    await prisma.reminder.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
  }
} 