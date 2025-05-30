'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useUser } from '@/app/context/UserContext';
import { useRouter } from 'next/navigation';
import { NotificationType, Role } from '@prisma/client';
import useSWR from 'swr';
import Link from 'next/link';
import { MdAnalytics, MdLibraryBooks } from 'react-icons/md';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
  user: User;
}

export default function AdminNotificationsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Form state for creating new notifications
  const [formData, setFormData] = useState({
    targetType: 'user', // 'user' or 'role'
    userId: '',
    roleId: '',
    title: '',
    message: '',
    type: 'GENERAL_INFO',
  });
  
  // Filter state
  const [filters, setFilters] = useState({
    userId: '',
    type: '',
    isRead: '',
  });
  
  const [users, setUsers] = useState<User[]>([]);

  // Fetcher function for SWR
  const fetcher = async (url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Failed to fetch data');
    }
    return res.json();
  };
  
  // SWR for users
  const { data: userData } = useSWR(
    user?.role === 'ADMIN' ? '/api/admin/users' : null,
    fetcher,
    {
      onSuccess: (data) => {
        if (data.success) {
          setUsers(data.users);
        }
      }
    }
  );
  
  // Create SWR key based on filters
  const getNotificationsKey = () => {
    if (!user || user.role !== 'ADMIN') return null;
    
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', '20');
    
    if (filters.userId) {
      queryParams.append('userId', filters.userId);
    }
    
    if (filters.type) {
      queryParams.append('type', filters.type);
    }
    
    if (filters.isRead) {
      queryParams.append('isRead', filters.isRead);
    }
    
    return `/api/admin/notifications?${queryParams.toString()}`;
  };
  
  // SWR for notifications
  const { data: notificationsData, error: notificationsError, mutate } = useSWR(
    getNotificationsKey,
    fetcher,
    {
      onSuccess: (data) => {
        if (data.success) {
          setNotifications(data.notifications);
          setTotalPages(data.pagination.totalPages);
          setIsLoading(false);
        }
      },
      onError: (err) => {
        console.error('Error fetching notifications:', err);
        setError('Failed to fetch notifications');
        setIsLoading(false);
      }
    }
  );
  
  // Update SWR key when filters change
  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      setIsLoading(true);
      mutate();
    }
  }, [page, filters, user, mutate]);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user, router]);

  // Define fetchNotifications for compatibility
  const fetchNotifications = async () => {
    return mutate();
  };

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form
      if (!formData.title || !formData.message) {
        setError('Title and message are required');
        return;
      }
      
      if (formData.targetType === 'user' && !formData.userId) {
        setError('Please select a user');
        return;
      }
      
      if (formData.targetType === 'role' && !formData.roleId) {
        setError('Please select a role');
        return;
      }
      
      // Prepare request data
      const requestData = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
      };
      
      if (formData.targetType === 'user') {
        Object.assign(requestData, { userId: formData.userId });
      } else {
        Object.assign(requestData, { roleId: formData.roleId });
      }
      
      // Send request
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Reset form
        setFormData({
          targetType: 'user',
          userId: '',
          roleId: '',
          title: '',
          message: '',
          type: 'GENERAL_INFO',
        });
        
        // Refresh notifications
        mutate();
        
        // Show success message
        alert(`Successfully created ${data.count} notification(s)`);
      } else {
        setError(data.message || 'Failed to create notification');
      }
    } catch (err) {
      console.error('Error creating notification:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh notifications
        mutate();
      } else {
        setError(data.message || 'Failed to delete notification');
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleDeleteAllNotifications = async () => {
    if (!confirm('Are you sure you want to delete all notifications that match the current filters?')) {
      return;
    }
    
    try {
      // Build query string with filters
      const queryParams = new URLSearchParams();
      
      if (filters.userId) {
        queryParams.append('userId', filters.userId);
      }
      
      if (filters.type) {
        queryParams.append('type', filters.type);
      }
      
      const response = await fetch(`/api/admin/notifications?${queryParams.toString()}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh notifications
        mutate();
        alert(`Successfully deleted ${data.count} notifications`);
      } else {
        setError(data.message || 'Failed to delete notifications');
      }
    } catch (err) {
      console.error('Error deleting notifications:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPage(1); // Reset to first page when filters change
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Notifikasi</h1>
          
          <div className="flex space-x-2">
            <Link 
              href="/admin/notifications/analytics" 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <MdAnalytics className="mr-2 h-5 w-5" />
              Lihat Analitik
            </Link>
            
            <Link 
              href="/admin/notifications/docs" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <MdLibraryBooks className="mr-2 h-5 w-5" />
              Dokumentasi
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Create notification form */}
        <div className="bg-white p-4 rounded-md border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Buat Notifikasi Baru</h2>
          
          <form onSubmit={handleCreateNotification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Notifikasi
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="targetType"
                    value="user"
                    checked={formData.targetType === 'user'}
                    onChange={() => setFormData({ ...formData, targetType: 'user' })}
                    className="h-4 w-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">User Tertentu</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="targetType"
                    value="role"
                    checked={formData.targetType === 'role'}
                    onChange={() => setFormData({ ...formData, targetType: 'role' })}
                    className="h-4 w-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Semua User dengan Role</span>
                </label>
              </div>
            </div>
            
            {formData.targetType === 'user' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pilih User
                </label>
                <select
                  name="userId"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  aria-label="Select user"
                >
                  <option value="">-- Pilih User --</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pilih Role
                </label>
                <select
                  name="roleId"
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  aria-label="Select role"
                >
                  <option value="">-- Pilih Role --</option>
                  <option value={Role.ADMIN}>Admin</option>
                  <option value={Role.MANAGER}>Manager</option>
                  <option value={Role.USER}>User</option>
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipe Notifikasi
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                aria-label="Select notification type"
              >
                <option value={NotificationType.GENERAL_INFO}>Informasi Umum</option>
                <option value={NotificationType.RENTAL_REQUEST}>Permintaan Rental</option>
                <option value={NotificationType.RENTAL_STATUS_CHANGE}>Perubahan Status Rental</option>
                <option value={NotificationType.CALIBRATION_REMINDER}>Pengingat Kalibrasi</option>
                <option value={NotificationType.CALIBRATION_STATUS_CHANGE}>Perubahan Status Kalibrasi</option>
                <option value={NotificationType.RENTAL_DUE_REMINDER}>Pengingat Jatuh Tempo Rental</option>
                <option value={NotificationType.MAINTENANCE_REMINDER}>Pengingat Maintenance</option>
                <option value={NotificationType.INVENTORY_SCHEDULE}>Jadwal Inventarisasi</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Judul
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Judul notifikasi"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pesan
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Isi pesan notifikasi"
                rows={3}
                required
              />
            </div>
            
            <div>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Kirim Notifikasi
              </button>
            </div>
          </form>
        </div>

        {/* Notification list */}
        <div className="bg-white p-4 rounded-md border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Daftar Notifikasi</h2>
            
            <button
              onClick={handleDeleteAllNotifications}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Hapus Semua yang Terfilter
            </button>
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter User
              </label>
              <select
                name="userId"
                value={filters.userId}
                onChange={handleFilterChange}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                aria-label="Filter by user"
              >
                <option value="">Semua User</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Tipe
              </label>
              <select
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                aria-label="Filter by notification type"
              >
                <option value="">Semua Tipe</option>
                <option value={NotificationType.GENERAL_INFO}>Informasi Umum</option>
                <option value={NotificationType.RENTAL_REQUEST}>Permintaan Rental</option>
                <option value={NotificationType.RENTAL_STATUS_CHANGE}>Perubahan Status Rental</option>
                <option value={NotificationType.CALIBRATION_REMINDER}>Pengingat Kalibrasi</option>
                <option value={NotificationType.CALIBRATION_STATUS_CHANGE}>Perubahan Status Kalibrasi</option>
                <option value={NotificationType.RENTAL_DUE_REMINDER}>Pengingat Jatuh Tempo Rental</option>
                <option value={NotificationType.MAINTENANCE_REMINDER}>Pengingat Maintenance</option>
                <option value={NotificationType.INVENTORY_SCHEDULE}>Jadwal Inventarisasi</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Dibaca
              </label>
              <select
                name="isRead"
                value={filters.isRead}
                onChange={handleFilterChange}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                aria-label="Filter by read status"
              >
                <option value="">Semua Status</option>
                <option value="true">Sudah Dibaca</option>
                <option value="false">Belum Dibaca</option>
              </select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-gray-50 p-4 text-center text-gray-500 rounded-md">
              Tidak ada notifikasi yang ditemukan
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Judul
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pesan
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipe
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {notifications.map((notification) => (
                      <tr key={notification.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {notification.user?.name || 'Unknown'} 
                          <span className="ml-1 text-xs text-gray-500">({notification.user?.role})</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {notification.title}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {notification.message}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {notification.type}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {notification.isRead ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Sudah Dibaca
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Belum Dibaca
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(notification.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className={`px-3 py-1 rounded-md text-sm ${
                      page === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                    className={`px-3 py-1 rounded-md text-sm ${
                      page === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 