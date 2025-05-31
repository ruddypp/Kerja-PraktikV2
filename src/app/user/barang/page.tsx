'use client';

<<<<<<< HEAD
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
=======
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface Category {
  id: number;
  name: string;
}

interface Status {
  id: number;
  name: string;
  type: string;
}

interface Item {
  id: number;
  name: string;
  specification: string | null;
  serialNumber: string | null;
  category: Category;
  status: Status;
}

interface Request {
  id: number;
  userId: number;
  itemId: number;
  requestType: string;
  reason: string | null;
  approvedBy: number | null;
  requestDate: string;
  statusId: number;
  item: {
    id: number;
    name: string;
    serialNumber: string | null;
  };
  status: Status;
}

export default function UserBarang() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  
  // Form state
  const [requestForm, setRequestForm] = useState({
    requestType: 'rental',
    reason: ''
  });
  
  // User requests state
  const [userRequests, setUserRequests] = useState<Request[]>([]);
  
  // Filters
  const [filters, setFilters] = useState({
    categoryId: '',
    statusId: '',
    search: ''
  });

  // Simple function to handle retries
  const handleRetry = () => {
    setError('');
    setLoading(true);
    window.location.reload();
  };

  // Load data on component mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch items with simple error handling
        try {
          const itemsRes = await fetch('/api/admin/items');
          const itemsData = await itemsRes.json();
          setItems(itemsData);
        } catch (err) {
          console.error('Error fetching items:', err);
        }
        
        // Fetch categories
        try {
          const categoriesRes = await fetch('/api/admin/categories');
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData);
        } catch (err) {
          console.error('Error fetching categories:', err);
        }
        
        // Fetch statuses
        try {
          const statusesRes = await fetch('/api/admin/statuses?type=item');
          const statusesData = await statusesRes.json();
          setStatuses(statusesData);
        } catch (err) {
          console.error('Error fetching statuses:', err);
        }
        
        // Fetch user requests
        try {
          const requestsRes = await fetch('/api/user/requests');
          const requestsData = await requestsRes.json();
          setUserRequests(requestsData);
        } catch (err) {
          console.error('Error fetching user requests:', err);
        }
      } catch (error) {
        setError('Terjadi kesalahan saat memuat data.');
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAllData();
  }, []);

  // Apply filters
  useEffect(() => {
    const applyFilters = async () => {
      try {
        setLoading(true);
        
        // Build query params
        const params = new URLSearchParams();
        if (filters.categoryId) params.append('categoryId', filters.categoryId);
        if (filters.statusId) params.append('statusId', filters.statusId);
        if (filters.search) params.append('search', filters.search);
        
        const queryString = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`/api/admin/items${queryString}`);
        const data = await res.json();
        
        setItems(data);
      } catch (err) {
        console.error('Error applying filters:', err);
      } finally {
        setLoading(false);
      }
    };
    
    applyFilters();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      categoryId: '',
      statusId: '',
      search: ''
    });
  };
  
  const handleRequestFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRequestForm(prev => ({ ...prev, [name]: value }));
  };
  
  const openRequestModal = (item: Item) => {
    setSelectedItem(item);
    setRequestForm({
      requestType: 'rental',
      reason: ''
    });
    setShowRequestModal(true);
  };
  
  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedItem(null);
  };
  
  const findUserApprovedRequest = (itemId: number) => {
    return userRequests.find(request => 
      request.itemId === itemId && 
      (request.status.name === 'APPROVED' || request.status.name === 'Approved' || request.status.name === 'approved') &&
      (request.requestType === 'rental' || request.requestType === 'calibration')
    );
  };
  
  const openReturnModal = (item: Item) => {
    const approvedRequest = findUserApprovedRequest(item.id);
    if (approvedRequest) {
      setSelectedItem(item);
      setSelectedRequest(approvedRequest);
      setShowReturnModal(true);
    } else {
      setError('No active request found for this item.');
    }
  };
  
  const closeReturnModal = () => {
    setShowReturnModal(false);
    setSelectedItem(null);
    setSelectedRequest(null);
  };
  
  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItem) return;
    
    try {
      const res = await fetch('/api/user/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemId: selectedItem.id,
          requestType: requestForm.requestType,
          reason: requestForm.reason
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit request');
      }
      
      // Update UI
      setSuccess(`Request for ${selectedItem.name} submitted successfully!`);
      
      // Refresh user requests
      const requestsRes = await fetch('/api/user/requests');
      const requestsData = await requestsRes.json();
      setUserRequests(requestsData);
      
      closeRequestModal();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to submit request. Please try again.');
    }
  };
  
  const submitReturn = async () => {
    if (!selectedRequest) return;
    
    try {
      const res = await fetch('/api/user/requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: selectedRequest.id,
          action: 'return'
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit return request');
      }
      
      // Update UI
      setSuccess(`Return request for ${selectedItem?.name} submitted successfully!`);
      
      // Refresh user requests
      const requestsRes = await fetch('/api/user/requests');
      const requestsData = await requestsRes.json();
      setUserRequests(requestsData);
      
      closeReturnModal();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to submit return request. Please try again.');
>>>>>>> 0989372 (add fitur inventory dan history)
    }
  };

  return (
    <DashboardLayout>
<<<<<<< HEAD
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Product Catalog</h1>
        </div>
        
        {/* Search Bar */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-200">
          <h2 className="text-base md:text-lg font-medium text-gray-800 mb-3">Search Products</h2>
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
=======
      <div>
        <h1 className="text-title text-xl md:text-2xl mb-6">Daftar Barang</h1>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{error}</p>
            <button 
              onClick={handleRetry}
              className="mt-2 text-red-700 underline hover:text-red-800"
            >
              Coba Lagi
            </button>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{success}</p>
          </div>
        )}
        
        {/* Filters */}
        <div className="card mb-6 border border-gray-200">
          <h2 className="text-subtitle mb-4">Filter Barang</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="search" className="form-label">
                Search
              </label>
              <input
                type="text"
                id="search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Cari berdasarkan nama barang..."
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="categoryId" className="form-label">
                Kategori
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={filters.categoryId}
                onChange={handleFilterChange}
                className="form-input"
              >
                <option value="">Semua Kategori</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="statusId" className="form-label">
                Status
              </label>
              <select
                id="statusId"
                name="statusId"
                value={filters.statusId}
                onChange={handleFilterChange}
                className="form-input"
              >
                <option value="">Semua Status</option>
                {statuses.map(status => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="btn btn-secondary w-full"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-subtitle">Loading barang...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
            <p className="text-yellow-700 font-medium">Tidak ada barang ditemukan. Silakan ubah filter Anda.</p>
            <button 
              onClick={handleRetry}
              className="mt-2 text-yellow-700 underline hover:text-yellow-800"
            >
              Refresh Data
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="table-container bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="table-header">Nama Barang</th>
                    <th className="table-header hidden md:table-cell">Spesifikasi</th>
                    <th className="table-header hidden sm:table-cell">Kategori</th>
                    <th className="table-header hidden lg:table-cell">Serial Number</th>
                    <th className="table-header">Status</th>
                    <th className="table-header text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => {
                    // Check if the user has an approved request for this item
                    const hasApprovedRequest = findUserApprovedRequest(item.id);
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-cell">
                          <div className="text-subtitle">{item.name}</div>
                          <div className="text-muted text-xs sm:hidden">
                            {item.category.name}
                          </div>
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <div className="text-muted text-sm line-clamp-2">{item.specification || '-'}</div>
                        </td>
                        <td className="table-cell hidden sm:table-cell">
                          <div className="text-body">{item.category.name}</div>
                        </td>
                        <td className="table-cell hidden lg:table-cell">
                          <div className="text-muted text-sm">
                            {item.serialNumber || '-'}
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={`badge whitespace-nowrap
                            ${(item.status.name === 'Available' || item.status.name === 'AVAILABLE' || item.status.name === 'available') && 'badge-success'}
                            ${(item.status.name === 'In Use' || item.status.name === 'IN USE' || item.status.name === 'in use') && 'badge-warning'}
                            ${(item.status.name === 'Maintenance' || item.status.name === 'MAINTENANCE' || item.status.name === 'maintenance') && 'badge-danger'}
                            ${(item.status.name === 'In Calibration' || item.status.name === 'IN CALIBRATION' || item.status.name === 'in calibration') && 'badge-info'}
                            ${(item.status.name === 'Retired' || item.status.name === 'RETIRED' || item.status.name === 'retired') && 'badge-secondary'}
                          `}>
                            {item.status.name}
                          </span>
                        </td>
                        <td className="table-cell text-right">
                          {(item.status.name === 'Available' || item.status.name === 'AVAILABLE' || item.status.name === 'available') ? (
                            <button 
                              onClick={() => openRequestModal(item)}
                              className="text-green-600 hover:text-green-800 font-medium mr-3"
                            >
                              Request
                            </button>
                          ) : (
                            hasApprovedRequest ? (
                              <button 
                                onClick={() => openReturnModal(item)}
                                className="text-blue-600 hover:text-blue-800 font-medium mr-3"
                              >
                                Return
                              </button>
                            ) : (
                              <button className="text-gray-400 cursor-not-allowed mr-3">Request</button>
                            )
                          )}
                          <button className="text-blue-600 hover:text-blue-800 font-medium">Detail</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
>>>>>>> 0989372 (add fitur inventory dan history)
            </div>
          </div>
        )}
        
