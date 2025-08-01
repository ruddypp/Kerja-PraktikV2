'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'react-hot-toast';
import { FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { ItemStatus } from '@prisma/client';
import { z } from 'zod';

// Item schema for form validation
const itemSchema = z.object({
  serialNumber: z.string().min(1, "Serial number is required"),
  name: z.string().min(1, "Name is required"),
  partNumber: z.string().min(1, "Part number is required"),
  sensor: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  status: z.nativeEnum(ItemStatus)
});

type ItemFormData = z.infer<typeof itemSchema>;

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

// Interface for customer
interface Customer {
  id: string;
  name: string;
  address?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  service?: string | null;
}

export default function UserItemsPage() {
  const router = useRouter();
  
  // State for items and loading
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<ItemFormData>({
    serialNumber: '',
    name: '',
    partNumber: '',
    sensor: '',
    description: '',
    customerId: '',
    status: ItemStatus.AVAILABLE
  });
  
  // Error state
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ItemFormData, string>>>({});
  
  // Clear form
  const clearForm = useCallback(() => {
    setFormData({
      serialNumber: '',
      name: '',
      partNumber: '',
      sensor: '',
      description: '',
      customerId: '',
      status: ItemStatus.AVAILABLE
    });
    setFormErrors({});
  }, []);
  
  // Open modal in create mode
  const openCreateModal = useCallback(() => {
    clearForm();
    setIsEditMode(false);
    setCurrentItem(null);
    setModalOpen(true);
    
    // Fetch customers when opening the modal
    fetchCustomers();
  }, [clearForm]);
  
  // Open modal in edit mode
  const openEditModal = useCallback((item: Item) => {
    setFormData({
      serialNumber: item.serialNumber,
      name: item.name,
      partNumber: item.partNumber,
      sensor: item.sensor || '',
      description: item.description || '',
      customerId: item.customerId || '',
      status: item.status
    });
    
    setCurrentItem(item);
    setIsEditMode(true);
    setModalOpen(true);
    
    // Fetch customers when opening the modal
    fetchCustomers().then(() => {
      // If item has a customer, set the selected customer name for the dropdown display
      if (item.customer) {
        setCustomerSearch(item.customer.name);
      }
    });
  }, []);
  
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
      
      // Check cache
      const cacheKey = `items_${params.toString()}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      const lastFetch = sessionStorage.getItem(`${cacheKey}_time`);
      const now = Date.now();
      
      if (cachedData && lastFetch && now - parseInt(lastFetch) < 60000) {
        // Use cached data if still valid
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
      
      // Save to cache
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
  
  // Fetch customers
  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers for dropdown...');
      
      const customersRes = await fetch('/api/customers?limit=100');
      if (!customersRes.ok) {
        throw new Error('Failed to fetch customers');
      }
      
      const customersData = await customersRes.json();
      console.log('Customers fetched successfully:', customersData);
      
      if (customersData && customersData.items && Array.isArray(customersData.items)) {
        setCustomers(customersData.items);
      } else {
        console.error('Invalid customers data format received:', customersData);
        setCustomers([]);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setCustomers([]);
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
  
  // Handle form change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (formErrors[name as keyof ItemFormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  // Handle customer search
  const handleCustomerSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerSearch(e.target.value);
  };
  
  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (customer.contactName && customer.contactName.toLowerCase().includes(customerSearch.toLowerCase()))
    );
  }, [customers, customerSearch]);
  
  // Validate form
  const validateForm = (): boolean => {
    try {
      itemSchema.parse(formData);
      setFormErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Partial<Record<keyof ItemFormData, string>> = {};
        err.errors.forEach((error) => {
          const path = error.path[0] as keyof ItemFormData;
          errors[path] = error.message;
        });
        setFormErrors(errors);
      }
      return false;
    }
  };
  
  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setFormSubmitting(true);
      
      if (isEditMode) {
        // Update item - use admin API since user needs to be able to update
        const res = await fetch(`/api/admin/items?serialNumber=${currentItem?.serialNumber}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          cache: 'no-store',
          body: JSON.stringify({
            name: formData.name,
            partNumber: formData.partNumber,
            sensor: formData.sensor || null,
            description: formData.description || null,
            customerId: formData.customerId || null,
            status: formData.status
          })
        });
      
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update item');
        }
        
        toast.success('Item updated successfully');
      } else {
        // Create item - use admin API since user needs to be able to create
        const res = await fetch('/api/admin/items', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          cache: 'no-store',
          body: JSON.stringify(formData)
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create item');
        }
        
        toast.success('Item created successfully');
      }
      
      // Close modal
      setModalOpen(false);
      
      // Clear cache and refresh data
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('items_')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Refresh data
      fetchItems(currentPage, searchQuery);
      
    } catch (error: unknown) {
      console.error('Error submitting form:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save item');
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Refresh data
  const refreshData = () => {
    // Clear cache
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('items_')) {
        sessionStorage.removeItem(key);
      }
    });
    fetchItems(currentPage, searchQuery);
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

  // Get selected customer name
  const selectedCustomerName = useMemo(() => {
    if (!formData.customerId) return '';
    
    // First try to find the customer in the loaded customers list
    const selectedCustomer = customers.find(v => v.id === formData.customerId);
    if (selectedCustomer) return selectedCustomer.name;
    
    // If not found in customers list but we're in edit mode, try to get from currentItem
    if (isEditMode && currentItem?.customer && currentItem.customerId === formData.customerId) {
      return currentItem.customer.name;
    }
    
    return '';
  }, [formData.customerId, customers, isEditMode, currentItem]);

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Product Catalog</h1>
          <button
            onClick={openCreateModal}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-sm transition duration-300 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Item
          </button>
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
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mb-3"></div>
            <p className="text-gray-900">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <p className="text-yellow-700">No products found. Please try a different search term or add a new item.</p>
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
                      
                      <div className="pt-3 border-t border-gray-100 mt-auto flex gap-2">
                        <Link 
                          href={`/user/barang/history/${item.serialNumber}`}
                          className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          View History
                        </Link>
                        <button
                          onClick={() => openEditModal(item)}
                          className="inline-flex justify-center items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          Edit
                        </button>
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
            </div>
          </div>
        )}
      </div>

      {/* Item Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              {/* Header with close button */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-5">
                <h3 className="text-xl font-semibold text-gray-900">
                  {isEditMode ? 'Edit Item' : 'Add New Item'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-white rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-4">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Serial Number */}
                    <div className="relative">
                      <input
                        type="text"
                        name="serialNumber"
                        id="serialNumber"
                        value={formData.serialNumber}
                        onChange={handleFormChange}
                        disabled={isEditMode}
                        placeholder=" "
                        className={`mt-1 block w-full px-3 py-2.5 rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 peer ${
                          formErrors.serialNumber ? 'border-red-300' : ''
                        } ${isEditMode ? 'bg-gray-50' : ''}`}
                      />
                      <label 
                        htmlFor="serialNumber" 
                        className="absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-green-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-2 peer-focus:-top-2 peer-focus:text-green-600 peer-focus:text-xs"
                      >
                        Serial Number {isEditMode && <span className="text-green-400">(Read Only)</span>}
                      </label>
                      {formErrors.serialNumber && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.serialNumber}</p>
                      )}
                    </div>

                    {/* Part Number */}
                    <div className="relative">
                      <input 
                        type="text"
                        name="partNumber"
                        id="partNumber"
                        value={formData.partNumber}
                        onChange={handleFormChange}
                        placeholder=" "
                        className={`mt-1 block w-full px-3 py-2.5 rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 peer ${
                          formErrors.partNumber ? 'border-red-300' : ''
                        }`}
                      />
                      <label 
                        htmlFor="partNumber" 
                        className="absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-green-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-2 peer-focus:-top-2 peer-focus:text-green-600 peer-focus:text-xs"
                      >
                        Part Number
                      </label>
                      {formErrors.partNumber && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.partNumber}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Product Name - Full width */}
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder=" "
                      className={`mt-1 block w-full px-3 py-2.5 rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 peer ${
                        formErrors.name ? 'border-red-300' : ''
                      }`}
                    />
                    <label 
                      htmlFor="name" 
                      className="absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-green-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-2 peer-focus:-top-2 peer-focus:text-green-600 peer-focus:text-xs"
                    >
                      Product Name
                    </label>
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Sensor */}
                    <div className="relative">
                      <input
                        type="text"
                        name="sensor"
                        id="sensor"
                        value={formData.sensor || ''}
                        onChange={handleFormChange}
                        placeholder=" "
                        className="mt-1 block w-full px-3 py-2.5 rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 peer"
                      />
                      <label 
                        htmlFor="sensor" 
                        className="absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-green-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-2 peer-focus:-top-2 peer-focus:text-green-600 peer-focus:text-xs"
                      >
                        Sensor Type
                      </label>
                    </div>

                    {/* Status */}
                    <div className="relative">
                      <select
                        name="status"
                        id="status"
                        value={formData.status}
                        onChange={handleFormChange}
                        className={`mt-1 block w-full px-3 py-2.5 rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 appearance-none peer ${
                          formErrors.status ? 'border-red-300' : ''
                        }`}
                      >
                        <option value={ItemStatus.AVAILABLE}>Available</option>
                        <option value={ItemStatus.IN_CALIBRATION}>In Calibration</option>
                        <option value={ItemStatus.RENTED}>Rented</option>
                        <option value={ItemStatus.IN_MAINTENANCE}>In Maintenance</option>
                      </select>
                      <label 
                        htmlFor="status" 
                        className="absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-green-600 transition-all peer-focus:text-green-600"
                      >
                        Status
                      </label>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                      {formErrors.status && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.status}</p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="relative">
                    <textarea
                      name="description"
                      id="description"
                      rows={3}
                      value={formData.description || ''}
                      onChange={handleFormChange}
                      placeholder=" "
                      className="mt-1 block w-full px-3 py-2.5 rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 peer"
                    ></textarea>
                    <label 
                      htmlFor="description" 
                      className="absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-green-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-2 peer-focus:-top-2 peer-focus:text-green-600 peer-focus:text-xs"
                    >
                      Description
                    </label>
                  </div>

                  {/* Customer */}
                  <div className="relative">
                    <label 
                      htmlFor="customerId" 
                      className="absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-green-600 z-10"
                    >
                      Customer
                    </label>
                    <div className="mt-1 w-full border border-gray-300 rounded-lg shadow-sm focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500">
                      {selectedCustomerName && (
                        <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">{selectedCustomerName}</span>
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Selected
                            </span>
                          </div>
                          <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500"
                            onClick={() => {
                              setFormData(prev => ({...prev, customerId: ''}));
                              setCustomerSearch('');
                            }}
                          >
                            <span className="sr-only">Clear selection</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search customers..."
                          value={customerSearch}
                          onChange={handleCustomerSearch}
                          className={`w-full px-3 py-2.5 border-0 ${selectedCustomerName ? 'border-t border-gray-200 rounded-b-lg' : 'rounded-t-lg'} focus:ring-0 focus:outline-none text-sm`}
                          onFocus={() => {
                            if (formData.customerId && !customerSearch) {
                              const selectedCustomer = customers.find(v => v.id === formData.customerId);
                              if (selectedCustomer) {
                                setCustomerSearch(selectedCustomer.name);
                              }
                            }
                          }}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-40 border-t border-gray-300 rounded-b-lg bg-white">
                        <div 
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${formData.customerId === '' ? 'bg-green-50' : ''}`}
                          onClick={() => {
                            setFormData(prev => ({...prev, customerId: ''}));
                            setCustomerSearch('');
                          }}
                        >
                          None
                        </div>
                        {filteredCustomers.map(customer => (
                          <div
                            key={customer.id}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${formData.customerId === customer.id ? 'bg-green-50' : ''}`}
                            onClick={() => {
                              setFormData(prev => ({...prev, customerId: customer.id}));
                              setCustomerSearch(customer.name);
                            }}
                          >
                            <div className="font-medium">{customer.name}</div>
                            {customer.contactName && (
                              <div className="text-xs text-gray-600">{customer.contactName}</div>
                            )}
                          </div>
                        ))}
                        {filteredCustomers.length === 0 && (
                          <div className="px-3 py-2 text-gray-500 text-sm">No results found</div>
                        )}
                        {customerSearch.trim() !== '' && filteredCustomers.length > 0 && (
                          <div className="px-3 py-1 text-xs text-gray-500 border-t border-gray-200">
                            Showing {filteredCustomers.length} of {customers.length} customers
                          </div>
                        )}
                      </div>
                      <input
                        type="hidden"
                        name="customerId"
                        id="customerId"
                        value={formData.customerId || ''}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 mt-6">
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setModalOpen(false)}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-medium text-sm shadow-sm"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={formSubmitting}
                        className="px-5 py-2.5 rounded-lg border border-transparent shadow-sm bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-medium text-sm flex items-center justify-center min-w-[100px]"
                      >
                        {formSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : isEditMode ? (
                          'Update'
                        ) : (
                          'Create'
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
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