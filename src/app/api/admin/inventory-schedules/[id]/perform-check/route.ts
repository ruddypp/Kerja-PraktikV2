import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    // Validate ID
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID' },
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
    
    // Find schedule
    const schedule = await prisma.inventorySchedule.findUnique({
      where: { id }
    });
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    // Fetch current user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Begin transaction to update items and history
    const currentDate = new Date();
    
    await prisma.$transaction(async (tx) => {
      // Get all items
      const items = await tx.item.findMany();
      
      // Update lastVerifiedDate for all items
      for (const item of items) {
        await tx.item.update({
          where: { id: item.id },
          data: { lastVerifiedDate: currentDate }
        });
        
        // Create history record for each item
        await tx.itemHistory.create({
          data: {
            itemId: item.id,
            activityType: 'inventory_check',
            description: `Inventory check performed as part of ${schedule.name}`,
            performedBy: user.id,
            date: currentDate
          }
        });
      }
      
      // Calculate next date based on frequency
      const nextDate = new Date(currentDate);
      
      // Adjust the date based on frequency
      if (schedule.frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (schedule.frequency === 'quarterly') {
        nextDate.setMonth(nextDate.getMonth() + 3);
      } else if (schedule.frequency === 'yearly') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      
      // Update the schedule with the new next date
      await tx.inventorySchedule.update({
        where: { id },
        data: { nextDate }
      });
      
      // Create activity log
      await tx.activityLog.create({
        data: {
          userId: user.id,
          activity: `Performed inventory check: ${schedule.name}`
        }
      });
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Inventory check completed successfully'
    });
  } catch (error) {
    console.error('Error performing inventory check:', error);
    return NextResponse.json(
      { error: 'Failed to perform inventory check' },
      { status: 500 }
    );
  }
} 