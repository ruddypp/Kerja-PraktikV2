'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

// Define ItemStatus enum since it might not be directly accessible from @prisma/client
enum ItemStatus {
  AVAILABLE = "AVAILABLE",
  IN_USE = "IN_USE",
  IN_CALIBRATION = "IN_CALIBRATION",
  IN_RENTAL = "IN_RENTAL",
  IN_MAINTENANCE = "IN_MAINTENANCE"
}

interface Category {
  id: number;
  name: string;
}

interface Item {
  id: number;
  name: string;
  specification: string | null;
  serialNumber: string | null;
  lastVerifiedDate: string | null;
  category: Category;
  status: ItemStatus;
}

export default function InventoryPage() {
  // Status color mappings
  const statusColors: Record<ItemStatus, string> = {
    [ItemStatus.AVAILABLE]: 'bg-green-100 text-green-800',
    [ItemStatus.IN_USE]: 'bg-yellow-100 text-yellow-800',
    [ItemStatus.IN_CALIBRATION]: 'bg-blue-100 text-blue-800',
    [ItemStatus.IN_MAINTENANCE]: 'bg-red-100 text-red-800',
    [ItemStatus.IN_RENTAL]: 'bg-purple-100 text-purple-800'
  };

  const statusDisplayNames: Record<ItemStatus, string> = {
    [ItemStatus.AVAILABLE]: 'Available',
    [ItemStatus.IN_USE]: 'In Use',
    [ItemStatus.IN_CALIBRATION]: 'In Calibration',
    [ItemStatus.IN_MAINTENANCE]: 'In Maintenance',
    [ItemStatus.IN_RENTAL]: 'In Rental'
  };

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    name: '',
    categoryId: '',
    specification: '',
    serialNumber: '',
    status: ItemStatus.AVAILABLE,
    lastVerifiedDate: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    categoryId: '',
    status: '',
    search: ''
  });

  // Add this to the state declarations
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [forceDelete, setForceDelete] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      
      // Build query params for filtering
      const params = new URLSearchParams();
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/admin/items${queryString}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch items');
      }
      
      const data = await res.json();
      setItems(data);
    } catch (err) {
      setError('Error loading items. Please try again.');
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      
      if (!res.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Error loading categories. Please try again.');
    }
  };

  useEffect(() => {
    Promise.all([fetchItems(), fetchCategories()]);
  }, []);

  // Refetch items when filters change
  useEffect(() => {
    fetchItems();
  }, [filters]);

  // Add use effect to clear success message after a timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      categoryId: '',
      status: '',
      search: ''
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = isEditing 
        ? `/api/admin/items/${formData.id}` 
        : '/api/admin/items';
      
      const method = isEditing ? 'PATCH' : 'POST';
      
      const lastVerified = formData.lastVerifiedDate ? new Date(formData.lastVerifiedDate).toISOString() : null;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          categoryId: formData.categoryId,
          specification: formData.specification || null,
          serialNumber: formData.serialNumber || null,
          status: formData.status,
          lastVerifiedDate: lastVerified
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save item');
      }
      
      // Reset form and refresh data
      setFormData({ 
        id: 0, 
        name: '', 
        categoryId: '', 
        specification: '', 
        serialNumber: '', 
        status: ItemStatus.AVAILABLE, 
        lastVerifiedDate: '' 
      });
      setIsEditing(false);
      setShowForm(false);
      setSuccess(isEditing ? 'Item updated successfully!' : 'Item added successfully!');
      fetchItems();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save item. Please try again.';
      setError(errorMessage);
    }
  };

  const handleEdit = (item: Item) => {
    setFormData({
      id: item.id,
      name: item.name,
      categoryId: String(item.category.id),
      specification: item.specification || '',
      serialNumber: item.serialNumber || '',
      status: item.status,
      lastVerifiedDate: item.lastVerifiedDate ? new Date(item.lastVerifiedDate).toISOString().split('T')[0] : ''
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const confirmDelete = (id: number) => {
    setItemToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const params = new URLSearchParams();
      if (forceDelete) {
        params.append('force', 'true');
      }
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      const res = await fetch(`/api/admin/items/${itemToDelete}${queryString}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        
        // If error is about dependent records and force delete not yet tried
        if (errorData.error && errorData.error.includes('dependent') && !forceDelete) {
          // Show confirmation for force delete
          return;
        }
        
        throw new Error(errorData.error || 'Failed to delete item');
      }
      
      // Reset states
      setItemToDelete(null);
      setShowDeleteConfirm(false);
      setForceDelete(false);
      setSuccess('Item deleted successfully!');
      
      // Refresh items
      fetchItems();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete item. Please try again.';
      setError(errorMessage);
    }
  };

  const cancelForm = () => {
    setFormData({ 
      id: 0, 
      name: '', 
      categoryId: '', 
      specification: '', 
      serialNumber: '', 
      status: ItemStatus.AVAILABLE, 
      lastVerifiedDate: '' 
    });
    setIsEditing(false);
    setShowForm(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not verified';
    
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory Management</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/inventory/schedules"
            className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm"
          >
            Inventory Schedules
          </Link>
          <Link
            href="/admin/inventory/categories"
            className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            Manage Categories
          </Link>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              Add Item
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
          <p>{success}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-medium mb-4">
            {isEditing ? 'Edit Item' : 'Add New Item'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
                  Category*
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleFormChange}
                  required
                  className="form-input"
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  id="serialNumber"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleFormChange}
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status*
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  required
                  className="form-input"
                >
                  <option value="">Select Status</option>
                  {Object.values(ItemStatus).map(status => (
                    <option key={status} value={status}>
                      {statusDisplayNames[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lastVerifiedDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Verified Date
                </label>
                <input
                  type="date"
                  id="lastVerifiedDate"
                  name="lastVerifiedDate"
                  value={formData.lastVerifiedDate}
                  onChange={handleFormChange}
                  className="form-input"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="specification" className="block text-sm font-medium text-gray-700 mb-1">
                  Specification
                </label>
                <textarea
                  id="specification"
                  name="specification"
                  value={formData.specification}
                  onChange={handleFormChange}
                  rows={3}
                  className="form-input"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {isEditing ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search items..."
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="categoryId"
              name="categoryId"
              value={filters.categoryId}
              onChange={handleFilterChange}
              className="form-input"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="form-input"
            >
              <option value="">All Statuses</option>
              {Object.values(ItemStatus).map(status => (
                <option key={status} value={status}>
                  {statusDisplayNames[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading items...</div>
      ) : items.length === 0 ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">No items found. Add new items or adjust your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden hidden md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                  Serial Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                  Last Verified
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    {item.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    {item.specification && (
                      <div className="text-xs text-gray-800 mt-1 truncate max-w-xs" title={item.specification}>
                        {item.specification}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.category.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-800">
                      {item.serialNumber || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-800">
                      {formatDate(item.lastVerifiedDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status] || 'bg-gray-100 text-gray-800'}`}>
                      {statusDisplayNames[item.status]}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => handleEdit(item)}
                        className="bg-blue-100 p-1.5 rounded-md flex items-center justify-center hover:bg-blue-200"
                        title="Edit Item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => confirmDelete(item.id)}
                        className="bg-red-100 p-1.5 rounded-md flex items-center justify-center hover:bg-red-200"
                        title="Delete Item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Responsive Card View for smaller screens */}
      {!loading && items.length > 0 && (
        <div className="md:hidden">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-4 mb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.category.name}</p>
                </div>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                  ${item.status === ItemStatus.AVAILABLE && 'bg-green-100 text-green-800'}
                  ${item.status === ItemStatus.IN_USE && 'bg-yellow-100 text-yellow-800'}
                  ${item.status === ItemStatus.IN_CALIBRATION && 'bg-blue-100 text-blue-800'}
                  ${item.status === ItemStatus.IN_MAINTENANCE && 'bg-red-100 text-red-800'}
                  ${item.status === ItemStatus.IN_RENTAL && 'bg-purple-100 text-purple-800'}
                `}>
                  {statusDisplayNames[item.status]}
                </span>
              </div>
              
              {item.specification && (
                <p className="text-xs text-gray-700 mb-2">{item.specification}</p>
              )}
              
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <p className="text-gray-500">Serial Number:</p>
                  <p className="font-medium">{item.serialNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Verified:</p>
                  <p className="font-medium">{formatDate(item.lastVerifiedDate)}</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => handleEdit(item)}
                  className="bg-blue-100 p-2 rounded-md flex items-center justify-center"
                  title="Edit Item"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => confirmDelete(item.id)}
                  className="bg-red-100 p-2 rounded-md flex items-center justify-center"
                  title="Delete Item"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Confirm Deletion</h3>
            <p className="mb-4 text-gray-700">Are you sure you want to delete this item?</p>
            
            <div className="mb-6 bg-yellow-50 p-3 rounded-md border border-yellow-100">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={forceDelete} 
                  onChange={() => setForceDelete(!forceDelete)} 
                  className="mr-2 h-4 w-4 text-red-600"
                />
                <span className="text-sm text-red-700 font-medium">Force delete</span>
              </label>
              <p className="text-xs text-gray-600 mt-1">
                {forceDelete 
                  ? "Warning: Force delete will permanently remove this item and may cause data inconsistencies if it has associated requests." 
                  : "Items with associated requests will be marked as retired instead of being deleted."}
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button 
                className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-red-600 rounded-md text-white hover:bg-red-700"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 