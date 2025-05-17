import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { z } from 'zod';
import { ActivityType } from '@prisma/client';

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
    
    // Select hanya kolom yang diperlukan untuk list view
    const schedules = await prisma.inventoryCheck.findMany({
      where: {
        completedDate: null // Only get scheduled checks that haven't been completed
      },
      select: {
        id: true,
        name: true,
        notes: true,
        scheduledDate: true,
        completedDate: true,
        // Tidak perlu user detail di list view
        userId: true,
        createdAt: true,
      },
      orderBy: {
        scheduledDate: 'asc'
      },
      // Batasi hasil query untuk performa
      take: 100
    });
    
    // Buat response dengan header cache
    const response = NextResponse.json(schedules);
    
    // Set header Cache-Control untuk memungkinkan browser caching
    // max-age=60 berarti cache akan valid selama 60 detik
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
    
    const { name, description, frequency, nextDate } = validationResult.data;
    
    // Create schedule
    const schedule = await prisma.inventoryCheck.create({
      data: {
        name: name,
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
        details: `Scheduled new inventory check for ${new Date(nextDate).toLocaleDateString()}`,
        type: ActivityType.ITEM_UPDATED
      }
    });
    
    // Buat response dengan header no-cache
    const response = NextResponse.json(schedule, { status: 201 });
    
    // Set header Cache-Control untuk memastikan data tidak di-cache
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
    
    // Verify schedule exists - gunakan select untuk mengoptimasi query
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
    
    const { name, description, nextDate } = validationResult.data;
    
    // Update schedule
    const updatedSchedule = await prisma.inventoryCheck.update({
      where: { id },
      data: {
        name: name,
        notes: description,
        scheduledDate: new Date(nextDate)
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPDATED_SCHEDULE',
        details: `Updated inventory check schedule for ${new Date(nextDate).toLocaleDateString()}`,
        type: ActivityType.ITEM_UPDATED
      }
    });
    
    // Buat response dengan header no-cache
    const response = NextResponse.json(updatedSchedule);
    
    // Set header Cache-Control untuk memastikan data tidak di-cache
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
    
    // Verify schedule exists - gunakan select untuk mengoptimasi query
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
        details: `Deleted inventory check schedule with ID ${id}`,
        type: ActivityType.ITEM_DELETED
      }
    });
    
    // Buat response dengan header no-cache
    const response = NextResponse.json({ success: true });
    
    // Set header Cache-Control untuk memastikan data tidak di-cache
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    
    return response;
  } catch (error) {
    console.error('Error deleting inventory schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory schedule' },
      { status: 500 }
    );
  }
} 