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

interface Request {
  id: number;
  userId: number;
  itemId: number;
  requestType: string;
  reason: string | null;
  approvedBy: number | null;
  requestDate: string;
  statusId: number;
  item: {
    id: number;
    name: string;
    serialNumber: string | null;
  };
  status: Status;
}

export default function UserBarang() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  
  // Form state
  const [requestForm, setRequestForm] = useState({
    requestType: 'rental',
    reason: ''
  });
  
  // User requests state
  const [userRequests, setUserRequests] = useState<Request[]>([]);
  
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
        
        // Fetch user requests
        try {
          const requestsRes = await fetch('/api/user/requests');
          const requestsData = await requestsRes.json();
          setUserRequests(requestsData);
        } catch (err) {
          console.error('Error fetching user requests:', err);
        }
      } catch (error) {
        setError('Terjadi kesalahan saat memuat data.');
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
  
  const handleRequestFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRequestForm(prev => ({ ...prev, [name]: value }));
  };
  
  const openRequestModal = (item: Item) => {
    setSelectedItem(item);
    setRequestForm({
      requestType: 'rental',
      reason: ''
    });
    setShowRequestModal(true);
  };
  
  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedItem(null);
  };
  
  const findUserApprovedRequest = (itemId: number) => {
    return userRequests.find(request => 
      request.itemId === itemId && 
      (request.status.name === 'APPROVED' || request.status.name === 'Approved' || request.status.name === 'approved') &&
      (request.requestType === 'rental' || request.requestType === 'calibration')
    );
  };
  
  const openReturnModal = (item: Item) => {
    const approvedRequest = findUserApprovedRequest(item.id);
    if (approvedRequest) {
      setSelectedItem(item);
      setSelectedRequest(approvedRequest);
      setShowReturnModal(true);
    } else {
      setError('No active request found for this item.');
    }
  };
  
  const closeReturnModal = () => {
    setShowReturnModal(false);
    setSelectedItem(null);
    setSelectedRequest(null);
  };
  
  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItem) return;
    
    try {
      const res = await fetch('/api/user/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemId: selectedItem.id,
          requestType: requestForm.requestType,
          reason: requestForm.reason
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit request');
      }
      
      // Update UI
      setSuccess(`Request for ${selectedItem.name} submitted successfully!`);
      
      // Refresh user requests
      const requestsRes = await fetch('/api/user/requests');
      const requestsData = await requestsRes.json();
      setUserRequests(requestsData);
      
      closeRequestModal();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to submit request. Please try again.');
    }
  };
  
  const submitReturn = async () => {
    if (!selectedRequest) return;
    
    try {
      const res = await fetch('/api/user/requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: selectedRequest.id,
          action: 'return'
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit return request');
      }
      
      // Update UI
      setSuccess(`Return request for ${selectedItem?.name} submitted successfully!`);
      
      // Refresh user requests
      const requestsRes = await fetch('/api/user/requests');
      const requestsData = await requestsRes.json();
      setUserRequests(requestsData);
      
      closeReturnModal();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to submit return request. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-title text-xl md:text-2xl mb-6">Daftar Barang</h1>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{error}</p>
            <button 
              onClick={handleRetry}
              className="mt-2 text-red-700 underline hover:text-red-800"
            >
              Coba Lagi
            </button>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{success}</p>
          </div>
        )}
        
        {/* Filters */}
        <div className="card mb-6 border border-gray-200">
          <h2 className="text-subtitle mb-4">Filter Barang</h2>
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
                placeholder="Cari berdasarkan nama barang..."
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="categoryId" className="form-label">
                Kategori
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={filters.categoryId}
                onChange={handleFilterChange}
                className="form-input"
              >
                <option value="">Semua Kategori</option>
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
                <option value="">Semua Status</option>
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
                Reset Filter
              </button>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-subtitle">Loading barang...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
            <p className="text-yellow-700 font-medium">Tidak ada barang ditemukan. Silakan ubah filter Anda.</p>
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
                    <th className="table-header">Nama Barang</th>
                    <th className="table-header hidden md:table-cell">Spesifikasi</th>
                    <th className="table-header hidden sm:table-cell">Kategori</th>
                    <th className="table-header hidden lg:table-cell">Serial Number</th>
                    <th className="table-header">Status</th>
                    <th className="table-header text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => {
                    // Check if the user has an approved request for this item
                    const hasApprovedRequest = findUserApprovedRequest(item.id);
                    
                    return (
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
                        <td className="table-cell text-right">
                          {(item.status.name === 'Available' || item.status.name === 'AVAILABLE' || item.status.name === 'available') ? (
                            <button 
                              onClick={() => openRequestModal(item)}
                              className="text-green-600 hover:text-green-800 font-medium mr-3"
                            >
                              Request
                            </button>
                          ) : (
                            hasApprovedRequest ? (
                              <button 
                                onClick={() => openReturnModal(item)}
                                className="text-blue-600 hover:text-blue-800 font-medium mr-3"
                              >
                                Return
                              </button>
                            ) : (
                              <button className="text-gray-400 cursor-not-allowed mr-3">Request</button>
                            )
                          )}
                          <button className="text-blue-600 hover:text-blue-800 font-medium">Detail</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Request Modal */}
        {showRequestModal && selectedItem && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-30">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Request Barang</h3>
                <button onClick={closeRequestModal} className="text-gray-400 hover:text-gray-500" aria-label="Close request modal" title="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-subtitle mb-1">Item:</p>
                <p className="text-body">{selectedItem.name}</p>
              </div>
              
              <form onSubmit={submitRequest}>
                <div className="mb-4">
                  <label htmlFor="requestType" className="form-label">
                    Tipe Request
                  </label>
                  <select
                    id="requestType"
                    name="requestType"
                    value={requestForm.requestType}
                    onChange={handleRequestFormChange}
                    className="form-input"
                  >
                    <option value="rental">Peminjaman</option>
                    <option value="calibration">Kalibrasi</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="reason" className="form-label">
                    Alasan
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={requestForm.reason}
                    onChange={handleRequestFormChange}
                    rows={3}
                    className="form-input"
                    placeholder="Jelaskan alasan Anda memerlukan barang ini..."
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={closeRequestModal}
                    className="btn btn-secondary order-2 sm:order-1"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary order-1 sm:order-2"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Return Modal */}
        {showReturnModal && selectedItem && selectedRequest && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-30">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Return Barang</h3>
                <button onClick={closeReturnModal} className="text-gray-400 hover:text-gray-500" aria-label="Close return modal" title="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-subtitle mb-1">Item:</p>
                <p className="text-body">{selectedItem.name}</p>
              </div>
              
              <div className="mb-4">
                <p className="text-subtitle mb-1">Request Type:</p>
                <p className="text-body capitalize">{selectedRequest.requestType}</p>
              </div>
              
              <div className="mb-6">
                <p className="text-subtitle mb-1">Request Date:</p>
                <p className="text-body">{new Date(selectedRequest.requestDate).toLocaleDateString('id-ID')}</p>
              </div>
              
              <p className="text-subtitle text-gray-500 mb-4">
                Apakah Anda yakin ingin mengembalikan barang ini? Admin akan menerima notifikasi dan memverifikasi pengembalian.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <button 
                  type="button" 
                  onClick={closeReturnModal}
                  className="btn btn-secondary order-2 sm:order-1"
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  onClick={submitReturn}
                  className="btn btn-primary order-1 sm:order-2"
                >
                  Kembalikan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 