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
  
  // Status badge styling
  const getStatusBadgeClass = (status: ItemStatus) => {
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

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <button
            onClick={() => openCreateModal()}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded flex items-center"
          >
            <FiPlus className="mr-2" /> Add Item
            </button>
      </div>

        {/* Error display */}
      {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}

      {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4" role="alert">
          <p>{success}</p>
        </div>
      )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="w-full md:w-1/2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search by name, serial number, part number..."
                  className="form-input pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400" />
              </div>
              </div>
            </div>
            
            <div className="w-full md:w-1/3">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
                className="form-select w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              {Object.values(ItemStatus).map(status => (
                  <option key={status} value={status}>{getStatusDisplayName(status)}</option>
              ))}
            </select>
          </div>
            
            <button
              onClick={resetFilters}
              className="px-4 py-2 flex items-center justify-center text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <FiRefreshCw className="mr-2" /> Reset
            </button>
        </div>
      </div>

        {/* Items Table */}
        <div className="bg-white rounded shadow overflow-hidden">
      {loading ? (
            <div className="text-center py-10">
              <div className="spinner"></div>
              <p className="mt-2 text-gray-600">Loading items...</p>
            </div>
      ) : items.length === 0 ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="text-yellow-700">No items found. Add some inventory items or adjust your filters.</p>
        </div>
      ) : (
            <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Nama Produk
                </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                  Serial Number
                </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Part Number
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Sensor
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Description
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Customer
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      History
                </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                  Status
                </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                  {items
                    .filter((item) => {
                      return !filters.status || filters.status === 'all' || item.status === filters.status;
                    })
                    .map((item) => (
                      <tr key={item.serialNumber}>
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
                          <div className="text-sm text-gray-500">{item.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{item.customer?.name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Link href={`/admin/inventory/history/${item.serialNumber}`} className="text-indigo-600 hover:text-indigo-900">
                            View History
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(item.status)}`}>
                            {getStatusDisplayName(item.status)}
                          </span>
                  </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                            onClick={() => openEditModal(item)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                        title="Edit Item"
                      >
                            <FiEdit2 />
                      </button>
                      <button
                            onClick={() => openDeleteConfirm(item)}
                            className="text-red-600 hover:text-red-900"
                        title="Delete Item"
                      >
                            <FiTrash2 />
                      </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </div>
        
        {/* Pagination */}
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
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
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

        {/* Create/Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">{isEditMode ? 'Edit Item' : 'Add New Item'}</h2>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="serialNumber"
                    name="serialNumber"
                    value={formData.serialNumber}
                    onChange={handleFormChange}
                    className={`form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${formErrors.serialNumber ? 'border-red-500' : ''}`}
                    disabled={isEditMode}
                    required
                  />
                  {formErrors.serialNumber && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.serialNumber}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className={`form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${formErrors.name ? 'border-red-500' : ''}`}
                    required
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
              </div>
              
                <div>
                  <label htmlFor="partNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Part Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="partNumber"
                    name="partNumber"
                    value={formData.partNumber}
                    onChange={handleFormChange}
                    className={`form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${formErrors.partNumber ? 'border-red-500' : ''}`}
                    required
                  />
                  {formErrors.partNumber && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.partNumber}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="sensor" className="block text-sm font-medium text-gray-700 mb-1">
                    Sensor Type
                  </label>
                  <input
                    type="text"
                    id="sensor"
                    name="sensor"
                    value={formData.sensor || ''}
                    onChange={handleFormChange}
                    className="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Enter sensor type"
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleFormChange}
                    className="form-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={3}
                    placeholder="Enter item description"
                  ></textarea>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-1">
                      Customer
                    </label>
                    <select
                      id="customerId"
                      name="customerId"
                      value={formData.customerId || ''}
                      onChange={handleFormChange}
                      className="form-select w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">None</option>
                      {vendors.map(vendor => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                    {/* Debug information */}
                    <p className="mt-1 text-xs text-gray-500">
                      Selected value: {formData.customerId || 'None'}
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      className={`form-select w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${formErrors.status ? 'border-red-500' : ''}`}
                      required
                    >
                      {Object.values(ItemStatus).map(status => (
                        <option key={status} value={status}>{getStatusDisplayName(status)}</option>
                      ))}
                    </select>
                    {formErrors.status && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.status}</p>
                    )}
                </div>
              </div>
              
                <div className="mt-6 flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    disabled={formSubmitting}
                  >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                        Processing...
                      </div>
                    ) : isEditMode ? 'Update Item' : 'Create Item'}
                </button>
              </div>
              </form>
            </div>
        </div>
      )}

        {/* Delete Confirmation Modal */}
        {confirmDeleteOpen && currentItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 bg-red-100 rounded-full p-2 mr-3">
                  <svg className="h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Confirm Deletion</h2>
              </div>
              
              <p className="mb-6 text-gray-700">
                Are you sure you want to delete <span className="font-medium">{currentItem.name}</span> ({currentItem.serialNumber})?
                This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
              <button 
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  disabled={formSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  ) : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
} 