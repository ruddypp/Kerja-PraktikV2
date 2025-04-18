import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for inventory schedule
const inventoryCheckSchema = z.object({
  name: z.string().min(1, "Schedule name is required"),
  description: z.string().nullable(),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
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
    
    const schedules = await prisma.inventoryCheck.findMany({
      where: {
        completedDate: null // Only get scheduled checks that haven't been completed
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    });
    
    return NextResponse.json(schedules);
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
    
    const { name, description, frequency, nextDate } = validationResult.data;
    
    // Create schedule
    const schedule = await prisma.inventoryCheck.create({
      data: {
        notes: description,
        scheduledDate: new Date(nextDate),
        userId: user.id
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'SCHEDULED_INVENTORY',
        details: `Scheduled new inventory check for ${new Date(nextDate).toLocaleDateString()}`
      }
    });
    
    return NextResponse.json(schedule, { status: 201 });
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
      where: { id }
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
    
    const { description, nextDate } = validationResult.data;
    
    // Update schedule
    const updatedSchedule = await prisma.inventoryCheck.update({
      where: { id },
      data: {
        notes: description,
        scheduledDate: new Date(nextDate)
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPDATED_SCHEDULE',
        details: `Updated inventory check schedule for ${new Date(nextDate).toLocaleDateString()}`
      }
    });
    
    return NextResponse.json(updatedSchedule);
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
      where: { id }
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
        details: `Deleted inventory check scheduled for ${new Date(existingSchedule.scheduledDate).toLocaleDateString()}`
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