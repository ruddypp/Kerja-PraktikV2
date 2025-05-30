'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/app/context/UserContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import useSWR from 'swr';
import { 
  MdDashboard, 
  MdPieChart, 
  MdBarChart, 
  MdPeople,
  MdSettings,
  MdLibraryBooks
} from 'react-icons/md';

// Type definitions
interface NotificationStats {
  totalCount: number;
  unreadCount: number;
  readCount: number;
  typeDistribution: Record<string, number>;
  userEngagement: {
    userId: string;
    userName: string;
    totalReceived: number;
    readPercentage: number;
  }[];
  dailyCounts: {
    date: string;
    count: number;
  }[];
}

export default function NotificationAnalyticsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('7d'); // 7d, 30d, 90d

  // Fetcher function for SWR
  const fetcher = async (url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Failed to fetch data');
    }
    return res.json();
  };
  
  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user, router]);
  
  // SWR for stats
  const { data, error: swrError, isValidating } = useSWR(
    user?.role === 'ADMIN' ? `/api/admin/notifications/stats?range=${timeRange}` : null,
    fetcher,
    {
      onSuccess: (data) => {
        if (data.success) {
          setStats(data.stats);
          setIsLoading(false);
        }
      },
      onError: (err) => {
        console.error('Error fetching notification statistics:', err);
        setError('Failed to fetch statistics');
        setIsLoading(false);
      },
      revalidateOnFocus: false
    }
  );
  
  // Show loading state during revalidation
  useEffect(() => {
    setIsLoading(isValidating);
  }, [isValidating]);
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analitik Notifikasi</h1>
          
          <div className="flex space-x-2">
            <Link 
              href="/admin/notifications" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <MdDashboard className="mr-2 h-5 w-5" />
              Kembali ke Panel
            </Link>
            <Link 
              href="/notifications/preferences" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <MdSettings className="mr-2 h-5 w-5" />
              Pengaturan
            </Link>
            <Link 
              href="/admin/notifications/docs" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <MdLibraryBooks className="mr-2 h-5 w-5" />
              Dokumentasi
            </Link>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Rentang Waktu</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setTimeRange('7d')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    timeRange === '7d' 
                      ? 'bg-green-100 text-green-800 font-medium' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  7 Hari
                </button>
                <button 
                  onClick={() => setTimeRange('30d')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    timeRange === '30d' 
                      ? 'bg-green-100 text-green-800 font-medium' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  30 Hari
                </button>
                <button 
                  onClick={() => setTimeRange('90d')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    timeRange === '90d' 
                      ? 'bg-green-100 text-green-800 font-medium' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  90 Hari
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md text-red-800 mb-6">
            {error}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Notifikasi</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCount}</p>
                <div className="mt-2 flex items-center text-sm">
                  <div className="text-gray-500">Periode {timeRange === '7d' ? '7 hari' : timeRange === '30d' ? '30 hari' : '90 hari'}</div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Notifikasi Dibaca</h3>
                <p className="text-3xl font-bold text-green-600">{stats.readCount}</p>
                <div className="mt-2 flex items-center text-sm">
                  <div className="text-gray-700">{stats.totalCount > 0 ? Math.round((stats.readCount / stats.totalCount) * 100) : 0}% rate</div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Notifikasi Belum Dibaca</h3>
                <p className="text-3xl font-bold text-red-500">{stats.unreadCount}</p>
                <div className="mt-2 flex items-center text-sm">
                  <div className="text-gray-700">{stats.totalCount > 0 ? Math.round((stats.unreadCount / stats.totalCount) * 100) : 0}% dari total</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Distribusi Jenis Notifikasi</h3>
                  <MdPieChart className="h-5 w-5 text-gray-400" />
                </div>
                <div className="space-y-4">
                  {Object.entries(stats.typeDistribution || {}).map(([type, count]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex justify-between">
                        <div className="text-sm font-medium text-gray-700">
                          {formatNotificationType(type)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {count} ({stats.totalCount > 0 ? Math.round((count / stats.totalCount) * 100) : 0}%)
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-green-600 h-2.5 rounded-full" 
                          style={{ width: `${stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Notifikasi Harian</h3>
                  <MdBarChart className="h-5 w-5 text-gray-400" />
                </div>
                <div className="h-64 flex items-end space-x-2">
                  {stats.dailyCounts && stats.dailyCounts.length > 0 ? (
                    stats.dailyCounts.map((day) => {
                      const maxCount = Math.max(...stats.dailyCounts.map(d => d.count));
                      const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                      return (
                        <div key={day.date} className="flex flex-col items-center flex-1">
                          <div 
                            className="w-full bg-green-100 hover:bg-green-200 rounded-t"
                            style={{ height: `${height}%` }}
                          >
                            <div className="w-full bg-green-500 h-1"></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(day.date).toLocaleDateString('id-ID', { day: 'numeric' })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full flex items-center justify-center text-gray-500 text-sm">
                      Tidak ada data
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Keterlibatan Pengguna</h3>
                <MdPeople className="h-5 w-5 text-gray-400" />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pengguna
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Diterima
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Persentase Dibaca
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.userEngagement && stats.userEngagement.length > 0 ? (
                      stats.userEngagement.map((user) => (
                        <tr key={user.userId}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{user.totalReceived}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-grow max-w-xs">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div 
                                    className={`h-2.5 rounded-full ${
                                      user.readPercentage > 90 ? 'bg-green-600' : 
                                      user.readPercentage > 70 ? 'bg-green-500' : 
                                      user.readPercentage > 50 ? 'bg-yellow-500' : 
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${user.readPercentage}%` }}
                                  ></div>
                                </div>
                              </div>
                              <div className="ml-4 text-sm text-gray-500">
                                {user.readPercentage}%
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                          Tidak ada data keterlibatan pengguna
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-yellow-50 p-4 rounded-md text-yellow-800 mb-6">
            Tidak ada data statistik yang tersedia
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Helper function to format notification types
function formatNotificationType(type: string) {
  switch (type) {
    case 'RENTAL_REQUEST':
      return 'Permintaan Rental';
    case 'RENTAL_STATUS_CHANGE':
      return 'Status Rental Berubah';
    case 'CALIBRATION_REMINDER':
      return 'Pengingat Kalibrasi';
    case 'CALIBRATION_STATUS_CHANGE':
      return 'Status Kalibrasi Berubah';
    case 'RENTAL_DUE_REMINDER':
      return 'Pengingat Jatuh Tempo Rental';
    case 'MAINTENANCE_REMINDER':
      return 'Pengingat Maintenance';
    case 'INVENTORY_SCHEDULE':
      return 'Jadwal Inventaris';
    case 'VENDOR_INFO':
      return 'Informasi Vendor';
    case 'GENERAL_INFO':
      return 'Informasi Umum';
    default:
      return type.replace(/_/g, ' ');
  }
} 