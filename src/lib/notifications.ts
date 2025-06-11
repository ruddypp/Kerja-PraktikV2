import { prisma } from './prisma';
import { NotificationType, RequestStatus } from '@prisma/client';

/**
 * Creates a notification for a user
 */
export async function createNotification({
  userId,
  title,
  message,
  type,
  relatedId,
  actionUrl,
  actionLabel,
  secondaryActionUrl,
  secondaryActionLabel
}: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedId?: string;
  actionUrl?: string;
  actionLabel?: string;
  secondaryActionUrl?: string;
  secondaryActionLabel?: string;
}) {
  try {
    // Check if user has notifications enabled for this type
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId }
    });

    // If user has explicitly disabled this type of notification, don't send it
    if (preferences) {
      if (type === NotificationType.RENTAL_REQUEST || type === NotificationType.RENTAL_STATUS_CHANGE) {
        if (!preferences.rentalNotifications) return null;
      }
    }

    // Create the notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        relatedId,
        actionUrl,
        actionLabel,
        secondaryActionUrl,
        secondaryActionLabel
      }
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Sends rental status change notifications to relevant users
 */
export async function sendRentalStatusNotification(
  rental: any,
  status: RequestStatus,
  adminId: string,
  notes?: string
) {
  try {
    // Get admin name for the notification
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { name: true }
    });

    const adminName = admin?.name || 'Administrator';
    const itemName = rental.item.name;
    const serialNumber = rental.item.serialNumber;
    
    // Different messages based on status
    let userTitle = '';
    let userMessage = '';
    let adminTitle = '';
    let adminMessage = '';
    
    switch (status) {
      case RequestStatus.APPROVED:
        userTitle = `Rental Approved: ${itemName}`;
        userMessage = `Your rental request for ${itemName} (${serialNumber}) has been approved by ${adminName}${notes ? `. Notes: ${notes}` : '.'}`;
        
        adminTitle = `Rental Approved: ${itemName}`;
        adminMessage = `You approved rental request for ${itemName} (${serialNumber}) by ${rental.user.name}.`;
        break;
        
      case RequestStatus.REJECTED:
        userTitle = `Rental Rejected: ${itemName}`;
        userMessage = `Your rental request for ${itemName} (${serialNumber}) has been rejected by ${adminName}${notes ? `. Reason: ${notes}` : '.'}`;
        
        adminTitle = `Rental Rejected: ${itemName}`;
        adminMessage = `You rejected rental request for ${itemName} (${serialNumber}) by ${rental.user.name}.`;
        break;
        
      case RequestStatus.COMPLETED:
        userTitle = `Rental Completed: ${itemName}`;
        userMessage = `Your rental for ${itemName} (${serialNumber}) has been marked as completed by ${adminName}.`;
        
        adminTitle = `Rental Completed: ${itemName}`;
        adminMessage = `You marked rental for ${itemName} (${serialNumber}) by ${rental.user.name} as completed.`;
        break;
        
      case RequestStatus.PENDING:
        if (rental.returnDate) {
          // This is a return request
          userTitle = `Return Request Submitted: ${itemName}`;
          userMessage = `Your return request for ${itemName} (${serialNumber}) has been submitted and is pending approval.`;
          
          adminTitle = `New Return Request: ${itemName}`;
          adminMessage = `${rental.user.name} has submitted a return request for ${itemName} (${serialNumber}).`;
        } else {
          // This is a new rental request
          userTitle = `Rental Request Submitted: ${itemName}`;
          userMessage = `Your rental request for ${itemName} (${serialNumber}) has been submitted and is pending approval.`;
          
          adminTitle = `New Rental Request: ${itemName}`;
          adminMessage = `${rental.user.name} has submitted a rental request for ${itemName} (${serialNumber}).`;
        }
        break;
        
      default:
        userTitle = `Rental Status Updated: ${itemName}`;
        userMessage = `The status of your rental for ${itemName} (${serialNumber}) has been updated to ${status}.`;
        
        adminTitle = `Rental Status Updated: ${itemName}`;
        adminMessage = `You updated the status of rental for ${itemName} (${serialNumber}) by ${rental.user.name} to ${status}.`;
    }
    
    // Create action URL
    const userActionUrl = `/user/rentals`;
    const adminActionUrl = `/admin/rentals`;
    
    // Send notification to the user
    await createNotification({
      userId: rental.userId,
      title: userTitle,
      message: userMessage,
      type: NotificationType.RENTAL_STATUS_CHANGE,
      relatedId: rental.id,
      actionUrl: userActionUrl,
      actionLabel: 'View Rental'
    });
    
    // Send notification to the admin who made the change
    await createNotification({
      userId: adminId,
      title: adminTitle,
      message: adminMessage,
      type: NotificationType.RENTAL_STATUS_CHANGE,
      relatedId: rental.id,
      actionUrl: adminActionUrl,
      actionLabel: 'View Rental'
    });
    
    // If this is a new rental request, notify all admins
    if (status === RequestStatus.PENDING && !rental.returnDate) {
      // Get all admins except the one who made the change
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          id: { not: adminId } // Exclude the admin who made the change
        }
      });
      
      // Send notification to all other admins
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          title: `New Rental Request: ${itemName}`,
          message: `${rental.user.name} has submitted a rental request for ${itemName} (${serialNumber}).`,
          type: NotificationType.RENTAL_REQUEST,
          relatedId: rental.id,
          actionUrl: adminActionUrl,
          actionLabel: 'View Request'
        });
      }
    }
    
    // If this is a return request, notify all admins
    if (status === RequestStatus.PENDING && rental.returnDate) {
      // Get all admins except the one who made the change
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          id: { not: adminId } // Exclude the admin who made the change
        }
      });
      
      // Send notification to all other admins
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          title: `New Return Request: ${itemName}`,
          message: `${rental.user.name} has submitted a return request for ${itemName} (${serialNumber}).`,
          type: NotificationType.RENTAL_REQUEST,
          relatedId: rental.id,
          actionUrl: adminActionUrl,
          actionLabel: 'View Request'
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error sending rental status notification:', error);
    return false;
  }
} 