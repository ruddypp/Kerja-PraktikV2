'use client';

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

export default function UserBarang() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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