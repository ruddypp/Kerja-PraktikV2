import { prisma } from './prisma';
import { 
  createScheduleReminder, 
  createCalibrationReminder,
  createMaintenanceReminder,
  createRentalReminder
} from './reminder-service';

/**
 * IMPROVED NOTIFICATION SERVICE
 * 
 * Alur Notifikasi Sesuai Kebutuhan:
 * 1. User buat request → Reminder masuk ke ADMIN
 * 2. Saat deadline → Notifikasi ke ADMIN dan USER
 * 3. Pesan jelas dan spesifik
 * 4. Tidak ada duplikasi notifikasi
 */

// Function to create an instant notification for a new or updated reminder
export async function createInstantNotificationForReminder(
  entityId: string, 
  entityType: 'SCHEDULE' | 'CALIBRATION' | 'MAINTENANCE' | 'RENTAL'
) {
  try {
    console.log(`🔔 [INSTANT] Creating notification for ${entityType} ID: ${entityId}`);
    
    // Step 1: Create or update the reminder
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
      console.log(`⏭️ [INSTANT] Reminder creation skipped for ${entityType} ID: ${entityId}`);
      return { status: 'reminder_skipped' };
    }
    
    console.log(`✅ [INSTANT] Reminder ${reminder.id} created for ${entityType} ID: ${entityId}`);

    // Step 2: Check if instant notification should be created
    // Only create instant notification if due date is today or overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(reminder.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const isToday = today.getTime() === dueDate.getTime();
    const isOverdue = today.getTime() > dueDate.getTime();

    if (!isToday && !isOverdue) {
      console.log(`⏭️ [INSTANT] Due date not today/overdue for reminder ${reminder.id}. Cron will handle it.`);
      return { status: 'notification_deferred' };
    }

    // Step 3: Create instant notification for admin (reminder is assigned to admin)
    const notification = await createNotification({
      userId: reminder.userId, // This is admin ID
      reminderId: reminder.id,
      title: `[ADMIN] ${reminder.title}`,
      message: `${reminder.message} (Permintaan baru dari user)`,
      isRead: false,
      shouldPlaySound: true,
    });

    console.log(`✅ [INSTANT] Created notification ${notification.id} for admin`);
    
    return { 
      status: 'created',
      reminder,
      notification 
    };
    
  } catch (error) {
    console.error(`❌ [INSTANT] Error creating notification for ${entityType} ID ${entityId}:`, error);
    return { status: 'error', error };
  }
}

