import { io, Socket } from 'socket.io-client';
import { NotificationType } from '@prisma/client';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  relatedId: string | null;
  createdAt: string;
}

interface NotificationClientOptions {
  serverUrl?: string;
  userId: string;
  role: string;
  onNewNotification?: (notification: Notification) => void;
  onUnreadCountChanged?: (count: number) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  autoReconnect?: boolean;
  autoReconnectDelay?: number;
  useAdaptivePolling?: boolean;
  enableBrowserNotifications?: boolean;
}

class NotificationClient {
  private socket: Socket | null = null;
  private userId: string;
  private role: string;
  private serverUrl: string;
  private autoReconnect: boolean;
  private autoReconnectDelay: number;
  private useAdaptivePolling: boolean;
  private enableBrowserNotifications: boolean;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private cachedNotifications: Notification[] = [];
  private unreadCount: number = 0;
  
  // Callbacks
  private onNewNotification: ((notification: Notification) => void) | undefined;
  private onUnreadCountChanged: ((count: number) => void) | undefined;
  private onConnect: (() => void) | undefined;
  private onDisconnect: (() => void) | undefined;
  private onError: ((error: any) => void) | undefined;
  
  constructor(options: NotificationClientOptions) {
    this.userId = options.userId;
    this.role = options.role;
    this.serverUrl = options.serverUrl || 
      (typeof window !== 'undefined' ? `${window.location.origin}` : 'http://localhost:4000');
    
    this.onNewNotification = options.onNewNotification;
    this.onUnreadCountChanged = options.onUnreadCountChanged;
    this.onConnect = options.onConnect;
    this.onDisconnect = options.onDisconnect;
    this.onError = options.onError;
    
    this.autoReconnect = options.autoReconnect !== false;
    this.autoReconnectDelay = options.autoReconnectDelay || 5000;
    this.useAdaptivePolling = options.useAdaptivePolling !== false;
    this.enableBrowserNotifications = options.enableBrowserNotifications || false;
    
    // Initialize browser notification permission if enabled
    if (this.enableBrowserNotifications && typeof window !== 'undefined' && 'Notification' in window) {
      this.requestNotificationPermission();
    }
    
    // Set up visibility change listener for adaptive polling
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
  
  /**
   * Initialize the connection to the notification server
   */
  connect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    // Create a new socket connection
    this.socket = io(this.serverUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling']
    });
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up Socket.IO event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('Connected to notification server');
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // Register with the server
      this.register();
      
      // Set priority based on visibility
      this.updatePriorityBasedOnVisibility();
      
      // Call the onConnect callback
      if (this.onConnect) {
        this.onConnect();
      }
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from notification server');
      this.connected = false;
      
      // Call the onDisconnect callback
      if (this.onDisconnect) {
        this.onDisconnect();
      }
      
      // Auto reconnect if enabled
      if (this.autoReconnect) {
        this.reconnect();
      }
    });
    
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      
      // Call the onError callback
      if (this.onError) {
        this.onError(error);
      }
    });
    
    // Handle receiving initial notifications
    this.socket.on('initial_notifications', ({ notifications, unreadCount }) => {
      console.log('Received initial notifications:', notifications.length);
      this.cachedNotifications = notifications;
      this.unreadCount = unreadCount;
      
      // Call the onUnreadCountChanged callback
      if (this.onUnreadCountChanged) {
        this.onUnreadCountChanged(unreadCount);
      }
    });
    
    // Handle receiving new notifications
    this.socket.on('new_notifications', (notifications) => {
      console.log('Received new notifications:', notifications.length);
      
      // Update cached notifications
      this.cachedNotifications = [
        ...notifications,
        ...this.cachedNotifications.filter(cached => 
          !notifications.some(n => n.id === cached.id)
        )
      ];
      
      // Call the onNewNotification callback for each notification
      if (this.onNewNotification) {
        notifications.forEach(notification => {
          this.onNewNotification!(notification);
        });
      }
    });
    
    // Handle high priority notifications
    this.socket.on('priority_notifications', (notifications) => {
      // Show browser notifications if enabled and permission granted
      if (this.enableBrowserNotifications && 
          typeof window !== 'undefined' && 
          'Notification' in window && 
          Notification.permission === 'granted') {
        
        notifications.forEach(notification => {
          const browserNotification = new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            tag: notification.id
          });
          
          browserNotification.onclick = () => {
            window.focus();
            this.markAsRead(notification.id);
          };
        });
      }
    });
    
    // Handle updates to unread count
    this.socket.on('unread_count', ({ unreadCount }) => {
      this.unreadCount = unreadCount;
      
      // Call the onUnreadCountChanged callback
      if (this.onUnreadCountChanged) {
        this.onUnreadCountChanged(unreadCount);
      }
    });
    
    // Handle notification marked as read
    this.socket.on('notification_marked_read', ({ notificationId }) => {
      // Update the cached notification
      this.cachedNotifications = this.cachedNotifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true } 
          : notification
      );
    });
    
    // Handle all notifications marked as read
    this.socket.on('all_notifications_marked_read', () => {
      // Mark all cached notifications as read
      this.cachedNotifications = this.cachedNotifications.map(notification => 
        ({ ...notification, isRead: true })
      );
      
      // Update unread count
      this.unreadCount = 0;
      
      // Call the onUnreadCountChanged callback
      if (this.onUnreadCountChanged) {
        this.onUnreadCountChanged(0);
      }
    });
  }
  
  /**
   * Register with the notification server
   */
  private register(): void {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('register', {
      userId: this.userId,
      role: this.role
    });
  }
  
  /**
   * Handle visibility change for adaptive polling
   */
  private handleVisibilityChange = (): void => {
    if (!this.useAdaptivePolling || !this.socket) return;
    
    const isVisible = document.visibilityState === 'visible';
    
    // Update the server with visibility status
    this.socket.emit('visibility_change', { isVisible });
    
    // Update priority based on visibility
    this.updatePriorityBasedOnVisibility();
    
    // If becoming visible, refresh notifications
    if (isVisible) {
      this.refreshNotifications();
    }
  };
  
  /**
   * Update priority based on page visibility
   */
  private updatePriorityBasedOnVisibility(): void {
    if (!this.useAdaptivePolling || !this.socket) return;
    
    const isVisible = typeof document !== 'undefined' 
      ? document.visibilityState === 'visible'
      : true;
    
    // Higher priority for visible tabs
    const priority = isVisible ? 7 : 3;
    
    this.socket.emit('set_priority', { priority });
  }
  
  /**
   * Attempt to reconnect to the server
   */
  private reconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectAttempts++;
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.autoReconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  /**
   * Refresh notifications manually
   */
  refreshNotifications(): void {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('refresh_notifications');
  }
  
  /**
   * Mark a notification as read
   */
  markAsRead(notificationId: string): void {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('mark_as_read', { notificationId });
  }
  
  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('mark_all_read');
  }
  
  /**
   * Get cached notifications
   */
  getNotifications(): Notification[] {
    return this.cachedNotifications;
  }
  
  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.unreadCount;
  }
  
  /**
   * Request permission for browser notifications
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }
  
  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.connected = false;
    
    // Remove visibility change listener
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}

export default NotificationClient; 