import { NotificationType, Role } from '@prisma/client';
import prisma from '@/lib/prisma';

// Notification creation functions
interface NotificationParams {
  title: string;
  message: string;
  type: NotificationType;
  relatedId?: string;
}

// Send notification to a specific user
export async function sendNotificationToUser(userId: string, params: NotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title: params.title,
        message: params.message,
        type: params.type,
        relatedId: params.relatedId,
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Failed to create notification');
  }
}

// Send notification to all users with a specific role
export async function sendNotificationToRole(role: Role, params: NotificationParams) {
  try {
    const users = await prisma.user.findMany({
      where: { role },
      select: { id: true },
    });

    const notifications = await Promise.all(
      users.map((user) =>
        prisma.notification.create({
          data: {
            userId: user.id,
            title: params.title,
            message: params.message,
            type: params.type,
            relatedId: params.relatedId,
          },
        })
      )
    );

    return notifications;
  } catch (error) {
    console.error('Error creating notifications for role:', error);
    throw new Error('Failed to create notifications for role');
  }
}

// Rental notification helpers
export async function sendRentalRequestNotification(rentalId: string, userId: string, itemName: string) {
  const params = {
    title: 'Rental Request Submitted',
    message: `Your rental request for ${itemName} has been submitted and is pending approval.`,
    type: NotificationType.RENTAL_REQUEST,
    relatedId: rentalId,
  };
  
  return await sendNotificationToUser(userId, params);
}

export async function sendRentalStatusChangeNotification(
  rentalId: string, 
  userId: string, 
  itemName: string, 
  status: string
) {
  const params = {
    title: 'Rental Status Updated',
    message: `Your rental request for ${itemName} has been ${status.toLowerCase()}.`,
    type: NotificationType.RENTAL_STATUS_CHANGE,
    relatedId: rentalId,
  };
  
  return await sendNotificationToUser(userId, params);
}

export async function sendRentalDueReminderNotification(
  rentalId: string, 
  userId: string, 
  itemName: string, 
  dueDate: Date
) {
  const formattedDate = dueDate.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const params = {
    title: 'Rental Due Reminder',
    message: `Your rental for ${itemName} is due on ${formattedDate}.`,
    type: NotificationType.RENTAL_DUE_REMINDER,
    relatedId: rentalId,
  };
  
  return await sendNotificationToUser(userId, params);
}

// Calibration notification helpers
export async function sendCalibrationReminderNotification(
  calibrationId: string,
  userId: string,
  itemName: string,
  daysRemaining: number
) {
  const params = {
    title: 'Calibration Due Soon',
    message: `Calibration for ${itemName} is due in ${daysRemaining} days.`,
    type: NotificationType.CALIBRATION_REMINDER,
    relatedId: calibrationId,
  };
  
  return await sendNotificationToUser(userId, params);
}

export async function sendCalibrationStatusChangeNotification(
  calibrationId: string,
  userId: string,
  itemName: string,
  status: string
) {
  const params = {
    title: 'Calibration Status Updated',
    message: `The calibration for ${itemName} has been ${status.toLowerCase()}.`,
    type: NotificationType.CALIBRATION_STATUS_CHANGE,
    relatedId: calibrationId,
  };
  
  return await sendNotificationToUser(userId, params);
}

// Maintenance notification helpers
export async function sendMaintenanceReminderNotification(
  maintenanceId: string,
  userId: string,
  itemName: string
) {
  const params = {
    title: 'Maintenance Reminder',
    message: `A maintenance has been scheduled for ${itemName}.`,
    type: NotificationType.MAINTENANCE_REMINDER,
    relatedId: maintenanceId,
  };
  
  return await sendNotificationToUser(userId, params);
}

// Activity notification for admins and managers
export async function notifyAdminsAndManagersOfActivity(
  activityType: string,
  itemName: string,
  userName: string,
  relatedId?: string
) {
  const params = {
    title: 'New Activity',
    message: `${userName} has ${activityType.toLowerCase()} for ${itemName}.`,
    type: NotificationType.GENERAL_INFO,
    relatedId,
  };
  
  // Send to admins
  await sendNotificationToRole(Role.ADMIN, params);
  
  // Send to managers
  return await sendNotificationToRole(Role.MANAGER, params);
}

// Generic success notification
export async function sendActionSuccessNotification(
  userId: string,
  actionType: string,
  itemName: string,
  relatedId?: string
) {
  const params = {
    title: 'Action Successful',
    message: `Your ${actionType} for ${itemName} has been successfully created.`,
    type: NotificationType.GENERAL_INFO,
    relatedId,
  };
  
  return await sendNotificationToUser(userId, params);
}

// Inventory schedule notification
export async function sendInventoryScheduleNotification(
  scheduleId: string,
  scheduleName: string
) {
  const params = {
    title: 'Inventory Schedule Reminder',
    message: `The inventory schedule "${scheduleName}" is due soon.`,
    type: NotificationType.INVENTORY_SCHEDULE,
    relatedId: scheduleId,
  };
  
  // Send to admins
  await sendNotificationToRole(Role.ADMIN, params);
  
  // Send to managers
  return await sendNotificationToRole(Role.MANAGER, params);
} 