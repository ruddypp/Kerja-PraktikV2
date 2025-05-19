import server from './notificationServer';
import notificationService from './notificationService';
import { Server } from 'socket.io';

// Get the io instance from the server
const io = new Server(server);

// Set the io instance in the notification service
notificationService.setSocketServer(io);

export { server, notificationService }; 