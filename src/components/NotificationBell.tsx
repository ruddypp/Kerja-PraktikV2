'use client';

import { useState, useEffect, useRef } from 'react';
import { useNotifications } from '@/app/context/NotificationContext';
import { differenceInDays } from 'date-fns';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiCheck, FiTrash2 } from 'react-icons/fi';

interface NotificationBellProps {
  role: 'ADMIN' | 'USER';
}

export default function NotificationBell({ role }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
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
  
  // Maximum number of notifications to show in dropdown
  const MAX_NOTIFICATIONS_TO_DISPLAY = 10;

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

  // OPTIMIZED: Periodic refresh of unread count (quietly without toasts)
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Only refresh when dropdown is closed AND page is visible to reduce unnecessary requests
      if (!isOpen && document.visibilityState === 'visible') {
        fetchNotifications(false).catch(err => 
          console.error('Error refreshing notifications count:', err)
        );
      }
    }, 5 * 60 * 1000); // Every 5 minutes instead of 1 minute to reduce server load
    
    return () => clearInterval(refreshInterval);
  }, [fetchNotifications, isOpen]);

  const toggleDropdown = async () => {
    // If opening dropdown, fetch latest notifications and trigger cron check
    if (!isOpen) {
      // Rate limit opening to prevent excessive API calls
      const now = Date.now();
      if (now - lastOpenTime.current > 5000) { // 5 seconds rate limit
        lastOpenTime.current = now;
        
        try {
          // Trigger cron check but don't show toasts
          await triggerCronCheck(false);
          
          // Fetch latest notifications
          await fetchNotifications(false);
        } catch (error) {
          console.error('Error refreshing notifications on open:', error);
        }
      }
    }
    
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setIsOpen(false); // Close dropdown after marking all as read
  };

  // NEW: Clear notifications from bell (mark as read but don't delete from page)
  const handleClearNotifications = async () => {
    if (isClearing) return;
    
    setIsClearing(true);
    try {
      // Mark all notifications as read to clear them from bell
      await markAllAsRead();
      toast.success('Notifications cleared from bell');
      setIsOpen(false);
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
    } finally {
      setIsClearing(false);
    }
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
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      } else if (daysRemaining === 0) {
        return {
          text: 'Hari ini',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      } else if (daysRemaining === 1) {
        return {
          text: 'Besok',
          color: 'text-orange-500',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      } else if (daysRemaining <= 7) {
        return {
          text: `${daysRemaining} hari lagi`,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      } else if (daysRemaining === 30) {
        return {
          text: '30 hari lagi',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      } else {
        return {
          text: `${daysRemaining} hari lagi`,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      }
    } catch (error) {
      console.error('Error calculating countdown:', error);
      return { 
        text: 'Unknown', 
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      };
    }
  };

  // Sort and filter notifications for display
  const prioritizedNotifications = notifications
    // Sort by read status and due date
    .sort((a, b) => {
      // First prioritize unread
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      
      // Then sort by closest due date if reminder exists
      if (a.reminder?.dueDate && b.reminder?.dueDate) {
        return new Date(a.reminder.dueDate).getTime() - new Date(b.reminder.dueDate).getTime();
      }
      
      // Otherwise sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    // Limit to reasonable number for dropdown
    .slice(0, MAX_NOTIFICATIONS_TO_DISPLAY);

  return (
    <div className="relative">
      {/* Bell Icon with Badge */}
      <div 
        ref={bellIconRef}
        className="relative cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
          <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {/* Enhanced Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-20"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-800">Notifikasi</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <>
                    <button
                      onClick={handleClearNotifications}
                      disabled={isClearing}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                      title="Clear notifications from bell (mark as read)"
                    >
                      <FiCheck size={12} />
                      {isClearing ? 'Clearing...' : 'Clear'}
                    </button>
                    <span className="text-gray-300">|</span>
                  </>
                )}
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                  {unreadCount} unread
                </span>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-gray-400 mb-2">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">Tidak ada notifikasi</p>
                <p className="text-xs text-gray-400 mt-1">Semua notifikasi sudah dibaca</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {prioritizedNotifications.map((notification) => {
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
                        : `/admin/inventory/schedules`
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
                      className={`relative transition-colors ${
                        !notification.isRead 
                          ? countdownDisplay 
                            ? `${countdownDisplay.bgColor} hover:bg-opacity-80` 
                            : 'bg-blue-50 hover:bg-blue-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <Link
                        href={notificationPath}
                        onClick={() => {
                          handleMarkAsRead(notification.id);
                          setIsOpen(false);
                        }}
                        className="block px-4 py-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${
                              !notification.isRead ? 'text-gray-900' : 'text-gray-600'
                            } line-clamp-2`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            
                            {countdownDisplay && (
                              <div className="mt-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  countdownDisplay.color
                                } bg-white ${countdownDisplay.borderColor} border`}>
                                  {countdownDisplay.text}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Unread indicator */}
                          {!notification.isRead && (
                            <div className="ml-2 flex-shrink-0">
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <Link
                href={role === 'ADMIN' ? '/admin/notifications' : '/user/notifications'}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Lihat semua notifikasi →
              </Link>
              
              {notifications.length > MAX_NOTIFICATIONS_TO_DISPLAY && (
                <span className="text-xs text-gray-500">
                  +{notifications.length - MAX_NOTIFICATIONS_TO_DISPLAY} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}