'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { ItemStatus } from '@prisma/client';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import Link from 'next/link';


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

// Interface for Item with related data
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
  calibrations?: Array<{
    id: string;
    status: string;
    calibrationDate: string;
  }>;
  maintenances?: Array<{
    id: string;
    status: string;
    startDate: string;
  }>;
}

// Interface for Vendor
interface Vendor {
  id: string;
  name: string;
  address?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  service?: string | null;
}

export default function ManagerInventoryPage() {
  // States
  const [items, setItems] = useState<Item[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: ''
  });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  
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
  const [error, setError] = useState('');
  
  // Status counts from the server
  const [statusCounts, setStatusCounts] = useState({
    AVAILABLE: 0,
    IN_CALIBRATION: 0,
    RENTED: 0,
    IN_MAINTENANCE: 0
  });

  // Konstanta untuk caching
  const CACHE_DURATION = 60000; // 1 menit
  const CACHE_KEY_PREFIX = 'manager_inventory';
  
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
    
    // Fetch vendors when opening the modal
    fetchVendors();
  }, [clearForm]);
  
  // Open modal in edit mode
  const openEditModal = useCallback((item: Item) => {
    console.log('Opening edit modal for item:', item);
    console.log('Customer ID value:', item.customerId);
    
    setFormData({
      serialNumber: item.serialNumber,
      name: item.name,
      partNumber: item.partNumber,
      sensor: item.sensor || '',
      description: item.description || '',
      customerId: item.customerId || '',
      status: item.status
    });
    
    console.log('Form data set to:', {
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
    
    // Fetch vendors when opening the modal
    fetchVendors().then(() => {
      // If item has a customer, set the selected customer name for the dropdown display
      if (item.customer) {
        // Update vendor search with the customer name to show it's selected
        setVendorSearch(item.customer.name);
      }
    });
  }, []);
  
  // Open delete confirmation
  const openDeleteConfirm = useCallback((item: Item) => {
    setCurrentItem(item);
    setConfirmDeleteOpen(true);
  }, []);

  // Membuat cacheKey berdasarkan parameter
  const getCacheKey = useCallback((page: number, filters: {search: string, status: string, category: string}) => {
    return `${CACHE_KEY_PREFIX}_${page}_${filters.search}_${filters.status}_${filters.category}`;
  }, []);
  
  // Fungsi untuk invalidasi cache
  const invalidateCache = useCallback(() => {
    // Hapus semua cache terkait inventory
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  }, []);

  // Fetch data
  const fetchData = useCallback(async (page = currentPage, currentFilters = filters) => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching inventory items for manager...');
      
      // Build query parameters including pagination
      const queryParams = new URLSearchParams();
      
      if (currentFilters.search) queryParams.append('search', currentFilters.search);
      if (currentFilters.status) queryParams.append('status', currentFilters.status);
      if (currentFilters.category) queryParams.append('category', currentFilters.category);
      
      // Add pagination parameters
      queryParams.append('page', page.toString());
      queryParams.append('limit', itemsPerPage.toString());
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      // Debug log untuk melihat query string
      console.log('Fetching items with query:', queryString);

      // Cek apakah ada cache
      const cacheKey = getCacheKey(page, currentFilters);
      const cachedData = sessionStorage.getItem(cacheKey);
      const lastFetch = sessionStorage.getItem(`${cacheKey}_time`);
      const now = Date.now();

      if (cachedData && lastFetch && now - parseInt(lastFetch) < CACHE_DURATION) {
        // Gunakan data dari cache
        console.log('Using cached data for inventory');
        const data = JSON.parse(cachedData);
        
        setItems(data.items || []);
        setTotalItems(data.total || 0);
        
        if (data.countByStatus) {
          setStatusCounts(data.countByStatus);
        }
        
        setLoading(false);
        return;
      }
      
      // Fetch items from API - Use manager endpoint instead of admin
      const itemsRes = await fetch(`/api/manager/items${queryString}`);
      console.log('Response status:', itemsRes.status);
      
      if (!itemsRes.ok) {
        console.error('Failed to fetch items:', itemsRes.statusText);
        throw new Error('Failed to fetch items');
      }
      
      const itemsData = await itemsRes.json();
      
      // Simpan data ke cache
      sessionStorage.setItem(cacheKey, JSON.stringify(itemsData));
      sessionStorage.setItem(`${cacheKey}_time`, now.toString());
      
      // Debug log untuk melihat data yang diterima
      console.log('Items fetched:', itemsData);
      console.log('Items count:', itemsData.length);
      
      // If the API returns paginated data with a different structure, adjust accordingly
      if (itemsData.items && typeof itemsData.total === 'number') {
        setItems(itemsData.items);
        setTotalItems(itemsData.total);
        
        // Set status counts from API response
        if (itemsData.countByStatus) {
          setStatusCounts(itemsData.countByStatus);
        }
      } else {
        // Fallback if API doesn't support pagination yet
        setItems(itemsData);
        setTotalItems(itemsData.length);
      }
      
      // Fetch vendors for dropdown
      await fetchVendors();
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, getCacheKey]);
  
  // Handle search and filter changes
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    
    // Reset to page 1 when filters change
    setCurrentPage(1);
    
    // Directly fetch data with the new filters
    fetchData(1, newFilters);
  }, [filters, fetchData]);

  // Fetch vendors
  const fetchVendors = async () => {
    try {
      console.log('Fetching vendors for dropdown...');
      
      // Use manager endpoint instead of admin
      const vendorsRes = await fetch('/api/manager/vendors?limit=100');
      if (!vendorsRes.ok) {
        throw new Error('Failed to fetch vendors');
      }
      
      const vendorsData = await vendorsRes.json();
      console.log('Vendors fetched successfully:', vendorsData);
      
      if (vendorsData && vendorsData.items && Array.isArray(vendorsData.items)) {
        setVendors(vendorsData.items);
        console.log('Vendors set to:', vendorsData.items);
      } else {
        console.error('Invalid vendors data format received:', vendorsData);
        setVendors([]);
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setVendors([]);
    }
  };

  useEffect(() => {
    console.log('Halaman inventory dimuat, memanggil fetchData()');
    fetchData();
    // Explicitly fetch vendors on page load
    fetchVendors();
  }, [fetchData]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchData(page, filters);
  };
  
  // Handle form change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    console.log(`Form field changed: ${name} = ${value}`);
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (formErrors[name as keyof ItemFormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  // Handle vendor search
  const handleVendorSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVendorSearch(e.target.value);
  };
  
  // Filter vendors based on search term
  const filteredVendors = useMemo(() => {
    if (!vendorSearch.trim()) return vendors;
    return vendors.filter(vendor => 
      vendor.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      (vendor.contactName && vendor.contactName.toLowerCase().includes(vendorSearch.toLowerCase()))
    );
  }, [vendors, vendorSearch]);
  
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
        // Update item - Use manager endpoint
        const res = await fetch(`/api/manager/items?serialNumber=${encodeURIComponent(currentItem?.serialNumber || '')}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update item');
        }
        
        const updatedItem = await res.json();
        console.log('Item updated successfully:', updatedItem);
        
        // Update local state
        setItems(items.map(item => 
          item.serialNumber === updatedItem.serialNumber ? updatedItem : item
        ));
        
        // Invalidate cache on successful update
        invalidateCache();
        
        toast.success('Item updated successfully');
      } else {
        // Create new item - Use manager endpoint
        const res = await fetch('/api/manager/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create item');
        }
        
        const newItem = await res.json();
        console.log('Item created successfully:', newItem);
        
        // Update local state
        setItems([newItem, ...items]);
        setTotalItems(totalItems + 1);
        
        // Invalidate cache on successful creation
        invalidateCache();
        
        toast.success('Item created successfully');
      }
      
      // Close modal and reset form
      setModalOpen(false);
      clearForm();
      
      // Refresh data to ensure it's up to date
      fetchData();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error(error.message || 'An error occurred');
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Handle delete
  const handleDelete = async () => {
    if (!currentItem) return;
    
    try {
      setFormSubmitting(true);
      
      // Delete item - Use manager endpoint
      const res = await fetch(`/api/manager/items?serialNumber=${encodeURIComponent(currentItem.serialNumber)}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }
      
      // Update local state
      setItems(items.filter(item => item.serialNumber !== currentItem.serialNumber));
      setTotalItems(totalItems - 1);
      
      // Invalidate cache on successful deletion
      invalidateCache();
      
      toast.success('Item deleted successfully');
      
      // Close confirmation modal
      setConfirmDeleteOpen(false);
      setCurrentItem(null);
      
      // Refresh data to ensure it's up to date
      fetchData();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error(error.message || 'An error occurred');
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Get status badge color
  const getStatusBadgeClass = (status: ItemStatus): string => {
    switch (status) {
      case ItemStatus.AVAILABLE:
        return 'bg-green-100 text-green-800';
      case ItemStatus.IN_CALIBRATION:
        return 'bg-blue-100 text-blue-800';
      case ItemStatus.RENTED:
        return 'bg-yellow-100 text-yellow-800';
      case ItemStatus.IN_MAINTENANCE:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Status display name
  const getStatusDisplayName = (status: ItemStatus) => {
    return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Default filters
  const defaultFilters = {
    search: '',
    status: '',
    category: ''
  };

  // Count items by status - This will be removed since we now get counts from the API
  const itemStatusCount = useMemo(() => {
    // Use the server-provided counts instead of calculating from current page items
    return {
      [ItemStatus.AVAILABLE]: statusCounts.AVAILABLE,
      [ItemStatus.IN_CALIBRATION]: statusCounts.IN_CALIBRATION,
      [ItemStatus.RENTED]: statusCounts.RENTED,
      [ItemStatus.IN_MAINTENANCE]: statusCounts.IN_MAINTENANCE
    };
  }, [statusCounts]);

  // Get selected vendor name
  const selectedVendorName = useMemo(() => {
    if (!formData.customerId) return '';
    
    // First try to find the vendor in the loaded vendors list
    const selectedVendor = vendors.find(v => v.id === formData.customerId);
    if (selectedVendor) return selectedVendor.name;
    
    // If not found in vendors list but we're in edit mode, try to get from currentItem
    if (isEditMode && currentItem?.customer && currentItem.customerId === formData.customerId) {
      return currentItem.customer.name;
    }
    
    return '';
  }, [formData.customerId, vendors, isEditMode, currentItem]);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Inventory Management</h1>
            <button
            onClick={openCreateModal}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md shadow transition duration-300 flex items-center justify-center"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Item
            </button>
      </div>

        {/* Filter Section */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-200">
          <h2 className="text-base md:text-lg font-medium text-gray-800 mb-3">Filter Inventory</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              id="search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name or serial number"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm"
            />
          </div>
          <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="IN_CALIBRATION">In Calibration</option>
              <option value="RENTED">Rented</option>
              <option value="IN_MAINTENANCE">In Maintenance</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters(defaultFilters)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            >
              Reset Filters
            </button>
            </div>
          </div>
        </div>

        {/* Status information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Object.entries(itemStatusCount).map(([status, count]) => (
            <div
              key={status}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex justify-between items-center"
            >
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${getStatusBadgeClass(status as ItemStatus)}`}></div>
                <span className="text-gray-900 font-medium text-sm">{getStatusDisplayName(status as ItemStatus)}</span>
              </div>
              <span className="text-gray-900 font-bold">{count as number}</span>
      </div>
          ))}
      </div>

        {error && (
          <div className="bg-red-50 p-4 rounded-md mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading inventory</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

      {loading ? (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mb-3"></div>
            <p className="text-gray-900">Loading inventory...</p>
        </div>
      ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-base md:text-lg font-medium text-gray-800">Inventory Items</h2>
              {items.length > 0 && (
                <p className="text-xs md:text-sm text-gray-600 mt-1">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
                </p>
              )}
            </div>
            
            {items.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try changing your search criteria or add a new item.
                </p>
              </div>
            ) : (
              <>
                {/* Table view for desktop - hidden on mobile */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Number</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sensor</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">History</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item) => (
                        <tr key={item.serialNumber} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.serialNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.partNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sensor || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.customer?.name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(item.status)}`}>
                          {getStatusDisplayName(item.status)}
                        </span>
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link 
                          href={`/manager/inventory/history/${encodeURIComponent(item.serialNumber)}`}
                          className="text-green-600 hover:text-green-800"
                        >
                          View History
                        </Link>
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                          onClick={() => openEditModal(item)}
                          className="text-green-600 hover:text-green-800 mr-4"
                      >
                          Edit
                      </button>
                      <button
                          onClick={() => openDeleteConfirm(item)}
                          className="text-red-600 hover:text-red-800"
                      >
                          Delete
                      </button>
                  </td>
                </tr>
                      ))}
            </tbody>
          </table>
        </div>
                
                {/* Card view for mobile */}
                <div className="md:hidden p-4 space-y-4">
                  {items.map((item) => (
                    <div key={item.serialNumber} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                            <p className="text-xs text-gray-500">SN: {item.serialNumber}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(item.status)}`}>
                            {getStatusDisplayName(item.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                          <div>
                            <p className="text-gray-500 font-medium">Part Number</p>
                            <p>{item.partNumber}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-medium">Sensor</p>
                            <p>{item.sensor || '-'}</p>
                          </div>
                          
                          <div className="col-span-2">
                            <p className="text-gray-500 font-medium">Customer</p>
                            <p>{item.customer?.name || '-'}</p>
                          </div>
                        </div>
                        
                        <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                          <Link 
                            href={`/manager/inventory/history/${encodeURIComponent(item.serialNumber)}`}
                            className="inline-flex justify-center items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            View History
                          </Link>
                          <button
                            onClick={() => openEditModal(item)}
                            className="inline-flex justify-center items-center px-3 py-2 border border-green-600 rounded-md shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(item)}
                            className="col-span-2 inline-flex justify-center items-center px-3 py-2 border border-red-600 rounded-md shadow-sm text-xs font-medium text-white bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination controls */}
                <div className="px-4 py-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 text-sm text-gray-500 mb-4 sm:mb-0">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
              <span className="font-medium">{totalItems}</span> results
            </div>
            
                    <div>
              <nav className="flex justify-center items-center space-x-1" aria-label="Pagination">
                {/* Previous button */}
                <button
                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-md text-sm font-medium ${
                    currentPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-green-50'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Page numbers */}
                {(() => {
                  const pages = [];
                          const maxVisiblePages = 5;
                  
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  const endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);
                  
                          // Adjust startPage if needed
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }
                  
                          // First page
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => handlePageChange(1)}
                        className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 rounded-md"
                      >
                        1
                      </button>
                    );
                    
                    // Add ellipsis if needed
                    if (startPage > 2) {
                      pages.push(
                                <span key="ellipsis-1" className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">
                          ...
                        </span>
                      );
                    }
                  }
                  
                          // Page numbers
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => handlePageChange(i)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                          i === currentPage
                                    ? 'bg-green-600 text-white'
                            : 'text-gray-700 hover:bg-green-50'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  
                          // Last page
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                                <span key="ellipsis-2" className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">
                          ...
                        </span>
                      );
                    }
                    
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => handlePageChange(totalPages)}
                        className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 rounded-md"
                      >
                        {totalPages}
                      </button>
                    );
                  }
                  
                  return pages;
                })()}
                
                {/* Next button */}
                <button
                  onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-md text-sm font-medium ${
                    currentPage === totalPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-green-50'
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
      </div>
              </>
                        )}
                      </div>
        )}

        {/* Item Form Modal - No changes needed here */}
        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            {/* Rest of modal stays the same */}
                            </div>
                          )}

        {/* Delete Confirmation Modal - No changes needed here */}
      {confirmDeleteOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            {/* Rest of delete modal stays the same */}
        </div>
      )}
      </div>
    </DashboardLayout>
  );
} 