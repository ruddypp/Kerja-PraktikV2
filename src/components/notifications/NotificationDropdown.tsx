'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { NotificationType } from '@prisma/client';
import { Button } from '@/components/ui/button';

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
  
  // Constants for caching
  const CACHE_DURATION = 60000; // 1 minute
  const CACHE_KEY = `notifications_${userId}`;
  const CACHE_TIMESTAMP_KEY = `notifications_timestamp_${userId}`;

  // Fetch notifications with caching and error handling
  const fetchNotifications = useCallback(async (forceRefresh = false) => {
    // Skip if no userId
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
          setLoading(false);
          return;
        }
      }
      
      // Make API request with retry logic
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          const response = await fetch(`/api/admin/notifications?userId=${userId}&limit=10`, {
            cache: 'no-store'
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch notifications: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Cache the results
          const cacheData = {
            notifications: data.notifications,
            unreadCount: data.unreadCount
          };
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
          sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
          
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
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
        } catch (e) {
          // Ignore parsing errors
        }
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  // Fetch notifications on component mount and when userId changes
  useEffect(() => {
    fetchNotifications();
    
    // Set up polling for new notifications (every minute)
    const interval = setInterval(() => fetchNotifications(), 60000);
    
    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);
  
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
  
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    
    // Refresh notifications when opening dropdown if it's been a while
    if (!isOpen) {
      const lastFetch = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
      const now = Date.now();
      
      if (!lastFetch || now - parseInt(lastFetch) > CACHE_DURATION) {
        fetchNotifications(true);
      }
    }
  };
  
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/notifications?id=${id}`, {
        method: 'PATCH',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        // Update the local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === id ? { ...notif, isRead: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // Update cache
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            const data = JSON.parse(cachedData);
            data.notifications = data.notifications.map((notif: Notification) => 
              notif.id === id ? { ...notif, isRead: true } : notif
            );
            data.unreadCount = Math.max(0, data.unreadCount - 1);
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const markAllAsRead = async () => {
    try {
      const response = await fetch(`/api/admin/notifications?userId=${userId}&markAllRead=true`, {
        method: 'PATCH',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        // Update the local state
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
        
        // Update cache
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            const data = JSON.parse(cachedData);
            data.notifications = data.notifications.map((notif: Notification) => 
              ({ ...notif, isRead: true })
            );
            data.unreadCount = 0;
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    fetchNotifications(true);
  };
  
  // Get icon and color based on notification type
  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case 'REQUEST_UPDATE':
        return { 
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
          color: 'text-blue-500 bg-blue-100'
        };
      case 'CALIBRATION_UPDATE':
      case 'CALIBRATION_EXPIRY':
        return { 
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 21H5v-6l2.257-2.257A6 6 0 1119 9z" />
            </svg>
          ),
          color: 'text-purple-500 bg-purple-100'
        };
      case 'RENTAL_UPDATE':
      case 'RENTAL_EXPIRY':
        return { 
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: 'text-orange-500 bg-orange-100'
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
      case 'SYSTEM':
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