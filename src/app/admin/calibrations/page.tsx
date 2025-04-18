'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FiCheckCircle, FiUpload, FiEdit2, FiInfo, FiFileText } from 'react-icons/fi';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Status {
  id: string;
  name: string;
  type: string;
}

interface Category {
  name: string;
}

interface Item {
  serialNumber: string;
  name: string;
  partNumber: string;
  category?: Category | null;
  sensor?: string | null;
  description?: string | null;
  status: ItemStatus;
}

interface User {
  id: string;
  name: string;
  email: string;
}

enum ItemStatus {
  AVAILABLE = 'AVAILABLE',
  IN_CALIBRATION = 'IN_CALIBRATION',
  RENTED = 'RENTED',
  IN_MAINTENANCE = 'IN_MAINTENANCE'
}

// RequestStatus bisa berupa enum atau string status
type RequestStatusType = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface Vendor {
  id: string;
  name: string;
  contactName?: string | null;
  contactPhone?: string | null;
  service?: string | null;
}

interface Calibration {
  id: string;
  itemSerial: string;
  userId: string;
  vendorId: string;
  status: RequestStatusType | { name: string };
  statusId?: string;  // Untuk backward compatibility dengan form
  calibrationDate: string;
  validUntil: string | null;
  certificateUrl: string | null;
  result: string | null;  // Menambahkan field result
  createdAt: string;
  updatedAt: string;
  item: Item;
  user: User;
  vendor: Vendor | null;
  statusLogs?: Array<any>;
}

