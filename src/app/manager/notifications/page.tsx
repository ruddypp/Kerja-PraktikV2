"use client";

// Disable static generation for this page
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'edge';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotificationType } from "@prisma/client";

// Define extended session type
interface ExtendedSession {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

type Notification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
};

export default function ManagerNotificationsPage() {
  const session = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [notificationTypes, setNotificationTypes] = useState<string[]>([]);

  useEffect(() => {
    // Only fetch notifications when session is loaded and authenticated
    if (session.status === 'loading') return;
    if (session.status === 'unauthenticated') {
      setError('Anda harus login untuk melihat notifikasi');
      setLoading(false);
      return;
    }
    
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/manager/notifications");
        
        if (!response.ok) {
          throw new Error("Failed to fetch notifications");
        }
        
        const data = await response.json();
        setNotifications(data.notifications);
        
        // Extract unique notification types for filtering
        const types = Array.from(
          new Set(data.notifications.map((notification: Notification) => notification.type))
        ) as string[];
        setNotificationTypes(types);
      } catch (err) {
        setError("Error loading notifications");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [session.status]);

  const handleReadStatusChange = () => {
    setShowUnreadOnly(!showUnreadOnly);
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/manager/notifications?id=${id}`, {
        method: "PATCH",
      });
      
      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === id 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Use a safer approach to get the user ID
      const userId = (session.data?.user as any)?.id || "";
      const response = await fetch(`/api/manager/notifications?userId=${userId}&markAllRead=true`, {
        method: "PATCH",
      });
      
      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesType = selectedType === "" || notification.type === selectedType;
    const matchesReadStatus = !showUnreadOnly || !notification.isRead;
    
    return matchesType && matchesReadStatus;
  });

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case "RENTAL_REQUEST":
      case "RENTAL_STATUS_CHANGE":
        return "bg-blue-100 text-blue-800";
      case "CALIBRATION_REMINDER":
      case "CALIBRATION_STATUS_CHANGE":
        return "bg-purple-100 text-purple-800";
      case "RENTAL_DUE_REMINDER":
      case "MAINTENANCE_REMINDER":
        return "bg-orange-100 text-orange-800";
      case "INVENTORY_SCHEDULE":
        return "bg-green-100 text-green-800";
      case "VENDOR_INFO":
        return "bg-indigo-100 text-indigo-800";
      case "GENERAL_INFO":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeName = (type: NotificationType) => {
    switch (type) {
      case "RENTAL_REQUEST":
        return "Permintaan Rental";
      case "RENTAL_STATUS_CHANGE":
        return "Perubahan Status Rental";
      case "CALIBRATION_REMINDER":
        return "Pengingat Kalibrasi";
      case "CALIBRATION_STATUS_CHANGE":
        return "Perubahan Status Kalibrasi";
      case "RENTAL_DUE_REMINDER":
        return "Pengingat Jatuh Tempo Rental";
      case "MAINTENANCE_REMINDER":
        return "Pengingat Pemeliharaan";
      case "INVENTORY_SCHEDULE":
        return "Jadwal Inventarisasi";
      case "VENDOR_INFO":
        return "Informasi Vendor";
      case "GENERAL_INFO":
        return "Informasi Umum";
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">Notifikasi</h1>
          
          <div className="flex flex-col sm:flex-row gap-4">
            {notifications.length > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
              >
                Tandai Semua Dibaca
              </Button>
            )}
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="unread-only"
                checked={showUnreadOnly}
                onChange={handleReadStatusChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="unread-only" className="text-sm text-gray-700">
                Hanya yang belum dibaca
              </label>
            </div>
            
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Filter notifikasi berdasarkan tipe"
            >
              <option value="">Semua Tipe</option>
              {notificationTypes.map((type) => (
                <option key={type} value={type}>
                  {getTypeName(type as NotificationType)}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-lg text-gray-600">Memuat notifikasi...</span>
          </div>
        ) : error ? (
          <Card className="p-6 border-red-200 bg-red-50">
            <p className="text-red-700">{error}</p>
          </Card>
        ) : (
          <>
            {filteredNotifications.length === 0 ? (
              <Card className="p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada notifikasi</h3>
                <p className="mt-1 text-sm text-gray-500">Anda tidak memiliki notifikasi saat ini.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <Card
                    key={notification.id} 
                    className={`overflow-hidden ${notification.isRead ? "" : "border-l-4 border-blue-500"}`}
                  >
                    <div className="p-4">
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(notification.type)}`}>
                              {getTypeName(notification.type)}
                            </span>
                            {!notification.isRead && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Baru
                              </span>
                            )}
                            <span className="ml-auto text-xs text-gray-500">
                              {formatDate(notification.createdAt)}
                            </span>
                          </div>
                          <h3 className="mt-2 text-md font-medium text-gray-900">{notification.title}</h3>
                          <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                          
                          {notification.relatedId && (
                            <div className="mt-2">
                              <a
                                href={`/manager/detail/${notification.relatedId}`}
                                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                              >
                                Lihat Detail
                                <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                              </a>
                            </div>
                          )}
                        </div>
                        
                        {!notification.isRead && (
                          <Button
                            onClick={() => markAsRead(notification.id)}
                            variant="ghost"
                            size="sm"
                            className="ml-4 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            title="Tandai sudah dibaca"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 