import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { z } from 'zod';
import { ActivityType, ItemStatus } from '@prisma/client';

// Validation schema for performing inventory check
const performCheckSchema = z.object({
  scheduleId: z.string().uuid("Invalid schedule ID format")
});

// POST to perform an inventory check
export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate with Zod schema
    const validationResult = performCheckSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      return NextResponse.json(
        { error: `Validation failed: ${errorMessages}` },
        { status: 400 }
      );
    }
    
    const { scheduleId } = validationResult.data;
    
    // Get the schedule
    const schedule = await prisma.inventoryCheck.findUnique({
      where: { id: scheduleId },
      include: {
        items: {
          include: {
            item: true
          }
        }
      }
    });
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    if (schedule.completedDate) {
      return NextResponse.json(
        { error: 'This inventory check has already been completed' },
        { status: 400 }
      );
    }
    
    const now = new Date();
    
    // Mark schedule as completed
    const updatedSchedule = await prisma.inventoryCheck.update({
      where: { id: scheduleId },
      data: {
        completedDate: now
      }
    });
    
    // Update lastVerifiedAt for all items in the check
    for (const checkItem of schedule.items) {
      await prisma.item.update({
        where: { serialNumber: checkItem.itemSerial },
        data: {
          lastVerifiedAt: now,
          status: checkItem.verifiedStatus
        }
      });
      
      // Add to item history
      await prisma.itemHistory.create({
        data: {
          itemSerial: checkItem.itemSerial,
          action: 'INVENTORY_CHECK',
          details: `Verified during inventory check. Status: ${checkItem.verifiedStatus}`,
          relatedId: scheduleId,
          startDate: now
        }
      });
    }
    
    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Inventory Check Completed',
        message: `Inventory check "${schedule.name}" has been completed successfully`,
        type: 'INVENTORY_SCHEDULE',
        relatedId: schedule.id
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'COMPLETED_INVENTORY',
        details: `Completed inventory check "${schedule.name}"`,
        type: ActivityType.ITEM_UPDATED
      }
    });
    
    // If this was a recurring schedule, create the next one
    if (schedule.isRecurring && schedule.frequency && schedule.nextScheduleDate) {
      // Calculate the next schedule date after the current next date
      const nextDate = new Date(schedule.nextScheduleDate);
      let followingDate = new Date(nextDate);
      
      if (schedule.frequency === 'MONTHLY') {
        followingDate.setMonth(followingDate.getMonth() + 1);
      } else if (schedule.frequency === 'YEARLY') {
        followingDate.setFullYear(followingDate.getFullYear() + 1);
      }
      
      // Create the next recurring schedule
      const nextSchedule = await prisma.inventoryCheck.create({
        data: {
          name: schedule.name,
          notes: schedule.notes,
          scheduledDate: nextDate,
          userId: user.id,
          isRecurring: true,
          frequency: schedule.frequency,
          nextScheduleDate: followingDate
        }
      });
      
      // Create notification for the next schedule
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'New Recurring Inventory Schedule',
          message: `Next ${schedule.frequency.toLowerCase()} inventory check "${schedule.name}" has been scheduled for ${nextDate.toLocaleDateString()}`,
          type: 'INVENTORY_SCHEDULE',
          relatedId: nextSchedule.id
        }
      });
      
      // Log activity for the new schedule
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'SCHEDULED_INVENTORY',
          details: `Auto-scheduled next recurring inventory check for ${nextDate.toLocaleDateString()} (${schedule.frequency} recurring)`,
          type: ActivityType.ITEM_UPDATED
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Inventory check completed successfully',
      schedule: updatedSchedule
    });
  } catch (error) {
    console.error('Error performing inventory check:', error);
    return NextResponse.json(
      { error: 'Failed to perform inventory check' },
      { status: 500 }
    );
  }
} 