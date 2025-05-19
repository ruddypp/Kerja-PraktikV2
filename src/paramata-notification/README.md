# Paramata Notification System

A real-time notification system using Socket.IO with intelligent/adaptive polling capabilities.

## Features

- Socket.IO based real-time notifications
- Adaptive polling based on user activity and tab visibility
- Incremental fetching (only fetches new notifications since last request)
- Differential loading (prioritizes important notifications)
- Browser notification API integration
- Offline mode with automatic reconnection
- Caching for improved performance

## Architecture

The notification system consists of two main parts:

1. **Server**: A Socket.IO server that handles connections, fetches notifications, and implements adaptive polling.
2. **Client**: A notification client that connects to the Socket.IO server and provides a React component for displaying notifications.

## Setup

### Server Setup

1. Install dependencies:
   ```bash
   npm install socket.io express cors ts-node
   ```

2. Start the notification server:
   ```bash
   node src/paramata-notification/server.js
   ```

3. The server will run on port 4000 by default. You can change this by setting the `NOTIFICATION_SERVER_PORT` environment variable.

### Client Setup

1. Import and use the `SocketNotificationDropdown` component:

```tsx
import { SocketNotificationDropdown } from '@/paramata-notification/client/SocketNotificationDropdown';

// In your component:
<SocketNotificationDropdown userId={user.id} role={user.role} />
```

## Environment Variables

- `NEXT_PUBLIC_NOTIFICATION_SERVER_URL`: URL of the notification server (defaults to the origin URL or http://localhost:4000)
- `NOTIFICATION_SERVER_PORT`: Port number for the notification server (default: 4000)

## Creating Notifications

You can use the notification service to create new notifications:

```typescript
import { notificationService } from '@/paramata-notification/server';

// Create a notification for a specific user
await notificationService.createNotification({
  userId: 'user-id',
  title: 'Notification Title',
  message: 'Notification message',
  type: 'GENERAL_INFO',
});

// Create notifications for all users with a specific role
await notificationService.createNotificationsForRole({
  role: 'ADMIN',
  title: 'Notification Title',
  message: 'Notification message',
  type: 'GENERAL_INFO',
});
```

## Advanced Usage

### Browser Notifications

The client supports browser notifications for high-priority notifications. To enable:

```tsx
<SocketNotificationDropdown 
  userId={user.id} 
  role={user.role} 
  enableBrowserNotifications={true} 
/>
```

### Adaptive Polling Configuration

The notification client automatically adjusts polling frequency based on:

- Tab visibility (active/background)
- User interaction patterns
- Connection quality
- Notification priority

This ensures timely delivery of important notifications while minimizing server load.

## Event Flow

1. Client connects to the notification server
2. Client sends 'register' event with user ID and role
3. Server fetches initial notifications and sends to client
4. Server begins adaptive polling based on client priority
5. When tab becomes visible/active, client notifies server to increase polling frequency
6. When tab becomes hidden/inactive, client notifies server to decrease polling frequency
7. When new notifications arrive, server pushes them to the client

## Technical Details

### Intelligent Polling

The system uses a sophisticated polling approach that:

- Adjusts polling frequency based on user activity
- Only fetches new notifications since the last request
- Uses exponential backoff for reconnection attempts
- Prioritizes high-importance notifications

### Data Flow

```
┌────────────┐     ┌────────────┐     ┌───────────────┐
│            │     │            │     │               │
│  Database  │◄────┤  Socket.IO │◄────┤  Client App   │
│            │     │   Server   │     │               │
└────────────┘     └────────────┘     └───────────────┘
                          │                   ▲
                          │                   │
                          ▼                   │
                   ┌────────────┐            │
                   │Notification│            │
                   │  Service   │────────────┘
                   └────────────┘
``` 