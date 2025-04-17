'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Notifications from '@/components/Notifications';


type Notification = {
  id: number;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  isRead: boolean;
  createdAt: Date;
  relatedItemUrl?: string;
};

export default function UserNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/user/notifications');
        
        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }
        
        const data = await response.json();
        setNotifications(data);
      } catch (err) {
        setError('Error loading notifications');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleReadStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowUnreadOnly(e.target.checked);
  };

  const markAsRead = async (id: number) => {
    try {
      const response = await fetch(`/api/user/notifications/${id}/read`, {
        method: 'PUT',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
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
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/user/notifications/mark-all-read', {
        method: 'PUT',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (showUnreadOnly && notification.isRead) {
      return false;
    }
    
    return true;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INFO':
        return 'bg-blue-100 text-blue-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">Notifikasi</h1>
          {notifications.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={markAllAsRead}
                className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Tandai Semua Dibaca
              </button>
              <label className="inline-flex items-center px-2 py-1">
                <input
                  type="checkbox"
                  checked={showUnreadOnly}
                  onChange={handleReadStatusChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Hanya yang belum dibaca</span>
              </label>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-lg text-gray-600">Memuat notifikasi...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {filteredNotifications.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada notifikasi</h3>
                <p className="mt-1 text-sm text-gray-500">Anda tidak memiliki notifikasi saat ini.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`bg-white p-4 rounded-lg shadow ${notification.isRead ? 'border-l-4 border-gray-300' : 'border-l-4 border-blue-500'}`}
                  >
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(notification.type)}`}>
                            {notification.type === 'INFO' && 'Informasi'}
                            {notification.type === 'WARNING' && 'Peringatan'}
                            {notification.type === 'ERROR' && 'Error'}
                            {notification.type === 'SUCCESS' && 'Sukses'}
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
                        
                        {notification.relatedItemUrl && (
                          <div className="mt-2">
                            <a
                              href={notification.relatedItemUrl}
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
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="ml-4 inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          title="Tandai sudah dibaca"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 