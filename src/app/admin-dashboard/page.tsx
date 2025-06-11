'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { DashboardStats, formatDate, formatNumber, calculatePercentage } from '@/lib/utils/dashboard';
import { useRouter } from 'next/navigation';
import { FiSearch, FiRefreshCw } from 'react-icons/fi';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import EquipmentActivityChart from '@/components/EquipmentActivityChart';
import UpcomingSchedulesCard from '@/components/UpcomingSchedulesCard';
import { useNotifications } from '@/app/context/NotificationContext';
import { MdNotifications, MdSettings } from 'react-icons/md';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Constants for caching
const CACHE_DURATION = 60000; // 1 minute
const CACHE_KEY = 'admin_dashboard_data';
const CACHE_TIMESTAMP_KEY = 'admin_dashboard_timestamp';
const SEARCH_CACHE_PREFIX = 'admin_dashboard_search_';

// Tipe data untuk statistik dashboard
type DashboardData = {
  totalItems: number;
  availableItems: number;
  inUseItems: number;
  inCalibrationItems: number;
  inRentalItems: number;
  inMaintenanceItems: number;
  pendingRequests: number;
  pendingCalibrations: number;
  pendingRentals: number;
  upcomingCalibrations: number;
  overdueRentals: number;
  totalVendors: number;
  totalUsers: number;
};

// Tipe data untuk suggestion inventory
interface InventoryItem {
  serialNumber: string;
  name: string;
  partNumber: string;
  status: string;
}

