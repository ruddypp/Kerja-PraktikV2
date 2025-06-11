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

export default function AdminInventoryPage() {
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
  const CACHE_KEY_PREFIX = 'admin_inventory';
  
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
      
      console.log('Fetching inventory items for admin...');
      
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
      
      // Fetch items from API
      const itemsRes = await fetch(`/api/admin/items${queryString}`);
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
      
      // Remove caching temporarily to ensure we get fresh data
      const vendorsRes = await fetch('/api/admin/vendors?limit=100');
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
        // Update item
        console.log('Updating item with data:', formData);
        
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
        
        const updatedItem = await res.json();
        console.log('Item updated successfully:', updatedItem);
        
        // Close modal
        setModalOpen(false);
        
        // First invalidate all cached data
        invalidateCache();
        
        // Force manual refresh without using cache
        setLoading(true);
        setTimeout(async () => {
          try {
            // Build query parameters
            const queryParams = new URLSearchParams();
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.category) queryParams.append('category', filters.category);
            queryParams.append('page', currentPage.toString());
            queryParams.append('limit', itemsPerPage.toString());
            
            const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
            
            // Force a fresh fetch by adding a cache-busting parameter
            const timestamp = new Date().getTime();
            const cacheBustUrl = `/api/admin/items${queryString}${queryString ? '&' : '?'}t=${timestamp}`;
            
            const freshResponse = await fetch(cacheBustUrl, {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            });
            
            if (!freshResponse.ok) {
              throw new Error('Failed to refresh data after update');
            }
            
            const freshData = await freshResponse.json();
            
            // Update state with fresh data
            setItems(freshData.items || []);
            setTotalItems(freshData.total || 0);
            
            if (freshData.countByStatus) {
              setStatusCounts(freshData.countByStatus);
            }
            
            toast.success('Item updated successfully');
          } catch (err) {
            console.error('Error refreshing data after update:', err);
            toast.error('Item was updated but the display could not be refreshed. Please reload the page.');
          } finally {
            setLoading(false);
          }
        }, 300);
      } else {
        // Create item
        console.log('Creating new item with data:', formData);
        
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
        
        // Close modal
        setModalOpen(false);
        
        // Invalidate cache and force refresh
        invalidateCache();
        
        // Force manual refresh after creation
        setLoading(true);
        setTimeout(async () => {
          try {
            // Build query parameters
            const queryParams = new URLSearchParams();
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.category) queryParams.append('category', filters.category);
            queryParams.append('page', currentPage.toString());
            queryParams.append('limit', itemsPerPage.toString());
            
            const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
            
            // Force a fresh fetch
            const timestamp = new Date().getTime();
            const cacheBustUrl = `/api/admin/items${queryString}${queryString ? '&' : '?'}t=${timestamp}`;
            
            const freshResponse = await fetch(cacheBustUrl, {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            });
            
            if (!freshResponse.ok) {
              throw new Error('Failed to refresh data after item creation');
            }
            
            const freshData = await freshResponse.json();
            
            // Update state with fresh data
            setItems(freshData.items || []);
            setTotalItems(freshData.total || 0);
            
            if (freshData.countByStatus) {
              setStatusCounts(freshData.countByStatus);
            }
            
            toast.success('Item created successfully');
          } catch (err) {
            console.error('Error refreshing data after creation:', err);
            toast.error('Item was created but the display could not be refreshed. Please reload the page.');
          } finally {
            setLoading(false);
          }
        }, 300);
      }
    } catch (error: unknown) {
      console.error('Error submitting form:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save item');
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Handle delete
  const handleDelete = async () => {
    if (!currentItem) return;
    
    try {
      const serialNumber = encodeURIComponent(currentItem.serialNumber);
      const response = await fetch(`/api/admin/items?serialNumber=${serialNumber}`, {
        method: 'DELETE',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }
      
      // Close confirm dialog
      setConfirmDeleteOpen(false);
      
      // First invalidate all cached data
      invalidateCache();
      
      // Force manual refresh without using cache
      setLoading(true);
      setTimeout(async () => {
        try {
          // Build query parameters
          const queryParams = new URLSearchParams();
          if (filters.search) queryParams.append('search', filters.search);
          if (filters.status) queryParams.append('status', filters.status);
          if (filters.category) queryParams.append('category', filters.category);
          queryParams.append('page', currentPage.toString());
          queryParams.append('limit', itemsPerPage.toString());
          
          const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
          
          // Force a fresh fetch by adding a cache-busting parameter
          const timestamp = new Date().getTime();
          const cacheBustUrl = `/api/admin/items${queryString}${queryString ? '&' : '?'}t=${timestamp}`;
          
          const freshResponse = await fetch(cacheBustUrl, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          
          if (!freshResponse.ok) {
            throw new Error('Failed to refresh data after deletion');
          }
          
          const freshData = await freshResponse.json();
          
          // Update state with fresh data
          setItems(freshData.items || []);
          setTotalItems(freshData.total || 0);
          
          if (freshData.countByStatus) {
            setStatusCounts(freshData.countByStatus);
          }
          
          toast.success('Item deleted successfully');
        } catch (err) {
          console.error('Error refreshing data after deletion:', err);
          toast.error('Item was deleted but the display could not be refreshed. Please reload the page.');
        } finally {
          setLoading(false);
        }
      }, 300);
    } catch (error: unknown) {
      console.error('Error deleting item:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete item');
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
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Inventory Management</h1>
            <p className="text-gray-500 mt-1">Manage and track all equipment in your inventory</p>
          </div>
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

        {/* Filter Section */}
        <div className="bg-white p-5 rounded-xl shadow-sm mb-6 border border-gray-100">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Filter Inventory</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              <input
                type="text"
                id="search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by name or serial number"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-sm"
              />
              </div>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="relative">
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-sm appearance-none"
              >
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="IN_CALIBRATION">In Calibration</option>
                <option value="RENTED">Rented</option>
                <option value="IN_MAINTENANCE">In Maintenance</option>
              </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters(defaultFilters)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm flex items-center transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Status information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
              <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Available</span>
                <p className="text-lg font-bold text-gray-900">{statusCounts.AVAILABLE}</p>
            </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              </div>
              <div>
                <span className="text-sm text-gray-500">In Calibration</span>
                <p className="text-lg font-bold text-gray-900">{statusCounts.IN_CALIBRATION}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center mr-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Rented</span>
                <p className="text-lg font-bold text-gray-900">{statusCounts.RENTED}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center mr-3">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
              </div>
              <div>
                <span className="text-sm text-gray-500">In Maintenance</span>
                <p className="text-lg font-bold text-gray-900">{statusCounts.IN_MAINTENANCE}</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 p-4 rounded-xl mb-6 border border-red-100">
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
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading inventory...</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-800">Inventory Items</h2>
              {items.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
                </p>
              )}
            </div>
            
            {items.length === 0 ? (
              <div className="p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-3 text-base font-medium text-gray-900">No items found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Try changing your search criteria or add a new item.
                </p>
                <div className="mt-6">
                  <button
                    onClick={openCreateModal}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Add New Item
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Table view for desktop - hidden on mobile */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Name</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Serial Number</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Part Number</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sensor</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">History</th>
                        <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {items.map((item) => (
                        <tr key={item.serialNumber} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 font-mono">{item.serialNumber}</div>
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
                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getStatusBadgeClass(item.status)}`}>
                              {getStatusDisplayName(item.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link 
                              href={`/admin/inventory/history/${encodeURIComponent(item.serialNumber)}`}
                              className="text-green-600 hover:text-green-900 font-medium"
                            >
                              View History
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => openEditModal(item)}
                                className="inline-flex items-center p-1.5 border border-green-600 rounded-md text-xs font-medium text-green-600 bg-white hover:bg-green-50"
                                aria-label="Edit item"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(item)}
                                className="inline-flex items-center p-1.5 border border-red-600 rounded-md text-xs font-medium text-red-600 bg-white hover:bg-red-50"
                                aria-label="Delete item"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Card view for mobile - visible only on mobile */}
                <div className="md:hidden">
                  <ul className="divide-y divide-gray-200">
                  {items.map((item) => (
                      <li key={item.serialNumber} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                            <p className="text-xs text-gray-500 mt-1">SN: {item.serialNumber}</p>
                            <p className="text-xs text-gray-500">PN: {item.partNumber}</p>
                            {item.sensor && <p className="text-xs text-gray-500">Sensor: {item.sensor}</p>}
                            {item.customer?.name && <p className="text-xs text-gray-500">Customer: {item.customer.name}</p>}
                            <div className="mt-2">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getStatusBadgeClass(item.status)}`}>
                            {getStatusDisplayName(item.status)}
                          </span>
                        </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => openEditModal(item)}
                              className="inline-flex items-center p-1.5 border border-green-600 rounded-md text-xs font-medium text-green-600 bg-white hover:bg-green-50"
                              aria-label="Edit item"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(item)}
                              className="inline-flex items-center p-1.5 border border-red-600 rounded-md text-xs font-medium text-red-600 bg-white hover:bg-red-50"
                              aria-label="Delete item"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                          </button>
                        </div>
                      </div>
                        <div className="mt-3 flex justify-between items-center">
                          <Link 
                            href={`/admin/inventory/history/${encodeURIComponent(item.serialNumber)}`}
                            className="text-xs text-green-600 hover:text-green-900 font-medium"
                          >
                            View History
                          </Link>
                    </div>
                      </li>
                  ))}
                  </ul>
                </div>
                
                {/* Pagination controls - same for both layouts */}
                <div className="px-5 py-5 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 text-sm text-gray-500 mb-4 sm:mb-0">
                      Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
                      <span className="font-medium">{totalItems}</span> results
                    </div>
                    
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        {/* Previous button */}
                        <button
                          onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`relative inline-flex items-center px-3 py-2 rounded-l-md border ${
                            currentPage === 1
                              ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-green-50 hover:text-green-600'
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
                          
                          if (endPage - startPage + 1 < maxVisiblePages) {
                            startPage = Math.max(1, endPage - maxVisiblePages + 1);
                          }
                          
                          if (startPage > 1) {
                            pages.push(
                              <button
                                key={1}
                                onClick={() => handlePageChange(1)}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-600"
                              >
                                1
                              </button>
                            );
                            
                            if (startPage > 2) {
                              pages.push(
                                <span key="ellipsis-1" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                  ...
                                </span>
                              );
                            }
                          }
                          
                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <button
                                key={i}
                                onClick={() => handlePageChange(i)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  i === currentPage
                                    ? 'z-10 bg-green-600 border-green-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-green-50 hover:text-green-600'
                                }`}
                              >
                                {i}
                              </button>
                            );
                          }
                          
                          if (endPage < totalPages) {
                            if (endPage < totalPages - 1) {
                              pages.push(
                                <span key="ellipsis-2" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                  ...
                                </span>
                              );
                            }
                            
                            pages.push(
                              <button
                                key={totalPages}
                                onClick={() => handlePageChange(totalPages)}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-600"
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
                          className={`relative inline-flex items-center px-3 py-2 rounded-r-md border ${
                            currentPage === totalPages
                              ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-green-50 hover:text-green-600'
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
                          {selectedVendorName && (
                            <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">{selectedVendorName}</span>
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Selected
                                </span>
                              </div>
                              <button
                                type="button"
                                className="text-gray-400 hover:text-gray-500"
                                onClick={() => {
                                  setFormData(prev => ({...prev, customerId: ''}));
                                  setVendorSearch('');
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
                              value={vendorSearch}
                              onChange={handleVendorSearch}
                          className={`w-full px-3 py-2.5 border-0 ${selectedVendorName ? 'border-t border-gray-200 rounded-b-lg' : 'rounded-t-lg'} focus:ring-0 focus:outline-none text-sm`}
                              onFocus={() => {
                                if (formData.customerId && !vendorSearch) {
                                  const selectedVendor = vendors.find(v => v.id === formData.customerId);
                                  if (selectedVendor) {
                                    setVendorSearch(selectedVendor.name);
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
                                setVendorSearch('');
                              }}
                            >
                              None
                            </div>
                            {filteredVendors.map(vendor => (
                              <div
                                key={vendor.id}
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${formData.customerId === vendor.id ? 'bg-green-50' : ''}`}
                                onClick={() => {
                                  setFormData(prev => ({...prev, customerId: vendor.id}));
                                  setVendorSearch(vendor.name);
                                }}
                              >
                                <div className="font-medium">{vendor.name}</div>
                                {vendor.contactName && (
                                  <div className="text-xs text-gray-600">{vendor.contactName}</div>
                                )}
                              </div>
                            ))}
                            {filteredVendors.length === 0 && (
                              <div className="px-3 py-2 text-gray-500 text-sm">No results found</div>
                            )}
                            {vendorSearch.trim() !== '' && filteredVendors.length > 0 && (
                              <div className="px-3 py-1 text-xs text-gray-500 border-t border-gray-200">
                                Showing {filteredVendors.length} of {vendors.length} vendors
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
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => openDeleteConfirm(currentItem!)}
                          className="px-5 py-2.5 rounded-lg border border-transparent shadow-sm bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 font-medium text-sm flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Delete
                        </button>
                      )}
                    </div>
                      </div>
                    </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Item</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-900">
                        Are you sure you want to delete item <span className="font-semibold">{currentItem?.serialNumber}</span>?
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        This action cannot be undone. This will permanently delete the item and all associated records.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button"
                  disabled={formSubmitting}
                  onClick={handleDelete}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {formSubmitting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
   );
}