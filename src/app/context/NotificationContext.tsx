'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

// Notification interface
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
  actionUrl?: string; // URL to navigate to when clicked
  actionLabel?: string; // Label for the action button
  secondaryActionUrl?: string; // URL for secondary action
  secondaryActionLabel?: string; // Label for secondary action
}

// User notification preferences
export interface NotificationPreferences {
  rentalNotifications: boolean;
  calibrationNotifications: boolean;
  maintenanceNotifications: boolean;
  inventoryNotifications: boolean;
  systemNotifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

// Context interface
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  preferences: NotificationPreferences | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  showToast: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
  performAction: (notification: Notification) => void;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
}

// Default notification preferences
const defaultPreferences: NotificationPreferences = {
  rentalNotifications: true,
  calibrationNotifications: true,
  maintenanceNotifications: true,
  inventoryNotifications: true,
  systemNotifications: true,
  emailNotifications: false,
  pushNotifications: false,
};

// Create the context
const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: true,
  error: null,
  preferences: null,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  clearNotification: async () => {},
  clearAllNotifications: async () => {},
  showToast: () => {},
  performAction: () => {},
  updatePreferences: async () => {},
  requestPushPermission: async () => false,
});

// Custom hook to use the context
export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: ReactNode;
}

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }
  return res.json();
};

// Context provider component
export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const router = useRouter();

  // Use SWR for data fetching with revalidation
  const { data, error: swrError, mutate, isLoading } = useSWR(
    '/api/notifications',
    fetcher,
    { 
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      dedupingInterval: 5000, // Dedupe calls within 5 seconds
      onSuccess: (data) => {
        if (data.success && data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.notifications.filter((n: Notification) => !n.isRead).length);
        }
      },
      onError: (err) => {
        console.error('Error fetching notifications:', err);
        setError('Failed to fetch notifications');
      }
    }
  );

  // Use SWR for preferences
  const { data: prefsData, error: prefsError, mutate: mutatePrefs } = useSWR(
    '/api/notifications/preferences',
    fetcher,
    {
      onSuccess: (data) => {
        if (data.success && data.preferences) {
          setPreferences(data.preferences);
        } else {
          setPreferences(defaultPreferences);
        }
      },
      onError: () => {
        setPreferences(defaultPreferences);
      }
    }
  );

  // Check if push notifications are supported
  const isPushSupported = () => {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  };

  // Request permission for push notifications
  const requestPushPermission = async (): Promise<boolean> => {
    if (!isPushSupported()) {
      console.log('Push notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Save preference
        await updatePreferences({ pushNotifications: true });
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error requesting push permission:', error);
      return false;
    }
  };

  // Manual fetch function (kept for compatibility)
  const fetchNotifications = async () => {
    return mutate();
  };

  // Update user notification preferences
  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      setPreferences(updatedPreferences as NotificationPreferences);

      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ preferences: updatedPreferences }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification preferences');
      }

      // Revalidate preferences data
      mutatePrefs();
      
      const data = await response.json();
      if (data.success) {
        return true;
      } else {
        throw new Error(data.message || 'Failed to update preferences');
      }
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return false;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Revalidate data
      mutate();
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Revalidate to get the correct state
      mutate();
    }
  };

  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);

      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      // Revalidate data
      mutate();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Revalidate to get the correct state
      mutate();
    }
  };

  const clearNotification = async (id: string) => {
    try {
      // Optimistic update
      const removedNotification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(notification => notification.id !== id));
      if (removedNotification && !removedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      // Revalidate data
      mutate();
    } catch (err) {
      console.error('Error deleting notification:', err);
      // Revalidate to get the correct state
      mutate();
    }
  };

  const clearAllNotifications = async () => {
    try {
      // Optimistic update
      setNotifications([]);
      setUnreadCount(0);

      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to clear all notifications');
      }

      // Revalidate data
      mutate();
    } catch (err) {
      console.error('Error clearing all notifications:', err);
      // Revalidate to get the correct state
      mutate();
    }
  };

  // Function to perform action when notification is clicked
  const performAction = (notification: Notification) => {
    // Mark notification as read
    markAsRead(notification.id);
    
    // Navigate to action URL if provided
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    } else if (notification.relatedId) {
      // Navigate based on notification type if actionUrl not specified
      switch (notification.type) {
        case 'RENTAL_REQUEST':
        case 'RENTAL_STATUS_CHANGE':
        case 'RENTAL_DUE_REMINDER':
          router.push(`/rentals/${notification.relatedId}`);
          break;
        case 'CALIBRATION_REMINDER':
        case 'CALIBRATION_STATUS_CHANGE':
          router.push(`/calibrations/${notification.relatedId}`);
          break;
        case 'MAINTENANCE_REMINDER':
          router.push(`/maintenance/${notification.relatedId}`);
          break;
        case 'INVENTORY_SCHEDULE':
          router.push(`/inventory/schedule/${notification.relatedId}`);
          break;
        default:
          // Do nothing for other types
          break;
      }
    }
  };

  // Function to show a toast notification
  const showToast = (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {notification.title}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {notification.message}
              </p>
            </div>
          </div>
          {notification.actionLabel && notification.actionUrl && (
            <div className="mt-3">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  router.push(notification.actionUrl!);
                }}
                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {notification.actionLabel}
              </button>
              
              {notification.secondaryActionLabel && notification.secondaryActionUrl && (
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    router.push(notification.secondaryActionUrl!);
                  }}
                  className="ml-2 inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  {notification.secondaryActionLabel}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex border-l border-gray-200">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-green-600 hover:text-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Tutup
          </button>
        </div>
      </div>
    ), {
      duration: 5000,
    });
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        loading: isLoading, 
        error: error || (swrError ? 'Failed to fetch notifications' : null), 
        preferences,
        fetchNotifications, 
        markAsRead, 
        markAllAsRead, 
        clearNotification, 
        clearAllNotifications,
        showToast,
        performAction,
        updatePreferences,
        requestPushPermission
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationContext; 