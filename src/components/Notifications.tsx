"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

type NotificationType = "INFO" | "WARNING" | "ERROR" | "SUCCESS";

type Notification = {
  id: string;
  userId: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
};

export default function Notifications({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;

    async function fetchNotifications() {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/notifications?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch notifications");
        }
        
        const data = await response.json();
        setNotifications(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching notifications:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, [userId]);

  const handleToggleNotifications = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, read: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      // Update the notifications list locally
      setNotifications(
        notifications.map((notification) =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, read: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }

      // Update all notifications as read locally
      setNotifications(
        notifications.map((notification) => ({ ...notification, read: true }))
      );
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case "INFO":
        return "bg-blue-50 border-blue-200";
      case "WARNING":
        return "bg-yellow-50 border-yellow-200";
      case "ERROR":
        return "bg-red-50 border-red-200";
      case "SUCCESS":
        return "bg-green-50 border-green-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggleNotifications}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-5 w-5 flex items-center justify-center text-xs bg-red-500 text-white rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 border border-gray-200">
          <div className="py-2 px-3 bg-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-medium">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading notifications...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b ${
                      notification.read ? "bg-white" : getNotificationStyle(notification.type)
                    } ${!notification.read ? "font-medium" : ""}`}
                  >
                    <div className="flex justify-between">
                      <p className="text-sm">{notification.message}</p>
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 ml-2"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 