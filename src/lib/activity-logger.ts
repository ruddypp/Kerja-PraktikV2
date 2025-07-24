import prisma from '@/lib/prisma';
import { ActivityType } from '@prisma/client';

interface LogActivityParams {
  userId: string; // User performing the action
  type: ActivityType; // Type of activity from enum
  action: string; // Additional details about action
  details?: string; // More detailed description
  
  // Only one of these should be set
  itemSerial?: string;
  rentalId?: string;
  calibrationId?: string;
  maintenanceId?: string;
  affectedUserId?: string;
  customerId?: string;
}

/**
 * Logs an activity in the system
 * @param params Parameters for the activity log
 * @returns The created activity log or null if there was an error
 */
export async function logActivity(params: LogActivityParams) {
  try {
    const {
      userId,
      type,
      action,
      details,
      itemSerial,
      rentalId,
      calibrationId,
      maintenanceId,
      affectedUserId,
      customerId
    } = params;

    // Create activity log
    const activityLog = await prisma.activityLog.create({
      data: {
        type,
        action,
        details,
        user: { connect: { id: userId } },
        ...(itemSerial && { item: { connect: { serialNumber: itemSerial } } }),
        ...(rentalId && { rental: { connect: { id: rentalId } } }),
        ...(calibrationId && { calibration: { connect: { id: calibrationId } } }),
        ...(maintenanceId && { maintenance: { connect: { id: maintenanceId } } }),
        ...(affectedUserId && { affectedUser: { connect: { id: affectedUserId } } }),
        ...(customerId && { customer: { connect: { id: customerId } } })
      }
    });

    return activityLog;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
}

/**
 * Logs a login activity
 */
export async function logLoginActivity(
  userId: string,
  details?: string
) {
  return logActivity({
    userId,
    type: 'LOGIN' as ActivityType,
    action: 'User logged in',
    details
  });
}

/**
 * Logs an item-related activity
 */
export async function logItemActivity(
  userId: string,
  type: 'ITEM_CREATED' | 'ITEM_UPDATED' | 'ITEM_DELETED',
  itemSerial: string,
  details?: string
) {
  const actionMap: Record<string, string> = {
    'ITEM_CREATED': 'Item created',
    'ITEM_UPDATED': 'Item updated',
    'ITEM_DELETED': 'Item deleted'
  };

  return logActivity({
    userId,
    type: type as ActivityType,
    action: actionMap[type],
    details,
    itemSerial
  });
}

/**
 * Logs a calibration-related activity
 */
export async function logCalibrationActivity(
  userId: string,
  type: 'CALIBRATION_CREATED' | 'CALIBRATION_UPDATED' | 'CALIBRATION_DELETED',
  calibrationId: string,
  itemSerial: string,
  details?: string
) {
  const actionMap: Record<string, string> = {
    'CALIBRATION_CREATED': 'Calibration created',
    'CALIBRATION_UPDATED': 'Calibration updated',
    'CALIBRATION_DELETED': 'Calibration deleted'
  };

  return logActivity({
    userId,
    type: type as ActivityType,
    action: actionMap[type],
    details,
    calibrationId,
    itemSerial
  });
}

/**
 * Logs a maintenance-related activity
 */
export async function logMaintenanceActivity(
  userId: string,
  type: 'MAINTENANCE_CREATED' | 'MAINTENANCE_UPDATED' | 'MAINTENANCE_DELETED',
  maintenanceId: string,
  itemSerial: string,
  details?: string
) {
  const actionMap: Record<string, string> = {
    'MAINTENANCE_CREATED': 'Maintenance created',
    'MAINTENANCE_UPDATED': 'Maintenance updated',
    'MAINTENANCE_DELETED': 'Maintenance deleted'
  };

  return logActivity({
    userId,
    type: type as ActivityType,
    action: actionMap[type],
    details,
    maintenanceId,
    itemSerial
  });
}

/**
 * Logs a rental-related activity
 */
export async function logRentalActivity(
  userId: string,
  type: 'RENTAL_CREATED' | 'RENTAL_UPDATED' | 'RENTAL_DELETED',
  rentalId: string,
  itemSerial: string,
  details?: string
) {
  const actionMap: Record<string, string> = {
    'RENTAL_CREATED': 'Rental created',
    'RENTAL_UPDATED': 'Rental updated',
    'RENTAL_DELETED': 'Rental deleted'
  };

  return logActivity({
    userId,
    type: type as ActivityType,
    action: actionMap[type],
    details,
    rentalId,
    itemSerial
  });
}

/**
 * Logs a user-related activity
 */
export async function logUserActivity(
  userId: string,
  type: 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED',
  affectedUserId: string,
  details?: string
) {
  const actionMap: Record<string, string> = {
    'USER_CREATED': 'User created',
    'USER_UPDATED': 'User updated',
    'USER_DELETED': 'User deleted'
  };

  return logActivity({
    userId,
    type: type as ActivityType,
    action: actionMap[type],
    details,
    affectedUserId
  });
}
/**
 * Logs a customer-related activity
 */
export async function logcustomerActivity(
  userId: string,
  type: 'customer_CREATED' | 'customer_UPDATED' | 'customer_DELETED',
  customerId: string,
  details?: string
) {
  const actionMap: Record<string, string> = {
    'customer_CREATED': 'customer created',
    'customer_UPDATED': 'customer updated',
    'customer_DELETED': 'customer deleted'
  };

  return logActivity({
    userId,
    type: type as ActivityType,
    action: actionMap[type],
    details,
    customerId
  });
} 