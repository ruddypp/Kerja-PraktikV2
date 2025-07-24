import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { z } from 'zod';
import { ActivityType, RecurrenceType } from '@prisma/client';
import { createInstantNotificationForReminder } from '@/lib/notification-service';

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
    // Verify admin authentication
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Inventory schedules being fetched by admin:', user.id);
    
    // Select all inventory schedules
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
    
    console.log(`Admin found ${schedules.length} inventory schedules`);
    
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
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'SCHEDULED_INVENTORY',
        details: `Scheduled new inventory check for ${new Date(nextDate).toLocaleDateString()}${isRecurring ? ` (Recurring ${recurrenceType})` : ''}`,
        type: ActivityType.ITEM_UPDATED
      }
    });
    
    // Create reminder and notification for the schedule instantly
    try {
      await createInstantNotificationForReminder(schedule.id, 'SCHEDULE');
      console.log(`Instant reminder and notification process triggered for schedule ${schedule.id}`);
    } catch (error) {
      console.error(`Failed to trigger instant notification for schedule ${schedule.id}:`, error);
      // Don't fail the request if this process fails
    }
    
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