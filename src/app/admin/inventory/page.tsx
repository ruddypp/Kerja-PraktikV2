'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

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
  lastVerifiedDate: string | null;
  category: Category;
  status: Status;
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    name: '',
    categoryId: '',
    specification: '',
    serialNumber: '',
    statusId: '',
    lastVerifiedDate: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    categoryId: '',
    statusId: '',
    search: ''
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      
      // Build query params for filtering
      const params = new URLSearchParams();
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.statusId) params.append('statusId', filters.statusId);
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

  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/admin/statuses?type=item');
      
      if (!res.ok) {
        throw new Error('Failed to fetch statuses');
      }
      
      const data = await res.json();
      setStatuses(data);
    } catch (err) {
      console.error('Error fetching statuses:', err);
      setError('Error loading statuses. Please try again.');
    }
  };

  useEffect(() => {
    Promise.all([fetchItems(), fetchCategories(), fetchStatuses()]);
  }, []);

  // Refetch items when filters change
  useEffect(() => {
    fetchItems();
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
          statusId: formData.statusId,
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
        statusId: '',
        lastVerifiedDate: ''
      });
      setIsEditing(false);
      setShowForm(false);
      fetchItems();
    } catch (err: any) {
      setError(err.message || 'Failed to save item. Please try again.');
    }
  };

  const handleEdit = (item: Item) => {
    // Format date for input if it exists
    const lastVerifiedDate = item.lastVerifiedDate 
      ? new Date(item.lastVerifiedDate).toISOString().split('T')[0]
      : '';

    setFormData({
      id: item.id,
      name: item.name,
      categoryId: String(item.category.id),
      specification: item.specification || '',
      serialNumber: item.serialNumber || '',
      statusId: String(item.status.id),
      lastVerifiedDate: lastVerifiedDate
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/items/${id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }
      
      fetchItems();
    } catch (err: any) {
      setError(err.message || 'Failed to delete item. Please try again.');
    }
  };

  const cancelForm = () => {
    setFormData({ 
      id: 0, 
      name: '', 
      categoryId: '', 
      specification: '', 
      serialNumber: '', 
      statusId: '',
      lastVerifiedDate: ''
    });
    setIsEditing(false);
    setShowForm(false);
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not verified';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory Management</h1>
        <div className="flex space-x-4">
          <Link
            href="/admin/inventory/schedules"
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            Inventory Schedules
          </Link>
          <Link
            href="/admin/inventory/categories"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Manage Categories
          </Link>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
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
                <label htmlFor="statusId" className="block text-sm font-medium text-gray-700 mb-1">
                  Status*
                </label>
                <select
                  id="statusId"
                  name="statusId"
                  value={formData.statusId}
                  onChange={handleFormChange}
                  required
                  className="form-input"
                >
                  <option value="">Select Status</option>
                  {statuses.map(status => (
                    <option key={status.id} value={status.id}>
                      {status.name}
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
            <label htmlFor="statusId" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="statusId"
              name="statusId"
              value={filters.statusId}
              onChange={handleFilterChange}
              className="form-input"
            >
              <option value="">All Statuses</option>
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${item.status.name === 'Available' && 'bg-green-100 text-green-800'}
                      ${item.status.name === 'In Use' && 'bg-yellow-100 text-yellow-800'}
                      ${item.status.name === 'In Calibration' && 'bg-blue-100 text-blue-800'}
                      ${item.status.name === 'Maintenance' && 'bg-red-100 text-red-800'}
                      ${item.status.name === 'Rented' && 'bg-purple-100 text-purple-800'}
                      ${item.status.name === 'Damaged' && 'bg-orange-100 text-orange-800'}
                      ${item.status.name === 'Retired' && 'bg-gray-100 text-gray-800'}
                    `}>
                      {item.status.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
} 