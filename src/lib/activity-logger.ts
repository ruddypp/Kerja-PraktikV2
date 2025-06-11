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
  vendorId?: string;
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
      vendorId
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
        ...(vendorId && { vendor: { connect: { id: vendorId } } })
      }
    });

    return activityLog;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
}

/**
 * Logs an item-related activity
 */
export async function logItemActivity(
  userId: string,
  type: ActivityType.ITEM_CREATED | ActivityType.ITEM_UPDATED | ActivityType.ITEM_DELETED,
  itemSerial: string,
  details?: string
) {
  const actionMap = {
    [ActivityType.ITEM_CREATED]: 'Item created',
    [ActivityType.ITEM_UPDATED]: 'Item updated',
    [ActivityType.ITEM_DELETED]: 'Item deleted'
  };

  return logActivity({
    userId,
    type,
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
  type: ActivityType.CALIBRATION_CREATED | ActivityType.CALIBRATION_UPDATED | ActivityType.CALIBRATION_DELETED,
  calibrationId: string,
  itemSerial: string,
  details?: string
) {
  const actionMap = {
    [ActivityType.CALIBRATION_CREATED]: 'Calibration created',
    [ActivityType.CALIBRATION_UPDATED]: 'Calibration updated',
    [ActivityType.CALIBRATION_DELETED]: 'Calibration deleted'
  };

  return logActivity({
    userId,
    type,
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
  type: ActivityType.MAINTENANCE_CREATED | ActivityType.MAINTENANCE_UPDATED | ActivityType.MAINTENANCE_DELETED,
  maintenanceId: string,
  itemSerial: string,
  details?: string
) {
  const actionMap = {
    [ActivityType.MAINTENANCE_CREATED]: 'Maintenance created',
    [ActivityType.MAINTENANCE_UPDATED]: 'Maintenance updated',
    [ActivityType.MAINTENANCE_DELETED]: 'Maintenance deleted'
  };

  return logActivity({
    userId,
    type,
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
  type: ActivityType.RENTAL_CREATED | ActivityType.RENTAL_UPDATED | ActivityType.RENTAL_DELETED,
  rentalId: string,
  itemSerial: string,
  details?: string
) {
  const actionMap = {
    [ActivityType.RENTAL_CREATED]: 'Rental created',
    [ActivityType.RENTAL_UPDATED]: 'Rental updated',
    [ActivityType.RENTAL_DELETED]: 'Rental deleted'
  };

  return logActivity({
    userId,
    type,
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
  type: ActivityType.USER_CREATED | ActivityType.USER_UPDATED | ActivityType.USER_DELETED,
  affectedUserId: string,
  details?: string
) {
  const actionMap = {
    [ActivityType.USER_CREATED]: 'User created',
    [ActivityType.USER_UPDATED]: 'User updated',
    [ActivityType.USER_DELETED]: 'User deleted'
  };

  return logActivity({
    userId,
    type,
    action: actionMap[type],
    details,
    affectedUserId
  });
}

/**
 * Logs a vendor-related activity
 */
export async function logVendorActivity(
  userId: string,
  type: ActivityType.VENDOR_CREATED | ActivityType.VENDOR_UPDATED | ActivityType.VENDOR_DELETED,
  vendorId: string,
  details?: string
) {
  const actionMap = {
    [ActivityType.VENDOR_CREATED]: 'Vendor created',
    [ActivityType.VENDOR_UPDATED]: 'Vendor updated',
    [ActivityType.VENDOR_DELETED]: 'Vendor deleted'
  };

  return logActivity({
    userId,
    type,
    action: actionMap[type],
    details,
    vendorId
  });
} 