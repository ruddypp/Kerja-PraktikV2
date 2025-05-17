const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO with the server
  const io = new Server(server, {
    path: '/api/socketio',
    addTrailingSlash: false,
  });

  // Store active connections for quick access
  const activeConnections = new Map();

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Handle user authentication
    socket.on('authenticate', (userId) => {
      if (userId) {
        // Store the connection for this user
        activeConnections.set(userId, socket.id);
        socket.join(`user:${userId}`);
        console.log(`User ${userId} authenticated with socket ${socket.id}`);
      }
    });
    
    // Handle adaptive polling configuration
    socket.on('set_polling_config', ({ userId, isActive, priority }) => {
      if (userId) {
        socket.join(`priority:${priority || 'normal'}`);
        console.log(`User ${userId} set polling config: active=${isActive}, priority=${priority || 'normal'}`);
      }
    });
    
    // Request latest notifications (for incremental fetching)
    socket.on('get_latest_notifications', async ({ userId, lastFetchTime }) => {
      if (userId) {
        try {
          // This would normally call your API endpoint
          // Here we're just emitting a response directly
          socket.emit('latest_notifications', {
            success: true,
            message: 'Please implement the actual notification fetch in production',
          });
        } catch (error) {
          socket.emit('error', { 
            message: 'Failed to fetch notifications',
            error: error.message 
          });
        }
      }
    });
    
    // Handle marking notifications as read
    socket.on('mark_notification_read', async ({ userId, notificationId }) => {
      // Implementation would call your API endpoint
      console.log(`User ${userId} marked notification ${notificationId} as read`);
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
  
  // Expose socket.io instance to global object for access in API routes
  global.io = io;
  global.activeConnections = activeConnections;
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}); 