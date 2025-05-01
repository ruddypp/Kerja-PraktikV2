'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter, FiRefreshCw, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  
  // States
  const [items, setItems] = useState<Item[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
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
  const [success, setSuccess] = useState('');
  
  // Status counts from the server
  const [statusCounts, setStatusCounts] = useState({
    AVAILABLE: 0,
    IN_CALIBRATION: 0,
    RENTED: 0,
    IN_MAINTENANCE: 0
  });
  
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
  }, []);
  
  // Open delete confirmation
  const openDeleteConfirm = useCallback((item: Item) => {
    setCurrentItem(item);
    setConfirmDeleteOpen(true);
  }, []);
  
  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching inventory items for admin...');
      
      // Build query parameters including pagination
      const queryParams = new URLSearchParams();
      
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.category) queryParams.append('category', filters.category);
      
      // Add pagination parameters
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', itemsPerPage.toString());
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      // Debug log untuk melihat query string
      console.log('Fetching items with query:', queryString);
      
      // Fetch items
      const itemsRes = await fetch(`/api/admin/items${queryString}`, {
        cache: 'no-store',
        next: { revalidate: 0 }
      });
      console.log('Response status:', itemsRes.status);
      
      if (!itemsRes.ok) {
        console.error('Failed to fetch items:', itemsRes.statusText);
        throw new Error('Failed to fetch items');
      }
      
      const itemsData = await itemsRes.json();
      
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
  }, [currentPage, filters]);

  // Fetch vendors
  const fetchVendors = async () => {
    try {
      console.log('Fetching vendors for dropdown...');
      const vendorsRes = await fetch('/api/admin/vendors');
      if (!vendorsRes.ok) {
        throw new Error('Failed to fetch vendors');
      }
      const vendorsData = await vendorsRes.json();
      console.log('Vendors fetched successfully:', vendorsData);
      setVendors(vendorsData);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      // We don't set error state here to prevent blocking the main inventory view
    }
  };

  useEffect(() => {
    console.log('Halaman inventory dimuat, memanggil fetchData()');
    fetchData();
  }, [fetchData]);
  
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
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
            partNumber: formData.partNumber,
            sensor: formData.sensor || null,
            description: formData.description || null,
            customerId: formData.customerId || null,
            status: formData.status
          }),
          cache: 'no-store'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update item');
        }
        
        const updatedItem = await res.json();
        console.log('Item updated successfully:', updatedItem);
        
        toast.success('Item updated successfully');
      } else {
        // Create item
        console.log('Creating new item with data:', formData);
        
        const res = await fetch('/api/admin/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          cache: 'no-store'
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create item');
        }
        
        const newItem = await res.json();
        console.log('Item created successfully:', newItem);
        
        toast.success('Item created successfully');
      }
      
      // Close modal and refresh data
      setModalOpen(false);
      
      // Wait a moment before refreshing data to ensure backend updates are complete
      setTimeout(() => {
        fetchData();
      }, 500);
      
    } catch (err: any) {
      console.error('Error submitting form:', err);
      toast.error(err.message || 'An error occurred');
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Handle delete
  const handleDelete = async () => {
    if (!currentItem) return;
    
    try {
      setFormSubmitting(true);
      
      const res = await fetch(`/api/admin/items?serialNumber=${currentItem.serialNumber}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        
        // Handle case where item has related records
        if (res.status === 409) {
          toast.error(`This item has ${errorData.count} related records and cannot be deleted`);
        } else {
          throw new Error(errorData.error || 'Failed to delete item');
        }
      } else {
        toast.success('Item deleted successfully');
        fetchData();
      }
      
      setConfirmDeleteOpen(false);
    } catch (err: any) {
      console.error('Error deleting item:', err);
      toast.error(err.message || 'An error occurred');
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
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
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      category: ''
    });
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Default form data for resetting the form
  const defaultFormData: ItemFormData = {
    serialNumber: '',
    name: '',
    partNumber: '',
    sensor: '',
    description: '',
    customerId: '',
    status: ItemStatus.AVAILABLE
  };

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

  return (
    <DashboardLayout>
      <div className="p-6 bg-white rounded shadow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <button
            onClick={() => {
              setModalOpen(true);
              setFormData(defaultFormData);
              setFormErrors({});
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md shadow transition duration-300"
          >
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Item
            </span>
            </button>
      </div>

        {/* Filter Section */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-900 mb-1">Search</label>
            <input
              type="text"
              id="search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name or serial number"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-900 mb-1">Status</label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
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
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Status information */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(itemStatusCount).map(([status, count]) => (
            <div
              key={status}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex justify-between items-center"
            >
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${getStatusBadgeClass(status as ItemStatus)}`}></div>
                <span className="text-gray-900 font-medium">{getStatusDisplayName(status as ItemStatus)}</span>
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
          <div className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mb-3"></div>
            <p className="text-gray-900">Loading inventory...</p>
        </div>
      ) : (
          <div className="overflow-x-auto pb-4">
            <table className="min-w-full bg-white border-collapse">
            <thead className="bg-gray-50">
              <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Product Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Serial Number</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Part Number</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Sensor</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Customer</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">History</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
              <tbody className="divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-900">
                      No items found
                  </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.serialNumber} className="hover:bg-green-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.serialNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.partNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.sensor || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.customer?.name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(item.status)}`}>
                          {getStatusDisplayName(item.status)}
                        </span>
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link 
                          href={`/admin/inventory/history/${encodeURIComponent(item.serialNumber)}`}
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
                  ))
                )}
            </tbody>
          </table>
        </div>
      )}

        {/* Pagination Controls */}
        {items.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-gray-200 pt-4">
            <div className="flex-1 text-sm text-gray-500">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
              <span className="font-medium">{totalItems}</span> results
            </div>
            
            <div className="mt-4 sm:mt-0">
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
                  const maxVisiblePages = 5; // Jumlah maksimal halaman yang ditampilkan
                  
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  
                  // Adjust startPage if we're at the end of the range
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }
                  
                  // Add first page
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
                        <span key="start-ellipsis" className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700">
                          ...
                        </span>
                      );
                    }
                  }
                  
                  // Add visible page numbers
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => handlePageChange(i)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                          i === currentPage
                            ? 'z-10 bg-green-600 text-white'
                            : 'text-gray-700 hover:bg-green-50'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  
                  // Add last page
                  if (endPage < totalPages) {
                    // Add ellipsis if needed
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="end-ellipsis" className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700">
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
        )}
      </div>

