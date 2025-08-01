import { prisma } from './prisma';
import { 
  createScheduleReminder, 
  createCalibrationReminder,
  createMaintenanceReminder,
  createRentalReminder
} from './reminder-service';

// Function to create an instant notification for a new or updated reminder
export async function createInstantNotificationForReminder(
  entityId: string, 
  entityType: 'SCHEDULE' | 'CALIBRATION' | 'MAINTENANCE' | 'RENTAL'
) {
  try {
    console.log(`[createInstantNotification] Received request for ${entityType} ID: ${entityId}`);
    
    // Step 1: Create or update the reminder.
    // This logic needs to be specific to the entity type.
    let reminder;
    switch (entityType) {
      case 'SCHEDULE':
        reminder = await createScheduleReminder(entityId);
        break;
      case 'CALIBRATION':
        reminder = await createCalibrationReminder(entityId);
        break;
      case 'MAINTENANCE':
        reminder = await createMaintenanceReminder(entityId);
        break;
      case 'RENTAL':
        reminder = await createRentalReminder(entityId);
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    if (!reminder) {
      console.log(`[createInstantNotification] Reminder creation/update was skipped for ${entityType} ID: ${entityId}. No notification will be created.`);
      return { status: 'reminder_skipped' };
    }
    
    console.log(`[createInstantNotification] Reminder ${reminder.id} created/updated for ${entityType} ID: ${entityId}`);

    // Step 2: Check if a notification should be created right now.
    // We only create an instant notification if the due date is today.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(reminder.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (today.getTime() !== dueDate.getTime()) {
      console.log(`[createInstantNotification] Due date for reminder ${reminder.id} is not today. Cron job will handle it. Skipping instant notification.`);
      return { status: 'notification_deferred' };
    }

    // Step 3: Create the notification instantly.
    const notification = await prisma.notification.create({
      data: {
        userId: reminder.userId,
        reminderId: reminder.id,
        title: reminder.title,
        message: reminder.message,
        isRead: false,
        shouldPlaySound: true,
      },
    });

    console.log(`[createInstantNotification] Instantly created notification ${notification.id} for reminder ${reminder.id}`);
    
    return { 
      status: 'created',
      reminder,
      notification 
    };
    
  } catch (error) {
    console.error(`[createInstantNotification] Error creating instant notification for ${entityType} ID ${entityId}:`, error);
    // Do not re-throw, as this might break the primary user action (e.g., creating a schedule)
    return { status: 'error', error };
  }
}


// Create a new notification (with enhanced duplicate check)
export async function createNotification(data: any) {
  try {
    const { userId, reminderId, title } = data;
    
    // Check for existing notifications with the same reminderId
    if (reminderId) {
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId,
          reminderId,
          isRead: false,
          createdAt: {
            // Only consider notifications created in the last 24 hours as duplicates
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // If we found a duplicate, return it instead of creating a new one
      if (existingNotification) {
        console.log(`Found existing notification ${existingNotification.id} for reminder ${reminderId}. Skipping creation.`);
        return existingNotification;
      }
    }
    
    // No duplicate found, create a new notification
    const newNotification = await prisma.notification.create({
      data: {
        ...data,
        // Ensure these fields have default values
        isRead: data.isRead ?? false,
        shouldPlaySound: data.shouldPlaySound ?? true
      }
    });
    
    console.log(`Created notification ${newNotification.id} for user ${userId}`);
    return newNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function getUserNotifications(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    type?: 'SCHEDULE' | 'CALIBRATION' | 'RENTAL' | 'MAINTENANCE' | 'ALL';
  } = {}
) {
  try {
    const { page = 1, limit = 100, type = 'ALL' } = options;
    const skip = (page - 1) * limit;

    const whereClause: any = { userId };
    if (type !== 'ALL') {
      whereClause.reminder = {
        type: type,
      };
    }

    // Get total count and notifications in a single transaction
    const [totalNotifications, allNotifications] = await prisma.$transaction([
      prisma.notification.count({ where: whereClause }),
      prisma.notification.findMany({
        where: whereClause,
        skip,
        take: limit,
      orderBy: {
          createdAt: 'desc',
      },
      include: {
        reminder: {
          include: {
              calibration: { include: { item: true, customer: true } },
              rental: { include: { item: true, customer: true } },
              maintenance: { include: { item: true } },
              inventoryCheck: true,
            },
          },
        },
      }),
    ]);

    // Deduplicate notifications based on reminderId, keeping only the newest.
    const uniqueNotifications = [];
    const seenReminderIds = new Set();
    const notificationsToDelete = [];

    for (const notification of allNotifications) {
      if (notification.reminderId) {
        if (seenReminderIds.has(notification.reminderId)) {
          notificationsToDelete.push(notification.id);
        } else {
          uniqueNotifications.push(notification);
          seenReminderIds.add(notification.reminderId);
        }
      } else {
        uniqueNotifications.push(notification);
      }
    }
    
    if (notificationsToDelete.length > 0) {
      // Deletion can happen in the background, no need to await
      prisma.notification.deleteMany({
        where: { id: { in: notificationsToDelete } },
      }).catch(err => console.error("Error during background duplicate deletion:", err));
    }

    const processedNotifications = uniqueNotifications
      .map(notification => ({
        ...notification,
        shouldPlaySound: notification.reminder && !notification.isRead
      }))
      .sort((a, b) => {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return {
      notifications: processedNotifications,
      total: totalNotifications,
      page,
      limit,
      totalPages: Math.ceil(totalNotifications / limit),
    };
    
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return {
      notifications: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0,
    };
  }
}

export async function getOverdueNotifications(userId: string) {
  try {
    console.log(`Getting overdue notifications for user ${userId}`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get reminders that are due today or overdue (due date today or in the past)
    // and not acknowledged
    const dueReminderIds = await prisma.$queryRaw<Array<{id: string}>>`
      SELECT id FROM "Reminder"
      WHERE "dueDate" < ${tomorrow}
      AND status IN ('PENDING', 'SENT')
      AND ("acknowledgedAt" IS NULL OR status != 'ACKNOWLEDGED')
    `;
    
    // Convert raw results to array of IDs
    const reminderIds = dueReminderIds.map(r => r.id);
    
    console.log(`Found ${reminderIds.length} due reminder IDs`);
    
    if (reminderIds.length === 0) {
      return [];
    }
    
    // Then get notifications related to these reminders
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        reminderId: {
          in: reminderIds
        },
        isRead: false
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        reminder: {
          include: {
            calibration: {
              include: {
                item: true,
                customer: true,
              },
            },
            rental: {
              include: {
                item: true,
                customer: true,
              },
            },
            maintenance: {
              include: {
                item: true,
              },
            },
            inventoryCheck: true,
          },
        },
      },
    });
    
    console.log(`Found ${notifications.length} overdue notifications`);
    
    // Add shouldPlaySound property to each notification
    const notificationsWithSound = notifications.map(notification => ({
      ...notification,
      shouldPlaySound: true
    }));
    
    return notificationsWithSound;
  } catch (error) {
    console.error('Error getting overdue notifications:', error);
    return [];
  }
}

export async function getUnreadNotificationCount(userId: string) {
  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
  
  return count;
}

export async function markNotificationAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function deleteNotification(notificationId: string) {
  return prisma.notification.delete({
    where: { id: notificationId },
  });
}

export async function deleteAllReadNotifications(userId: string) {
  return prisma.notification.deleteMany({
    where: {
      userId,
      isRead: true,
    },
  });
} 