'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useUser } from '@/app/context/UserContext';
import { toast } from 'react-hot-toast';
import { 
  FiBell, 
  FiTool, 
  FiCalendar, 
  FiTruck, 
  FiList, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiChevronLeft, 
  FiChevronRight,
  FiInbox
} from 'react-icons/fi';
import { Notification } from '@/lib/types';

type NotificationType = 'ALL' | 'SCHEDULE' | 'CALIBRATION' | 'RENTAL' | 'MAINTENANCE';

const typeIcons: { [key in NotificationType]: React.ElementType } = {
  ALL: FiBell,
  SCHEDULE: FiCalendar,
  CALIBRATION: FiTool,
  RENTAL: FiTruck,
  MAINTENANCE: FiList,
};

const typeColors: { [key in NotificationType]: string } = {
  ALL: 'text-gray-500',
  SCHEDULE: 'text-purple-500',
  CALIBRATION: 'text-blue-500',
  RENTAL: 'text-orange-500',
  MAINTENANCE: 'text-green-500',
};

export default function UserNotificationsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<NotificationType>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 100;

  const fetchNotifications = useCallback(async (page: number, type: NotificationType) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/user/notifications?page=${page}&limit=${limit}&type=${type}`);
        if (!response.ok) {
        throw new Error('Failed to fetch notifications');
        }
        const data = await response.json();
      setNotifications(data.notifications || []);
      setTotalPages(data.totalPages || 1);
      } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      toast.error('Failed to load notifications.');
      } finally {
        setLoading(false);
      }
  }, [limit]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (user) {
      fetchNotifications(currentPage, activeTab);
    }
  }, [user, currentPage, activeTab, fetchNotifications]);

  const handleTabClick = (type: NotificationType) => {
    setActiveTab(type);
    setCurrentPage(1); // Reset to first page
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getNotificationPath = (notification: Notification) => {
    if (!notification.reminder) return '#';
    const type = notification.reminder.type as NotificationType;
    switch (type) {
      case 'CALIBRATION': return `/user/calibrations/${notification.reminder.calibrationId}`;
      case 'RENTAL': return `/user/rentals`;
      case 'MAINTENANCE': return `/user/maintenance/${notification.reminder.maintenanceId}`;
      case 'SCHEDULE': return `/user/barang`;
      default: return '#';
    }
  };

  const renderTabs = () => {
    const tabs: NotificationType[] = ['ALL', 'SCHEDULE', 'CALIBRATION', 'RENTAL', 'MAINTENANCE'];
    return (
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = typeIcons[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${isActive
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className={`${isActive ? 'text-green-500' : 'text-gray-400'}`} />
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            );
          })}
        </nav>
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiChevronLeft className="inline-block" /> Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next <FiChevronRight className="inline-block" />
        </button>
      </div>
    );
  };
  
  const renderNotificationCard = (notification: Notification) => {
    const type = notification.reminder?.type as NotificationType || 'ALL';
    const Icon = typeIcons[type] || FiBell;
    const color = typeColors[type] || 'text-gray-500';

    return (
      <li key={notification.id} className={`p-4 rounded-lg flex items-start space-x-4 ${!notification.isRead ? 'bg-green-50' : 'bg-white'}`}>
        <div className={`mt-1 flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${!notification.isRead ? 'bg-green-100' : 'bg-gray-100'}`}>
          <Icon className={`${!notification.isRead ? 'text-green-500' : 'text-gray-400'}`} size={18} />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">{notification.title}</h3>
            <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          <div className="mt-2">
            <Link
              href={getNotificationPath(notification)}
              className="text-sm font-medium text-green-600 hover:text-green-700"
            >
              View Details
            </Link>
        </div>
      </div>
        {!notification.isRead && (
          <div className="mt-1 w-2.5 h-2.5 bg-green-500 rounded-full" title="Unread"></div>
        )}
      </li>
    );
  };
  
  if (userLoading) {
    return <div className="p-6 text-center">Loading user session...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Notifications</h1>

      <div className="bg-white shadow rounded-lg p-6">
        {renderTabs()}

        <div className="mt-6">
          {loading ? (
            <div className="text-center py-10">
              <FiBell className="mx-auto text-4xl text-gray-300 animate-pulse" />
              <p className="mt-2 text-gray-500">Loading notifications...</p>
              </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              <FiAlertCircle className="mx-auto text-4xl" />
              <p className="mt-2">{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-20">
              <FiInbox className="mx-auto text-5xl text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-800">All caught up!</h3>
              <p className="mt-1 text-sm text-gray-500">There are no new notifications in this category.</p>
          </div>
        ) : (
            <ul className="space-y-4">
              {notifications.map(renderNotificationCard)}
            </ul>
                      )}
                    </div>
                    
        {renderPagination()}
      </div>
    </div>
  );
} 