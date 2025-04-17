'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface Category {
  id: number;
  name: string;
}

// Define ItemStatus enum to match the schema
enum ItemStatus {
  AVAILABLE = "AVAILABLE",
  IN_USE = "IN_USE",
  IN_CALIBRATION = "IN_CALIBRATION",
  IN_RENTAL = "IN_RENTAL",
  IN_MAINTENANCE = "IN_MAINTENANCE"
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
  // Item can have either a Status object or a direct ItemStatus enum string
  status: Status | ItemStatus | string;
}

// Helper function to get status name safely regardless of format
const getStatusName = (status: Status | ItemStatus | string): string => {
  if (typeof status === 'string') {
    return status;
  }
  if ('name' in status) {
    return status.name;
  }
  return status;
};

// Add mapping functions for status display
const getStatusDisplayName = (status: Status | ItemStatus | string): string => {
  const name = getStatusName(status);
  
  // Convert to readable format
  switch(name.toUpperCase()) {
    case 'AVAILABLE':
      return 'Available';
    case 'IN_USE':
      return 'In Use';
    case 'IN_CALIBRATION':
      return 'In Calibration';
    case 'IN_RENTAL':
      return 'In Rental';
    case 'IN_MAINTENANCE':
      return 'In Maintenance';
    default:
      return name;
  }
};

const getStatusBadgeClass = (status: Status | ItemStatus | string): string => {
  const name = getStatusName(status).toUpperCase();
  
  switch(name) {
    case 'AVAILABLE':
      return 'badge-success';
    case 'IN_USE':
      return 'badge-warning';
    case 'IN_CALIBRATION':
      return 'badge-info';
    case 'IN_RENTAL':
      return 'badge-purple';
    case 'IN_MAINTENANCE':
      return 'badge-danger';
    default:
      return 'badge-secondary';
  }
};

export default function UserBarang() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    categoryId: '',
    status: '',
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
          const itemsRes = await fetch('/api/user/items');
          if (!itemsRes.ok) {
            // If user endpoint fails, try admin endpoint
            const adminItemsRes = await fetch('/api/admin/items');
            if (!adminItemsRes.ok) {
              throw new Error('Failed to fetch items');
            }
            const itemsData = await adminItemsRes.json();
            setItems(itemsData);
          } else {
            const itemsData = await itemsRes.json();
            setItems(itemsData);
          }
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
        
        // Try to fetch statuses but don't fail if not available
        try {
          const statusesRes = await fetch('/api/admin/statuses?type=item');
          if (statusesRes.ok) {
            const statusesData = await statusesRes.json();
            setStatuses(Array.isArray(statusesData) ? statusesData : []);
          } else {
            // If statuses endpoint fails, create status options from ItemStatus enum
            const enumStatuses = Object.values(ItemStatus).map((value, index) => ({
              id: index + 1,
              name: value,
              type: 'item'
            }));
            setStatuses(enumStatuses);
          }
        } catch (err) {
          console.error('Error fetching statuses:', err);
          // Create status options from ItemStatus enum
          const enumStatuses = Object.values(ItemStatus).map((value, index) => ({
            id: index + 1,
            name: value,
            type: 'item'
          }));
          setStatuses(enumStatuses);
        }
      } catch (error) {
        setError('An error occurred while loading data.');
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
        if (filters.status) params.append('status', filters.status);
        if (filters.search) params.append('search', filters.search);
        
        const queryString = params.toString() ? `?${params.toString()}` : '';
        
        // First try user API endpoint
        try {
          const res = await fetch(`/api/user/items${queryString}`);
          if (!res.ok) {
            throw new Error('Failed to fetch from user endpoint');
          }
          const data = await res.json();
          setItems(data);
        } catch (err) {
          // Fall back to admin endpoint
          console.error('Error with user endpoint, trying admin endpoint:', err);
          const adminRes = await fetch(`/api/admin/items${queryString}`);
          if (!adminRes.ok) {
            throw new Error('Failed to fetch from admin endpoint');
          }
          const data = await adminRes.json();
          setItems(data);
        }
      } catch (err) {
        console.error('Error applying filters:', err);
        setError('Failed to filter items. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    applyFilters();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    // Map statusId input to status filter value
    if (name === 'statusId') {
      setFilters(prev => ({ ...prev, status: value }));
    } else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
  };

  const resetFilters = () => {
    setFilters({
      categoryId: '',
      status: '',
      search: ''
    });
  };

  return (
    <DashboardLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-title text-xl md:text-2xl">Item List</h1>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{error}</p>
            <button 
              onClick={handleRetry}
              className="mt-2 text-red-700 underline hover:text-red-800"
            >
              Try Again
            </button>
          </div>
        )}
        
        {/* Filters */}
        <div className="card mb-6 border border-gray-200">
          <h2 className="text-subtitle mb-4">Filter Items</h2>
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
                placeholder="Search by item name..."
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="categoryId" className="form-label">
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
              <label htmlFor="statusId" className="form-label">
                Status
              </label>
              <select
                id="statusId"
                name="statusId"
                value={filters.status}
                onChange={handleFilterChange}
                className="form-input"
              >
                <option value="">All Statuses</option>
                {Object.values(ItemStatus).map(status => (
                  <option key={status} value={status}>
                    {getStatusDisplayName(status)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="btn btn-secondary w-full"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-subtitle">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
            <p className="text-yellow-700 font-medium">No items found. Please adjust your filters.</p>
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
                    <th className="table-header">Item Name</th>
                    <th className="table-header hidden md:table-cell">Specification</th>
                    <th className="table-header hidden sm:table-cell">Category</th>
                    <th className="table-header hidden lg:table-cell">Serial Number</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
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
                        <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                          {getStatusDisplayName(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 