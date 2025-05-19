import { PrismaClient, NotificationType, Role } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';

const prisma = new PrismaClient();

/**
 * Service to handle notification creation and distribution
 */
class NotificationService {
  private io: SocketServer | null = null;
  
  // Set the Socket.IO server instance
  setSocketServer(io: SocketServer) {
    this.io = io;
  }
  
  /**
   * Create a new notification and emit it through Socket.IO
   */
  async createNotification({
    userId,
    title,
    message,
    type,
    relatedId = null
  }: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    relatedId?: string | null;
  }) {
    try {
      // Create notification in database
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          isRead: false,
          relatedId
        }
      });
      
      // Emit to connected clients for this user
      if (this.io) {
        this.io.emit(`user:${userId}:notification`, notification);
      }
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
  
  /**
   * Create notifications for multiple users
   */
  async createNotificationsForUsers({
    userIds,
    title,
    message,
    type,
    relatedId = null
  }: {
    userIds: string[];
    title: string;
    message: string;
    type: NotificationType;
    relatedId?: string | null;
  }) {
    const notifications = [];
    
    for (const userId of userIds) {
      try {
        const notification = await this.createNotification({
          userId,
          title,
          message,
          type,
          relatedId
        });
        
        notifications.push(notification);
      } catch (error) {
        console.error(`Error creating notification for user ${userId}:`, error);
      }
    }
    
    return notifications;
  }
  
  /**
   * Create notifications for all users with a specific role
   */
  async createNotificationsForRole({
    role,
    title,
    message,
    type,
    relatedId = null
  }: {
    role: Role;
    title: string;
    message: string;
    type: NotificationType;
    relatedId?: string | null;
  }) {
    try {
      // Find all users with the specified role
      const users = await prisma.user.findMany({
        where: { role },
        select: { id: true }
      });
      
      // Create notifications for all found users
      return await this.createNotificationsForUsers({
        userIds: users.map(user => user.id),
        title,
        message,
        type,
        relatedId
      });
    } catch (error) {
      console.error(`Error creating notifications for role ${role}:`, error);
      throw error;
    }
  }
  
  /**
   * Create notifications for admins
   */
  async notifyAdmins({
    title,
    message,
    type,
    relatedId = null
  }: {
    title: string;
    message: string;
    type: NotificationType;
    relatedId?: string | null;
  }) {
    return this.createNotificationsForRole({
      role: Role.ADMIN,
      title,
      message,
      type,
      relatedId
    });
  }
  
  /**
   * Create rental request notification
   */
  async createRentalRequestNotification({
    requesterId,
    itemName,
    rentalId
  }: {
    requesterId: string;
    itemName: string;
    rentalId: string;
  }) {
    // Get requester name
    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { name: true }
    });
    
    const requesterName = requester?.name || 'A user';
    
    // Notify admins
    await this.notifyAdmins({
      title: 'New Rental Request',
      message: `${requesterName} has requested to rent ${itemName}`,
      type: NotificationType.RENTAL_REQUEST,
      relatedId: rentalId
    });
  }
  
  /**
   * Create rental status change notification
   */
  async createRentalStatusChangeNotification({
    rentalId,
    userId,
    status,
    itemName
  }: {
    rentalId: string;
    userId: string;
    status: string;
    itemName: string;
  }) {
    await this.createNotification({
      userId,
      title: 'Rental Status Update',
      message: `Your rental request for ${itemName} has been ${status.toLowerCase()}`,
      type: NotificationType.RENTAL_STATUS_CHANGE,
      relatedId: rentalId
    });
  }
  
  /**
   * Create calibration reminder notification
   */
  async createCalibrationReminderNotification({
    itemSerial,
    itemName,
    daysRemaining
  }: {
    itemSerial: string;
    itemName: string;
    daysRemaining: number;
  }) {
    // Notify admins
    await this.notifyAdmins({
      title: 'Calibration Reminder',
      message: `${itemName} (${itemSerial}) is due for calibration in ${daysRemaining} days`,
      type: NotificationType.CALIBRATION_REMINDER,
      relatedId: itemSerial
    });
  }
  
  /**
   * Create rental due reminder notification
   */
  async createRentalDueReminderNotification({
    userId,
    itemName,
    daysRemaining,
    rentalId
  }: {
    userId: string;
    itemName: string;
    daysRemaining: number;
    rentalId: string;
  }) {
    await this.createNotification({
      userId,
      title: 'Rental Due Reminder',
      message: `Your rental of ${itemName} is due in ${daysRemaining} days`,
      type: NotificationType.RENTAL_DUE_REMINDER,
      relatedId: rentalId
    });
    
    // Also notify admins if approaching due date (2 days or less)
    if (daysRemaining <= 2) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      });
      
      await this.notifyAdmins({
        title: 'Rental Due Soon',
        message: `${user?.name || 'A user'}'s rental of ${itemName} is due in ${daysRemaining} days`,
        type: NotificationType.RENTAL_DUE_REMINDER,
        relatedId: rentalId
      });
    }
  }
  
  /**
   * Create general info notification
   */
  async createGeneralInfoNotification({
    title,
    message,
    userIds = [],
    roles = []
  }: {
    title: string;
    message: string;
    userIds?: string[];
    roles?: Role[];
  }) {
    const notifications = [];
    
    // Create for specific users
    if (userIds.length > 0) {
      const userNotifications = await this.createNotificationsForUsers({
        userIds,
        title,
        message,
        type: NotificationType.GENERAL_INFO
      });
      
      notifications.push(...userNotifications);
    }
    
    // Create for specific roles
    for (const role of roles) {
      const roleNotifications = await this.createNotificationsForRole({
        role,
        title,
        message,
        type: NotificationType.GENERAL_INFO
      });
      
      notifications.push(...roleNotifications);
    }
    
    return notifications;
  }
}

export const notificationService = new NotificationService();
export default notificationService; 