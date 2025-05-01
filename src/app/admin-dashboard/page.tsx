'use client';

import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { DashboardStats, formatDate, formatNumber, calculatePercentage } from '@/lib/utils/dashboard';
import { useRouter } from 'next/navigation';
import { FiSearch } from 'react-icons/fi';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Tipe data untuk statistik dashboard
type DashboardData = DashboardStats & {
  notifications: Array<{
    id: number;
    message: string;
    isRead: boolean;
    createdAt: Date;
  }>;
};

// Tipe data untuk suggestion inventory
interface InventoryItem {
  serialNumber: string;
  name: string;
  partNumber: string;
  status: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (!res.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const data = await res.json();
        
        setStats(data);
      } catch (err) {
        setError('Error loading dashboard data. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Handler untuk menutup suggestion ketika klik di luar
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Fungsi untuk mencari item
  const searchItems = async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsSearching(true);
    try {
      const res = await fetch(`/api/admin/items?search=${encodeURIComponent(term)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.items || []);
        setShowSuggestions(true);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching items:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Debounce search dengan useEffect
  useEffect(() => {
    const timerId = setTimeout(() => {
      searchItems(searchTerm);
    }, 300);
    
    return () => clearTimeout(timerId);
  }, [searchTerm]);
  
  // Handle item selection dan navigasi ke halaman history
  const handleItemSelect = (item: InventoryItem) => {
    router.push(`/admin/inventory/history/${encodeURIComponent(item.serialNumber)}`);
    setSearchTerm('');
    setShowSuggestions(false);
  };

  // Format status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      'AVAILABLE': { color: 'bg-green-100 text-green-800', text: 'Available' },
      'IN_CALIBRATION': { color: 'bg-purple-100 text-purple-800', text: 'Calibration' },
      'RENTED': { color: 'bg-yellow-100 text-yellow-800', text: 'Rented' },
      'IN_MAINTENANCE': { color: 'bg-red-100 text-red-800', text: 'Maintenance' }
    };
    
    const style = statusMap[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.color}`}>
        {style.text}
      </span>
    );
  };
  
  // Pie chart configuration
  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: 'Distribusi Status Barang',
      },
    },
  };

  const pieChartData = stats ? {
    labels: ['Available', 'In Calibration', 'Rented', 'Maintenance'],
    datasets: [
      {
        label: 'Status Barang',
        data: [
          stats.availableItems || 0,
          stats.inCalibrationItems || 0,
          stats.inRentalItems || 0,
          stats.inMaintenanceItems || 0,
        ],
        backgroundColor: [
          'rgba(75, 192, 75, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(255, 99, 132, 0.7)',
        ],
        borderColor: [
          'rgba(75, 192, 75, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  } : { labels: [], datasets: [] };

  return (
    <DashboardLayout>
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">Dashboard</h1>
        
        {/* Search Bar dengan Suggestion */}
        <div className="mb-6 relative" ref={searchRef}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Cari barang berdasarkan nama, serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
            />
          </div>
          
          {/* Suggestion Dropdown */}
          {showSuggestions && (
            <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500 mx-auto mb-2"></div>
                  Sedang mencari...
                </div>
              ) : searchResults.length > 0 ? (
                <ul className="py-1">
                  {searchResults.map((item) => (
                    <li 
                      key={item.serialNumber}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleItemSelect(item)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-600">SN: {item.serialNumber}</div>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : searchTerm.length >= 2 ? (
                <div className="p-4 text-center text-gray-500">
                  Tidak ditemukan barang yang sesuai
                </div>
              ) : null}
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
            <span className="ml-3 text-lg text-gray-700">Loading dashboard data...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
            <p>{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistik Utama */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Barang</h2>
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-800">{stats ? formatNumber(stats.totalItems) : 0}</p>
                    <Link href="/admin/inventory" className="text-sm text-green-600 hover:underline">Lihat detail</Link>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">Permintaan</h2>
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-800">{stats ? formatNumber(stats.pendingRequests) : 0}</p>
                    <Link href="/admin/requests" className="text-sm text-blue-600 hover:underline">Lihat pending</Link>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">Kalibrasi</h2>
                <div className="flex items-center">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-800">{stats ? formatNumber(stats.pendingCalibrations) : 0}</p>
                    <Link href="/admin/calibrations" className="text-sm text-purple-600 hover:underline">Lihat pending</Link>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">Rental</h2>
                <div className="flex items-center">
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-800">{stats ? formatNumber(stats.pendingRentals) : 0}</p>
                    <Link href="/admin/rentals" className="text-sm text-yellow-600 hover:underline">Lihat pending</Link>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status Barang */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Status Barang</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-700 font-medium">Available</span>
                    <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs font-medium">{stats ? formatNumber(stats.availableItems) : 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-2" style={{ width: `${stats ? calculatePercentage(stats.availableItems, stats.totalItems) : 0}%` }}></div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-700 font-medium">In Calibration</span>
                    <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">{stats ? formatNumber(stats.inCalibrationItems) : 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-2" style={{ width: `${stats ? calculatePercentage(stats.inCalibrationItems, stats.totalItems) : 0}%` }}></div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-yellow-700 font-medium">Rented</span>
                    <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">{stats ? formatNumber(stats.inRentalItems) : 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-yellow-500 h-2" style={{ width: `${stats ? calculatePercentage(stats.inRentalItems, stats.totalItems) : 0}%` }}></div>
                  </div>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-700 font-medium">Maintenance</span>
                    <span className="bg-red-200 text-red-800 px-2 py-1 rounded-full text-xs font-medium">{stats ? formatNumber(stats.inMaintenanceItems) : 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-2" style={{ width: `${stats ? calculatePercentage(stats.inMaintenanceItems, stats.totalItems) : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Pengingat dan Pie Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pengingat */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Pengingat</h2>
                <div className="space-y-3">
                  <div className="flex items-start p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <div className="text-yellow-500 mr-2 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{stats?.upcomingCalibrations || 0} barang mendekati jadwal kalibrasi dalam 7 hari</p>
                      <Link href="/admin/calibrations" className="text-xs text-yellow-600 hover:underline">Lihat detail</Link>
                    </div>
                  </div>
                  
                  <div className="flex items-start p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="text-red-500 mr-2 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{stats?.overdueRentals || 0} barang melebihi batas waktu rental</p>
                      <Link href="/admin/rentals" className="text-xs text-red-600 hover:underline">Lihat detail</Link>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Pie Chart - Distribution of Items by Status */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Distribusi Status Barang</h2>
                <div className="h-60">
                  {stats ? (
                    <Pie data={pieChartData} options={pieChartOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500 text-sm">Loading chart data...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Notifikasi Terbaru */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Notifikasi Terbaru</h2>
                <Link href="/admin/notifications" className="text-sm text-blue-600 hover:underline">Lihat semua</Link>
              </div>
              
              {stats?.notifications && stats.notifications.length > 0 ? (
                <div className="space-y-3">
                  {stats.notifications.slice(0, 5).map(notification => (
                    <div key={notification.id} className={`px-4 py-3 rounded-lg border-l-4 ${notification.isRead ? 'border-gray-300 bg-gray-50' : 'border-blue-500 bg-blue-50'}`}>
                      <p className="text-sm font-medium text-gray-800">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(notification.createdAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Tidak ada notifikasi terbaru</p>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 