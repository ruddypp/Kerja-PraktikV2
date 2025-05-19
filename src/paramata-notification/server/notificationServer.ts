import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

// Setup CORS for socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_APP_URL 
      : 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Track connected clients and their last fetch times
interface ConnectedClient {
  userId: string;
  role: string;
  lastFetchTime: Date;
  priority: number; // 1-10, higher number = higher priority
  active: boolean; // Is the user's tab active?
}

const connectedClients = new Map<string, ConnectedClient>();

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  let clientUserId: string | null = null;
  
  // Handle client registration
  socket.on('register', async ({ userId, role }) => {
    try {
      if (!userId) {
        socket.emit('error', { message: 'User ID is required' });
        return;
      }
      
      clientUserId = userId;
      
      // Store client info with default values
      connectedClients.set(socket.id, {
        userId,
        role,
        lastFetchTime: new Date(),
        priority: 5, // Default priority
        active: true
      });
      
      console.log(`User ${userId} registered with role ${role}`);
      
      // Get initial notifications for the user
      const initialNotifications = await getNotificationsForUser(userId);
      socket.emit('initial_notifications', initialNotifications);
      
    } catch (error) {
      console.error('Registration error:', error);
      socket.emit('error', { message: 'Failed to register for notifications' });
    }
  });
  
  // Handle tab visibility changes
  socket.on('visibility_change', ({ isVisible }) => {
    const client = connectedClients.get(socket.id);
    if (client) {
      client.active = isVisible;
      connectedClients.set(socket.id, client);
      
      // If becoming visible, send latest notifications immediately
      if (isVisible && clientUserId) {
        sendLatestNotifications(socket, clientUserId);
      }
    }
  });
  
  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connectedClients.delete(socket.id);
  });
  
  // Handle priority changes
  socket.on('set_priority', ({ priority }) => {
    const client = connectedClients.get(socket.id);
    if (client) {
      client.priority = Math.max(1, Math.min(10, priority)); // Ensure priority is between 1-10
      connectedClients.set(socket.id, client);
    }
  });
  
  // Handle manual refresh request
  socket.on('refresh_notifications', () => {
    if (clientUserId) {
      sendLatestNotifications(socket, clientUserId);
    }
  });
  
  // Handle mark as read for a specific notification
  socket.on('mark_as_read', async ({ notificationId }) => {
    try {
      if (!clientUserId) return;
      
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
      });
      
      // Emit event to confirm the notification was marked as read
      socket.emit('notification_marked_read', { notificationId });
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      socket.emit('error', { message: 'Failed to mark notification as read' });
    }
  });
  
  // Handle mark all as read
  socket.on('mark_all_read', async () => {
    try {
      if (!clientUserId) return;
      
      await prisma.notification.updateMany({
        where: { 
          userId: clientUserId,
          isRead: false
        },
        data: { isRead: true }
      });
      
      // Emit event to confirm all notifications were marked as read
      socket.emit('all_notifications_marked_read');
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      socket.emit('error', { message: 'Failed to mark all notifications as read' });
    }
  });
});

// Function to get notifications for a user
async function getNotificationsForUser(userId: string, limit = 20) {
  try {
    // Get notifications
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    // Get count of unread notifications
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });
    
    return { notifications, unreadCount };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

// Function to get new notifications since last fetch
async function getNewNotifications(userId: string, since: Date) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        createdAt: {
          gt: since
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return notifications;
  } catch (error) {
    console.error('Error fetching new notifications:', error);
    throw error;
  }
}

// Send latest notifications to a client
async function sendLatestNotifications(socket: any, userId: string) {
  try {
    const client = connectedClients.get(socket.id);
    if (!client) return;
    
    // Get new notifications since last fetch
    const newNotifications = await getNewNotifications(userId, client.lastFetchTime);
    
    // Update last fetch time
    client.lastFetchTime = new Date();
    connectedClients.set(socket.id, client);
    
    // If there are new notifications, send them
    if (newNotifications.length > 0) {
      socket.emit('new_notifications', newNotifications);
      
      // Send browser notification for high priority notifications
      const highPriorityNotifications = newNotifications.filter(notification => 
        isPriorityNotification(notification.type)
      );
      
      if (highPriorityNotifications.length > 0) {
        socket.emit('priority_notifications', highPriorityNotifications);
      }
    }
    
    // Always send updated unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });
    
    socket.emit('unread_count', { unreadCount });
    
  } catch (error) {
    console.error('Error sending latest notifications:', error);
  }
}

// Determine if notification type is high priority
function isPriorityNotification(type: NotificationType): boolean {
  // These are considered high priority notifications that might need immediate attention
  return [
    NotificationType.RENTAL_DUE_REMINDER,
    NotificationType.CALIBRATION_REMINDER,
    NotificationType.MAINTENANCE_REMINDER
  ].includes(type);
}

// Start polling for new notifications for all connected clients
// Adaptive polling based on priority and activity
setInterval(async () => {
  for (const [socketId, client] of connectedClients.entries()) {
    try {
      // Skip inactive clients
      if (!client.active) continue;
      
      // Get socket instance
      const socket = io.sockets.sockets.get(socketId);
      if (!socket) {
        connectedClients.delete(socketId);
        continue;
      }
      
      // Send latest notifications
      await sendLatestNotifications(socket, client.userId);
      
    } catch (error) {
      console.error(`Error in notification polling for client ${socketId}:`, error);
    }
  }
}, 30000); // Base interval is 30 seconds

// Dynamic polling interval handler - adjusts polling frequency based on user activity
const ADAPTIVE_INTERVAL_MAP = new Map<number, number>([
  [1, 300000],  // Priority 1: 5 minutes
  [2, 240000],  // Priority 2: 4 minutes
  [3, 180000],  // Priority 3: 3 minutes
  [4, 120000],  // Priority 4: 2 minutes
  [5, 60000],   // Priority 5: 1 minute (default)
  [6, 45000],   // Priority 6: 45 seconds
  [7, 30000],   // Priority 7: 30 seconds
  [8, 20000],   // Priority 8: 20 seconds
  [9, 15000],   // Priority 9: 15 seconds
  [10, 10000],  // Priority 10: 10 seconds (highest priority)
]);

// Adaptive polling based on priority
setInterval(() => {
  for (const [socketId, client] of connectedClients.entries()) {
    try {
      // Skip if not active
      if (!client.active) continue;
      
      // Get socket instance
      const socket = io.sockets.sockets.get(socketId);
      if (!socket) {
        connectedClients.delete(socketId);
        continue;
      }
      
      // Check if it's time to poll for this client based on priority
      const interval = ADAPTIVE_INTERVAL_MAP.get(client.priority) || 60000; // Default to 60 seconds
      const timeSinceLastFetch = new Date().getTime() - client.lastFetchTime.getTime();
      
      if (timeSinceLastFetch >= interval) {
        sendLatestNotifications(socket, client.userId);
      }
      
    } catch (error) {
      console.error(`Error in adaptive polling for client ${socketId}:`, error);
    }
  }
}, 5000); // Check every 5 seconds

// Start the server
const PORT = process.env.NOTIFICATION_SERVER_PORT || 4000;
server.listen(PORT, () => {
  console.log(`Notification server running on port ${PORT}`);
});

export default server; 