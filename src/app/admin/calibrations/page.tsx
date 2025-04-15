'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FiCheckCircle, FiUpload, FiEdit2, FiInfo, FiFileText } from 'react-icons/fi';
import Link from 'next/link';

interface Status {
  id: number;
  name: string;
  type: string;
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
  category: Category;
  status: Status;
}

interface User {
  id: number;
  name: string;
  email: string;
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
  user: User;
}

interface Vendor {
  id: number;
  name: string;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

interface Calibration {
  id: number;
  requestId: number;
  vendorId: number | null;
  calibrationDate: string;
  result: string | null;
  certificateUrl: string | null;
  statusId: number;
  request: Request;
  status: Status;
  vendor: Vendor | null;
}

export default function CalibrationPage() {
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [selectedCalibration, setSelectedCalibration] = useState<Calibration | null>(null);
  
  // Form states
  const [approvalForm, setApprovalForm] = useState({
    vendorId: '',
    calibrationDate: new Date().toISOString().split('T')[0],
    result: '',
    notes: ''
  });
  
  const [editForm, setEditForm] = useState({
    vendorId: '',
    calibrationDate: '',
    result: '',
    certificateUrl: '',
    statusId: '',
    completed: false
  });
  
  const [rejectForm, setRejectForm] = useState({
    reason: ''
  });
  
  // Filter state
  const [filter, setFilter] = useState({
    statusId: '',
    vendorId: ''
  });
  
  // Load data on component mount
  useEffect(() => {
    fetchVendors();
    fetchStatuses();
    fetchCalibrations();
    fetchPendingRequests();
    ensureRejectedStatusExists();
  }, []);
  
  // Apply filters
  useEffect(() => {
    fetchCalibrations();
  }, [filter]);
  
  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/admin/vendors');
      if (!res.ok) throw new Error('Failed to fetch vendors');
      const data = await res.json();
      setVendors(data);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    }
  };
  
  const fetchStatuses = async () => {
    try {
      // Fetch all statuses for both 'calibration' and 'request' types
      const [calibrationRes, requestRes] = await Promise.all([
        fetch('/api/admin/statuses?type=calibration'),
        fetch('/api/admin/statuses?type=request')
      ]);
      
      if (!calibrationRes.ok || !requestRes.ok) 
        throw new Error('Failed to fetch statuses');
      
      const calibrationData = await calibrationRes.json();
      const requestData = await requestRes.json();
      
      // Combine both types of statuses
      setStatuses([...calibrationData, ...requestData]);
    } catch (err) {
      console.error('Error fetching statuses:', err);
    }
  };
  
  const fetchCalibrations = async () => {
    try {
      setLoading(true);
      
      let url = '/api/admin/calibrations';
      const params = new URLSearchParams();
      
      if (filter.statusId) params.append('statusId', filter.statusId);
      if (filter.vendorId) params.append('vendorId', filter.vendorId);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch calibrations');
      const data = await res.json();
      setCalibrations(data);
    } catch (err) {
      console.error('Error fetching calibrations:', err);
      setError('Failed to load calibrations');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchPendingRequests = async () => {
    try {
      setRequestsLoading(true);
      
      const res = await fetch('/api/admin/requests?requestType=calibration&statusName=pending');
      if (!res.ok) throw new Error('Failed to fetch pending requests');
      const data = await res.json();
      console.log(`Fetched ${data.length} pending calibration requests`);
      setPendingRequests(data);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };
  
  const resetFilters = () => {
    setFilter({
      statusId: '',
      vendorId: ''
    });
  };
  
  const openApproveModal = (request: Request) => {
    setSelectedRequest(request);
    setApprovalForm({
      vendorId: '',
      calibrationDate: new Date().toISOString().split('T')[0],
      result: '',
      notes: ''
    });
    setShowApproveModal(true);
  };
  
  const closeApproveModal = () => {
    setShowApproveModal(false);
    setSelectedRequest(null);
  };
  
  const openEditModal = (calibration: Calibration) => {
    setSelectedCalibration(calibration);
    setEditForm({
      vendorId: calibration.vendorId?.toString() || '',
      calibrationDate: new Date(calibration.calibrationDate).toISOString().split('T')[0],
      result: calibration.result || '',
      certificateUrl: calibration.certificateUrl || '',
      statusId: calibration.statusId.toString(),
      completed: false
    });
    setShowEditModal(true);
  };
  
  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedCalibration(null);
  };
  
  const openDetailsModal = (calibration: Calibration) => {
    setSelectedCalibration(calibration);
    setShowDetailsModal(true);
  };
  
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedCalibration(null);
  };
  
  const openRejectModal = (request: Request) => {
    setSelectedRequest(request);
    setRejectForm({
      reason: ''
    });
    setShowRejectModal(true);
  };
  
  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedRequest(null);
  };
  
  const handleApprovalFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setApprovalForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      setEditForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleRejectCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRequest) return;
    
    console.log('Starting rejection process...');
    console.log('Total statuses:', statuses.length);
    
    // Log the types of statuses we have
    const statusTypes = statuses.map(s => s.type);
    const uniqueTypes = [...new Set(statusTypes)];
    console.log('Status types:', uniqueTypes);
    
    // Log the request-type statuses
    const requestStatuses = statuses.filter(s => s.type.toLowerCase().includes('request'));
    console.log('Request-type statuses:', requestStatuses);
    
    try {
      // Find the rejected status ID
      console.log('Available statuses:', statuses);
      const rejectedStatus = statuses.find((status: Status) => {
        const name = status.name?.toLowerCase() || '';
        const type = status.type?.toLowerCase() || '';
        return name.includes('reject') && type.includes('request');
      });
      
      if (!rejectedStatus) {
        // Create rejected status
        try {
          console.log('No rejected status found, creating one...');
          const createRes = await fetch('/api/admin/statuses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: 'rejected',
              type: 'request'
            })
          });
          
          if (!createRes.ok) {
            throw new Error('Failed to create rejected status');
          }
          
          const createdStatus = await createRes.json();
          console.log('Created rejected status:', createdStatus);
          
          // Use the newly created status
          console.log(`Rejecting calibration request ${selectedRequest.id} with status ${createdStatus.id} and reason: ${rejectForm.reason}`);
          
          // Continue with reject
          const requestRes = await fetch(`/api/admin/requests/${selectedRequest.id}/reject`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              rejectionReason: rejectForm.reason,
              approvedBy: 1 // Admin ID
            })
          });
          
          // Process response
          const responseData = await requestRes.json();
          
          if (!requestRes.ok) {
            throw new Error(responseData.error || 'Failed to reject calibration request');
          }
          
          // Success handling
          console.log('Rejection successful:', responseData);
          setSuccess('Calibration request rejected successfully!');
          closeRejectModal();
          setRejectForm({ reason: '' });
          fetchCalibrations();
          fetchPendingRequests();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            setSuccess('');
          }, 3000);
          
          return;
        } catch (err: any) {
          console.error('Error creating rejected status:', err);
          setError(err.message || 'Failed to create rejected status');
          setTimeout(() => {
            setError('');
          }, 3000);
          return;
        }
      }
      
      // If we get here, we have a valid rejected status
      console.log(`Rejecting calibration request ${selectedRequest.id} with status ${rejectedStatus.id} and reason: ${rejectForm.reason}`);
      
      // First check if this request has a calibration
      let calibrationResponse = await fetch(`/api/admin/calibrations?requestId=${selectedRequest.id}`);
      let calibrationData = await calibrationResponse.json();
      
      if (calibrationResponse.ok && Array.isArray(calibrationData) && calibrationData.length > 0) {
        // If the calibration exists, update its status
        const calibration = calibrationData[0];
        console.log(`Found existing calibration #${calibration.id}, will update status`);
        
        // Delete the existing calibration since request will be rejected
        const deleteRes = await fetch(`/api/admin/calibrations/${calibration.id}`, {
          method: 'DELETE'
        });
        
        if (!deleteRes.ok) {
          const deleteData = await deleteRes.json();
          throw new Error(deleteData.error || 'Failed to delete existing calibration');
        }
      }
      
      // Update the request to rejected status directly
      const requestRes = await fetch(`/api/admin/requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rejectionReason: rejectForm.reason,
          approvedBy: 1 // Admin ID
        })
      });
      
      const responseData = await requestRes.json();
      
      if (!requestRes.ok) {
        throw new Error(responseData.error || 'Failed to reject calibration request');
      }
      
      // Success
      console.log('Rejection successful:', responseData);
      setSuccess('Calibration request rejected successfully!');
      closeRejectModal();
      
      // Reset form
      setRejectForm({ reason: '' });
      
      // Refresh data
      fetchCalibrations();
      fetchPendingRequests();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error('Error rejecting calibration:', err);
      setError(err.message || 'Failed to reject calibration request');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  
  const handleApproveCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRequest) return;
    
    try {
      const res = await fetch('/api/admin/calibrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          vendorId: approvalForm.vendorId || null,
          calibrationDate: approvalForm.calibrationDate,
          result: approvalForm.notes
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to approve calibration');
      }
      
      // Success
      setSuccess('Calibration request approved successfully!');
      closeApproveModal();
      fetchCalibrations();
      fetchPendingRequests();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to approve calibration');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  
  const handleUpdateCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCalibration) return;
    
    try {
      const res = await fetch(`/api/admin/calibrations/${selectedCalibration.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update calibration');
      }
      
      // Success
      setSuccess('Calibration updated successfully!');
      closeEditModal();
      fetchCalibrations();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update calibration');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const getStatusBadgeColor = (statusName: string) => {
    switch (statusName.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Function to ensure rejected status exists
  const ensureRejectedStatusExists = async () => {
    try {
      // Fetch all request statuses
      const res = await fetch('/api/admin/statuses?type=request');
      if (!res.ok) throw new Error('Failed to fetch request statuses');
      const data = await res.json();
      
      // Check if rejected status exists
      const rejectedExists = data.some((status: { name: string; type: string }) => 
        status.name.toLowerCase() === 'rejected' && 
        status.type.toLowerCase() === 'request'
      );
      
      if (!rejectedExists) {
        console.log('Creating rejected status for requests...');
        // Create rejected status
        const createRes = await fetch('/api/admin/statuses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'rejected',
            type: 'request'
          })
        });
        
        if (!createRes.ok) {
          throw new Error('Failed to create rejected status');
        }
        
        // Refresh statuses
        fetchStatuses();
      }
    } catch (err) {
      console.error('Error ensuring rejected status exists:', err);
      setError('There was a problem with the status configuration. Please contact the administrator.');
    }
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-title text-xl md:text-2xl">Calibration Management</h1>
          <Link href="/admin/vendors" className="btn btn-secondary">
            Manage Vendors
          </Link>
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
        
        {/* Pending Requests Section */}
        <div className="mb-8">
          <h2 className="text-subtitle text-lg mb-4">Pending Calibration Requests</h2>
          
          {requestsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading requests...</p>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="bg-gray-50 p-4 rounded border border-gray-200 text-center">
              <p className="text-gray-600">No pending calibration requests.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{request.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{request.item.name}</div>
                          <div className="text-xs text-gray-500">{request.item.serialNumber || 'No S/N'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{request.user?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{request.user?.email || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(request.requestDate)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {request.reason || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openApproveModal(request)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(request)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Calibrations Section */}
        <div>
          <h2 className="text-subtitle text-lg mb-4">Calibration Records</h2>
          
          {/* Filters */}
          <div className="card mb-6 border border-gray-200 p-4">
            <h3 className="text-subtitle mb-4">Filter Calibrations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="statusId" className="form-label">Status</label>
                <select
                  id="statusId"
                  name="statusId"
                  value={filter.statusId}
                  onChange={handleFilterChange}
                  className="form-input"
                >
                  <option value="">All Statuses</option>
                  {statuses.map(status => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="vendorId" className="form-label">Vendor</label>
                <select
                  id="vendorId"
                  name="vendorId"
                  value={filter.vendorId}
                  onChange={handleFilterChange}
                  className="form-input"
                >
                  <option value="">All Vendors</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
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
              <p className="mt-4 text-subtitle">Loading calibrations...</p>
            </div>
          ) : calibrations.length === 0 ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
              <p className="text-yellow-700 font-medium">No calibration records found.</p>
              <p className="text-yellow-600 mt-2">
                Approve pending calibration requests to start tracking calibrations.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {calibrations.map((calibration) => (
                      <tr key={calibration.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{calibration.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{calibration.request.item.name}</div>
                          <div className="text-xs text-gray-500">{calibration.request.item.serialNumber || 'No S/N'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {calibration.request.user?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {calibration.vendor?.name || 'Not assigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(calibration.calibrationDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(calibration.status.name)}`}>
                            {calibration.status.name.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openDetailsModal(calibration)}
                            className="text-blue-600 hover:text-blue-900 mr-2"
                            title="View Details"
                          >
                            <FiInfo className="inline-block" />
                          </button>
                          <button
                            onClick={() => openEditModal(calibration)}
                            className="text-green-600 hover:text-green-900 mr-2"
                            title="Edit Calibration"
                          >
                            <FiEdit2 className="inline-block" />
                          </button>
                          {calibration.status.name !== 'COMPLETED' && (
                            <button
                              onClick={() => {
                                setSelectedCalibration(calibration);
                                setEditForm(prev => ({
                                  ...prev,
                                  completed: true
                                }));
                                setShowEditModal(true);
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="Mark as Completed"
                            >
                              <FiCheckCircle className="inline-block" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Approve Calibration Modal */}
        {showApproveModal && selectedRequest && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Approve Calibration Request</h3>
                <button onClick={closeApproveModal} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleApproveCalibration}>
                <div className="mb-4">
                  <p className="text-subtitle mb-1">Item:</p>
                  <p className="text-body">{selectedRequest.item.name}</p>
                </div>
                
                <div className="mb-4">
                  <p className="text-subtitle mb-1">User:</p>
                  <p className="text-body">{selectedRequest.user?.name || 'Unknown'}</p>
                </div>
                
                <div className="mb-4">
                  <p className="text-subtitle mb-1">Request Reason:</p>
                  <p className="text-body">{selectedRequest.reason || '-'}</p>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="vendorId" className="form-label">Assign Vendor</label>
                  <select
                    id="vendorId"
                    name="vendorId"
                    value={approvalForm.vendorId}
                    onChange={handleApprovalFormChange}
                    className="form-input"
                  >
                    <option value="">Select a vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="calibrationDate" className="form-label">Calibration Date</label>
                  <input
                    id="calibrationDate"
                    name="calibrationDate"
                    type="date"
                    value={approvalForm.calibrationDate}
                    onChange={handleApprovalFormChange}
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="notes" className="form-label">Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={approvalForm.notes}
                    onChange={handleApprovalFormChange}
                    rows={3}
                    className="form-input"
                    placeholder="Add any initial notes about this calibration..."
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={closeApproveModal}
                    className="btn btn-secondary order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary order-1 sm:order-2"
                  >
                    Approve Calibration
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Edit Calibration Modal */}
        {showEditModal && selectedCalibration && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">
                  {editForm.completed ? 'Complete Calibration' : 'Edit Calibration'}
                </h3>
                <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleUpdateCalibration}>
                <div className="mb-4">
                  <p className="text-subtitle mb-1">Item:</p>
                  <p className="text-body">{selectedCalibration.request.item.name}</p>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="vendorId" className="form-label">Vendor</label>
                  <select
                    id="vendorId"
                    name="vendorId"
                    value={editForm.vendorId}
                    onChange={handleEditFormChange}
                    className="form-input"
                  >
                    <option value="">Select a vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="calibrationDate" className="form-label">Calibration Date</label>
                  <input
                    id="calibrationDate"
                    name="calibrationDate"
                    type="date"
                    value={editForm.calibrationDate}
                    onChange={handleEditFormChange}
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="result" className="form-label">Result / Notes</label>
                  <textarea
                    id="result"
                    name="result"
                    value={editForm.result}
                    onChange={handleEditFormChange}
                    rows={3}
                    className="form-input"
                    placeholder="Enter calibration results or notes..."
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="certificateUrl" className="form-label">Certificate URL (if available)</label>
                  <input
                    id="certificateUrl"
                    name="certificateUrl"
                    type="text"
                    value={editForm.certificateUrl}
                    onChange={handleEditFormChange}
                    className="form-input"
                    placeholder="https://example.com/certificate.pdf"
                  />
                </div>
                
                {!editForm.completed && (
                  <div className="mb-4">
                    <label htmlFor="statusId" className="form-label">Status</label>
                    <select
                      id="statusId"
                      name="statusId"
                      value={editForm.statusId}
                      onChange={handleEditFormChange}
                      className="form-input"
                      required
                    >
                      {statuses.map(status => (
                        <option key={status.id} value={status.id}>{status.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {editForm.completed && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <div className="flex items-start">
                      <input
                        id="completed"
                        name="completed"
                        type="checkbox"
                        checked={editForm.completed}
                        onChange={handleEditFormChange}
                        className="mt-1 h-4 w-4 text-green-600"
                      />
                      <label htmlFor="completed" className="ml-2 text-yellow-800">
                        <span className="font-medium">Mark as completed</span>
                        <p className="text-xs mt-1">
                          This will mark the calibration as complete, update the item status to AVAILABLE, 
                          and make the calibration certificate available to the user.
                        </p>
                      </label>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={closeEditModal}
                    className="btn btn-secondary order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary order-1 sm:order-2"
                  >
                    {editForm.completed ? 'Complete Calibration' : 'Update Calibration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Details Modal */}
        {showDetailsModal && selectedCalibration && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Calibration Details</h3>
                <button onClick={closeDetailsModal} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <div className="font-semibold text-gray-500">Calibration ID:</div>
                  <div>{selectedCalibration.id}</div>
                </div>
                <div className="flex justify-between mb-2">
                  <div className="font-semibold text-gray-500">Item:</div>
                  <div>{selectedCalibration.request.item.name}</div>
                </div>
                <div className="flex justify-between mb-2">
                  <div className="font-semibold text-gray-500">Serial Number:</div>
                  <div>{selectedCalibration.request.item.serialNumber || '-'}</div>
                </div>
                <div className="flex justify-between mb-2">
                  <div className="font-semibold text-gray-500">Category:</div>
                  <div>{selectedCalibration.request.item.category.name}</div>
                </div>
                <div className="flex justify-between mb-2">
                  <div className="font-semibold text-gray-500">Requestor:</div>
                  <div>{selectedCalibration.request.user?.name || 'Unknown'}</div>
                </div>
                <div className="flex justify-between mb-2">
                  <div className="font-semibold text-gray-500">Vendor:</div>
                  <div>{selectedCalibration.vendor?.name || 'Not assigned'}</div>
                </div>
                <div className="flex justify-between mb-2">
                  <div className="font-semibold text-gray-500">Date:</div>
                  <div>{formatDate(selectedCalibration.calibrationDate)}</div>
                </div>
                <div className="flex justify-between mb-2">
                  <div className="font-semibold text-gray-500">Status:</div>
                  <div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(selectedCalibration.status.name)}`}>
                      {selectedCalibration.status.name.toLowerCase()}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="font-semibold text-gray-500 mb-1">Results / Notes:</div>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                    {selectedCalibration.result || 'No results recorded'}
                  </div>
                </div>
                
                {selectedCalibration.certificateUrl && (
                  <div className="mt-4">
                    <div className="font-semibold text-gray-500 mb-1">Certificate:</div>
                    <a 
                      href={selectedCalibration.certificateUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <FiFileText className="mr-1" /> View Certificate
                    </a>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <button 
                  type="button" 
                  onClick={closeDetailsModal}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Reject Modal */}
        {showRejectModal && selectedRequest && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Reject Calibration Request</h3>
                <button onClick={closeRejectModal} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-subtitle mb-2">Are you sure you want to reject the calibration request for:</p>
                <p className="font-medium">{selectedRequest.item.name} {selectedRequest.item.serialNumber && `(${selectedRequest.item.serialNumber})`}</p>
                <p className="text-sm text-gray-600 mt-1">Requested by: {selectedRequest.user?.name || 'Unknown user'}</p>
              </div>
              
              <form onSubmit={handleRejectCalibration}>
                <div className="mb-4">
                  <label htmlFor="reason" className="form-label">Rejection Reason</label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={rejectForm.reason}
                    onChange={(e) => setRejectForm({...rejectForm, reason: e.target.value})}
                    rows={3}
                    className="form-input"
                    placeholder="Enter reason for rejection..."
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeRejectModal}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger"
                  >
                    Reject Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 