{/* Modal for creating/editing items */}
{modalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {isEditMode ? 'Edit Item' : 'Add New Item'}
                  </h3>
                  <div className="mt-2">
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                          className={`mt-1 block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 peer ${
                            formErrors.serialNumber ? 'border-red-300' : ''
                          }`}
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

                      {/* Name */}
                      <div className="relative">
                <input 
                          type="text"
                          name="name"
                          id="name"
                          value={formData.name}
                          onChange={handleFormChange}
                          placeholder=" "
                          className={`mt-1 block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 peer ${
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
            
                      {/* Part Number */}
                      <div className="relative">
                        <input
                          type="text"
                          name="partNumber"
                          id="partNumber"
                          value={formData.partNumber}
                          onChange={handleFormChange}
                          placeholder=" "
                          className={`mt-1 block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 peer ${
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

                      {/* Sensor */}
                      <div className="relative">
                        <input
                          type="text"
                          name="sensor"
                          id="sensor"
                          value={formData.sensor || ''}
                          onChange={handleFormChange}
                          placeholder=" "
                          className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 peer"
                        />
                        <label 
                          htmlFor="sensor" 
                          className="absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-green-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-2 peer-focus:-top-2 peer-focus:text-green-600 peer-focus:text-xs"
                        >
                          Sensor Type
                        </label>
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
                          className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 peer"
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
                        <select
                          name="customerId"
                          id="customerId"
                          value={formData.customerId || ''}
                          onChange={handleFormChange}
                          className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 appearance-none peer"
                        >
                          <option value="">None</option>
                          {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </option>
                          ))}
                        </select>
                        <label 
                          htmlFor="customerId" 
                          className="absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-green-600 transition-all peer-focus:text-green-600"
                        >
                          Customer
                        </label>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                          </svg>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="relative">
                        <select
                          name="status"
                          id="status"
                          value={formData.status}
                          onChange={handleFormChange}
                          className={`mt-1 block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 appearance-none peer ${
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

                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button 
                          type="submit"
                          disabled={formSubmitting}
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
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
                        <button
                          type="button"
                          onClick={() => setModalOpen(false)}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
                      </div>
                    </form>
                  </div>
                </div>
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