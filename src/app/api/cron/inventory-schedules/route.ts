import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RecurrenceType } from '@prisma/client';

/**
 * This API route is designed to be called by a cron job to process recurring inventory schedules.
 * It will:
 * 1. Find all recurring schedules that need to be processed
 * 2. Update the nextDate for recurring schedules
 */
export async function GET(request: Request) {
  try {
    // For security, validate API key if it's set in environment variables
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('key');
    
    if (process.env.CRON_API_KEY && apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const today = new Date();
    
    // Find all recurring schedules that are due today or in the past
    const dueSchedules = await prisma.inventoryCheck.findMany({
      where: {
        isRecurring: true,
        nextDate: {
          lte: today
        }
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    console.log(`Found ${dueSchedules.length} recurring schedules to process`);
    
    const results = [];
    
    // Process each due schedule
    for (const schedule of dueSchedules) {
      // Calculate the next date based on recurrence type
      const nextDate = calculateNextDate(schedule.nextDate || today, schedule.recurrenceType as RecurrenceType);
      
      // Notification system has been removed
      
      // Update the schedule with the new nextDate
      await prisma.inventoryCheck.update({
        where: { id: schedule.id },
        data: {
          nextDate
        }
      });
      
      results.push({
        id: schedule.id,
        name: schedule.name,
        owner: schedule.createdBy.name,
        previousDate: schedule.nextDate,
        newNextDate: nextDate
      });
    }
    
    return NextResponse.json({
      processedAt: today.toISOString(),
      schedulesProcessed: dueSchedules.length,
      results
    });
  } catch (error) {
    console.error('Error processing recurring schedules:', error);
    return NextResponse.json(
      { error: 'Failed to process recurring schedules' },
      { status: 500 }
    );
  }
}

/**
 * Calculate the next date based on recurrence type
 */
function calculateNextDate(currentDate: Date, recurrenceType: RecurrenceType): Date {
  const nextDate = new Date(currentDate);
  
  if (recurrenceType === RecurrenceType.MONTHLY) {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else if (recurrenceType === RecurrenceType.YEARLY) {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }
  
  return nextDate;
} 