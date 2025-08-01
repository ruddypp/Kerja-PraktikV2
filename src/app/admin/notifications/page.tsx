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
  FiInbox,
  FiTrash2,
  FiMoreHorizontal,
  FiCheck,
  FiX
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

export default function AdminNotificationsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<NotificationType>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const limit = 10; // Reduced for better pagination

  // Selection state for bulk actions
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  const fetchNotifications = useCallback(async (page: number, type: NotificationType) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/notifications?page=${page}&limit=${limit}&type=${type}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      const data = await response.json();
      setNotifications(data.notifications || []);
      setTotalPages(data.totalPages || 1);
      setTotalNotifications(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      toast.error('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (!userLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchNotifications(currentPage, activeTab);
    }
  }, [user, currentPage, activeTab, fetchNotifications]);

  const handleTabClick = (type: NotificationType) => {
    setActiveTab(type);
    setCurrentPage(1);
    setSelectedNotifications(new Set());
    setIsSelectMode(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setSelectedNotifications(new Set());
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Delete single notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setSelectedNotifications(prev => {
          const newSet = new Set(prev);
          newSet.delete(notificationId);
          return newSet;
        });
        toast.success('Notification deleted successfully');
        
        // Refresh if current page becomes empty
        if (notifications.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          fetchNotifications(currentPage, activeTab);
        }
      } else {
        throw new Error('Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Delete selected notifications
  const deleteSelectedNotifications = async () => {
    if (selectedNotifications.size === 0) return;
    
    try {
      const deletePromises = Array.from(selectedNotifications).map(id =>
        fetch(`/api/admin/notifications/${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      
      setNotifications(prev => 
        prev.filter(n => !selectedNotifications.has(n.id))
      );
      setSelectedNotifications(new Set());
      setIsSelectMode(false);
      
      toast.success(`${selectedNotifications.size} notifications deleted`);
      fetchNotifications(currentPage, activeTab);
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Failed to delete notifications');
    }
  };

  // Mark selected as read
  const markSelectedAsRead = async () => {
    if (selectedNotifications.size === 0) return;
    
    try {
      const markPromises = Array.from(selectedNotifications).map(id =>
        fetch(`/api/admin/notifications/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        })
      );
      
      await Promise.all(markPromises);
      
      setNotifications(prev => 
        prev.map(n => selectedNotifications.has(n.id) ? { ...n, isRead: true } : n)
      );
      setSelectedNotifications(new Set());
      setIsSelectMode(false);
      
      toast.success(`${selectedNotifications.size} notifications marked as read`);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  // Toggle selection
  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  // Select all on current page
  const selectAll = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setSelectedNotifications(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedNotifications(new Set());
    setIsSelectMode(false);
  };

  const getNotificationPath = (notification: Notification) => {
    if (!notification.reminder) return '#';
    const type = notification.reminder.type as NotificationType;
    switch (type) {
      case 'CALIBRATION': return `/admin/calibrations/${notification.reminder.calibrationId}`;
      case 'RENTAL': return `/admin/rentals`;
      case 'MAINTENANCE': return `/admin/maintenance/${notification.reminder.maintenanceId}`;
      case 'SCHEDULE': return `/admin/inventory/schedules`;
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

    const startItem = (currentPage - 1) * limit + 1;
    const endItem = Math.min(currentPage * limit, totalNotifications);

    return (
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Showing {startItem}-{endItem} of {totalNotifications} notifications
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            First
          </button>
          
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiChevronLeft className="inline-block" />
          </button>
          
          <span className="px-3 py-1 text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiChevronRight className="inline-block" />
          </button>
          
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
      </div>
    );
  };

  const renderBulkActions = () => {
    if (!isSelectMode && selectedNotifications.size === 0) return null;

    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {selectedNotifications.size} notification(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={markSelectedAsRead}
              className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
            >
              <FiCheck className="inline-block mr-1" />
              Mark as Read
            </button>
            <button
              onClick={deleteSelectedNotifications}
              className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
            >
              <FiTrash2 className="inline-block mr-1" />
              Delete
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <FiX className="inline-block mr-1" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderActionButtons = () => {
    return (
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isSelectMode ? (
            <button
              onClick={() => setIsSelectMode(true)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Select
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          Total: {totalNotifications} notifications
        </div>
      </div>
    );
  };
  
  const renderNotificationCard = (notification: Notification) => {
    const type = notification.reminder?.type as NotificationType || 'ALL';
    const Icon = typeIcons[type] || FiBell;
    const isSelected = selectedNotifications.has(notification.id);

    return (
      <li key={notification.id} className={`p-4 rounded-lg border transition-colors ${
        !notification.isRead ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
        <div className="flex items-start space-x-4">
          {/* Selection checkbox */}
          {isSelectMode && (
            <div className="mt-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(notification.id)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          )}
          
          {/* Icon */}
          <div className={`mt-1 flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
            !notification.isRead ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <Icon className={`${!notification.isRead ? 'text-green-500' : 'text-gray-400'}`} size={18} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-gray-800 truncate">{notification.title}</h3>
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </span>
                
                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Mark as read"
                    >
                      <FiCheck size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete notification"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
            
            <div className="mt-2 flex items-center justify-between">
              <Link
                href={getNotificationPath(notification)}
                className="text-sm font-medium text-green-600 hover:text-green-700"
                onClick={() => markAsRead(notification.id)}
              >
                View Details →
              </Link>
              
              {!notification.isRead && (
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Unread"></div>
              )}
            </div>
          </div>
        </div>
      </li>
    );
  };
  
  if (userLoading) {
    return <div className="p-6 text-center">Loading user session...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin Notifications</h1>

      <div className="bg-white shadow rounded-lg p-6">
        {renderTabs()}

        <div className="mt-6">
          {renderActionButtons()}
          {renderBulkActions()}
          
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