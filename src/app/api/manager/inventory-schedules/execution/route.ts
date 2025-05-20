import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// POST - Create a new inventory execution
export async function POST(request: Request) {
  try {
    // Get the schedule ID from the request body
    const body = await request.json();
    const { scheduleId } = body;
    
    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }
    
    // Get the current user from session
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if the schedule exists
    const schedule = await prisma.inventorySchedule.findUnique({
      where: { id: scheduleId }
    });
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    // Get all items for inventory check
    const items = await prisma.item.findMany({
      include: {
        category: true
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    // Create an inventory execution record
    const execution = await prisma.inventoryExecution.create({
      data: {
        name: `Inventory Check: ${schedule.name}`,
        scheduleId,
        performedById: user.id,
        status: 'IN_PROGRESS',
        date: new Date()
      }
    });
    
    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        activity: `Started inventory check for schedule: ${schedule.name}`
      }
    });
    
    // Format the response
    const response = {
      id: execution.id,
      name: execution.name,
      scheduleId: execution.scheduleId,
      scheduleName: schedule.name,
      date: execution.date.toISOString(),
      status: execution.status,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        serialNumber: item.serialNumber,
        categoryName: item.category.name,
        status: item.status,
        lastVerifiedDate: item.lastVerifiedDate ? item.lastVerifiedDate.toISOString() : null,
        verified: false
      }))
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory execution:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory execution' },
      { status: 500 }
    );
  }
} 