# Notification System Developer Guide

This guide explains how to use the notification system in your application code.

## Creating Notifications

To create a notification, use the `createNotification` function from the notification service:

```typescript
import { createNotification } from '@/lib/notificationService';
import { NotificationType } from '@prisma/client';

// Create a notification
await createNotification({
  userId: "user-id-here",
  title: "Notification Title",
  message: "Notification message details here",
  type: "RENTAL_STATUS_CHANGE" as NotificationType,
  relatedId: "optional-related-entity-id"
});
```

## Notification Types and Priorities

Notifications are automatically prioritized based on type:

### High Priority Notifications (delivered immediately via WebSocket):
- `RENTAL_STATUS_CHANGE` - Changes in rental status (approved, rejected, etc.)
- `CALIBRATION_STATUS_CHANGE` - Changes in calibration status

### Medium Priority Notifications:
- `RENTAL_DUE_REMINDER` - Reminders for rental due dates
- `CALIBRATION_REMINDER` - Reminders for upcoming calibrations
- `MAINTENANCE_REMINDER` - Reminders for scheduled maintenance

### Low Priority Notifications:
- `INVENTORY_SCHEDULE` - Inventory check scheduling information
- `VENDOR_INFO` - Updates about vendor information
- `GENERAL_INFO` - General system information

## Browser Notifications

High-priority notifications will trigger browser notifications if:
1. The user has granted notification permissions
2. The browser tab is not currently active (in background)

## Common Use Cases

### 1. Notify users about rental status changes:

```typescript
// In your rental approval handler
async function approveRental(rentalId: string, userId: string) {
  // ... your approval logic
  
  // Notify the user
  await createNotification({
    userId,
    title: "Rental Request Approved",
    message: `Your rental request #${rentalId} has been approved.`,
    type: "RENTAL_STATUS_CHANGE",
    relatedId: rentalId
  });
}
```

### 2. Send calibration reminders:

```typescript
// In a scheduled job that checks for upcoming calibrations
async function sendCalibrationReminders() {
  const dueCalibrations = await prisma.calibration.findMany({
    where: {
      validUntil: {
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      }
    },
    include: {
      user: true,
      item: true
    }
  });
  
  for (const calibration of dueCalibrations) {
    await createNotification({
      userId: calibration.userId,
      title: "Calibration Due Soon",
      message: `Calibration for ${calibration.item.name} (${calibration.item.serialNumber}) is due in 7 days.`,
      type: "CALIBRATION_REMINDER",
      relatedId: calibration.id
    });
  }
}
```

## Testing Notifications

To test the notification system, you can use the provided test script:

```bash
npm run test:notifications
```

This will create sample notifications of each type for a user and admin account.

## Debugging

Socket.IO connections can be monitored in the browser console and server logs.

If you see "Connection error. Retrying..." in the UI, the system will automatically fall back to polling-based notifications. 