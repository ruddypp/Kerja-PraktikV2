'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { NotificationType } from '@prisma/client';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

interface NotificationDropdownProps {
  userId: string;
}

export default function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  
  // Intelligent polling settings
  const [userActive, setUserActive] = useState<boolean>(true);
  const lastFetchTimeRef = useRef<string>(new Date().toISOString());
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true); // Track if page is active/visible
  
  // Constants for caching
  const CACHE_DURATION = 300000; // 5 minutes
  const CACHE_KEY = `notifications_${userId}`;
  const CACHE_TIMESTAMP_KEY = `notifications_timestamp_${userId}`;
  
  // Polling intervals based on activity
  const POLLING_INTERVALS = {
    ACTIVE: 60000,     // 1 minute when user is active
    INACTIVE: 300000,  // 5 minutes when user is inactive
    BACKGROUND: 600000 // 10 minutes when tab is in background
  };
  
  // Initialize Socket.IO connection
  const initSocketConnection = useCallback(() => {
    if (!userId || socketRef.current) return;
    
    try {
      // Create socket instance
      const socket = io({
        path: '/api/socketio',
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
      
      socketRef.current = socket;
      
      // Connection events
      socket.on('connect', () => {
        console.log('Socket connected');
        
        // Authenticate with userId
        socket.emit('authenticate', userId);
        
        // Set initial adaptive polling config
        socket.emit('set_polling_config', { 
          userId,
          isActive: userActive, 
          priority: 'normal' 
        });
      });
      
      // Handle reconnection
      socket.on('reconnect', () => {
        console.log('Socket reconnected');
        socket.emit('authenticate', userId);
        
        // Force refresh notifications on reconnect
        fetchNotifications(true);
      });
      
      // Handle new notifications from server
      socket.on('new_notification', (data: { notification: Notification, priority: string }) => {
        setNotifications(prev => {
          const exists = prev.some(n => n.id === data.notification.id);
          if (exists) return prev;
          
          const updated = [data.notification, ...prev];
          // Keep array at reasonable size
          return updated.slice(0, 50);
        });
        
        if (!data.notification.isRead) {
          setUnreadCount(prev => prev + 1);
        }
        
        // Update cache
        updateNotificationCache(data.notification);
      });
      
      // Handle notification status changes
      socket.on('notification_marked_read', ({ id }: { id: string }) => {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === id ? { ...notif, isRead: true } : notif
          )
        );
        
        calculateUnreadCount();
        updateCache();
      });
      
      socket.on('notifications_marked_read', () => {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        
        setUnreadCount(0);
        updateCache();
      });
      
      // Handle browser push notifications for high priority notifications
      socket.on('push_notification', (data: { title: string, message: string, icon?: string }) => {
        if (Notification.permission === 'granted' && document.hidden) {
          new Notification(data.title, {
            body: data.message,
            icon: data.icon || '/favicon.ico'
          });
        }
      });
      
      // Handle errors
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setError('Connection error. Retrying...');
        
        // Fallback to traditional polling on connection error
        setupIntelligentPolling();
      });
      
      socket.on('error', (error) => {
        console.error('Socket error:', error);
        setError(error.message || 'An error occurred');
      });
      
      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        
        // Fallback to traditional polling on disconnection
        setupIntelligentPolling();
      });
      
      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing socket:', error);
      setError('Failed to establish real-time connection. Using polling instead.');
      
      // Fallback to traditional polling
      setupIntelligentPolling();
    }
  }, [userId, userActive]);
  
  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        await Notification.requestPermission();
      }
    }
  }, []);
  
  // Function to update notification cache
  const updateNotificationCache = useCallback((newNotification: Notification) => {
    try {
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const data = JSON.parse(cachedData);
        
        // Check if notification already exists
        const exists = data.notifications.some((n: Notification) => n.id === newNotification.id);
        if (!exists) {
          data.notifications = [newNotification, ...data.notifications];
          
          if (!newNotification.isRead) {
            data.unreadCount += 1;
          }
          
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        }
      }
    } catch {
      // Ignore cache errors
    }
  }, [CACHE_KEY]);
  
  // Update entire cache
  const updateCache = useCallback(() => {
    try {
      const cacheData = {
        notifications,
        unreadCount,
        lastFetchTime: new Date().toISOString(),
      };
      
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch {
      // Ignore cache errors
    }
  }, [CACHE_KEY, notifications, unreadCount]);
  
  // Recalculate unread count
  const calculateUnreadCount = useCallback(() => {
    const count = notifications.filter(n => !n.isRead).length;
    setUnreadCount(count);
  }, [notifications]);
  
  // Fetch notifications with caching and incremental loading
  const fetchNotifications = useCallback(async (forceRefresh = false) => {
    if (!userId) return;
    
    try {
      setError(null);
      setLoading(true);
      
      // Check cache first (unless force refresh is requested)
      if (!forceRefresh) {
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        const lastFetch = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
        const now = Date.now();
        
        // Use cache if available and not expired
        if (cachedData && lastFetch && now - parseInt(lastFetch) < CACHE_DURATION) {
          const data = JSON.parse(cachedData);
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
          lastFetchTimeRef.current = data.lastFetchTime || new Date().toISOString();
          setLoading(false);
          return;
        }
      }
      
      // Make API request with retry logic and incremental loading
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          // Use lastFetchTime for incremental loading
          const url = `/api/admin/notifications?userId=${userId}&limit=10` + 
                      (forceRefresh ? '' : `&lastFetchTime=${encodeURIComponent(lastFetchTimeRef.current)}`);
          
          const response = await fetch(url, {
            cache: 'no-store'
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch notifications: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (forceRefresh) {
            // Replace all notifications
            setNotifications(data.notifications);
          } else {
            // Merge new notifications with existing ones
            setNotifications(prev => {
              const merged = [...data.notifications];
              
              // Add existing notifications that aren't in the new batch
              prev.forEach(notification => {
                if (!merged.some(n => n.id === notification.id)) {
                  merged.push(notification);
                }
              });
              
              // Sort by createdAt descending
              return merged.sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
            });
          }
          
          setUnreadCount(data.unreadCount);
          
          // Update lastFetchTime for next incremental fetch
          lastFetchTimeRef.current = data.lastFetchTime || new Date().toISOString();
          
          // Cache the results
          updateCache();
          break; // Success, exit retry loop
        } catch (error) {
          retries++;
          
          if (retries >= maxRetries) {
            throw error; // Rethrow if max retries reached
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
      
      // Try to use cached data even if it's expired
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedData) {
        try {
          const data = JSON.parse(cachedData);
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
          lastFetchTimeRef.current = data.lastFetchTime || new Date().toISOString();
        } catch {
          // Ignore parsing errors
        }
      }
    } finally {
      setLoading(false);
    }
  }, [userId, CACHE_DURATION, CACHE_KEY, updateCache]);
  
  // Setup intelligent polling based on user activity
  const setupIntelligentPolling = useCallback(() => {
    // Clear any existing intervals
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }
    
    // Set appropriate polling interval based on user activity and tab visibility
    let interval = POLLING_INTERVALS.ACTIVE;
    
    if (!isActiveRef.current) {
      interval = POLLING_INTERVALS.BACKGROUND;
    } else if (!userActive) {
      interval = POLLING_INTERVALS.INACTIVE;
    }
    
    // Set up new polling interval
    pollingTimeoutRef.current = setTimeout(() => {
      if (isActiveRef.current || interval === POLLING_INTERVALS.BACKGROUND) {
        fetchNotifications();
      }
      
      // Recursively setup next poll
      setupIntelligentPolling();
    }, interval);
  }, [fetchNotifications, userActive, POLLING_INTERVALS]);
  
  // Track user activity
  const handleUserActivity = useCallback(() => {
    setUserActive(true);
    
    // Reset activity timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    
    // Set user as inactive after 2 minutes of no activity
    activityTimeoutRef.current = setTimeout(() => {
      setUserActive(false);
      
      // Update socket.io preference if connected
      if (socketRef.current?.connected) {
        socketRef.current.emit('set_polling_config', { 
          userId, 
          isActive: false,
          priority: 'normal' 
        });
      }
      
      // Adjust polling interval
      setupIntelligentPolling();
    }, 120000); // 2 minutes of inactivity
    
    // Update socket.io preference if connected
    if (socketRef.current?.connected && !userActive) {
      socketRef.current.emit('set_polling_config', { 
        userId, 
        isActive: true,
        priority: 'normal' 
      });
    }
  }, [userId, userActive, setupIntelligentPolling]);
  
  // Initialize the component
  useEffect(() => {
    if (!userId) return;
    
    // Initialize Socket.IO
    initSocketConnection();
    
    // Request notification permissions
    requestNotificationPermission();
    
    // Initial fetch of notifications
    fetchNotifications();
    
    // Set up activity tracking
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    
    // Track document visibility to adjust polling
    const handleVisibilityChange = () => {
      isActiveRef.current = document.visibilityState === 'visible';
      
      // If becoming visible and cache is stale, fetch new data
      if (isActiveRef.current) {
        const lastFetch = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
        const now = Date.now();
        if (!lastFetch || now - parseInt(lastFetch) > CACHE_DURATION) {
          fetchNotifications();
        }
      }
      
      // Adjust polling interval based on visibility
      setupIntelligentPolling();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle user activity initially
    handleUserActivity();
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Clean up intervals and timeouts
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
      
      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [
    userId,
    fetchNotifications,
    handleUserActivity,
    initSocketConnection,
    requestNotificationPermission,
    setupIntelligentPolling,
    CACHE_DURATION
  ]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Toggle dropdown and refresh notifications when opening
  const toggleDropdown = () => {
    if (!isOpen) {
      // Refresh notifications when opening dropdown
        fetchNotifications(true);
    }
    
    setIsOpen(!isOpen);
  };
  
  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      // Check if connected to socket.io
      if (socketRef.current?.connected) {
        socketRef.current.emit('mark_notification_read', {
          userId,
          notificationId: id
        });
      } else {
        // Fallback to REST API
      const response = await fetch(`/api/admin/notifications?id=${id}`, {
        method: 'PATCH',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
        if (!response.ok) {
          throw new Error('Failed to mark notification as read');
        }
      }
      
        // Update the local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === id ? { ...notif, isRead: true } : notif
          )
        );
      
      // Recalculate unread count
      calculateUnreadCount();
        
        // Update cache
      updateCache();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setError('Failed to mark as read. Please try again.');
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      // Check if connected to socket.io
      if (socketRef.current?.connected) {
        socketRef.current.emit('mark_all_read', { userId });
      } else {
        // Fallback to REST API
      const response = await fetch(`/api/admin/notifications?userId=${userId}&markAllRead=true`, {
        method: 'PATCH',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
        if (!response.ok) {
          throw new Error('Failed to mark all notifications as read');
        }
      }
      
        // Update the local state
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, isRead: true }))
        );
      
      // Update unread count
        setUnreadCount(0);
        
        // Update cache
      updateCache();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setError('Failed to mark all as read. Please try again.');
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    fetchNotifications(true);
  };
  
  // Get icon and color based on notification type
  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case 'RENTAL_REQUEST':
      case 'RENTAL_STATUS_CHANGE':
        return { 
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: 'text-orange-500 bg-orange-100'
        };
      case 'CALIBRATION_REMINDER':
      case 'CALIBRATION_STATUS_CHANGE':
        return { 
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 21H5v-6l2.257-2.257A6 6 0 1119 9z" />
            </svg>
          ),
          color: 'text-purple-500 bg-purple-100'
        };
      case 'RENTAL_DUE_REMINDER':
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: 'text-red-500 bg-red-100'
        };
      case 'MAINTENANCE_REMINDER':
        return { 
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          color: 'text-blue-500 bg-blue-100'
        };
      case 'INVENTORY_SCHEDULE':
        return { 
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
          color: 'text-green-500 bg-green-100'
        };
      case 'VENDOR_INFO':
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
          color: 'text-indigo-500 bg-indigo-100'
        };
      case 'GENERAL_INFO':
      default:
        return { 
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: 'text-gray-500 bg-gray-100'
        };
    }
  };
  
  // Format date to relative time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }
    
    return date.toLocaleDateString();
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="p-2 rounded-full hover:bg-gray-100 relative"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Notifications</h3>
              <div className="flex space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  onClick={handleRefresh}
                  className="text-sm text-gray-600 hover:text-gray-800"
                  title="Refresh notifications"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500 mr-2"></div>
                Loading notifications...
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-red-500 text-sm mb-2">{error}</p>
                <button 
                  onClick={handleRefresh}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map(notification => {
                const { icon, color } = getNotificationStyle(notification.type);
                return (
                  <div 
                    key={notification.id} 
                    className={`p-4 hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50' : ''}`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="flex">
                      <div className={`rounded-full p-2 mr-3 ${color}`}>
                        {icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(notification.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
} 