// Create a new notification with enhanced duplicate prevention
export async function createNotification(data: any) {
  try {
    const { userId, reminderId, title, message } = data;
    
    console.log(`🔔 Creating notification for user ${userId}, reminder ${reminderId}`);
    
    // Enhanced duplicate check
    if (reminderId) {
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId,
          reminderId,
          isRead: false,
          createdAt: {
            // Consider notifications in last 12 hours as duplicates
            gte: new Date(Date.now() - 12 * 60 * 60 * 1000)
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      if (existingNotification) {
        console.log(`⏭️ Found existing notification ${existingNotification.id} for reminder ${reminderId}. Skipping creation.`);
        return existingNotification;
      }
    }
    
    // Create new notification
    const newNotification = await prisma.notification.create({
      data: {
        userId,
        reminderId,
        title,
        message,
        isRead: data.isRead ?? false,
        shouldPlaySound: data.shouldPlaySound ?? true,
        createdAt: new Date(),
      }
    });
    
    console.log(`✅ Created notification ${newNotification.id} for user ${userId}`);
    return newNotification;
    
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
}

// Get user notifications with improved filtering and deduplication
export async function getUserNotifications(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    type?: 'SCHEDULE' | 'CALIBRATION' | 'RENTAL' | 'MAINTENANCE' | 'ALL';
    overdueOnly?: boolean;
  } = {}
) {
  try {
    const { page = 1, limit = 100, type = 'ALL', overdueOnly = false } = options;
    const skip = (page - 1) * limit;

    console.log(`📋 Getting notifications for user ${userId}, type: ${type}, overdueOnly: ${overdueOnly}`);

    let whereClause: any = { userId };
    
    // Filter by type if specified
    if (type !== 'ALL') {
      whereClause.reminder = {
        type: type,
      };
    }
    
    // Filter for overdue only if requested
    if (overdueOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      whereClause.reminder = {
        ...whereClause.reminder,
        dueDate: { lt: today },
        status: { in: ['PENDING', 'SENT'] },
        acknowledgedAt: null,
      };
    }

    // Get notifications with full reminder details
    const [totalNotifications, allNotifications] = await prisma.$transaction([
      prisma.notification.count({ where: whereClause }),
      prisma.notification.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [
          { isRead: 'asc' }, // Unread first
          { createdAt: 'desc' }, // Newest first
        ],
        include: {
          reminder: {
            include: {
              calibration: { 
                include: { 
                  item: true, 
                  customer: true,
                  user: true 
                } 
              },
              rental: { 
                include: { 
                  item: true, 
                  customer: true,
                  user: true 
                } 
              },
              maintenance: { 
                include: { 
                  item: true,
                  user: true 
                } 
              },
              inventoryCheck: {
                include: {
                  createdBy: true, // FIXED: Use createdBy instead of user
                  items: true
                }
              },
              item: true,
              user: true,
            },
          },
        },
      }),
    ]);

    // Deduplicate notifications based on reminderId (keep newest)
    const uniqueNotifications = [];
    const seenReminderIds = new Set();
    const notificationsToDelete = [];

    for (const notification of allNotifications) {
      if (notification.reminderId) {
        if (seenReminderIds.has(notification.reminderId)) {
          // Mark older duplicate for deletion
          notificationsToDelete.push(notification.id);
        } else {
          uniqueNotifications.push(notification);
          seenReminderIds.add(notification.reminderId);
        }
      } else {
        // Notifications without reminderId are kept
        uniqueNotifications.push(notification);
      }
    }
    
    // Delete duplicates in background
    if (notificationsToDelete.length > 0) {
      console.log(`🗑️ Deleting ${notificationsToDelete.length} duplicate notifications`);
      prisma.notification.deleteMany({
        where: { id: { in: notificationsToDelete } },
      }).catch(err => console.error("Error deleting duplicates:", err));
    }

    // Process notifications with enhanced information
    const processedNotifications = uniqueNotifications.map(notification => {
      let enhancedNotification = {
        ...notification,
        shouldPlaySound: notification.reminder && !notification.isRead,
      };

      // Add context information based on reminder type
      if (notification.reminder) {
        const reminder = notification.reminder;
        let contextInfo = '';
        let originalUser = '';

        switch (reminder.type) {
          case 'CALIBRATION':
            if (reminder.calibration) {
              originalUser = reminder.calibration.user?.name || 'Unknown User';
              contextInfo = `Kalibrasi oleh ${originalUser}`;
            }
            break;
          case 'RENTAL':
            if (reminder.rental) {
              originalUser = reminder.rental.user?.name || 'Unknown User';
              contextInfo = `Rental oleh ${originalUser}`;
            }
            break;
          case 'MAINTENANCE':
            if (reminder.maintenance) {
              originalUser = reminder.maintenance.user?.name || 'Unknown User';
              contextInfo = `Maintenance oleh ${originalUser}`;
            }
            break;
          case 'SCHEDULE':
            if (reminder.inventoryCheck) {
              originalUser = reminder.inventoryCheck.createdBy?.name || 'Unknown User'; // FIXED: Use createdBy
              contextInfo = `Jadwal oleh ${originalUser}`;
            }
            break;
        }

        enhancedNotification = {
          ...enhancedNotification,
          contextInfo,
          originalUser,
        };
      }

      return enhancedNotification;
    });

    console.log(`📋 Returning ${processedNotifications.length} unique notifications`);

    return {
      notifications: processedNotifications,
      total: totalNotifications,
      page,
      limit,
      totalPages: Math.ceil(totalNotifications / limit),
    };
    
  } catch (error) {
    console.error('❌ Error fetching user notifications:', error);
    return {
      notifications: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0,
    };
  }
}

