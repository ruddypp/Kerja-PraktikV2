'use client';

import { useState, useEffect, useRef } from 'react';
import { NotificationType } from '@prisma/client';
import NotificationClient from './NotificationClient';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

interface NotificationDropdownProps {
  userId: string;
  role: string;
  enableBrowserNotifications?: boolean;
}

export default function SocketNotificationDropdown({
  userId,
  role,
  enableBrowserNotifications = true
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationClientRef = useRef<NotificationClient | null>(null);
  
  // Initialize notification client
  useEffect(() => {
    if (!userId) return;
    
    try {
      // Create a new notification client
      const client = new NotificationClient({
        userId,
        role,
        serverUrl: process.env.NEXT_PUBLIC_NOTIFICATION_SERVER_URL || undefined,
        enableBrowserNotifications,
        
        // Callbacks
        onConnect: () => {
          setIsConnected(true);
          setError(null);
        },
        
        onDisconnect: () => {
          setIsConnected(false);
        },
        
        onError: (error) => {
          setError('Failed to connect to notification server');
          console.error('Notification client error:', error);
        },
        
        onNewNotification: (notification) => {
          setNotifications(prev => [notification, ...prev.filter(n => n.id !== notification.id)]);
          
          // Update unread count
          if (!notification.isRead) {
            setUnreadCount(prev => prev + 1);
          }
        },
        
        onUnreadCountChanged: (count) => {
          setUnreadCount(count);
        }
      });
      
      // Connect to the server
      client.connect();
      
      // Store the client reference
      notificationClientRef.current = client;
      
      // Set loading to false
      setLoading(false);
      
      // Clean up on unmount
      return () => {
        client.disconnect();
        notificationClientRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing notification client:', error);
      setError('Failed to initialize notifications');
      setLoading(false);
    }
  }, [userId, role, enableBrowserNotifications]);
  
  // Sync notifications with client cache
  useEffect(() => {
    if (notificationClientRef.current) {
      setNotifications(notificationClientRef.current.getNotifications());
      setUnreadCount(notificationClientRef.current.getUnreadCount());
    }
  }, [isOpen]);
  
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
  
  // Toggle dropdown
  const toggleDropdown = () => {
    if (!isOpen && notificationClientRef.current) {
      // Refresh notifications when opening
      notificationClientRef.current.refreshNotifications();
    }
    
    setIsOpen(!isOpen);
  };
  
  // Mark notification as read
  const markAsRead = (id: string) => {
    if (notificationClientRef.current) {
      notificationClientRef.current.markAsRead(id);
      
      // Update state immediately for better UX
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };
  
  // Mark all as read
  const markAllAsRead = () => {
    if (notificationClientRef.current) {
      notificationClientRef.current.markAllAsRead();
      
      // Update state immediately for better UX
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    if (notificationClientRef.current) {
      notificationClientRef.current.refreshNotifications();
    }
  };
  
  // Get notification style based on type
  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case 'RENTAL_REQUEST':
      case 'RENTAL_STATUS_CHANGE':
      case 'RENTAL_DUE_REMINDER':
        return { 
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: 'text-green-600 bg-green-100'
        };
      
      case 'CALIBRATION_REMINDER':
      case 'CALIBRATION_STATUS_CHANGE':
        return { 
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 21H5v-6l2.257-2.257A6 6 0 1119 9z" />
            </svg>
          ),
          color: 'text-green-700 bg-green-50'
        };
      
      case 'MAINTENANCE_REMINDER':
        return { 
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          color: 'text-green-800 bg-green-50'
        };
      
      case 'INVENTORY_SCHEDULE':
        return { 
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
          color: 'text-green-500 bg-green-50'
        };
      
      case 'VENDOR_INFO':
        return { 
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
          color: 'text-emerald-600 bg-emerald-50'
        };
      
      case 'GENERAL_INFO':
      default:
        return { 
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: 'text-teal-600 bg-teal-50'
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
        className="p-2 rounded-full hover:bg-green-50 relative"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-5 w-5 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 max-h-96 overflow-y-auto border border-gray-200">
          <div className="p-4 border-b border-gray-100 bg-green-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800">Notifications</h3>
              <div className="flex space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-green-600 hover:text-green-800"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  onClick={handleRefresh}
                  className={`text-sm text-gray-600 hover:text-gray-800 ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Refresh notifications"
                  disabled={!isConnected}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
            {!isConnected && !loading && (
              <div className="mt-2 text-xs text-amber-600 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Offline mode - reconnecting...
              </div>
            )}
          </div>
          
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500 mr-2"></div>
                Loading notifications...
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-red-500 text-sm mb-2">{error}</p>
                <button 
                  onClick={handleRefresh}
                  className="text-sm text-green-600 hover:text-green-800"
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
                    className={`p-4 hover:bg-gray-50 ${!notification.isRead ? 'bg-green-50' : ''}`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="flex">
                      <div className={`rounded-full p-2 mr-3 ${color}`}>
                        {icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-700">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(notification.createdAt)}</p>
                      </div>
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="text-xs text-green-600 hover:text-green-800 self-start ml-2"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Show view all link if there are notifications */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-100 text-center bg-gray-50">
              <a 
                href={role === 'ADMIN' ? '/admin/notifications' : '/user/notifications'} 
                className="text-sm text-green-600 hover:text-green-800"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 