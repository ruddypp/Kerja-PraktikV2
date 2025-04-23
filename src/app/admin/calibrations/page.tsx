'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FiCheckCircle, FiEdit2, FiFileText, FiDownload, FiX } from 'react-icons/fi';
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
  statusLogs?: Array<{
    id: string;
    status: string;
    notes: string | null;
    createdAt: string;
    changedBy?: {
      id: string;
      name: string;
    }
  }>;
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
  const [completeModal, setCompleteModal] = useState(false);
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
  
  // Menambahkan state untuk konfirmasi hapus
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Tambahkan state untuk modal edit sertifikat
  const [showEditCertificateModal, setShowEditCertificateModal] = useState(false);
  const [certificateData, setCertificateData] = useState({
    gasType: '',
    gasConcentration: '',
    gasBalance: '',
    gasBatchNumber: '',
    testSensor: '',
    testSpan: '',
    testResult: '',
    manufacturer: '',
    instrumentName: '',
    modelNumber: '',
    configuration: '',
    approvedBy: '',
    vendorName: '',
    vendorAddress: '',
    vendorPhone: ''
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
      // Memperbaiki tipe data dengan interface
      interface UpdateCalibrationBody {
        vendorId: number | null;
        calibrationDate: string;
        result: string | null;
        statusId?: string | number;
        certificateUrl?: string;
      }
      
      const body: UpdateCalibrationBody = {
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
        } catch (error: Error | unknown) {
      console.error('Error updating calibration:', error);
      setError(error instanceof Error ? error.message : 'Failed to update calibration');
      
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
    } catch (error: Error | unknown) {
      console.error('Error completing calibration request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete calibration request');
    } finally {
      setActionInProgress(false);
    }
  };
  
  // Tambahkan fungsi untuk mengelola modal hapus
  const openDeleteModal = (calibration: Calibration) => {
    setSelectedCalibration(calibration);
    setShowDeleteModal(true);
  };
  
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedCalibration(null);
  };
  
  // Tambahkan fungsi untuk menghapus kalibrasi
  const handleDeleteCalibration = async () => {
    if (!selectedCalibration) return;
    
    try {
      setActionInProgress(true);
      
      const response = await fetch(`/api/admin/calibrations/${selectedCalibration.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menghapus kalibrasi');
      }
      
      // Success
      toast.success('Kalibrasi berhasil dihapus');
      closeDeleteModal();
      fetchCalibrations(); // Refresh data
    } catch (error: Error | unknown) {
      console.error('Error deleting calibration:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus kalibrasi');
    } finally {
      setActionInProgress(false);
    }
  };
  
  // Fungsi untuk mengambil dan menampilkan data sertifikat
  const openEditCertificateModal = async (calibration: Calibration) => {
    try {
      setActionInProgress(true);
      setSelectedCalibration(calibration);
      
      // Periksa status kalibrasi terlebih dahulu
      const statusName = typeof calibration.status === 'object' 
        ? calibration.status.name 
        : calibration.status;
      
      if (statusName !== 'COMPLETED') {
        toast.error('Sertifikat hanya tersedia untuk kalibrasi yang sudah selesai');
        setActionInProgress(false);
        return;
      }
      
      // Ambil data sertifikat dari API
      const response = await fetch(`/api/admin/calibrations/${calibration.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengambil data sertifikat');
      }
      
      const data = await response.json();
      
      console.log('Data kalibrasi:', data); // Debugging

      // Periksa apakah data sertifikat tersedia
      if (!data.certificate) {
        // Untuk kalibrasi yang sudah selesai tapi tidak ada sertifikat
        toast.error('Sertifikat belum dibuat. Pengguna perlu membuat sertifikat terlebih dahulu melalui halaman user.');
        setActionInProgress(false);
        return;
      }
      
      // Set data sertifikat ke state
      setCertificateData({
        gasType: data.certificate.gasType || '',
        gasConcentration: data.certificate.gasConcentration || '',
        gasBalance: data.certificate.gasBalance || '',
        gasBatchNumber: data.certificate.gasBatchNumber || '',
        testSensor: data.certificate.testSensor || '',
        testSpan: data.certificate.testSpan || '',
        testResult: data.certificate.testResult || '',
        manufacturer: data.certificate.manufacturer || '',
        instrumentName: data.certificate.instrumentName || '',
        modelNumber: data.certificate.modelNumber || '',
        configuration: data.certificate.configuration || '',
        approvedBy: data.certificate.approvedBy || '',
        vendorName: data.certificate.vendorName || '',
        vendorAddress: data.certificate.vendorAddress || '',
        vendorPhone: data.certificate.vendorPhone || ''
      });
      
      setShowEditCertificateModal(true);
    } catch (error: Error | unknown) {
      console.error('Error fetching certificate:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal mengambil data sertifikat');
    } finally {
      setActionInProgress(false);
    }
  };
  
  const closeEditCertificateModal = () => {
    setShowEditCertificateModal(false);
    setSelectedCalibration(null);
  };
  
  // Fungsi untuk handle perubahan form edit sertifikat
  const handleCertificateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCertificateData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Fungsi untuk menyimpan perubahan sertifikat
  const handleUpdateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCalibration) return;
    
    try {
      setActionInProgress(true);
      
      // Hanya kirim data gas kalibrasi dan hasil test ke API
      const certificateDataToSend = {
        gasType: certificateData.gasType,
        gasConcentration: certificateData.gasConcentration,
        gasBalance: certificateData.gasBalance,
        gasBatchNumber: certificateData.gasBatchNumber,
        testSensor: certificateData.testSensor,
        testSpan: certificateData.testSpan,
        testResult: certificateData.testResult
      };
      
      const response = await fetch(`/api/admin/calibrations/${selectedCalibration.id}/certificate`, {
        method: 'PATCH',
          headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(certificateDataToSend)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengupdate sertifikat');
      }
      
      // Success
      toast.success('Sertifikat berhasil diperbarui');
      closeEditCertificateModal();
      fetchCalibrations(); // Refresh data
    } catch (error: Error | unknown) {
      console.error('Error updating certificate:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal mengupdate sertifikat');
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
                          {(typeof calibration.status === 'object' && calibration.status.name === 'COMPLETED') || 
                           calibration.status === 'COMPLETED' ? (
                            <>
                              {/* Download sertifikat */}
                              <a 
                                href={`/api/admin/calibrations/${calibration.id}/certificate`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900 mr-3"
                                title="Download Certificate"
                              >
                                <FiDownload className="inline-block" />
                              </a>
                              
                              {/* Edit sertifikat */}
                          <button
                                onClick={() => openEditCertificateModal(calibration)}
                                className="text-green-600 hover:text-green-900 mr-3"
                                title="Edit Certificate"
                              >
                                <FiEdit2 className="inline-block" />
                          </button>
                            </>
                          ) : (
                            <>
                              {/* Tombol untuk mengubah status menjadi completed */}
                              <button
                                onClick={() => openCompleteModal(calibration)}
                                className="text-green-600 hover:text-green-900 mr-3"
                                title="Mark as Completed"
                              >
                                <FiCheckCircle className="inline-block" />
                              </button>
                              
                              {/* Edit kalibrasi */}
                          <button
                            onClick={() => openEditModal(calibration)}
                                className="text-green-600 hover:text-green-900 mr-3"
                            title="Edit Calibration"
                          >
                            <FiEdit2 className="inline-block" />
                          </button>
                            </>
                          )}
                          
                          {/* Tombol hapus untuk semua kalibrasi */}
                            <button
                            onClick={() => openDeleteModal(calibration)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Calibration"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
        
        {/* Tambahkan Delete Confirmation Modal */}
        {showDeleteModal && selectedCalibration && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Hapus Kalibrasi</h3>
                <button onClick={closeDeleteModal} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                </div>
                
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  </div>
                <h3 className="text-title text-lg leading-6 font-medium text-gray-900 mt-4">
                  Hapus Kalibrasi
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Apakah Anda yakin ingin menghapus kalibrasi untuk {selectedCalibration.item?.name || "item ini"}? 
                    Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data terkait termasuk sertifikat.
                  </p>
              </div>
                <div className="flex justify-center mt-5 gap-3">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                    onClick={closeDeleteModal}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDeleteCalibration}
                    disabled={actionInProgress}
                  >
                    {actionInProgress ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span>
                        Menghapus...
                      </>
                    ) : (
                      'Hapus'
                    )}
                </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal Edit Sertifikat */}
        {showEditCertificateModal && selectedCalibration && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Edit Sertifikat Kalibrasi</h3>
                <button onClick={closeEditCertificateModal} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-subtitle mb-1">Item:</p>
                <p className="text-body font-medium">{selectedCalibration.item?.name || 'Unknown Item'}</p>
                <p className="text-xs text-gray-500">{selectedCalibration.item?.serialNumber || 'No S/N'}</p>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-blue-700 text-sm">
                  <strong>Catatan:</strong> Hanya informasi Gas Kalibrasi dan Hasil Test yang dapat diedit. Informasi lainnya hanya dapat dilihat.
                </p>
              </div>
              
              <form onSubmit={handleUpdateCertificate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Informasi Vendor */}
                <div className="md:col-span-2 mb-2">
                  <h4 className="text-md font-medium text-gray-700 border-b pb-1 mb-2">Informasi Vendor</h4>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="vendorName" className="form-label">Nama Vendor</label>
                  <input
                    type="text"
                    id="vendorName"
                    name="vendorName"
                    value={certificateData.vendorName}
                    onChange={handleCertificateFormChange}
                    className="form-input bg-gray-100"
                    disabled
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="vendorAddress" className="form-label">Alamat Vendor</label>
                  <input
                    type="text"
                    id="vendorAddress"
                    name="vendorAddress"
                    value={certificateData.vendorAddress}
                    onChange={handleCertificateFormChange}
                    className="form-input bg-gray-100"
                    disabled
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="vendorPhone" className="form-label">Telepon Vendor</label>
                  <input
                    type="text"
                    id="vendorPhone"
                    name="vendorPhone"
                    value={certificateData.vendorPhone}
                    onChange={handleCertificateFormChange}
                    className="form-input bg-gray-100"
                    disabled
                  />
                </div>
                
                {/* Informasi Alat */}
                <div className="md:col-span-2 mb-2 mt-3">
                  <h4 className="text-md font-medium text-gray-700 border-b pb-1 mb-2">Informasi Alat</h4>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="manufacturer" className="form-label">Pembuat Alat</label>
                  <input
                    type="text"
                    id="manufacturer"
                    name="manufacturer"
                    value={certificateData.manufacturer}
                    onChange={handleCertificateFormChange}
                    className="form-input bg-gray-100"
                    disabled
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="instrumentName" className="form-label">Nama Instrumen</label>
                  <input
                    type="text"
                    id="instrumentName"
                    name="instrumentName"
                    value={certificateData.instrumentName}
                    onChange={handleCertificateFormChange}
                    className="form-input bg-gray-100"
                    disabled
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="modelNumber" className="form-label">Nomor Model</label>
                  <input
                    type="text"
                    id="modelNumber"
                    name="modelNumber"
                    value={certificateData.modelNumber}
                    onChange={handleCertificateFormChange}
                    className="form-input bg-gray-100"
                    disabled
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="configuration" className="form-label">Konfigurasi</label>
                  <input
                    type="text"
                    id="configuration"
                    name="configuration"
                    value={certificateData.configuration}
                    onChange={handleCertificateFormChange}
                    className="form-input bg-gray-100"
                    disabled
                  />
                </div>
                
                {/* Informasi Gas Kalibrasi - Bagian yang bisa diedit */}
                <div className="md:col-span-2 mb-2 mt-3">
                  <h4 className="text-md font-medium text-gray-700 border-b pb-1 mb-2">Informasi Gas Kalibrasi</h4>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="gasType" className="form-label">Jenis Gas</label>
                  <input
                    type="text"
                    id="gasType"
                    name="gasType"
                    value={certificateData.gasType}
                    onChange={handleCertificateFormChange}
                    className="form-input"
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="gasConcentration" className="form-label">Konsentrasi Gas</label>
                  <input
                    type="text"
                    id="gasConcentration"
                    name="gasConcentration"
                    value={certificateData.gasConcentration}
                    onChange={handleCertificateFormChange}
                    className="form-input"
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="gasBalance" className="form-label">Balance Gas</label>
                  <input
                    type="text"
                    id="gasBalance"
                    name="gasBalance"
                    value={certificateData.gasBalance}
                    onChange={handleCertificateFormChange}
                    className="form-input"
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="gasBatchNumber" className="form-label">Batch/Lot Gas</label>
                  <input
                    type="text"
                    id="gasBatchNumber"
                    name="gasBatchNumber"
                    value={certificateData.gasBatchNumber}
                    onChange={handleCertificateFormChange}
                    className="form-input"
                  />
                </div>
                
                {/* Hasil Test - Bagian yang bisa diedit */}
                <div className="md:col-span-2 mb-2 mt-3">
                  <h4 className="text-md font-medium text-gray-700 border-b pb-1 mb-2">Hasil Test</h4>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="testSensor" className="form-label">Sensor</label>
                  <input
                    type="text"
                    id="testSensor"
                    name="testSensor"
                    value={certificateData.testSensor}
                    onChange={handleCertificateFormChange}
                    className="form-input"
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="testSpan" className="form-label">Span</label>
                  <input
                    type="text"
                    id="testSpan"
                    name="testSpan"
                    value={certificateData.testSpan}
                    onChange={handleCertificateFormChange}
                    className="form-input"
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="testResult" className="form-label">Hasil</label>
                  <select
                    id="testResult"
                    name="testResult"
                    value={certificateData.testResult}
                    onChange={handleCertificateFormChange}
                    className="form-input"
                  >
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="approvedBy" className="form-label">Disetujui Oleh</label>
                  <input
                    type="text"
                    id="approvedBy"
                    name="approvedBy"
                    value={certificateData.approvedBy}
                    onChange={handleCertificateFormChange}
                    className="form-input bg-gray-100"
                    disabled
                  />
                </div>
                
                <div className="md:col-span-2 flex justify-end mt-6 space-x-3">
                  <button
                    type="button"
                    onClick={closeEditCertificateModal}
                    className="btn btn-secondary"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionInProgress}
                  >
                    {actionInProgress ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span>
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan Perubahan'
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