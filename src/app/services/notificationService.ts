import { Notification } from "@/app/context/NotificationContext";

// Fetch all notifications for the current user
export const fetchNotifications = async (): Promise<{ success: boolean; notifications: Notification[] }> => {
  try {
    const response = await fetch('/api/notifications', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { success: false, notifications: [] };
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

// Delete a notification
export const deleteNotification = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/notifications/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to delete notification');
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
};

// Delete all notifications
export const deleteAllNotifications = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to delete all notifications');
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    return false;
  }
};

// Create a notification with optional action buttons
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string,
  relatedId?: string,
  actionUrl?: string,
  actionLabel?: string,
  secondaryActionUrl?: string,
  secondaryActionLabel?: string
): Promise<{ success: boolean; notification?: Notification }> => {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        userId,
        title,
        message,
        type,
        relatedId,
        actionUrl,
        actionLabel,
        secondaryActionUrl,
        secondaryActionLabel
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create notification');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false };
  }
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (): Promise<{ success: boolean; subscription?: PushSubscription }> => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications not supported');
    }

    // Register service worker if not already registered
    const registration = await navigator.serviceWorker.ready;
    
    // Get push subscription
    let subscription = await registration.pushManager.getSubscription();
    
    // If no subscription exists, create one
    if (!subscription) {
      // Get server's public key
      const response = await fetch('/api/notifications/vapid-public-key');
      if (!response.ok) {
        throw new Error('Failed to get VAPID public key');
      }
      
      const { publicKey } = await response.json();
      
      // Convert base64 string to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }
    
    // Send subscription to server
    const subscribeResponse = await fetch('/api/notifications/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ subscription }),
    });
    
    if (!subscribeResponse.ok) {
      throw new Error('Failed to store subscription on server');
    }
    
    return { success: true, subscription };
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return { success: false };
  }
};

// Helper function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
} 