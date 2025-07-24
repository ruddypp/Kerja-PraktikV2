import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addMonths, addYears, isAfter, startOfDay, isSameDay } from 'date-fns';
import { checkForDueReminders, handleScheduleStatusChange } from '@/lib/reminder-service';

// Endpoint untuk cron job yang memeriksa jadwal inventaris dan reminder
export async function GET(request: Request) {
  try {
    // Proses jadwal inventaris
    const recurringSchedules = await prisma.inventoryCheck.findMany({
      where: {
        isRecurring: true,
        nextDate: {
          not: null,
        },
      },
    });

    const results = [];
    const today = startOfDay(new Date());

    for (const schedule of recurringSchedules) {
      if (schedule.nextDate && isAfter(today, schedule.nextDate)) {
        // Buat jadwal baru berdasarkan tipe pengulangan
        const newDate = schedule.recurrenceType === 'MONTHLY'
          ? addMonths(schedule.nextDate, 1)
          : addYears(schedule.nextDate, 1);

        // Buat jadwal baru
        const newSchedule = await prisma.inventoryCheck.create({
          data: {
            name: schedule.name,
            scheduledDate: newDate,
            userId: schedule.userId,
            isRecurring: true,
            recurrenceType: schedule.recurrenceType,
            nextDate: schedule.recurrenceType === 'MONTHLY'
              ? addMonths(newDate, 1)
              : addYears(newDate, 1),
          },
        });

        // Update jadwal yang sekarang
        await prisma.inventoryCheck.update({
          where: { id: schedule.id },
          data: {
            nextDate: null,
          },
        });

        // Create reminder for the new schedule
        try {
          await handleScheduleStatusChange(newSchedule.id);
          console.log(`Created reminder for new recurring schedule ${newSchedule.id}`);
        } catch (error) {
          console.error(`Failed to create reminder for new recurring schedule ${newSchedule.id}:`, error);
          // Don't fail the cron job if reminder creation fails
        }

        results.push({
          originalSchedule: schedule.id,
          newSchedule: newSchedule.id,
        });
      }
    }

    // Find all schedules due today that don't have reminders yet
    const schedulesForToday = await prisma.inventoryCheck.findMany({
      where: {
        scheduledDate: {
          gte: startOfDay(today),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
    });

    const todayResults = [];
    for (const schedule of schedulesForToday) {
      try {
        // Create or update reminder for this schedule
        const reminder = await handleScheduleStatusChange(schedule.id);
        todayResults.push({
          scheduleId: schedule.id,
          reminderCreated: !!reminder,
        });
      } catch (error) {
        console.error(`Failed to create/update reminder for schedule ${schedule.id}:`, error);
        todayResults.push({
          scheduleId: schedule.id,
          error: 'Failed to create/update reminder',
        });
      }
    }

    // Proses reminder yang jatuh tempo
    const reminderResults = await checkForDueReminders();

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} recurring schedules, ${todayResults.length} schedules for today, and ${reminderResults.length} reminders`,
      scheduleResults: results,
      todayResults,
      reminderResults,
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process cron job' },
      { status: 500 }
    );
  }
} 