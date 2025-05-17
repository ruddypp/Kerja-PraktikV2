import { NotificationType } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define notification priorities for intelligent polling
export const NOTIFICATION_PRIORITIES = {
  HIGH: 'high',   // Critical notifications (rental approvals/rejections, etc.)
  MEDIUM: 'medium', // Important but not urgent (calibration reminders a week out)
  LOW: 'low',     // Informational (general system messages)
};

// Map notification types to priorities
export const getNotificationPriority = (type: NotificationType): string => {
  switch (type) {
    // High priority notifications
    case 'RENTAL_STATUS_CHANGE':
    case 'CALIBRATION_STATUS_CHANGE':
      return NOTIFICATION_PRIORITIES.HIGH;
    
    // Medium priority notifications
    case 'RENTAL_DUE_REMINDER':
    case 'CALIBRATION_REMINDER':
    case 'MAINTENANCE_REMINDER':
      return NOTIFICATION_PRIORITIES.MEDIUM;
    
    // Low priority notifications
    case 'INVENTORY_SCHEDULE':
    case 'VENDOR_INFO':
    case 'GENERAL_INFO':
    default:
      return NOTIFICATION_PRIORITIES.LOW;
  }
};

// Create a notification in the database
export const createNotification = async ({
  userId,
  title,
  message,
  type,
  relatedId,
}: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedId?: string;
}) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        relatedId,
        isRead: false,
      },
    });

    // Get socket.io instance from global (set in custom server)
    const io = (global as any).io;
    if (io) {
      // Send real-time notification to the specific user
      io.to(`user:${userId}`).emit('new_notification', {
        notification,
        priority: getNotificationPriority(type),
      });

      // For high priority notifications, send to browser notifications channel
      if (getNotificationPriority(type) === NOTIFICATION_PRIORITIES.HIGH) {
        io.to(`user:${userId}`).emit('push_notification', {
          title,
          message,
          icon: '/notification-icon.png', // You'll need to create this icon
        });
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Get notifications for a user with incremental loading
export const getUserNotifications = async (
  userId: string,
  limit: number = 10,
  lastFetchTime?: Date
) => {
  try {
    // Base query
    const whereClause: any = { userId };
    
    // Incremental loading - only get notifications since last fetch
    if (lastFetchTime) {
      whereClause.createdAt = { gt: lastFetchTime };
    }

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    // Get notifications with pagination
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return { notifications, unreadCount };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (id: string) => {
  try {
    return await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    return await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}; 