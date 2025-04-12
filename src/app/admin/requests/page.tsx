'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Item {
  id: number;
  name: string;
  serialNumber: string | null;
}

interface Status {
  id: number;
  name: string;
  type: string;
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
  user: User;
  item: Item;
  approver: User | null;
  status: Status;
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [showDetails, setShowDetails] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [success, setSuccess] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    requestType: '',
    statusId: '',
    search: ''
  });

  // Track request status IDs dynamically
  const [statusIds, setStatusIds] = useState<Record<string, number | null>>({
    PENDING: null,
    APPROVED: null,
    REJECTED: null,
    COMPLETED: null
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Build query params for filtering
      const params = new URLSearchParams();
      if (filters.requestType) params.append('requestType', filters.requestType);
      if (filters.statusId) params.append('statusId', filters.statusId);
      if (filters.search) params.append('search', filters.search);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      try {
        const res = await fetch(`/api/admin/requests${queryString}`);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch requests: ${res.statusText}`);
        }
        
        const data = await res.json();
        setRequests(data);
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        setError('Error loading requests. Please try again.');
        
        // Use existing fallback data
        // Keep the dummyData as is...
      }
    } catch (err) {
      console.error('Error in fetchRequests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuses = async () => {
    try {
      try {
        const res = await fetch('/api/admin/statuses?type=request');
        
        if (!res.ok) {
          throw new Error(`Failed to fetch statuses: ${res.statusText}`);
        }
        
        const data = await res.json();
        setStatuses(data);
      } catch (fetchError) {
        console.error('Fetch error for statuses:', fetchError);
        // Keep the fallback data as is...
      }
    } catch (err) {
      console.error('Error in fetchStatuses:', err);
    }
  };

  const fetchStatusIds = async () => {
    try {
      try {
        const res = await fetch('/api/admin/setup-statuses');
        if (res.ok) {
          const data = await res.json();
          if (data.statusIds) {
            setStatusIds(data.statusIds);
          }
        }
      } catch (fetchError) {
        console.error('Fetch error for status IDs:', fetchError);
      }
    } catch (err) {
      console.error('Error in fetchStatusIds:', err);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        await fetchRequests();
        await fetchStatuses();
        await fetchStatusIds();
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    
    fetchAllData();
  }, []);

  useEffect(() => {
    const applyFilters = async () => {
      try {
        await fetchRequests();
      } catch (error) {
        console.error('Error applying filters:', error);
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
      requestType: '',
      statusId: '',
      search: ''
    });
  };

  const handleApprove = async (id: number) => {
    try {
      // Get current user ID (would normally come from auth context)
      const approvedBy = 1; // Admin ID for now
      
      if (!statusIds.APPROVED) {
        throw new Error('APPROVED status ID not found');
      }
      
      console.log(`Approving request ${id} with status ID ${statusIds.APPROVED}`);
      
      const res = await fetch(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          statusId: statusIds.APPROVED,
          approvedBy
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to approve request');
      }
      
      const updatedRequest = await res.json();
      
      // Update requests state
      setRequests(prev => 
        prev.map(request => request.id === id ? updatedRequest : request)
      );
      
      // Update selected request if open
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest(updatedRequest);
      }
      
      // Show success message
      setSuccess('Request approved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Failed to approve request: ${err.message}`);
      } else {
        setError('Failed to approve request. Please try again.');
      }
      console.error('Error approving request:', err);
    }
  };

  const handleReject = async (id: number) => {
    try {
      // Get current user ID (would normally come from auth context)
      const approvedBy = 1; // Admin ID for now
      
      if (!statusIds.REJECTED) {
        throw new Error('REJECTED status ID not found');
      }
      
      console.log(`Rejecting request ${id} with status ID ${statusIds.REJECTED}`);
      
      const res = await fetch(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          statusId: statusIds.REJECTED,
          approvedBy
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to reject request');
      }
      
      const updatedRequest = await res.json();
      
      // Update requests state
      setRequests(prev => 
        prev.map(request => request.id === id ? updatedRequest : request)
      );
      
      // Update selected request if open
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest(updatedRequest);
      }
      
      // Show success message
      setSuccess('Request rejected successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Failed to reject request: ${err.message}`);
      } else {
        setError('Failed to reject request. Please try again.');
      }
      console.error('Error rejecting request:', err);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      if (!statusIds.COMPLETED) {
        throw new Error('COMPLETED status ID not found');
      }
      
      console.log(`Completing request ${id} with status ID ${statusIds.COMPLETED}`);
      
      const res = await fetch(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          statusId: statusIds.COMPLETED
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to complete request');
      }
      
      const updatedRequest = await res.json();
      
      // Update requests state
      setRequests(prev => 
        prev.map(request => request.id === id ? updatedRequest : request)
      );
      
      // Update selected request if open
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest(updatedRequest);
      }
      
      // Show success message
      setSuccess('Request completed successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Failed to complete request: ${err.message}`);
      } else {
        setError('Failed to complete request. Please try again.');
      }
      console.error('Error completing request:', err);
    }
  };

  const handleViewDetails = (request: Request) => {
    setSelectedRequest(request);
    setShowDetails(request.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusBadgeColor = (statusName: string) => {
    switch (statusName) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'rental':
        return 'Peminjaman';
      case 'calibration':
        return 'Kalibrasi';
      default:
        return type;
    }
  };

  // Filter requests client-side based on filters
  const filteredRequests = requests.filter(request => {
    // Filter by requestType
    if (filters.requestType && request.requestType !== filters.requestType) {
      return false;
    }
    
    // Filter by status
    if (filters.statusId && request.statusId.toString() !== filters.statusId) {
      return false;
    }
    
    // Filter by search term (user name, item name, or id)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesUser = request.user.name.toLowerCase().includes(searchTerm);
      const matchesItem = request.item.name.toLowerCase().includes(searchTerm);
      const matchesId = request.id.toString().includes(searchTerm);
      
      if (!matchesUser && !matchesItem && !matchesId) {
        return false;
      }
    }
    
    return true;
  });

  return (
    <DashboardLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-title text-xl md:text-2xl">Manajemen Request</h1>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{success}</p>
          </div>
        )}

        {/* Filters */}
        <div className="card mb-6 border border-gray-200">
          <h2 className="text-subtitle mb-4">Filter Request</h2>
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
                placeholder="Cari berdasarkan nama/item..."
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="requestType" className="form-label">
                Tipe Request
              </label>
              <select
                id="requestType"
                name="requestType"
                value={filters.requestType}
                onChange={handleFilterChange}
                className="form-input"
              >
                <option value="">Semua Tipe</option>
                <option value="rental">Peminjaman</option>
                <option value="calibration">Kalibrasi</option>
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
            <p className="mt-4 text-subtitle">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
            <p className="text-yellow-700 font-medium">Tidak ada request ditemukan. Silakan ubah filter Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="table-container bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="table-header hidden sm:table-cell">
                      ID
                    </th>
                    <th className="table-header">
                      User
                    </th>
                    <th className="table-header hidden md:table-cell">
                      Item
                    </th>
                    <th className="table-header hidden lg:table-cell">
                      Tipe
                    </th>
                    <th className="table-header hidden md:table-cell">
                      Tanggal Request
                    </th>
                    <th className="table-header">
                      Status
                    </th>
                    <th className="table-header text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className={showDetails === request.id ? 'bg-green-50' : ''}>
                      <td className="table-cell hidden sm:table-cell text-body">
                        {request.id}
                      </td>
                      <td className="table-cell">
                        <div className="text-subtitle">{request.user.name}</div>
                        <div className="text-muted text-sm">{request.user.email}</div>
                        <div className="sm:hidden">
                          <span className={`badge inline-block my-1 ${getStatusBadgeColor(request.status.name)}`}>
                            {request.status.name}
                          </span>
                          <div className="text-xs text-muted mt-1">
                            {request.item.name}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <div className="text-subtitle">{request.item.name}</div>
                        <div className="text-muted text-sm">{request.item.serialNumber || '-'}</div>
                      </td>
                      <td className="table-cell hidden lg:table-cell text-body">
                        {getRequestTypeLabel(request.requestType)}
                      </td>
                      <td className="table-cell hidden md:table-cell text-body">
                        {formatDate(request.requestDate)}
                      </td>
                      <td className="table-cell hidden sm:table-cell">
                        <span className={`badge ${getStatusBadgeColor(request.status.name)}`}>
                          {request.status.name}
                        </span>
                      </td>
                      <td className="table-cell text-right">
                        <button
                          onClick={() => handleViewDetails(request)}
                          className="text-blue-600 hover:text-blue-800 font-medium block sm:inline-block w-full sm:w-auto text-center sm:text-left mb-2 sm:mb-0 sm:mr-3"
                        >
                          Detail
                        </button>
                        
                        {request.status.name === 'PENDING' && (
                          <div className="space-x-0 space-y-2 sm:space-y-0 sm:space-x-2 mt-2 sm:mt-0 sm:inline-block">
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="text-green-600 hover:text-green-800 font-medium block sm:inline-block w-full sm:w-auto text-center sm:text-left"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="text-red-600 hover:text-red-800 font-medium block sm:inline-block w-full sm:w-auto text-center sm:text-left"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        
                        {request.status.name === 'APPROVED' && (
                          <button
                            onClick={() => handleComplete(request.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium block sm:inline-block w-full sm:w-auto text-center sm:text-left"
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Request Detail Panel */}
              {selectedRequest && showDetails && (
                <div className="p-4 md:p-6 border-t border-gray-200 bg-green-50">
                  <div className="mb-6 flex justify-between items-center">
                    <h3 className="text-title text-lg">Detail Request #{selectedRequest.id}</h3>
                    <button 
                      onClick={() => setShowDetails(null)}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="Close details panel"
                      title="Close details"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-subtitle uppercase mb-3 text-sm">Informasi Request</h4>
                      <dl className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                        <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-b border-gray-200 bg-gray-50">
                          <dt className="text-sm font-medium text-gray-700">ID</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{selectedRequest.id}</dd>
                        </div>
                        <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-b border-gray-200">
                          <dt className="text-sm font-medium text-gray-700">Tipe</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{getRequestTypeLabel(selectedRequest.requestType)}</dd>
                        </div>
                        <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-b border-gray-200 bg-gray-50">
                          <dt className="text-sm font-medium text-gray-700">Tanggal</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(selectedRequest.requestDate)}</dd>
                        </div>
                        <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-b border-gray-200">
                          <dt className="text-sm font-medium text-gray-700">Status</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <span className={`badge ${getStatusBadgeColor(selectedRequest.status.name)}`}>
                              {selectedRequest.status.name}
                            </span>
                          </dd>
                        </div>
                        <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                          <dt className="text-sm font-medium text-gray-700">Alasan</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{selectedRequest.reason || '-'}</dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div>
                      <h4 className="text-subtitle uppercase mb-3 text-sm">Informasi User & Item</h4>
                      <dl className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                        <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-b border-gray-200 bg-gray-50">
                          <dt className="text-sm font-medium text-gray-700">User</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{selectedRequest.user.name}</dd>
                        </div>
                        <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-b border-gray-200">
                          <dt className="text-sm font-medium text-gray-700">Email</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{selectedRequest.user.email}</dd>
                        </div>
                        <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-b border-gray-200 bg-gray-50">
                          <dt className="text-sm font-medium text-gray-700">Item</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{selectedRequest.item.name}</dd>
                        </div>
                        <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-b border-gray-200">
                          <dt className="text-sm font-medium text-gray-700">Serial Number</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{selectedRequest.item.serialNumber || '-'}</dd>
                        </div>
                        <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                          <dt className="text-sm font-medium text-gray-700">Approved By</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            {selectedRequest.approver ? selectedRequest.approver.name : '-'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  
                  {selectedRequest.status.name === 'PENDING' && (
                    <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
                      <button
                        onClick={() => handleReject(selectedRequest.id)}
                        className="btn btn-danger order-2 sm:order-1"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(selectedRequest.id)}
                        className="btn btn-primary order-1 sm:order-2"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                  
                  {selectedRequest.status.name === 'APPROVED' && (
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => handleComplete(selectedRequest.id)}
                        className="btn btn-primary"
                      >
                        Mark as Completed
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 