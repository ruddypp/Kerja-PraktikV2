import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { z } from 'zod';
import { ActivityType } from '@prisma/client';

// Updated validation schema for inventory schedule with recurring fields
const inventoryCheckSchema = z.object({
  name: z.string().min(1, "Schedule name is required"),
  description: z.string().nullable(),
  isRecurring: z.boolean().default(false),
  frequency: z.enum(['MONTHLY', 'YEARLY']).nullable(),
  nextDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Next date must be a valid date"
  })
});

// GET all inventory schedules
export async function GET(request: Request) {
  try {
    // Verify admin authentication
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Admin fetching inventory schedules');
    
    // Select fields including recurring schedule information - without filtering by completedDate
    // to ensure all schedules are visible
    const schedules = await prisma.inventoryCheck.findMany({
      select: {
        id: true,
        name: true,
        notes: true,
        scheduledDate: true,
        completedDate: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        isRecurring: true,
        frequency: true,
        nextScheduleDate: true,
        lastNotificationSent: true
      },
      orderBy: {
        scheduledDate: 'asc'
      },
      // Limit results for performance
      take: 100
    });
    
    // Create response with cache headers
    const response = NextResponse.json(schedules);
    response.headers.set('Cache-Control', 'public, max-age=60');
    
    return response;
  } catch (error) {
    console.error('Error fetching inventory schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory schedules' },
      { status: 500 }
    );
  }
}

// POST create a new inventory schedule
export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate with Zod schema
    const validationResult = inventoryCheckSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      return NextResponse.json(
        { error: `Validation failed: ${errorMessages}` },
        { status: 400 }
      );
    }
    
    const { name, description, isRecurring, frequency, nextDate } = validationResult.data;
    
    // Calculate next schedule date if recurring
    let nextScheduleDate = null;
    if (isRecurring && frequency) {
      const scheduledDate = new Date(nextDate);
      nextScheduleDate = new Date(scheduledDate);
      
      if (frequency === 'MONTHLY') {
        nextScheduleDate.setMonth(nextScheduleDate.getMonth() + 1);
      } else if (frequency === 'YEARLY') {
        nextScheduleDate.setFullYear(nextScheduleDate.getFullYear() + 1);
      }
    }
    
    // Create schedule with recurring information
    const schedule = await prisma.inventoryCheck.create({
      data: {
        name: name,
        notes: description,
        scheduledDate: new Date(nextDate),
        userId: user.id,
        isRecurring: isRecurring,
        frequency: frequency,
        nextScheduleDate: nextScheduleDate
      }
    });
    
    // Create notification for the schedule
    if (isRecurring) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'New Recurring Inventory Schedule',
          message: `A new recurring ${frequency?.toLowerCase()} inventory check has been scheduled for ${new Date(nextDate).toLocaleDateString()}`,
          type: 'INVENTORY_SCHEDULE',
          relatedId: schedule.id
        }
      });
    } else {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'New Inventory Schedule',
          message: `A new inventory check has been scheduled for ${new Date(nextDate).toLocaleDateString()}`,
          type: 'INVENTORY_SCHEDULE',
          relatedId: schedule.id
        }
      });
    }
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'SCHEDULED_INVENTORY',
        details: `Scheduled new inventory check for ${new Date(nextDate).toLocaleDateString()}${isRecurring ? ` (${frequency} recurring)` : ''}`,
        type: ActivityType.ITEM_UPDATED
      }
    });
    
    // Create response with no-cache header
    const response = NextResponse.json(schedule, { status: 201 });
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    
    return response;
  } catch (error) {
    console.error('Error creating inventory schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory schedule' },
      { status: 500 }
    );
  }
}

// PATCH update an existing inventory schedule
export async function PATCH(request: Request) {
  try {
    // Verify admin authentication
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }
    
    // Verify schedule exists
    const existingSchedule = await prisma.inventoryCheck.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    
    // Validate with Zod schema
    const validationResult = inventoryCheckSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      return NextResponse.json(
        { error: `Validation failed: ${errorMessages}` },
        { status: 400 }
      );
    }
    
    const { name, description, isRecurring, frequency, nextDate } = validationResult.data;
    
    // Calculate next schedule date if recurring
    let nextScheduleDate = null;
    if (isRecurring && frequency) {
      const scheduledDate = new Date(nextDate);
      nextScheduleDate = new Date(scheduledDate);
      
      if (frequency === 'MONTHLY') {
        nextScheduleDate.setMonth(nextScheduleDate.getMonth() + 1);
      } else if (frequency === 'YEARLY') {
        nextScheduleDate.setFullYear(nextScheduleDate.getFullYear() + 1);
      }
    }
    
    // Update schedule with recurring information
    const updatedSchedule = await prisma.inventoryCheck.update({
      where: { id },
      data: {
        name: name,
        notes: description,
        scheduledDate: new Date(nextDate),
        isRecurring: isRecurring,
        frequency: frequency,
        nextScheduleDate: nextScheduleDate
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPDATED_SCHEDULE',
        details: `Updated inventory check schedule for ${new Date(nextDate).toLocaleDateString()}${isRecurring ? ` (${frequency} recurring)` : ''}`,
        type: ActivityType.ITEM_UPDATED
      }
    });
    
    // Create response with no-cache header
    const response = NextResponse.json(updatedSchedule);
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    
    return response;
  } catch (error) {
    console.error('Error updating inventory schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory schedule' },
      { status: 500 }
    );
  }
}

// DELETE an inventory schedule
export async function DELETE(request: Request) {
  try {
    // Verify admin authentication
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }
    
    // Verify schedule exists
    const existingSchedule = await prisma.inventoryCheck.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    // Delete schedule
    await prisma.inventoryCheck.delete({
      where: { id }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'DELETED_SCHEDULE',
        details: `Deleted inventory check schedule`,
        type: ActivityType.ITEM_UPDATED
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory schedule' },
      { status: 500 }
    );
  }
} 