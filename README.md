# Intelligent Polling Notification System with Socket.IO

This notification system implements an intelligent polling approach using Socket.IO for real-time notifications with fallback to optimized polling.

## Features

- **Socket.IO Integration**: Real-time notifications delivered via WebSockets when possible
- **Intelligent Polling**:
  - Adaptive polling intervals based on user activity
  - Incremental fetching of notifications (only gets new data)
  - Visibility-aware polling (adjusts based on tab visibility)
  - Prioritization of notifications by importance
  - Browser notification support for high-priority alerts

## Implementation Details

### Backend Components
- Custom Node.js server with Socket.IO (server.js)
- Notification service for creating and delivering notifications (src/lib/notificationService.ts)
- Updated API routes for Socket.IO compatibility (src/app/api/admin/notifications/route.ts)

### Frontend Components
- Enhanced NotificationDropdown component with Socket.IO and intelligent polling
- Fallback mechanisms when WebSocket connection fails
- Browser notification support for critical alerts

## How It Works

1. **Connection Setup**:
   - When a user loads the app, a Socket.IO connection is established
   - If Socket.IO fails, the system falls back to intelligent polling

2. **Notification Delivery**:
   - High-priority notifications are sent immediately via WebSockets
   - For background tabs, browser notifications can be shown (with permission)
   - Polling frequency adapts based on user activity and tab visibility

3. **User Activity Tracking**:
   - Active users get more frequent polling (1 minute)
   - Inactive users (no activity for 2 minutes) get reduced polling (5 minutes)
   - Background tabs have minimal polling (10 minutes)

## Running the Application

```bash
# Run with Socket.IO for development
npm run dev:socket

# Run with Socket.IO for production
npm run start:socket
```

## Technical Considerations

- The system will fallback gracefully to optimized polling when Socket.IO is unavailable
- Browser notifications require user permission and only work for high-priority notifications
- All notification state is cached in sessionStorage for performance
