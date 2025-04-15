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
  serialNumber: string | null;
  specification: string | null;
  category?: Category;
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
  item: Item;
  status: Status;
}

export default function UserRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [items, setItems] = useState<Item[]>([]);
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
    requestType: 'use',
    reason: ''
  });
  
  // Filters
  const [filters, setFilters] = useState({
    requestType: '',
    statusId: '',
  });

  useEffect(() => {
    fetchRequests();
    fetchItems();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [filters]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Build query params for filtering
      const params = new URLSearchParams();
      if (filters.requestType) params.append('requestType', filters.requestType);
      if (filters.statusId) params.append('statusId', filters.statusId);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      const res = await fetch(`/api/user/requests${queryString}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch requests: ${res.statusText}`);
      }
      
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      setError('Error loading requests. Please try again.');
      console.error('Error in fetchRequests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/admin/items?statusId=1'); // Assuming status ID 1 is AVAILABLE
      if (!res.ok) {
        throw new Error('Failed to fetch available items');
      }
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      requestType: '',
      statusId: '',
    });
  };

  const handleRequestFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRequestForm(prev => ({ ...prev, [name]: value }));
  };
  
  const openRequestModal = (item?: Item) => {
    if (item) {
      setSelectedItem(item);
    }
    setRequestForm({
      requestType: 'use',
      reason: ''
    });
    setShowRequestModal(true);
  };
  
  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedItem(null);
  };
  
  const findUserApprovedRequest = (itemId: number) => {
    return requests.find(request => 
      request.itemId === itemId && 
      (request.status.name === 'APPROVED' || request.status.name === 'Approved') &&
      request.requestType === 'use' &&
      !requests.some(r => 
        r.requestType === 'return' && 
        r.itemId === itemId && 
        (r.status.name === 'PENDING' || r.status.name === 'APPROVED')
      )
    );
  };
  
  const openReturnModal = (request: Request) => {
    setSelectedItem(request.item);
    setSelectedRequest(request);
    setShowReturnModal(true);
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
      
      // Refresh data
      fetchRequests();
      fetchItems();
      
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
      // Show the user is submitting a return request for clarity
      setSuccess('Submitting return request...');
      
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
      setSuccess(`Return request for ${selectedItem?.name} submitted successfully! Admin will verify your return.`);
      
      // Refresh data
      fetchRequests();
      
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeColor = (statusName: string) => {
    switch (statusName.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'use':
        return 'Use';
      case 'return':
        return 'Return';
      default:
        return type;
    }
  };

  return (
    <DashboardLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-title text-xl md:text-2xl">My Requests</h1>
          <button 
            onClick={() => openRequestModal()}
            className="btn btn-primary"
          >
            New Request
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{error}</p>
            <button 
              onClick={fetchRequests}
              className="mt-2 text-red-700 underline hover:text-red-800"
            >
              Try Again
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
          <h2 className="text-subtitle mb-4">Filter Requests</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="requestType" className="form-label">
                Request Type
              </label>
              <select
                id="requestType"
                name="requestType"
                value={filters.requestType}
                onChange={handleFilterChange}
                className="form-input"
              >
                <option value="">All Types</option>
                <option value="use">Use</option>
                <option value="return">Return</option>
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
                <option value="1">Pending</option>
                <option value="2">Approved</option>
                <option value="3">Rejected</option>
                <option value="4">Completed</option>
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
            <p className="mt-4 text-subtitle">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
            <p className="text-yellow-700 font-medium">No requests found.</p>
            <p className="text-yellow-600 mt-2">Use the "New Request" button to make a request for an item.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{request.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{request.item.name}</div>
                      <div className="text-xs text-gray-500">{request.item.serialNumber || 'No S/N'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {getRequestTypeLabel(request.requestType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {formatDate(request.requestDate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(request.status.name)}`}>
                        {request.status.name.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {request.reason || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {(request.status.name.toLowerCase() === 'approved') && 
                       (request.requestType === 'use') && 
                       !requests.some(r => 
                         r.requestType === 'return' && 
                         r.itemId === request.itemId && 
                         (r.status.name.toLowerCase() === 'pending' || r.status.name.toLowerCase() === 'approved')
                       ) && (
                        <button 
                          onClick={() => openReturnModal(request)}
                          className="text-blue-600 hover:text-blue-900 whitespace-nowrap"
                        >
                          Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile view */}
        <div className="md:hidden mt-6">
          {!loading && requests.length > 0 && (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">#{request.id} - {request.item.name}</h3>
                      <p className="text-sm text-gray-600">{getRequestTypeLabel(request.requestType)}</p>
                    </div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(request.status.name)}`}>
                      {request.status.name.toLowerCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-gray-500">Date:</p>
                      <p className="font-medium">{formatDate(request.requestDate)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Serial Number:</p>
                      <p className="font-medium">{request.item.serialNumber || '-'}</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-gray-500 text-sm">Reason:</p>
                    <p className="text-sm">{request.reason || '-'}</p>
                  </div>
                  {(request.status.name.toLowerCase() === 'approved') && 
                   (request.requestType === 'use') && 
                   !requests.some(r => 
                     r.requestType === 'return' && 
                     r.itemId === request.itemId && 
                     (r.status.name.toLowerCase() === 'pending' || r.status.name.toLowerCase() === 'approved')
                   ) && (
                    <div className="mt-2">
                      <button 
                        onClick={() => openReturnModal(request)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Return
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request Modal */}
        {showRequestModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-30">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">New Request</h3>
                <button onClick={closeRequestModal} className="text-gray-400 hover:text-gray-500" aria-label="Close request modal" title="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={submitRequest}>
                {!selectedItem && (
                  <div className="mb-4">
                    <label htmlFor="itemSelect" className="form-label">
                      Select Item
                    </label>
                    <select 
                      id="itemSelect" 
                      className="form-input"
                      onChange={(e) => {
                        const itemId = parseInt(e.target.value);
                        const item = items.find(i => i.id === itemId);
                        if (item) setSelectedItem(item);
                      }}
                      required
                    >
                      <option value="">Select an item</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} {item.serialNumber ? `(${item.serialNumber})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {selectedItem && (
                  <div className="mb-4">
                    <p className="text-subtitle mb-1">Item:</p>
                    <p className="text-body">{selectedItem.name}</p>
                  </div>
                )}
                
                <div className="mb-4">
                  <input
                    type="hidden"
                    id="requestType"
                    name="requestType"
                    value={requestForm.requestType}
                  />
                  <p className="text-subtitle mb-1">Request Type:</p>
                  <p className="text-body">Use Item</p>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="reason" className="form-label">
                    Reason
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={requestForm.reason}
                    onChange={handleRequestFormChange}
                    rows={3}
                    className="form-input"
                    placeholder="Explain why you need this item..."
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={closeRequestModal}
                    className="btn btn-secondary order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary order-1 sm:order-2"
                    disabled={!selectedItem}
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
                <h3 className="text-title text-lg">Return Item</h3>
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
                <p className="text-body">{new Date(selectedRequest.requestDate).toLocaleDateString('en-US')}</p>
              </div>
              
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-1">Return Process:</h4>
                <ol className="list-decimal pl-5 text-sm text-yellow-700 space-y-1">
                  <li>Submit this return request</li>
                  <li>Admin will verify your return</li>
                  <li>After verification, the item status will change to AVAILABLE</li>
                </ol>
              </div>
              
              <p className="text-subtitle text-gray-500 mb-4">
                Are you sure you want to return this item? The admin will receive a notification and verify the return.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <button 
                  type="button" 
                  onClick={closeReturnModal}
                  className="btn btn-secondary order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={submitReturn}
                  className="btn btn-primary order-1 sm:order-2"
                >
                  Return
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 