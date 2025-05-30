import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isManager, isAdmin } from '@/lib/auth';
import { z } from 'zod';
import { ActivityType, RecurrenceType } from '@prisma/client';

// Updated validation schema for inventory schedule
const inventoryCheckSchema = z.object({
  name: z.string().min(1, "Schedule name is required"),
  description: z.string().nullable(),
  nextDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Next date must be a valid date"
  }),
  isRecurring: z.boolean().optional().default(false),
  recurrenceType: z.enum(['MONTHLY', 'YEARLY']).optional()
});

// GET all inventory schedules
export async function GET(request: Request) {
  try {
    // Verify manager/admin authentication
    const user = await getUserFromRequest(request);
    if (!user || (!isManager(user) && !isAdmin(user))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Inventory schedules being fetched by:', user.role, user.id);
    
    // Select all inventory schedules - managers need to see all schedules including those created by admins
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
        createdBy: {
          select: {
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      },
      // Limit results for performance
      take: 100
    });
    
    console.log(`Found ${schedules.length} inventory schedules`);
    if (schedules.length > 0) {
      console.log('Schedule user IDs:', schedules.map(s => s.userId));
      console.log('Current user ID:', user.id);
    }
    
    // Create response with cache headers
    const response = NextResponse.json(schedules);
    response.headers.set('Cache-Control', 'no-store'); // Disable caching to ensure fresh data
    
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
    // Verify manager/admin authentication
    const user = await getUserFromRequest(request);
    if (!user || (!isManager(user) && !isAdmin(user))) {
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
    
    const { name, description, nextDate, isRecurring, recurrenceType } = validationResult.data;
    
    // Validate that recurrenceType is provided if isRecurring is true
    if (isRecurring && !recurrenceType) {
      return NextResponse.json(
        { error: 'Recurrence type is required for recurring schedules' },
        { status: 400 }
      );
    }
    
    // Create schedule
    const schedule = await prisma.inventoryCheck.create({
      data: {
        name: name,
        notes: description,
        scheduledDate: new Date(nextDate),
        userId: user.id,
        isRecurring: isRecurring || false,
        recurrenceType: isRecurring ? recurrenceType : null,
        nextDate: isRecurring ? new Date(nextDate) : null
      }
    });
    
    // Create notification for the schedule
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'New Inventory Schedule',
        message: `A new inventory check has been scheduled for ${new Date(nextDate).toLocaleDateString()}${isRecurring ? ` (Recurring ${recurrenceType})` : ''}`,
        type: 'INVENTORY_SCHEDULE',
        relatedId: schedule.id
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'SCHEDULED_INVENTORY',
        details: `Scheduled new inventory check for ${new Date(nextDate).toLocaleDateString()}${isRecurring ? ` (Recurring ${recurrenceType})` : ''}`,
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
    // Verify manager authentication
    const user = await getUserFromRequest(request);
    if (!user || !isManager(user)) {
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
    
    const { name, description, nextDate, isRecurring, recurrenceType } = validationResult.data;
    
    // Validate that recurrenceType is provided if isRecurring is true
    if (isRecurring && !recurrenceType) {
      return NextResponse.json(
        { error: 'Recurrence type is required for recurring schedules' },
        { status: 400 }
      );
    }
    
    // Update schedule
    const updatedSchedule = await prisma.inventoryCheck.update({
      where: { id },
      data: {
        name: name,
        notes: description,
        scheduledDate: new Date(nextDate),
        isRecurring: isRecurring || false,
        recurrenceType: isRecurring ? recurrenceType : null,
        nextDate: isRecurring ? new Date(nextDate) : null
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPDATED_SCHEDULE',
        details: `Updated inventory check schedule for ${new Date(nextDate).toLocaleDateString()}${isRecurring ? ` (Recurring ${recurrenceType})` : ''}`,
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
    // Verify manager authentication
    const user = await getUserFromRequest(request);
    if (!user || !isManager(user)) {
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