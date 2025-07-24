import { NextResponse } from 'next/server';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  createCalibrationReminder, 
  createRentalReminder, 
  createScheduleReminder,
  createMaintenanceReminder
} from '@/lib/reminder-service';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized', reminders: [] }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    
    const where: any = {};
    
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

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { type, id } = body;
    
    let reminder;
    
    switch (type) {
      case 'CALIBRATION':
        reminder = await createCalibrationReminder(id);
        break;
      case 'RENTAL':
        reminder = await createRentalReminder(id);
        break;
      case 'SCHEDULE':
        reminder = await createScheduleReminder(id);
        break;
      case 'MAINTENANCE':
        reminder = await createMaintenanceReminder(id);
        break;
      default:
        return NextResponse.json({ error: 'Invalid reminder type' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, reminder });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
} 