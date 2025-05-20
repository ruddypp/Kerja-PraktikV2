'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiRefreshCw, FiMail, FiPhone, FiUser, FiMapPin } from 'react-icons/fi';
import { XIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {useRef} from 'react';

interface Vendor {
  id: string;
  name: string;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  service: string | null;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  
  // Form state
  const [vendorForm, setVendorForm] = useState({
    name: '',
    address: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    service: ''
  });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Constants for caching
  const CACHE_DURATION = 60000; // 1 minute
  const getCacheKey = useCallback((query: string, page: number, limit: number) => 
    `admin_vendors_${query}_${page}_${limit}`, []);

  // Invalidate cache function
  const invalidateCache = useCallback(() => {
    // Clear all vendor-related caches by finding keys that match the pattern
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('admin_vendors_')) {
        sessionStorage.removeItem(key);
      }
    });
  }, []);
  
  // We're using direct setTimeout for debouncing in handleSearchInputChange

  // Using direct setTimeout for search debouncing in handleSearchInputChange
  
  const fetchVendors = useCallback(async (search: string = searchQuery, page: number = pagination.page, limit: number = pagination.limit) => {
    try {
      setLoading(true);
      // Build query params
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const cacheKey = getCacheKey(search, page, limit);
      
      // Check cache first
      const cachedData = sessionStorage.getItem(cacheKey);
      const lastFetch = sessionStorage.getItem(`${cacheKey}_timestamp`);
      const now = Date.now();
      
      // Use cache if available and not expired
      if (cachedData && lastFetch && now - parseInt(lastFetch) < CACHE_DURATION) {
        const data = JSON.parse(cachedData);
        setVendors(data.items);
        setPagination({
          page: data.page,
          limit: data.limit,
          total: data.total,
          totalPages: data.totalPages
        });
        setLoading(false);
        return;
      }
      
      const res = await fetch(`/api/admin/vendors${queryString}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch vendors: ${res.status} ${res.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }
      
      const data = await res.json();
      
      // Cache the results
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      sessionStorage.setItem(`${cacheKey}_timestamp`, now.toString());
      
      setVendors(data.items);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages
      });
      setError('');
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('Failed to load vendors. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, pagination.page, pagination.limit, getCacheKey]);
  
  useEffect(() => {
    fetchVendors(searchQuery, pagination.page, pagination.limit);
  }, [fetchVendors, searchQuery, pagination.page, pagination.limit]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchInput(query);
    
    // Debounce the search to prevent too many requests
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(query);
      setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on search
      fetchVendors(query, 1, pagination.limit);
    }, 500);
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setVendorForm(prev => ({ ...prev, [name]: value }));
  };
  
  const openAddModal = () => {
    setVendorForm({
      name: '',
      address: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      service: ''
    });
    setShowAddModal(true);
  };
  
  const closeAddModal = () => {
    setShowAddModal(false);
  };
  
  const openEditModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorForm({
      name: vendor.name,
      address: vendor.address || '',
      contactName: vendor.contactName || '',
      contactEmail: vendor.contactEmail || '',
      contactPhone: vendor.contactPhone || '',
      service: vendor.service || ''
    });
    setShowEditModal(true);
  };
  
  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedVendor(null);
  };
  
  const openDeleteModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowDeleteModal(true);
  };
  
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedVendor(null);
  };
  
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          name: vendorForm.name,
          address: vendorForm.address || null,
          contactName: vendorForm.contactName || null,
          contactEmail: vendorForm.contactEmail || null,
          contactPhone: vendorForm.contactPhone || null,
          service: vendorForm.service || null
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add vendor');
      }
      
      // Success
      setSuccess('Vendor added successfully!');
      closeAddModal();
      
      // Invalidate cache before fetching fresh data
      invalidateCache();
      fetchVendors();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add vendor');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVendor) return;
    
    try {
      const res = await fetch(`/api/admin/vendors/${selectedVendor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          name: vendorForm.name,
          address: vendorForm.address || null,
          contactName: vendorForm.contactName || null,
          contactEmail: vendorForm.contactEmail || null,
          contactPhone: vendorForm.contactPhone || null,
          service: vendorForm.service || null
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update vendor');
      }
      
      // Success
      setSuccess('Vendor updated successfully!');
      closeEditModal();
      
      // Invalidate cache before fetching fresh data
      invalidateCache();
      fetchVendors();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update vendor');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  
  const handleDeleteSubmit = async () => {
    if (!selectedVendor) return;
    
    try {
      const res = await fetch(`/api/admin/vendors/${selectedVendor.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete vendor');
      }
      
      // Success
      setSuccess('Vendor deleted successfully!');
      closeDeleteModal();
      
      // Invalidate cache before fetching fresh data
      invalidateCache();
      fetchVendors();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete vendor');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchVendors(searchQuery, newPage, pagination.limit);
  };
  
  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(e.target.value);
    setPagination(prev => ({ ...prev, page: 1, limit: newLimit }));
    fetchVendors(searchQuery, 1, newLimit);
  };
  
  const refreshData = () => {
    invalidateCache();
    fetchVendors();
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVendors(searchInput, 1, pagination.limit);
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Vendor Management</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={refreshData} 
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
              disabled={loading}
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} size={16} />
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button 
              onClick={openAddModal} 
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
            >
              <FiPlus size={16} />
              Add Vendor
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
            {success}
          </div>
        )}
        
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex items-center">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                  className="block w-full p-3 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Search vendors by name or services..."
                  value={searchInput}
                onChange={handleSearchInputChange}
              />
                {searchInput && (
              <button 
                type="button" 
                onClick={() => {
                      setSearchInput('');
                  setSearchQuery('');
                      fetchVendors('', 1, pagination.limit);
                }}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    title="Clear search"
              >
                    <XIcon className="h-5 w-5" />
              </button>
            )}
        </div>
              <button type="submit" className="ml-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                Search
              </button>
            </div>
          </form>
        
        {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : vendors.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No vendors found</h3>
              <p className="mt-1 text-sm text-gray-500">
              {searchQuery 
                  ? `No results for "${searchQuery}". Try a different search query or clear the filter.`
                  : "Get started by creating a new vendor."}
              </p>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                    fetchVendors('', 1, pagination.limit);
                  }}
                  className="mt-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Clear search
                </button>
              )}
              {!searchQuery && (
                <button
                  onClick={openAddModal}
                  className="mt-3 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <FiPlus className="-ml-1 mr-2 h-5 w-5" />
                  New Vendor
                </button>
              )}
          </div>
        ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Services</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vendors.map((vendor, index) => (
                    <tr key={vendor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                          {vendor.address && (
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <FiMapPin size={12} className="text-gray-400 mr-1" />
                              {vendor.address}
                            </div>
                          )}
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {vendor.contactName ? (
                            <div className="text-sm text-gray-900 flex items-center">
                              <FiUser size={14} className="text-gray-400 mr-2" />
                              {vendor.contactName}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          {vendor.contactEmail && (
                            <div className="text-sm text-gray-900 flex items-center">
                              <FiMail size={14} className="text-gray-400 mr-2" />
                              {vendor.contactEmail}
                            </div>
                          )}
                          {vendor.contactPhone && (
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <FiPhone size={14} className="text-gray-400 mr-2" />
                              {vendor.contactPhone}
                            </div>
                          )}
                          {!vendor.contactEmail && !vendor.contactPhone && (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                      </td>
                        <td className="px-6 py-4">
                          {vendor.service ? (
                            <div className="max-w-xs text-sm text-gray-500 line-clamp-2">{vendor.service}</div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(vendor)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit vendor"
                        >
                              <FiEdit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(vendor)}
                          className="text-red-600 hover:text-red-900"
                              title="Delete vendor"
                        >
                              <FiTrash2 className="h-5 w-5" />
                        </button>
                          </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              
              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-700 flex items-center">
                  <span className="mr-2">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} vendors
                  </span>
              <select 
                value={pagination.limit} 
                onChange={handleLimitChange}
                    className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    aria-label="Number of items per page"
                  >
                    <option value="10">10 per page</option>
                    <option value="25">25 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
              </select>
            </div>
        
        {pagination.totalPages > 1 && (
                  <div className="flex space-x-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1}
                      className={`px-3 py-1 rounded ${pagination.page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      title="First page"
              >
                &laquo;
              </button>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                      className={`px-3 py-1 rounded ${pagination.page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      title="Previous page"
              >
                      <ChevronLeft size={16} />
              </button>

                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(page => 
                        page === 1 || 
                        page === pagination.totalPages || 
                        (page >= pagination.page - 1 && page <= pagination.page + 1)
                      )
                      .map((page, index, array) => (
                        <div key={page} className="flex items-center">
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-1 text-gray-500">...</span>
                          )}
                  <button
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 rounded ${pagination.page === page ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                            {page}
                  </button>
                        </div>
                      ))}

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                      className={`px-3 py-1 rounded ${pagination.page === pagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      title="Next page"
              >
                      <ChevronRight size={16} />
              </button>
              <button
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
                      className={`px-3 py-1 rounded ${pagination.page === pagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      title="Last page"
              >
                &raquo;
              </button>
          </div>
        )}
              </div>
            </>
          )}
        </div>
        
        {/* Add Vendor Modal */}
        {showAddModal && (
          <div className="fixed inset-0 overflow-y-auto bg-gray-500/75 backdrop-blur-sm z-50 flex items-center justify-center p-3">
            <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full mx-auto p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Add New Vendor</h2>
                <button 
                  onClick={closeAddModal} 
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                  aria-label="Close"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddSubmit} className="space-y-3">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={vendorForm.name}
                    onChange={handleFormChange}
                    className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter vendor name"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={vendorForm.address}
                    onChange={handleFormChange}
                    className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter vendor address"
                    rows={2}
                  />
                </div>
                
                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    id="contactName"
                    name="contactName"
                    type="text"
                    value={vendorForm.contactName}
                    onChange={handleFormChange}
                    className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter contact person name"
                  />
                </div>
                
                <div>
                  <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={vendorForm.contactEmail}
                    onChange={handleFormChange}
                    className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter contact email"
                  />
                </div>
                
                <div>
                  <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    id="contactPhone"
                    name="contactPhone"
                    type="text"
                    value={vendorForm.contactPhone}
                    onChange={handleFormChange}
                    className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter contact phone number"
                  />
                </div>
                
                <div>
                  <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-1">
                    Services
                  </label>
                  <textarea
                    id="service"
                    name="service"
                    value={vendorForm.service}
                    onChange={handleFormChange}
                    className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter services provided by this vendor"
                    rows={2}
                  />
                </div>
                
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={closeAddModal}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-md shadow-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-3 py-1.5 text-xs border border-transparent rounded-md shadow-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Add Vendor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Edit Vendor Modal */}
        {showEditModal && selectedVendor && (
          <div className="fixed inset-0 overflow-y-auto bg-gray-500/75 backdrop-blur-sm z-50 flex items-center justify-center p-3">
            <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full mx-auto p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Edit Vendor</h2>
                <button 
                  onClick={closeEditModal} 
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                  aria-label="Close"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-name"
                    name="name"
                    type="text"
                    value={vendorForm.name}
                    onChange={handleFormChange}
                    className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter vendor name"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    id="edit-address"
                    name="address"
                    value={vendorForm.address}
                    onChange={handleFormChange}
                    className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter vendor address"
                    rows={2}
                  />
                </div>
                
                <div>
                  <label htmlFor="edit-contactName" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    id="edit-contactName"
                    name="contactName"
                    type="text"
                    value={vendorForm.contactName}
                    onChange={handleFormChange}
                    className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter contact person name"
                  />
                </div>
                
                <div>
                  <label htmlFor="edit-contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    id="edit-contactEmail"
                    name="contactEmail"
                    type="email"
                    value={vendorForm.contactEmail}
                    onChange={handleFormChange}
                    className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter contact email"
                  />
                </div>
                
                <div>
                  <label htmlFor="edit-contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    id="edit-contactPhone"
                    name="contactPhone"
                    type="text"
                    value={vendorForm.contactPhone}
                    onChange={handleFormChange}
                    className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter contact phone number"
                  />
                </div>
                
                <div>
                  <label htmlFor="edit-service" className="block text-sm font-medium text-gray-700 mb-1">
                    Services
                  </label>
                  <textarea
                    id="edit-service"
                    name="service"
                    value={vendorForm.service}
                    onChange={handleFormChange}
                    className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter services provided by this vendor"
                    rows={2}
                  />
                </div>
                
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={closeEditModal}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-md shadow-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-3 py-1.5 text-xs border border-transparent rounded-md shadow-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Update Vendor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedVendor && (
          <div className="fixed inset-0 overflow-y-auto bg-gray-500/75 backdrop-blur-sm z-50 flex items-center justify-center p-3">
            <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full mx-auto p-4">
              <h3 className="text-base font-medium text-gray-900 mb-3">Confirm Deletion</h3>
              <div className="mb-4">
                <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-red-100 mb-3">
                  <FiTrash2 className="h-5 w-5 text-red-600" />
              </div>
                <p className="text-xs text-gray-500">
                  Are you sure you want to delete vendor <span className="font-semibold">{selectedVendor.name}</span>? This action cannot be undone.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  <span className="font-medium">Note:</span> Vendors with active calibrations cannot be deleted.
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={closeDeleteModal}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-md shadow-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleDeleteSubmit}
                  className="px-3 py-1.5 text-xs border border-transparent rounded-md shadow-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                    Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 