// Function to ensure numeric values
function ensureNumericValues(data: any): DashboardData {
  // Check if data is defined
  if (!data) {
    return {
      totalItems: 0,
      availableItems: 0,
      inUseItems: 0,
      inCalibrationItems: 0,
      inRentalItems: 0,
      inMaintenanceItems: 0,
      pendingRequests: 0,
      pendingCalibrations: 0,
      pendingRentals: 0,
      upcomingCalibrations: 0,
      overdueRentals: 0,
      totalVendors: 0,
      totalUsers: 0,
    };
  }
  
  // Helper function to convert any value to number safely
  const toNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };
  
  return {
    totalItems: toNumber(data.totalItems),
    availableItems: toNumber(data.availableItems),
    inUseItems: toNumber(data.inUseItems),
    inCalibrationItems: toNumber(data.inCalibrationItems),
    inRentalItems: toNumber(data.inRentalItems),
    inMaintenanceItems: toNumber(data.inMaintenanceItems),
    pendingRequests: toNumber(data.pendingRequests),
    pendingCalibrations: toNumber(data.pendingCalibrations),
    pendingRentals: toNumber(data.pendingRentals),
    upcomingCalibrations: toNumber(data.upcomingCalibrations),
    overdueRentals: toNumber(data.overdueRentals),
    totalVendors: toNumber(data.totalVendors),
    totalUsers: toNumber(data.totalUsers),
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { unreadCount, notifications } = useNotifications();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch dashboard data with caching
  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Check cache first (unless force refresh is requested)
      if (!forceRefresh) {
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        const lastFetch = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
        const now = Date.now();
        
        // Use cache if available and not expired
        if (cachedData && lastFetch && now - parseInt(lastFetch) < CACHE_DURATION) {
          try {
            const parsedData = JSON.parse(cachedData);
            const validatedData = ensureNumericValues(parsedData);
            setStats(validatedData);
            setLoading(false);
            return;
          } catch (e) {
            console.error('Error parsing cached data:', e);
            // Continue with fetching fresh data
          }
        }
      }
      
      // Add timestamp to URL for cache busting when force refresh is true
      const url = forceRefresh 
        ? `/api/admin/dashboard?t=${Date.now()}` 
        : '/api/admin/dashboard';
      
      const res = await fetch(url, {
        cache: forceRefresh ? 'no-store' : 'default',
        headers: forceRefresh ? { 'Cache-Control': 'no-cache' } : {}
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await res.json();
      const validatedData = ensureNumericValues(data);
      
      console.log('Fresh admin dashboard data fetched:', validatedData);
      
      // Cache the validated results
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(validatedData));
      sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      setStats(validatedData);
    } catch (err) {
      setError('Error loading dashboard data. Please try again later.');
      console.error(err);
      
      // Try to use cached data even if it's expired
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          const validatedData = ensureNumericValues(parsedData);
          setStats(validatedData);
        } catch (e) {
          console.error('Error parsing fallback cached data:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
  }, [fetchDashboardData]);
  
  // Debug effect to log stats data for troubleshooting
  useEffect(() => {
    if (stats) {
      console.log('Dashboard Stats:', {
        totalItems: stats.totalItems,
        availableItems: stats.availableItems,
        inCalibrationItems: stats.inCalibrationItems,
        inRentalItems: stats.inRentalItems,
        inMaintenanceItems: stats.inMaintenanceItems,
        totalVendors: stats.totalVendors,
        totalUsers: stats.totalUsers,
        types: {
          totalItems: typeof stats.totalItems,
          availableItems: typeof stats.availableItems,
          totalVendors: typeof stats.totalVendors,
          totalUsers: typeof stats.totalUsers
        }
      });
    }
  }, [stats]);
  
  // Fungsi untuk mencari item dengan caching
  const searchItems = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsSearching(true);
    try {
      // Check search cache first
      const searchCacheKey = `${SEARCH_CACHE_PREFIX}${term}`;
      const cachedResults = sessionStorage.getItem(searchCacheKey);
      
      if (cachedResults) {
        const data = JSON.parse(cachedResults);
        setSearchResults(data);
        setShowSuggestions(true);
        setIsSearching(false);
        return;
      }
      
      const res = await fetch(`/api/admin/items?search=${encodeURIComponent(term)}&limit=5`, {
        headers: { 'Cache-Control': 'max-age=30' }
      });
      
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        
        // Cache search results (for 5 minutes)
        sessionStorage.setItem(searchCacheKey, JSON.stringify(items));
        
        setSearchResults(items);
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
  }, []);
  
  // Improved debounce search with useEffect and cleanup
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debouncing
    searchTimeoutRef.current = setTimeout(() => {
      searchItems(searchTerm);
    }, 300);
    
    // Cleanup on unmount or searchTerm change
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, searchItems]);
  
  // Handle item selection dan navigasi ke halaman history
  const handleItemSelect = (item: InventoryItem) => {
    router.push(`/admin/inventory/history/${encodeURIComponent(item.serialNumber)}`);
    setSearchTerm('');
    setShowSuggestions(false);
  };

  // Format status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      'AVAILABLE': { color: 'bg-green-100 text-green-800', text: 'Tersedia' },
      'IN_CALIBRATION': { color: 'bg-purple-100 text-purple-800', text: 'Kalibrasi' },
      'RENTED': { color: 'bg-yellow-100 text-yellow-800', text: 'Dipinjam' },
      'IN_MAINTENANCE': { color: 'bg-red-100 text-red-800', text: 'Maintenance' }
    };
    
    const style = statusMap[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.color}`}>
        {style.text}
      </span>
    );
  };
  
  // Function to clear the dashboard cache
  const clearDashboardCache = () => {
    console.log('Clearing dashboard cache...');
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    
    // Also clear any search related caches
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(SEARCH_CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  };
  
  // Handle refresh action
  const handleRefresh = () => {
    console.log('Refreshing admin dashboard data...');
    // Clear all dashboard-related cache entries
    clearDashboardCache();
    
    // Force a fresh data fetch with a unique timestamp to bypass all caching
    fetchDashboardData(true);
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

  // Create safe pie chart data with type checking
  const createPieChartData = (data: DashboardData | null) => {
    if (!data) return { labels: [], datasets: [] };
    
    // Ensure all values are numbers
    const availableItems = typeof data.availableItems === 'number' ? data.availableItems : 0;
    const inCalibrationItems = typeof data.inCalibrationItems === 'number' ? data.inCalibrationItems : 0;
    const inRentalItems = typeof data.inRentalItems === 'number' ? data.inRentalItems : 0;
    const inMaintenanceItems = typeof data.inMaintenanceItems === 'number' ? data.inMaintenanceItems : 0;
    
    return {
      labels: ['Tersedia', 'Dalam Kalibrasi', 'Dipinjam', 'Maintenance'],
      datasets: [
        {
          label: 'Status Barang',
          data: [
            availableItems,
            inCalibrationItems,
            inRentalItems,
            inMaintenanceItems,
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
    };
  };

  // Use the safe function to create pie chart data
  const pieChartData = createPieChartData(stats);

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Improved header with responsive flex layout */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
          
          <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            onClick={handleRefresh}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            disabled={loading}
          >
              <FiRefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
          </button>
            <button
              onClick={clearDashboardCache}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Clear Cache
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
            </div>
          )}
        
        {/* Main Statistics Cards - Improved grid layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Total Barang</p>
                    <h2 className="text-3xl font-bold text-gray-800">{stats && typeof stats.totalItems === 'number' ? formatNumber(stats.totalItems) : 0}</h2>
                    <Link href="/admin/inventory" className="text-sm text-green-600 hover:text-green-700 hover:underline inline-flex items-center mt-2 group">
                      Lihat inventaris
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Maintenance Tertunda</p>
                    <h2 className="text-3xl font-bold text-gray-800">{stats && typeof stats.inMaintenanceItems === 'number' ? formatNumber(stats.inMaintenanceItems) : 0}</h2>
                    <Link href="/admin/maintenance" className="text-sm text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center mt-2 group">
                      Lihat permintaan maintenance
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Kalibrasi</p>
                    <h2 className="text-3xl font-bold text-gray-800">{stats && typeof stats.pendingCalibrations === 'number' ? formatNumber(stats.pendingCalibrations) : 0}</h2>
                    <Link href="/admin/calibrations" className="text-sm text-purple-600 hover:text-purple-700 hover:underline inline-flex items-center mt-2 group">
                      Lihat kalibrasi
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Permintaan Peminjaman</p>
                    <h2 className="text-3xl font-bold text-gray-800">{stats && typeof stats.pendingRentals === 'number' ? formatNumber(stats.pendingRentals) : 0}</h2>
                    <Link href="/admin/rentals" className="text-sm text-amber-600 hover:text-amber-700 hover:underline inline-flex items-center mt-2 group">
                      Lihat peminjaman
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Total Vendor</p>
                    <h2 className="text-3xl font-bold text-gray-800">{stats && typeof stats.totalVendors === 'number' ? formatNumber(stats.totalVendors) : 0}</h2>
                    <Link href="/admin/vendors" className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center mt-2 group">
                      Lihat vendor
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Total Pengguna</p>
                    <h2 className="text-3xl font-bold text-gray-800">{stats && typeof stats.totalUsers === 'number' ? formatNumber(stats.totalUsers) : 0}</h2>
                    <Link href="/admin/users" className="text-sm text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center mt-2 group">
                      Lihat pengguna
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  <div className="bg-teal-50 p-3 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
              </div>
          
          {/* Notification Card */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Notifikasi</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{unreadCount}</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <MdNotifications className="h-4 w-4 mr-1" />
                Belum Dibaca
              </span>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {notifications && notifications.length > 0 ? (
                  <span className="text-gray-600">
                    {new Date(notifications[0].createdAt).toLocaleDateString()}
                  </span>
                ) : (
                  <span>Tidak ada notifikasi baru</span>
                )}
              </div>
              <Link href="/admin/notifications" className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1">
                Kelola
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
            </div>
            
        {/* Second Row with Upcoming Schedules and Pie Chart - Improved layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Upcoming Schedules Card */}
          <div className="col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Jadwal Mendatang</h3>
                <UpcomingSchedulesCard 
                  title="Upcoming Inventory Checks"
                  apiUrl="/api/admin/inventory-schedules"
                  viewAllLink="/admin/inventory/schedules"
                />
              </div>

          {/* Item Status Pie Chart - Improved styling */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Distribusi Status Barang</h3>
                <div className="h-64 flex items-center justify-center">
                  {stats ? (
                    <Pie data={pieChartData} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            boxWidth: 12,
                            padding: 15,
                            font: {
                              size: 12
                            }
                          }
                        },
                        title: {
                          display: false
                        },
                        tooltip: {
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          titleColor: '#1f2937',
                          bodyColor: '#4b5563',
                          borderColor: '#e5e7eb',
                          borderWidth: 1,
                          padding: 12,
                          boxPadding: 6,
                          usePointStyle: true,
                          callbacks: {
                            label: function(context) {
                              const value = context.raw as number;
                              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                              const percentage = Math.round((value / total) * 100);
                              return `${context.label}: ${value} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }} />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500 text-sm">Loading chart data...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
        {/* Item Status Overview - Improved layout and styling */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Ikhtisar Status Barang</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="flex flex-col p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-gray-700 font-medium">Tersedia</span>
                    </div>
                    <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-full text-xs font-semibold">
                      {stats && typeof stats.availableItems === 'number' ? formatNumber(stats.availableItems) : 0}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: `${stats && typeof stats.availableItems === 'number' && typeof stats.totalItems === 'number' ? 
                          calculatePercentage(stats.availableItems, stats.totalItems) : 0}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats && typeof stats.availableItems === 'number' && typeof stats.totalItems === 'number' ? 
                      Math.round(calculatePercentage(stats.availableItems, stats.totalItems)) : 0}% dari total inventaris
                  </p>
                </div>
                
            <div className="flex flex-col p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                      <span className="text-gray-700 font-medium">Dalam Kalibrasi</span>
                    </div>
                    <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full text-xs font-semibold">
                      {stats && typeof stats.inCalibrationItems === 'number' ? formatNumber(stats.inCalibrationItems) : 0}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-500 h-2 rounded-full" 
                      style={{ 
                        width: `${stats && typeof stats.inCalibrationItems === 'number' && typeof stats.totalItems === 'number' ? 
                          calculatePercentage(stats.inCalibrationItems, stats.totalItems) : 0}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats && typeof stats.inCalibrationItems === 'number' && typeof stats.totalItems === 'number' ? 
                      Math.round(calculatePercentage(stats.inCalibrationItems, stats.totalItems)) : 0}% dari total inventaris
                  </p>
                </div>
                
            <div className="flex flex-col p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                      <span className="text-gray-700 font-medium">Dipinjam</span>
                    </div>
                    <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-semibold">
                      {stats && typeof stats.inRentalItems === 'number' ? formatNumber(stats.inRentalItems) : 0}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-2 rounded-full" 
                      style={{ 
                        width: `${stats && typeof stats.inRentalItems === 'number' && typeof stats.totalItems === 'number' ? 
                          calculatePercentage(stats.inRentalItems, stats.totalItems) : 0}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats && typeof stats.inRentalItems === 'number' && typeof stats.totalItems === 'number' ? 
                      Math.round(calculatePercentage(stats.inRentalItems, stats.totalItems)) : 0}% dari total inventaris
                  </p>
                </div>
                
            <div className="flex flex-col p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                      <span className="text-gray-700 font-medium">Maintenance</span>
                    </div>
                    <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded-full text-xs font-semibold">
                      {stats && typeof stats.inMaintenanceItems === 'number' ? formatNumber(stats.inMaintenanceItems) : 0}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ 
                        width: `${stats && typeof stats.inMaintenanceItems === 'number' && typeof stats.totalItems === 'number' ? 
                          calculatePercentage(stats.inMaintenanceItems, stats.totalItems) : 0}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats && typeof stats.inMaintenanceItems === 'number' && typeof stats.totalItems === 'number' ? 
                      Math.round(calculatePercentage(stats.inMaintenanceItems, stats.totalItems)) : 0}% dari total inventaris
                  </p>
                </div>
              </div>
            </div>
            
        {/* Activity and Reminders - Improved design */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-5">Aktivitas & Pengingat</h2>
            
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="relative pl-8 border-l-2 border-yellow-300 py-1">
                  <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-100 hover:shadow-sm transition-shadow">
                    <p className="text-sm font-medium text-gray-800 mb-1">Kalibrasi Mendatang</p>
                    <p className="text-sm text-gray-600">
                      {stats && typeof stats.upcomingCalibrations === 'number' ? stats.upcomingCalibrations : 0} barang 
                      dijadwalkan untuk kalibrasi dalam 7 hari kedepan
                    </p>
                    <Link href="/admin/calibrations" className="text-xs text-yellow-600 hover:text-yellow-700 hover:underline inline-flex items-center mt-2">
                      Lihat jadwal kalibrasi
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
                
                <div className="relative pl-8 border-l-2 border-red-300 py-1">
                  <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-red-400"></div>
              <div className="bg-red-50 p-4 rounded-md border border-red-100 hover:shadow-sm transition-shadow">
                    <p className="text-sm font-medium text-gray-800 mb-1">Peminjaman Terlambat</p>
                    <p className="text-sm text-gray-600">
                      {stats && typeof stats.overdueRentals === 'number' ? stats.overdueRentals : 0} barang 
                      telah melewati batas waktu pengembalian
                    </p>
                    <Link href="/admin/rentals?filter=overdue" className="text-xs text-red-600 hover:text-red-700 hover:underline inline-flex items-center mt-2">
                      Lihat peminjaman terlambat
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
                
                <div className="relative pl-8 border-l-2 border-blue-300 py-1">
                  <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-400"></div>
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100 hover:shadow-sm transition-shadow">
                    <p className="text-sm font-medium text-gray-800 mb-1">Persetujuan Maintenance</p>
                    <p className="text-sm text-gray-600">
                      {stats && typeof stats.inMaintenanceItems === 'number' ? stats.inMaintenanceItems : 0} barang 
                      dalam proses maintenance
                    </p>
                    <Link href="/admin/maintenance" className="text-xs text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center mt-2">
                      Tinjau maintenance
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            
              {/* Equipment Activity Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all mb-8">
                <EquipmentActivityChart title="Aktivitas Peralatan" />
              </div>
      </div>
    </DashboardLayout>
  );
} 