'use client';

import { useState, useEffect, useRef } from 'react';
import { useNotifications } from '@/app/context/NotificationContext';
import { differenceInDays } from 'date-fns';
import Link from 'next/link';

interface NotificationBellProps {
  role: 'ADMIN' | 'USER';
}

export default function NotificationBell({ role }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    triggerCronCheck
  } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellIconRef = useRef<HTMLDivElement>(null);
  const lastOpenTime = useRef<number>(0);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        bellIconRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !bellIconRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = async () => {
    // If opening dropdown, fetch latest notifications and trigger cron check
    if (!isOpen) {
      // Rate limit opening to prevent excessive API calls
      const now = Date.now();
      if (now - lastOpenTime.current > 5000) { // 5 seconds rate limit
        lastOpenTime.current = now;
        
        // Trigger cron check but don't show toasts
        await triggerCronCheck(false);
        
        // Fetch latest notifications
        await fetchNotifications(false);
      }
    }
    
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  // Get countdown display based on days remaining
  const getCountdownDisplay = (dueDate: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(dueDate);
      const daysRemaining = differenceInDays(due, today);
      
      if (daysRemaining < 0) {
        return {
          text: `Terlambat ${Math.abs(daysRemaining)} hari`,
          color: 'text-red-600'
        };
      } else if (daysRemaining === 0) {
        return {
          text: 'Hari ini',
          color: 'text-orange-600'
        };
      } else if (daysRemaining === 30) {
        return {
          text: 'H-30',
          color: 'text-yellow-600'
        };
      } else if (daysRemaining === 7) {
        return {
          text: 'H-7',
          color: 'text-yellow-600'
        };
      } else {
        return {
          text: `H-${daysRemaining}`,
          color: 'text-blue-600'
        };
      }
    } catch (error) {
      console.error('Error calculating countdown:', error);
      return { text: 'Unknown', color: 'text-gray-600' };
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon with Badge */}
      <div 
        ref={bellIconRef}
        className="relative cursor-pointer p-2"
        onClick={toggleDropdown}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-20"
        >
          <div className="py-2">
            <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold">Notifikasi</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  Tidak ada notifikasi
                </div>
              ) : (
                <ul>
                  {notifications.map((notification) => {
                    // Get countdown display if reminder exists
                    const countdownDisplay = notification.reminder?.dueDate
                      ? getCountdownDisplay(notification.reminder.dueDate)
                      : null;

                    // Determine notification path
                    const notificationPath = notification.reminder
                      ? role === 'ADMIN'
                        ? notification.reminder.type === 'CALIBRATION'
                          ? `/admin/calibrations/${notification.reminder.calibrationId}`
                          : notification.reminder.type === 'RENTAL'
                          ? `/admin/rentals`
                          : notification.reminder.type === 'MAINTENANCE'
                          ? `/admin/maintenance/${notification.reminder.maintenanceId}`
                          : `/admin/inventory/schedules/execution`
                        : notification.reminder.type === 'CALIBRATION'
                        ? `/user/calibrations/${notification.reminder.calibrationId}`
                        : notification.reminder.type === 'RENTAL'
                        ? `/user/rentals`
                        : notification.reminder.type === 'MAINTENANCE'
                        ? `/user/maintenance/${notification.reminder.maintenanceId}`
                        : `/user/barang`
                      : role === 'ADMIN'
                      ? '/admin/notifications'
                      : '/user/notifications';

                    return (
                      <li
                        key={notification.id}
                        className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                          !notification.isRead ? 'bg-blue-50' : ''
                        }`}
                      >
                        <Link
                          href={notificationPath}
                          onClick={() => {
                            handleMarkAsRead(notification.id);
                          }}
                          className="block"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {notification.message}
                              </p>
                              
                              {countdownDisplay && (
                                <span className={`text-xs font-medium ${countdownDisplay.color} mt-1 inline-block`}>
                                  {countdownDisplay.text}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="px-4 py-2 border-t border-gray-200">
              <Link
                href={role === 'ADMIN' ? '/admin/notifications' : '/user/notifications'}
                className="text-xs text-blue-600 hover:text-blue-800"
                onClick={() => setIsOpen(false)}
              >
                Lihat semua notifikasi
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 