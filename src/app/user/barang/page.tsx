'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'react-hot-toast';
import { FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { ItemStatus } from '@prisma/client';

// Types for the data
interface Item {
  serialNumber: string;
  name: string;
  partNumber: string;
  sensor: string | null;
  description: string | null;
  customerId: string | null;
  customer: {
    id: string;
    name: string;
  } | null;
  status: ItemStatus;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function UserItemsPage() {
  const router = useRouter();
  
  // State for items and loading
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Start maintenance state
  const [isStartingMaintenance, setIsStartingMaintenance] = useState(false);
  
  // Debounced search handling
  const debouncedFetch = useCallback(
    // Debounce delay 500ms
    debounce((page: number, search: string) => {
      fetchItems(page, search);
    }, 500),
    []
  );
  
  // Function to fetch items with pagination
  const fetchItems = async (page: number, search: string = '') => {
    try {
      setLoading(true);
      
      // Build query params
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      // Add pagination params
      params.append('page', page.toString());
      params.append('limit', itemsPerPage.toString());
      
      // Cek apakah data ada di cache dan masih valid (tidak lebih dari 1 menit)
      const cacheKey = `items_${params.toString()}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      const lastFetch = sessionStorage.getItem(`${cacheKey}_time`);
      const now = Date.now();
      
      if (cachedData && lastFetch && now - parseInt(lastFetch) < 60000) {
        // Gunakan data dari cache jika masih valid
        const data = JSON.parse(cachedData);
        setItems(data.items || []);
        setTotalItems(data.total || 0);
        setLoading(false);
        setIsSearching(false);
        return;
      }
      
      const response = await fetch(`/api/user/items?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      
      const data = await response.json();
      
      // Simpan data ke cache
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      sessionStorage.setItem(`${cacheKey}_time`, now.toString());
      
      // If API returns paginated data
      if (data.items && typeof data.total === 'number') {
        setItems(data.items);
        setTotalItems(data.total);
      } else {
        // Fallback if API doesn't support pagination yet
        setItems(data);
        setTotalItems(data.length);
      }
      
      setLoading(false);
      setIsSearching(false);
    } catch (error) {
      console.error('Error fetching items:', error);
      setError('Failed to load items. Please try again.');
      setLoading(false);
      setIsSearching(false);
    }
  };
    
  // Fetch items on initial load and when page changes
  useEffect(() => {
    if (searchQuery) {
      debouncedFetch(currentPage, searchQuery);
    } else {
      fetchItems(currentPage, searchQuery);
    }
  }, [currentPage, searchQuery, debouncedFetch]);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setCurrentPage(1); // Reset to first page when searching
    fetchItems(1, searchQuery);
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Function to start maintenance
  const startMaintenance = async (serialNumber: string) => {
    try {
      setIsStartingMaintenance(true);
      
      const response = await fetch('/api/user/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemSerial: serialNumber }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start maintenance');
      }
      
      toast.success('Maintenance berhasil dimulai');
      
      // Hapus cache setelah melakukan perubahan status item
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('items_')) {
          sessionStorage.removeItem(key);
        }
      });
      
      router.push(`/user/maintenance/${data.id}`);
    } catch (error: unknown) {
      console.error('Error starting maintenance:', error);
      let errorMessage = 'Gagal memulai maintenance';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsStartingMaintenance(false);
    }
  };
  
  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Function to get status display name
  const getStatusDisplayName = (status: ItemStatus) => {
    switch (status) {
      case ItemStatus.AVAILABLE:
        return 'Available';
      case ItemStatus.IN_CALIBRATION:
        return 'In Calibration';
      case ItemStatus.RENTED:
        return 'Rented';
      case ItemStatus.IN_MAINTENANCE:
        return 'In Maintenance';
      default:
        return String(status).replace('_', ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
    }
  };
  
  // Function to get status badge class
  const getStatusBadgeClass = (status: ItemStatus) => {
    switch (status) {
      case ItemStatus.AVAILABLE:
        return 'bg-green-100 text-green-800';
      case ItemStatus.IN_CALIBRATION:
        return 'bg-purple-100 text-purple-800';
      case ItemStatus.RENTED:
        return 'bg-yellow-100 text-yellow-800';
      case ItemStatus.IN_MAINTENANCE:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Product Catalog</h1>
        
 {/* Search Bar */}
<div className="bg-white p-6 rounded-2xl shadow-md mb-6">
  <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-4">
    <div className="relative w-full md:w-2/3">
              <input
                type="text"
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search products by name, serial number, or part number..."
        className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FiSearch className="text-gray-400 text-lg" />
      </div>
            </div>
    <button 
      type="submit"
      className={`w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md transition ${
        isSearching ? 'opacity-70 cursor-not-allowed' : ''
      }`}
      disabled={isSearching}
    >
      {isSearching ? 'Searching...' : 'Search'}
    </button>
  </form>
</div>

        {/* Error Message */}        
        {error && (
          <div className="bg-red-50 p-4 rounded-md mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
            </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading items</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mb-3"></div>
            <p className="text-gray-900">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-yellow-700">No products found. Please try a different search term.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-md overflow-hidden">
            <div className="overflow-x-auto w-full" style={{ overflowX: 'auto', maxWidth: '100%' }}>
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '150px' }}>
                      Nama Produk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '130px' }}>
                      Serial Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '130px' }}>
                      Part Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '120px' }}>
                      Sensor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '130px' }}>
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '120px' }}>
                      History
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '120px' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.serialNumber} className="hover:bg-green-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{item.serialNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{item.partNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{item.sensor || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{item.customer?.name || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          href={`/user/barang/history/${item.serialNumber}`}
                          className="text-sm text-blue-600 hover:text-blue-900"
                        >
                          View History
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(item.status)}`}>
                          {getStatusDisplayName(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, totalItems)}
                    </span>{' '}
                    of <span className="font-medium">{totalItems}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <FiChevronLeft className="h-5 w-5" />
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Show pages around current page
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-green-500 border-green-500 text-white'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === totalPages
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <FiChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
} 