/**
 * Paramata Notification Server
 * 
 * This script starts a standalone Socket.IO server for real-time notifications
 * with intelligent/adaptive polling capabilities.
 */

// Enable TypeScript support
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2019',
  }
});

// Import and start the notification server
const { server } = require('./server/index');

// Log startup
console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║          PARAMATA NOTIFICATION SERVER          ║
║                                                ║
║           Intelligent Polling System           ║
║                                                ║
╚════════════════════════════════════════════════╝
`); 