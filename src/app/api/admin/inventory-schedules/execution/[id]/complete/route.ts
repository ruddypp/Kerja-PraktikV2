import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

interface Params {
  id: string;
}

// POST - Complete an inventory execution
export async function POST(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = parseInt(params?.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid execution ID' },
        { status: 400 }
      );
    }
    
    // Get items from request body
    const body = await request.json();
    const { items } = body;
    
    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items array is required' },
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
    
    // Get the execution record
    const execution = await prisma.inventoryExecution.findUnique({
      where: { id },
      include: {
        schedule: true
      }
    });
    
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }
    
    // Check if execution is already completed
    if (execution.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'This inventory execution is already completed' },
        { status: 400 }
      );
    }
    
    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mark execution as completed
      await tx.inventoryExecution.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });
      
      // Create verification records for verified items
      const verifiedItems = items.filter((item: { verified: boolean }) => item.verified);
      
      // If no verified items, return error
      if (verifiedItems.length === 0) {
        throw new Error('No items were verified');
      }
      
      // Create verification records
      for (const item of verifiedItems) {
        await tx.inventoryVerification.create({
          data: {
            executionId: id,
            itemId: item.id,
            verifiedById: user.id,
            verifiedAt: new Date()
          }
        });
        
        // Update the item's lastVerifiedDate
        await tx.item.update({
          where: { id: item.id },
          data: {
            lastVerifiedDate: new Date()
          }
        });
        
        // Add to item history
        await tx.itemHistory.create({
          data: {
            itemId: item.id,
            activityType: 'INVENTORY_CHECK',
            description: `Item verified during inventory check: ${execution.name}`,
            performedById: user.id,
            date: new Date()
          }
        });
      }
      
      // Update the schedule's next date
      const nextDate = new Date();
      if (execution.schedule.frequency === 'MONTHLY') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (execution.schedule.frequency === 'QUARTERLY') {
        nextDate.setMonth(nextDate.getMonth() + 3);
      } else if (execution.schedule.frequency === 'YEARLY') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      
      await tx.inventorySchedule.update({
        where: { id: execution.scheduleId },
        data: {
          nextDate
        }
      });
      
      // Add activity log
      await tx.activityLog.create({
        data: {
          userId: user.id,
          activity: `Completed inventory check: ${execution.name} with ${verifiedItems.length} verified items`
        }
      });
      
      // Create notification for admin
      await tx.notification.create({
        data: {
          userId: 1, // Assuming admin has ID 1
          type: 'INVENTORY_SCHEDULE',
          message: `Inventory check ${execution.name} completed with ${verifiedItems.length} verified items`,
          isRead: false,
          createdAt: new Date()
        }
      });
      
      return {
        message: 'Inventory check completed successfully',
        verifiedItemsCount: verifiedItems.length
      };
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error completing inventory execution:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete inventory execution' },
      { status: 500 }
    );
  }
} 