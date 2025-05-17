import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';

// Store active socket connections
export const activeConnections = new Map<string, string>();

interface SocketServerSingleton {
  io: SocketIOServer | null;
  initialized: boolean;
}

// Singleton pattern to ensure we only have one socket.io server
export const socketServerSingleton: SocketServerSingleton = {
  io: null,
  initialized: false,
};

// Function to initialize Socket.IO server
export const initSocketServer = (req: NextApiRequest, res: NextApiResponse) => {
  if (!socketServerSingleton.initialized) {
    const httpServer: NetServer = (res as any).socket?.server;
    
    if (!httpServer) {
      console.error('HTTP Server not available');
      return null;
    }
    
    const io = new ServerIO(httpServer, {
      path: '/api/socket-io',
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      addTrailingSlash: false,
    });
    
    socketServerSingleton.io = io;
    socketServerSingleton.initialized = true;
    
    // Setup connection handler
    io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);
      
      // Handle user authentication
      socket.on('authenticate', (userId: string) => {
        if (userId) {
          activeConnections.set(userId, socket.id);
          socket.join(`user:${userId}`);
          console.log(`User ${userId} authenticated with socket ${socket.id}`);
        }
      });
      
      // Clean up on disconnect
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        
        // Remove from active connections
        for (const [userId, socketId] of activeConnections.entries()) {
          if (socketId === socket.id) {
            activeConnections.delete(userId);
            console.log(`User ${userId} connection removed`);
            break;
          }
        }
      });
    });
    
    console.log('Socket.IO initialized');
  }
  
  return socketServerSingleton.io;
};

// Function to get access to the Socket.IO server instance
export const getSocketServer = () => {
  return socketServerSingleton.io;
};

// Send notification to a specific user
export const sendNotificationToUser = (userId: string, notification: any) => {
  if (!socketServerSingleton.io) {
    console.error('Socket.IO server not initialized');
    return;
  }
  
  socketServerSingleton.io.to(`user:${userId}`).emit('notification', notification);
};

// Send notification to all connected users
export const broadcastNotification = (notification: any) => {
  if (!socketServerSingleton.io) {
    console.error('Socket.IO server not initialized');
    return;
  }
  
  socketServerSingleton.io.emit('notification', notification);
}; 