export default function CalibrationPage() {
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [selectedCalibration, setSelectedCalibration] = useState<Calibration | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // Form states
  const [editForm, setEditForm] = useState({
    vendorId: '',
    calibrationDate: '',
    result: '',
    certificateUrl: '',
    statusId: '',
    completed: false
  });
  
  // Complete form states
  const [certificateNumber, setCertificateNumber] = useState('');
  const [calibrationDate, setCalibrationDate] = useState('');
  const [nextCalibrationDate, setNextCalibrationDate] = useState('');
  const [calibrationResult, setCalibrationResult] = useState('');
  
  // Filter state
  const [filter, setFilter] = useState({
    statusId: '',
    vendorId: ''
  });
  
  // Reset complete form
  const resetCompleteForm = () => {
    setCertificateNumber('');
    setCalibrationDate('');
    setNextCalibrationDate('');
    setCalibrationResult('');
  };
  
  // Load data on component mount
  useEffect(() => {
    fetchVendors();
    fetchStatuses();
    fetchCalibrations();
  }, []);
  
  // Apply filters
  useEffect(() => {
    fetchCalibrations();
  }, [filter]);
  
  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/admin/vendors', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch vendors: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }
      
      const data = await response.json();
      setVendors(data);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      // Don't set global error for vendors as it's not the primary data
    }
  };
  
  const fetchStatuses = async () => {
    try {
      // Only fetch calibration statuses, not request statuses
      const calibrationRes = await fetch('/api/admin/statuses?type=calibration', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!calibrationRes.ok) {
        const errorText = await calibrationRes.text();
        throw new Error(`Failed to fetch statuses: ${calibrationRes.status} ${calibrationRes.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }
      
      const calibrationData = await calibrationRes.json();
      
      // Set statuses directly from calibration data
      setStatuses(calibrationData);
      
      // Clear any existing error
      if (error.includes('status')) {
        setError('');
      }
    } catch (err) {
      console.error('Error fetching statuses:', err);
      // Display user-friendly error
      setError('Could not load status information. Please try refreshing the page.');
      // Still set empty statuses array to prevent undefined errors
      setStatuses([]);
    }
  };
  
  const fetchCalibrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/calibrations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch calibrations: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }
      
      const data = await response.json();
      setCalibrations(data);
      setError('');
    } catch (err) {
      console.error('Error fetching calibrations:', err);
      setError('Failed to load calibration requests. Please try refreshing the page.');
    } finally {
      setLoading(false);
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
  
  const openEditModal = (calibration: Calibration) => {
    setSelectedCalibration(calibration);
    
    // Find the matching status in the statuses array by name and type
    const matchingStatus = statuses.find(s => {
      const statusName = typeof calibration.status === 'object' 
        ? calibration.status.name 
        : calibration.status;
      return s.name === statusName && s.type === 'calibration';
    });
    
    setEditForm({
      vendorId: calibration.vendorId?.toString() || '',
      calibrationDate: calibration.calibrationDate.split('T')[0],
      result: calibration.result || '',
      certificateUrl: calibration.certificateUrl || '',
      statusId: matchingStatus ? String(matchingStatus.id) : calibration.statusId?.toString() || '',
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
  
  const openCompleteModal = (calibration: Calibration) => {
    setSelectedCalibration(calibration);
    setCalibrationDate(calibration.calibrationDate.split('T')[0]);
    setCompleteModal(true);
  };
  
  const closeCompleteModal = () => {
    setCompleteModal(false);
    setSelectedCalibration(null);
    resetCompleteForm();
  };
  
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setEditForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
    }));
  };
  
  const handleUpdateCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCalibration) return;
    
    try {
      const body: any = {
        vendorId: editForm.vendorId ? parseInt(editForm.vendorId) : null,
        calibrationDate: editForm.calibrationDate,
        result: editForm.result.trim() || null
      };
      
      // Update status if changed
      const currentStatusId = selectedCalibration.statusId || '';
      if (editForm.statusId && editForm.statusId !== currentStatusId) {
        // Extract the actual status value from the combined ID (format: type_STATUS)
        const statusId = editForm.statusId.includes('_') 
          ? editForm.statusId
          : parseInt(editForm.statusId); // For backward compatibility
          
        body.statusId = statusId;
      }
      
      // Add certificate URL if provided
      if (editForm.certificateUrl.trim()) {
        body.certificateUrl = editForm.certificateUrl.trim();
      }
      
      const res = await fetch(`/api/admin/calibrations/${selectedCalibration.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Add this to include auth cookies
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update calibration');
      }
      
      // Show success message
      setSuccess(`Calibration #${selectedCalibration.id} was updated successfully`);
      
      // Refresh data
      fetchCalibrations();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
      // Close modal
      closeEditModal();
    } catch (err: any) {
      console.error('Error updating calibration:', err);
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
  
  // Get status badge style based on status
  const getStatusBadgeColor = (statusName: string) => {
    switch (statusName.toLowerCase()) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleComplete = async (id: string) => {
    try {
      setActionInProgress(true);
      const response = await fetch(`/api/admin/calibrations/${id}/complete`, {
        method: 'PATCH',
          headers: {
          'Content-Type': 'application/json',
          },
        credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({
          status: 'COMPLETED',
          certificateNumber: certificateNumber,
          calibrationDate: calibrationDate,
          nextCalibrationDate: nextCalibrationDate,
          result: calibrationResult,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete calibration request');
      }
      
      await fetchCalibrations();
      setCompleteModal(false);
      resetCompleteForm();
      toast.success('Calibration request marked as completed successfully');
    } catch (err: any) {
      console.error('Error completing calibration request:', err);
      toast.error(err.message || 'Failed to complete calibration request');
    } finally {
      setActionInProgress(false);
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
            <button 
              onClick={() => fetchCalibrations()}
              className="mt-2 text-sm text-red-700 hover:text-red-600 underline"
            >
              Retry
            </button>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{success}</p>
          </div>
        )}
        
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
                    <option key={`status-${status.id}`} value={status.id}>{status.name}</option>
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
                    <option key={`filter-vendor-${vendor.id}`} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="btn btn-secondary"
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
                Add calibrations through the Edit button to start tracking calibrations.
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
                          <div className="text-sm font-medium text-gray-900">
                            {calibration.item ? calibration.item.name : 'Item tidak tersedia'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {calibration.item && calibration.item.serialNumber ? 
                              calibration.item.serialNumber : 'No S/N'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {calibration.user ? calibration.user.name : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {calibration.vendor?.name || 'Not assigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(calibration.calibrationDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(typeof calibration.status === 'object' ? calibration.status.name : calibration.status)}`}>
                            {typeof calibration.status === 'object' ? calibration.status.name.toLowerCase() : calibration.status.toLowerCase()}
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
                          {typeof calibration.status === 'object' ? 
                            (calibration.status.name !== 'COMPLETED' && (
                              <button
                                onClick={() => openCompleteModal(calibration)}
                                className="text-green-600 hover:text-green-900 mr-2"
                                title="Mark as Completed"
                              >
                                <FiCheckCircle className="inline-block" />
                              </button>
                            ))
                          :
                            (calibration.status !== 'COMPLETED' && (
                              <button
                                onClick={() => openCompleteModal(calibration)}
                                className="text-green-600 hover:text-green-900 mr-2"
                                title="Mark as Completed"
                              >
                                <FiCheckCircle className="inline-block" />
                              </button>
                            ))
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
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
                  <p className="text-body">{selectedCalibration && selectedCalibration.item ? selectedCalibration.item.name : 'Item tidak tersedia'}</p>
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
                      <option key={`edit-vendor-${vendor.id}`} value={vendor.id}>{vendor.name}</option>
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
                        <option key={`edit-status-${status.id}`} value={status.id}>{status.name}</option>
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
                  <div>{selectedCalibration.item ? selectedCalibration.item.name : 'Item tidak tersedia'}</div>
                </div>
                <div className="flex justify-between mb-2">
                  <div className="font-semibold text-gray-500">Serial Number:</div>
                  <div>{selectedCalibration.item && selectedCalibration.item.serialNumber ? selectedCalibration.item.serialNumber : '-'}</div>
                </div>
                <div className="flex justify-between mb-2">
                  <div className="font-semibold text-gray-500">Category:</div>
                  <div>{selectedCalibration.item && selectedCalibration.item.category ? selectedCalibration.item.category.name : '-'}</div>
                </div>
                <div className="flex justify-between mb-2">
                  <div className="font-semibold text-gray-500">Requestor:</div>
                  <div>{selectedCalibration.user ? selectedCalibration.user.name : 'Unknown'}</div>
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
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(typeof selectedCalibration.status === 'object' ? selectedCalibration.status.name : selectedCalibration.status)}`}>
                      {typeof selectedCalibration.status === 'object' ? selectedCalibration.status.name.toLowerCase() : selectedCalibration.status.toLowerCase()}
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
        
        {/* Complete Modal */}
        {completeModal && selectedCalibration && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Complete Calibration</h3>
                <button onClick={closeCompleteModal} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-700">Please enter the details to complete the calibration for: <strong>{selectedCalibration.item ? selectedCalibration.item.name : 'Item tidak tersedia'}</strong></p>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleComplete(selectedCalibration.id.toString()); }}>
                <div className="mb-4">
                  <label htmlFor="certificateNumber" className="form-label">Certificate Number</label>
                  <input
                    type="text"
                    id="certificateNumber"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    className="form-input"
                    placeholder="Enter certificate number"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="calibrationDate" className="form-label">Calibration Date</label>
                  <input
                    type="date"
                    id="calibrationDate"
                    value={calibrationDate}
                    onChange={(e) => setCalibrationDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="nextCalibrationDate" className="form-label">Next Calibration Date</label>
                  <input
                    type="date"
                    id="nextCalibrationDate"
                    value={nextCalibrationDate}
                    onChange={(e) => setNextCalibrationDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="calibrationResult" className="form-label">Result</label>
                  <textarea
                    id="calibrationResult"
                    value={calibrationResult}
                    onChange={(e) => setCalibrationResult(e.target.value)}
                    className="form-input"
                    rows={3}
                    placeholder="Enter calibration results"
                    required
                  ></textarea>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeCompleteModal}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionInProgress}
                  >
                    {actionInProgress ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span>
                        Processing...
                      </>
                    ) : (
                      'Complete Calibration'
                    )}
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