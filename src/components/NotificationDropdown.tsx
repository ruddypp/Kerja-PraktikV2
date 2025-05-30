'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications, Notification } from '@/app/context/NotificationContext';
import { IoMdNotificationsOutline } from 'react-icons/io';
import { HiOutlineCheckCircle, HiOutlineTrash, HiOutlineBell } from 'react-icons/hi';
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';
import { MdSettings } from 'react-icons/md';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotification, 
    clearAllNotifications,
    performAction
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'RENTAL_REQUEST':
      case 'RENTAL_STATUS_CHANGE':
      case 'RENTAL_DUE_REMINDER':
        return '🛒';
      case 'CALIBRATION_REMINDER':
      case 'CALIBRATION_STATUS_CHANGE':
        return '🔧';
      case 'MAINTENANCE_REMINDER':
        return '🔨';
      case 'INVENTORY_SCHEDULE':
        return '📋';
      default:
        return '🔔';
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // If the date is today or yesterday, show relative time
    if (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      return formatDistanceToNow(date, { addSuffix: true, locale: id });
    } else if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return 'Kemarin';
    } else {
      // Otherwise, show the full date
      return format(date, 'dd MMM yyyy, HH:mm', { locale: id });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    performAction(notification);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-green-600 focus:outline-none"
        aria-label="Notifications"
      >
        <IoMdNotificationsOutline className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-md shadow-lg overflow-hidden z-20">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Notifikasi</h3>
              <p className="text-xs text-gray-500">{unreadCount} belum dibaca</p>
            </div>
            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs text-green-600 hover:text-green-800 flex items-center"
                >
                  <HiOutlineCheckCircle className="w-4 h-4 mr-1" />
                  <span>Tandai Semua Dibaca</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => clearAllNotifications()}
                  className="text-xs text-red-600 hover:text-red-800 flex items-center"
                >
                  <HiOutlineTrash className="w-4 h-4 mr-1" />
                  <span>Hapus Semua</span>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <HiOutlineBell className="w-8 h-8 mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Tidak ada notifikasi</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      !notification.isRead ? 'bg-green-50' : ''
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5 text-xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div 
                        className="ml-3 flex-1"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600">{notification.message}</p>
                        <div className="mt-1 flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            {formatDate(notification.createdAt)}
                          </span>
                          <div className="flex space-x-2">
                            {!notification.isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="text-xs text-green-600 hover:text-green-800"
                              >
                                Tandai Dibaca
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                clearNotification(notification.id);
                              }}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons if present */}
                    {(notification.actionLabel || notification.secondaryActionLabel) && (
                      <div className="mt-2 ml-8 flex space-x-2">
                        {notification.actionLabel && notification.actionUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationClick(notification);
                            }}
                            className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                          >
                            {notification.actionLabel}
                          </button>
                        )}
                        {notification.secondaryActionLabel && notification.secondaryActionUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                              window.location.href = notification.secondaryActionUrl as string;
                            }}
                            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                          >
                            {notification.secondaryActionLabel}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <Link
              href="/notifications/preferences"
              className="text-xs text-green-600 hover:text-green-800 flex items-center justify-center"
            >
              <MdSettings className="w-4 h-4 mr-1" />
              <span>Pengaturan Notifikasi</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown; 