// Get overdue notifications with enhanced filtering
export async function getOverdueNotifications(userId: string) {
  try {
    console.log(`⏰ Getting overdue notifications for user ${userId}`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get reminders that are overdue and not acknowledged
    const overdueReminderIds = await prisma.$queryRaw<Array<{id: string}>>`
      SELECT id FROM "Reminder"
      WHERE "dueDate" < ${today}
      AND status IN ('PENDING', 'SENT')
      AND ("acknowledgedAt" IS NULL OR status != 'ACKNOWLEDGED')
    `;
    
    const reminderIds = overdueReminderIds.map(r => r.id);
    
    console.log(`📋 Found ${reminderIds.length} due reminder IDs`);
    
    if (reminderIds.length === 0) {
      console.log(`📋 Found 0 overdue notifications`);
      return [];
    }
    
    // Get notifications for these overdue reminders
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        reminderId: {
          in: reminderIds
        },
        isRead: false
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      include: {
        reminder: {
          include: {
            calibration: {
              include: {
                item: true,
                customer: true,
                user: true,
              },
            },
            rental: {
              include: {
                item: true,
                customer: true,
                user: true,
              },
            },
            maintenance: {
              include: {
                item: true,
                user: true,
              },
            },
            inventoryCheck: {
              include: {
                createdBy: true, // FIXED: Use createdBy instead of user
                items: true
              }
            },
            item: true,
            user: true,
          },
        },
      },
    });
    
    console.log(`📋 Found ${notifications.length} overdue notifications`);
    
    // Add enhanced properties
    const enhancedNotifications = notifications.map(notification => ({
      ...notification,
      shouldPlaySound: true,
      isOverdue: true,
    }));
    
    return enhancedNotifications;
    
  } catch (error) {
    console.error('❌ Error getting overdue notifications:', error);
    return [];
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string) {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
    
    console.log(`📊 User ${userId} has ${count} unread notifications`);
    return count;
    
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    return 0;
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string) {
  try {
    console.log(`✅ Marking notification ${notificationId} as read`);
    
    // First check if notification exists
    const existingNotification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    
    if (!existingNotification) {
      console.log(`⚠️ Notification ${notificationId} not found, may have been already deleted`);
      return null;
    }
    
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    
    console.log(`✅ Notification ${notificationId} marked as read`);
    return notification;
    
  } catch (error) {
    console.error(`❌ Error marking notification as read:`, error);
    
    // Handle specific Prisma error for record not found
    if (error.code === 'P2025') {
      console.log(`⚠️ Notification ${notificationId} was already deleted`);
      return null;
    }
    
    throw error;
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: string) {
  try {
    console.log(`✅ Marking all notifications as read for user ${userId}`);
    
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    
    console.log(`✅ Marked ${result.count} notifications as read for user ${userId}`);
    return result;
    
  } catch (error) {
    console.error(`❌ Error marking all notifications as read:`, error);
    throw error;
  }
}

// FIXED: Delete notification with existence check and proper error handling
export async function deleteNotification(notificationId: string) {
  try {
    console.log(`🗑️ Deleting notification ${notificationId}`);
    
    // First check if notification exists
    const existingNotification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    
    if (!existingNotification) {
      console.log(`⚠️ Notification ${notificationId} not found, may have been already deleted`);
      return null; // Return null instead of throwing error
    }
    
    const notification = await prisma.notification.delete({
      where: { id: notificationId },
    });
    
    console.log(`✅ Deleted notification ${notificationId}`);
    return notification;
    
  } catch (error) {
    console.error(`❌ Error deleting notification:`, error);
    
    // Handle specific Prisma error for record not found
    if (error.code === 'P2025') {
      console.log(`⚠️ Notification ${notificationId} was already deleted`);
      return null; // Return null for already deleted notifications
    }
    
    throw error;
  }
}

// Delete all read notifications
export async function deleteAllReadNotifications(userId: string) {
  try {
    console.log(`🗑️ Deleting all read notifications for user ${userId}`);
    
    const result = await prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
      },
    });
    
    console.log(`✅ Deleted ${result.count} read notifications for user ${userId}`);
    return result;
    
  } catch (error) {
    console.error(`❌ Error deleting read notifications:`, error);
    throw error;
  }
}