import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { ActivityType } from '@prisma/client';

// Type definition for params as Promise
type ParamsType = { id: string };

// GET a specific inventory schedule
export async function GET(
  request: Request,
  { params }: { params: ParamsType }
) {
  try {
    // Verify admin authentication
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get ID properly from params
    // Using destructuring to avoid direct property access
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }
    
    const schedule = await prisma.inventoryCheck.findUnique({
      where: { id }
    });
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// PATCH update an inventory schedule
export async function PATCH(
  request: Request,
  { params }: { params: ParamsType }
) {
  try {
    // Verify admin authentication
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get ID properly from params
    // Using destructuring to avoid direct property access
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { name, description, nextDate } = body;
    
    // Check if schedule exists
    const existingSchedule = await prisma.inventoryCheck.findUnique({
      where: { id }
    });
    
    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    // Update schedule
    const updatedSchedule = await prisma.inventoryCheck.update({
      where: { id },
      data: {
        name,
        notes: description,
        scheduledDate: new Date(nextDate)
      }
    });
    
    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPDATED_INVENTORY_CHECK',
        details: `Updated inventory check scheduled for ${new Date(nextDate).toLocaleDateString()}`,
        type: ActivityType.ITEM_UPDATED
      }
    });
    
    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

// DELETE an inventory schedule
export async function DELETE(
  request: Request,
  { params }: { params: ParamsType }
) {
  try {
    // Verify admin authentication
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get ID properly from params
    // Using destructuring to avoid direct property access
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }
    
    // Check if schedule exists
    const schedule = await prisma.inventoryCheck.findUnique({
      where: { id }
    });
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    // Delete related inventory check items first (if any)
    await prisma.inventoryCheckItem.deleteMany({
      where: { checkId: id }
    });
    
    // Now delete the inventory check
    await prisma.inventoryCheck.delete({
      where: { id }
    });
    
    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'DELETED_INVENTORY_CHECK',
        details: `Deleted inventory check scheduled for ${new Date(schedule.scheduledDate).toLocaleDateString()}`,
        type: ActivityType.ITEM_DELETED
      }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}