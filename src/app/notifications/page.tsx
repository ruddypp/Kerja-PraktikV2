'use client';

import { useState, useEffect } from 'react';
import { useNotifications, Notification } from '@/app/context/NotificationContext';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import DashboardLayout from '@/components/DashboardLayout';
import { HiOutlineCheckCircle, HiOutlineTrash, HiOutlineFilter } from 'react-icons/hi';
import { MdSettings } from 'react-icons/md';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    performAction,
  } = useNotifications();
  const router = useRouter();
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Update filtered notifications when main notifications change or filters change
  useEffect(() => {
    let filtered = [...notifications];

    // Apply read/unread filter
    if (filter === 'unread') {
      filtered = filtered.filter((n) => !n.isRead);
    } else if (filter === 'read') {
      filtered = filtered.filter((n) => n.isRead);
    }

    // Apply search term filter if it exists
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(term) ||
          n.message.toLowerCase().includes(term)
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, filter, searchTerm]);

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

  // Format notification type for display
  const formatNotificationType = (type: string) => {
    switch (type) {
      case 'RENTAL_REQUEST':
        return 'Permintaan Rental';
      case 'RENTAL_STATUS_CHANGE':
        return 'Status Rental Berubah';
      case 'RENTAL_DUE_REMINDER':
        return 'Pengingat Rental';
      case 'CALIBRATION_REMINDER':
        return 'Pengingat Kalibrasi';
      case 'CALIBRATION_STATUS_CHANGE':
        return 'Status Kalibrasi Berubah';
      case 'MAINTENANCE_REMINDER':
        return 'Pengingat Maintenance';
      case 'INVENTORY_SCHEDULE':
        return 'Jadwal Inventaris';
      case 'VENDOR_INFO':
        return 'Informasi Vendor';
      case 'GENERAL_INFO':
        return 'Informasi Umum';
      default:
        return type.replace(/_/g, ' ').toLowerCase();
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy, HH:mm', { locale: id });
  };

  const handleClearAll = async () => {
    if (window.confirm('Yakin ingin menghapus semua notifikasi?')) {
      await clearAllNotifications();
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    performAction(notification);
  };

  const getTypeFilterOptions = () => {
    const types = new Set(notifications.map((n) => n.type));
    return Array.from(types);
  };

  const typeFilterOptions = getTypeFilterOptions();

  return (
    <DashboardLayout>
      <div className="bg-white p-6 rounded-lg shadow">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifikasi</h1>
            <p className="text-sm text-gray-500">
              {unreadCount} notifikasi belum dibaca
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-md hover:bg-green-100"
              >
                <HiOutlineCheckCircle className="mr-1.5 h-4 w-4" />
                Tandai Semua Dibaca
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded-md hover:bg-red-100"
              >
                <HiOutlineTrash className="mr-1.5 h-4 w-4" />
                Hapus Semua
              </button>
            )}
            <Link
              href="/notifications/preferences"
              className="inline-flex items-center px-3 py-1.5 bg-gray-50 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-100"
            >
              <MdSettings className="mr-1.5 h-4 w-4" />
              Pengaturan
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center mb-3 gap-4">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Cari notifikasi..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search notifications"
              />
              <button
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                {searchTerm && (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <HiOutlineFilter className="mr-1.5 h-4 w-4" />
                  Filter
                </button>
                {isFilterOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <div className="p-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                        Status
                      </h3>
                      <button
                        onClick={() => {
                          setFilter('all');
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-md ${
                          filter === 'all' ? 'bg-green-50 text-green-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        onClick={() => {
                          setFilter('unread');
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-md ${
                          filter === 'unread' ? 'bg-green-50 text-green-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        Belum Dibaca
                      </button>
                      <button
                        onClick={() => {
                          setFilter('read');
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-md ${
                          filter === 'read' ? 'bg-green-50 text-green-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        Sudah Dibaca
                      </button>

                      {typeFilterOptions.length > 0 && (
                        <>
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4 px-2">
                            Jenis
                          </h3>
                          {typeFilterOptions.map((type) => (
                            <button
                              key={type}
                              onClick={() => {
                                setFilter(type);
                                setIsFilterOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm rounded-md ${
                                filter === type ? 'bg-green-50 text-green-700' : 'hover:bg-gray-100'
                              }`}
                            >
                              {formatNotificationType(type)}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active filters display */}
          {(filter !== 'all' || searchTerm) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {filter !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {filter === 'unread'
                    ? 'Belum Dibaca'
                    : filter === 'read'
                    ? 'Sudah Dibaca'
                    : formatNotificationType(filter)}
                  <button
                    onClick={() => setFilter('all')}
                    className="ml-1.5 text-green-600 hover:text-green-800"
                    aria-label="Remove filter"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Pencarian: {searchTerm}
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1.5 text-blue-600 hover:text-blue-800"
                    aria-label="Clear search"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada notifikasi</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filter !== 'all'
                ? 'Tidak ada notifikasi yang sesuai dengan filter'
                : 'Anda belum memiliki notifikasi'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                  >
                    Notifikasi
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
                  >
                    Jenis
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
                  >
                    Tanggal
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredNotifications.map((notification) => (
                  <tr
                    key={notification.id}
                    className={`hover:bg-gray-50 ${!notification.isRead ? 'bg-green-50' : ''}`}
                  >
                    <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:w-auto sm:max-w-none sm:pl-6">
                      <div className="flex items-center">
                        <div className="mr-3 text-xl">{getNotificationIcon(notification.type)}</div>
                        <div>
                          <div className="font-medium cursor-pointer" onClick={() => handleNotificationClick(notification)}>
                            {notification.title}
                            {!notification.isRead && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Baru
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-gray-500">{notification.message}</div>
                          
                          {/* Action buttons if present */}
                          {(notification.actionLabel || notification.secondaryActionLabel) && (
                            <div className="mt-2 flex space-x-2">
                              {notification.actionLabel && notification.actionUrl && (
                                <button
                                  onClick={() => handleNotificationClick(notification)}
                                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                                >
                                  {notification.actionLabel}
                                </button>
                              )}
                              {notification.secondaryActionLabel && notification.secondaryActionUrl && (
                                <button
                                  onClick={() => {
                                    markAsRead(notification.id);
                                    router.push(notification.secondaryActionUrl as string);
                                  }}
                                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                                >
                                  {notification.secondaryActionLabel}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-4 text-sm text-gray-500 lg:table-cell">
                      {formatNotificationType(notification.type)}
                    </td>
                    <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
                      {formatDate(notification.createdAt)}
                    </td>
                    <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex justify-end space-x-3">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Tandai Dibaca
                          </button>
                        )}
                        <button
                          onClick={() => clearNotification(notification.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination could be added here */}
      </div>
    </DashboardLayout>
  );
} 