<<<<<<< HEAD
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mb-3"></div>
            <p className="text-gray-900">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <p className="text-yellow-700">No products found. Please try a different search term.</p>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-base md:text-lg font-medium text-gray-800">Product List</h2>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} products
              </p>
            </div>
            
            {/* Card view for all screen sizes */}
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <div key={item.serialNumber} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
                    <div className="p-4 flex-grow flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-md font-medium text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-500">SN: {item.serialNumber}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(item.status)}`}>
                          {getStatusDisplayName(item.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4 text-sm flex-grow">
                        <div>
                          <p className="text-gray-500 font-medium">Part Number</p>
                          <p className="text-gray-800">{item.partNumber}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium">Sensor</p>
                          <p className="text-gray-800">{item.sensor || '-'}</p>
                        </div>
                        
                        <div className="col-span-2">
                          <p className="text-gray-500 font-medium">Customer</p>
                          <p className="text-gray-800">{item.customer?.name || '-'}</p>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-100 mt-auto">
                        <Link 
                          href={`/user/barang/history/${item.serialNumber}`}
                          className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          View History
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Pagination controls */}
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
=======
        {/* Request Modal */}
        {showRequestModal && selectedItem && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-30">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Request Barang</h3>
                <button onClick={closeRequestModal} className="text-gray-400 hover:text-gray-500" aria-label="Close request modal" title="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-subtitle mb-1">Item:</p>
                <p className="text-body">{selectedItem.name}</p>
              </div>
              
              <form onSubmit={submitRequest}>
                <div className="mb-4">
                  <label htmlFor="requestType" className="form-label">
                    Tipe Request
                  </label>
                  <select
                    id="requestType"
                    name="requestType"
                    value={requestForm.requestType}
                    onChange={handleRequestFormChange}
                    className="form-input"
                  >
                    <option value="rental">Peminjaman</option>
                    <option value="calibration">Kalibrasi</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="reason" className="form-label">
                    Alasan
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={requestForm.reason}
                    onChange={handleRequestFormChange}
                    rows={3}
                    className="form-input"
                    placeholder="Jelaskan alasan Anda memerlukan barang ini..."
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={closeRequestModal}
                    className="btn btn-secondary order-2 sm:order-1"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary order-1 sm:order-2"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Return Modal */}
        {showReturnModal && selectedItem && selectedRequest && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-30">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Return Barang</h3>
                <button onClick={closeReturnModal} className="text-gray-400 hover:text-gray-500" aria-label="Close return modal" title="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-subtitle mb-1">Item:</p>
                <p className="text-body">{selectedItem.name}</p>
              </div>
              
              <div className="mb-4">
                <p className="text-subtitle mb-1">Request Type:</p>
                <p className="text-body capitalize">{selectedRequest.requestType}</p>
              </div>
              
              <div className="mb-6">
                <p className="text-subtitle mb-1">Request Date:</p>
                <p className="text-body">{new Date(selectedRequest.requestDate).toLocaleDateString('id-ID')}</p>
              </div>
              
              <p className="text-subtitle text-gray-500 mb-4">
                Apakah Anda yakin ingin mengembalikan barang ini? Admin akan menerima notifikasi dan memverifikasi pengembalian.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <button 
                  type="button" 
                  onClick={closeReturnModal}
                  className="btn btn-secondary order-2 sm:order-1"
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  onClick={submitReturn}
                  className="btn btn-primary order-1 sm:order-2"
                >
                  Kembalikan
                </button>
              </div>
>>>>>>> 0989372 (add fitur inventory dan history)
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
<<<<<<< HEAD
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
=======
>>>>>>> 0989372 (add fitur inventory dan history)
} 