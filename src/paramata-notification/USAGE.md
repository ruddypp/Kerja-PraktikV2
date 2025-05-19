# Paramata Notification System - Usage Guide

This document explains how to use the Paramata notification system with intelligent/adaptive polling to provide real-time notifications in your application.

## Understanding Intelligent/Adaptive Polling

Our notification system uses an intelligent polling approach that combines the best aspects of traditional polling with modern optimization techniques. Key features include:

### 1. Adaptive Polling Intervals

The system adjusts polling frequency based on several factors:
- **Tab visibility**: More frequent polling when the tab is active, reduced when inactive
- **User priority**: Administrators get higher priority and more frequent updates
- **Connection quality**: Adjusts based on network conditions
- **Content importance**: Critical notifications use higher frequency

### 2. Incremental Data Fetching

Rather than repeatedly fetching all notifications, the system only retrieves:
- New notifications since the last successful fetch
- Updates to notification status (read/unread)

This significantly reduces server load and bandwidth usage.

### 3. Visibility Awareness

The system detects when:
- The browser tab becomes active/inactive
- The user is actively interacting with the app
- The notification panel is opened/closed

### 4. Differential Loading

Not all notifications are created equal:
- High-priority notifications (due dates, calibration reminders) get special handling
- Critical notifications can trigger browser notifications
- Different polling strategies for different notification types

### 5. Hybrid Notification System

Combines multiple notification methods:
- Socket.IO for real-time communication
- Browser Notification API for important alerts
- Intelligent polling for reliability
- Local caching for offline support

## Implementation in Your Application

### Server Setup

1. Start the notification server:
```bash
npm run notifications
```

The server runs separately from your main Next.js application and handles all notification-related operations.

### Client Integration

#### Basic Usage

Replace the existing notification dropdown with the Socket.IO-powered version:

```tsx
// Layout.tsx or Header.tsx
import { SocketNotificationDropdown } from '@/paramata-notification/client';

// In your component
function Header() {
  const { data: session } = useSession();
  
  return (
    <header>
      {/* Other header elements */}
      
      {session?.user?.id && (
        <SocketNotificationDropdown 
          userId={session.user.id}
          role={session.user.role}
        />
      )}
    </header>
  );
}
```

#### Advanced Configuration

You can customize the notification client behavior:

```tsx
<SocketNotificationDropdown 
  userId={session.user.id}
  role={session.user.role}
  enableBrowserNotifications={true} // Enable browser notifications for important alerts
/>
```

### Creating Notifications

#### From API Routes

In your API routes, you can create notifications using the notification service:

```typescript
// src/app/api/rental/route.ts
import { notificationService } from '@/paramata-notification/server';

export async function POST(req: Request) {
  // Process rental request
  
  // Create notification for admins
  await notificationService.createRentalRequestNotification({
    requesterId: userId,
    itemName: item.name,
    rentalId: rental.id
  });
  
  return Response.json({ success: true });
}
```

#### Common Notification Types

The notification service provides helper methods for common notification types:

```typescript
// Rental request
await notificationService.createRentalRequestNotification({
  requesterId: userId,
  itemName: item.name,
  rentalId: rental.id
});

// Rental status change
await notificationService.createRentalStatusChangeNotification({
  rentalId: rental.id,
  userId: rental.userId,
  status: 'APPROVED', // or 'REJECTED', 'COMPLETED', etc.
  itemName: item.name
});

// Calibration reminder
await notificationService.createCalibrationReminderNotification({
  itemSerial: item.serialNumber,
  itemName: item.name,
  daysRemaining: 7 // Days until calibration is due
});

// General notification for specific users
await notificationService.createGeneralInfoNotification({
  title: 'System Maintenance',
  message: 'The system will be down for maintenance on Saturday',
  userIds: ['user-id-1', 'user-id-2'],
  roles: ['ADMIN'] // Optional: Send to all users with specific roles
});
```

## Performance Considerations

### Client-Side Impact

The Socket.IO client is designed to be lightweight and efficient:
- Connections are only established when a user is logged in
- Polling frequency reduces automatically when tabs are inactive
- Data is cached locally to reduce redundant requests

### Server-Side Impact

The notification server is optimized for handling many concurrent connections:
- Uses incremental data fetching to minimize database load
- Batches database queries when possible
- Implements client-side throttling to prevent abuse

## Troubleshooting

### Connection Issues

If notifications aren't being received in real-time:

1. Check that the notification server is running: `npm run notifications`
2. Verify the correct server URL is being used in the client
3. Check browser console for WebSocket connection errors
4. Ensure there are no CORS issues preventing socket connections

### Browser Notifications

If browser notifications aren't working:

1. Make sure the user has granted notification permissions
2. Verify `enableBrowserNotifications` is set to `true`
3. Test in a different browser to rule out browser-specific issues

## Extending the System

### Adding New Notification Types

1. Update the `NotificationType` enum in your Prisma schema
2. Add a handler function to `notificationService.ts`
3. Update the styling in `SocketNotificationDropdown.tsx`

### Custom Notification Processing

You can intercept and process notifications before displaying them:

```tsx
<SocketNotificationDropdown 
  userId={session.user.id}
  role={session.user.role}
  onNewNotification={(notification) => {
    // Custom processing logic
    console.log('New notification received:', notification);
    
    // You could play a sound, show a toast, etc.
    playNotificationSound();
  }}
/>
```

## Technical Deep Dive

### Data Flow

1. An event happens that should trigger a notification (e.g., rental request)
2. The API route calls `notificationService.createNotification()`
3. The notification is stored in the database
4. The notification service emits a Socket.IO event
5. Connected clients for the target user receive the event
6. The notification appears in the dropdown
7. For high-priority notifications, a browser notification is shown 