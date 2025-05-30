import { NextRequest, NextResponse } from 'next/server';
import { NotificationType, Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { differenceInDays } from 'date-fns';
import {
  sendCalibrationReminderNotification,
  sendRentalDueReminderNotification,
  sendNotificationToRole,
} from '@/lib/notificationService';

// This endpoint should be called by a scheduled task (e.g., cron job)
// It checks for upcoming calibrations and rentals and sends reminder notifications
export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    const expectedApiKey = process.env.CRON_API_KEY;
    
    // Basic security check
    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const today = new Date();
    
    // Process calibration reminders
    await processCalibrationReminders(today);
    
    // Process rental due reminders
    await processRentalDueReminders(today);
    
    // Process inventory schedule reminders
    await processInventoryScheduleReminders(today);

    return NextResponse.json({
      success: true,
      message: 'Reminder notifications processed successfully',
    });
  } catch (error) {
    console.error('Error processing reminder notifications:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process reminder notifications' },
      { status: 500 }
    );
  }
}

// Process calibration reminders (H-30, H-7, H-1)
async function processCalibrationReminders(today: Date) {
  try {
    // Get all active calibrations with validUntil date
    const calibrations = await prisma.calibration.findMany({
      where: {
        validUntil: {
          not: null,
        },
        status: {
          in: ['APPROVED', 'COMPLETED'],
        },
      },
      include: {
        item: true,
        user: true,
      },
    });

    for (const calibration of calibrations) {
      if (!calibration.validUntil) continue;
      
      const daysUntilExpiration = differenceInDays(calibration.validUntil, today);
      
      // Check for H-30, H-7, H-1 reminders
      if (daysUntilExpiration === 30 || daysUntilExpiration === 7 || daysUntilExpiration === 1) {
        // Send notification to admin and manager roles
        const reminderMessage = `Calibration for ${calibration.item.name} (${calibration.item.serialNumber}) is due in ${daysUntilExpiration} days.`;
        await sendNotificationToRole(Role.ADMIN, {
          title: 'Calibration Due Soon',
          message: reminderMessage,
          type: NotificationType.CALIBRATION_REMINDER,
          relatedId: calibration.id,
        });
        
        await sendNotificationToRole(Role.MANAGER, {
          title: 'Calibration Due Soon',
          message: reminderMessage,
          type: NotificationType.CALIBRATION_REMINDER,
          relatedId: calibration.id,
        });
      }
    }
  } catch (error) {
    console.error('Error processing calibration reminders:', error);
  }
}

// Process rental due reminders
async function processRentalDueReminders(today: Date) {
  try {
    // Get all active rentals with endDate
    const rentals = await prisma.rental.findMany({
      where: {
        endDate: {
          not: null,
        },
        status: 'APPROVED',
        returnDate: null,
      },
      include: {
        item: true,
        user: true,
      },
    });

    for (const rental of rentals) {
      if (!rental.endDate) continue;
      
      const daysUntilDue = differenceInDays(rental.endDate, today);
      
      // Send notifications for upcoming due dates (3 days before due)
      if (daysUntilDue <= 3 && daysUntilDue >= 0) {
        // Notify the user
        await sendRentalDueReminderNotification(
          rental.id,
          rental.userId,
          rental.item.name,
          rental.endDate
        );
        
        // Notify admin and manager roles
        const dueMessage = `Rental for ${rental.item.name} (${rental.item.serialNumber}) by ${rental.user.name} is due in ${daysUntilDue} days.`;
        await sendNotificationToRole(Role.ADMIN, {
          title: 'Rental Due Soon',
          message: dueMessage,
          type: NotificationType.RENTAL_DUE_REMINDER,
          relatedId: rental.id,
        });
        
        await sendNotificationToRole(Role.MANAGER, {
          title: 'Rental Due Soon',
          message: dueMessage,
          type: NotificationType.RENTAL_DUE_REMINDER,
          relatedId: rental.id,
        });
      }
    }
  } catch (error) {
    console.error('Error processing rental due reminders:', error);
  }
}

// Process inventory schedule reminders
async function processInventoryScheduleReminders(today: Date) {
  try {
    // Get upcoming inventory checks
    const inventoryChecks = await prisma.inventoryCheck.findMany({
      where: {
        scheduledDate: {
          gte: today,
        },
        completedDate: null,
      },
      include: {
        createdBy: true,
      },
    });

    for (const check of inventoryChecks) {
      const daysUntilSchedule = differenceInDays(check.scheduledDate, today);
      
      // Send notifications for upcoming inventory checks (3 days before)
      if (daysUntilSchedule <= 3 && daysUntilSchedule >= 0) {
        // Notify admin and manager roles
        const scheduleMessage = `Inventory check "${check.name || 'Unnamed'}" is scheduled in ${daysUntilSchedule} days.`;
        await sendNotificationToRole(Role.ADMIN, {
          title: 'Inventory Schedule Reminder',
          message: scheduleMessage,
          type: NotificationType.INVENTORY_SCHEDULE,
          relatedId: check.id,
        });
        
        await sendNotificationToRole(Role.MANAGER, {
          title: 'Inventory Schedule Reminder',
          message: scheduleMessage,
          type: NotificationType.INVENTORY_SCHEDULE,
          relatedId: check.id,
        });
      }
    }
  } catch (error) {
    console.error('Error processing inventory schedule reminders:', error);
  }
} 