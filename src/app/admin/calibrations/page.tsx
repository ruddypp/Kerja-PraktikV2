'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FiCheckCircle, FiEdit2, FiDownload, FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import { format } from 'date-fns';

// Near the top of the file, add this interface for API responses
interface ApiResponse {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

// Tambahkan fetcher untuk SWR
const fetcher = async (url: string) => {
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    cache: 'no-store'
  });
  
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }
  
  return res.json();
};

// Tambahkan konstanta untuk page size
const PAGE_SIZE = 10;

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
  
  // Tambahkan state untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [selectedCalibration, setSelectedCalibration] = useState<Calibration | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // Menambahkan state untuk konfirmasi hapus
  const [showDeleteModal, setShowDeleteModal] = useState(false);
   
  // Tambahkan state untuk modal edit sertifikat
  const [showEditCertificateModal, setShowEditCertificateModal] = useState(false);
  const [certificateData, setCertificateData] = useState<{
    gasType: string;
    gasConcentration: string;
    gasBalance: string;
    gasBatchNumber: string;
    testSensor: string;
    testSpan: string;
    testResult: string;
    manufacturer: string;
    instrumentName: string;
    modelNumber: string;
    configuration: string;
    approvedBy: string;
    vendorName: string;
    vendorAddress: string;
    vendorPhone: string;
    // Add missing certificate fields
    certificateNumber: string;
    calibrationDate: string;
    validUntil: string;
    // Add arrays for multiple entries
    gasEntries: Array<{
      gasType: string;
      gasConcentration: string;
      gasBalance: string;
      gasBatchNumber: string;
    }>;
    testEntries: Array<{
      testSensor: string;
      testSpan: string;
      testResult: string;
    }>;
  }>({
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
    vendorPhone: '',
    // Initialize new fields
    certificateNumber: '',
    calibrationDate: '',
    validUntil: '',
    // Initialize empty arrays
    gasEntries: [],
    testEntries: []
  });
  
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
  const [completeForm, setCompleteForm] = useState({
    id: '',
    
    // Detail Gas Kalibrasi - changed to arrays to support multiple entries
    gasEntries: [{
      gasType: '',
      gasConcentration: '',
      gasBalance: '',
      gasBatchNumber: ''
    }],
    
    // Hasil Test - changed to arrays to support multiple entries
    testEntries: [{
      testSensor: '',
      testSpan: '',
      testResult: 'Pass' as 'Pass' | 'Fail'
    }],
    
    // Detail Alat - auto-filled from item data
    instrumentName: '',
    modelNumber: '',
    configuration: '',
    
    // Approval
    approvedBy: '',
    
    // Valid Until - default 1 tahun dari tanggal kalibrasi jika belum diisi
    validUntil: format(new Date(Date.now() + 365*24*60*60*1000), 'yyyy-MM-dd'),
    
    // Certificate Number
    certificateNumber: '',
    
    // Calibration Date
    calibrationDate: format(new Date(), 'yyyy-MM-dd'),
    
    // Notes
    notes: ''
  });
  
  // Filter state
  const [filter, setFilter] = useState({
    statusId: '',
    vendorId: '',
    page: 1
  });
  
  // Reset complete form
  const resetCompleteForm = () => {
    setCompleteForm({
      id: '',
      gasEntries: [{
        gasType: '',
        gasConcentration: '',
        gasBalance: '',
        gasBatchNumber: ''
      }],
      testEntries: [{
        testSensor: '',
        testSpan: '',
        testResult: 'Pass' as 'Pass' | 'Fail'
      }],
      instrumentName: '',
      modelNumber: '',
      configuration: '',
      approvedBy: '',
      validUntil: format(new Date(Date.now() + 365*24*60*60*1000), 'yyyy-MM-dd'),
      certificateNumber: '',
      calibrationDate: format(new Date(), 'yyyy-MM-dd'),
      notes: ''
    });
  };
  
  // Mengganti useEffect dengan SWR untuk data vendors dan statuses
  useSWR('/api/admin/vendors', fetcher, {
    onSuccess: (data) => {
      // Extract vendors array from the response object
      // The API returns {items: Vendor[], total: number, ...} 
      setVendors(Array.isArray(data) ? data : (data.items || []));
    },
    revalidateOnFocus: false
  });
  
  useSWR('/api/admin/statuses?type=calibration', fetcher, {
    onSuccess: (data: Status[]) => setStatuses(data),
    revalidateOnFocus: false
  });
  
  // Gunakan SWR untuk data kalibrasi dengan dependencies pada filter
  const { mutate } = 
    useSWR(() => `/api/admin/calibrations?statusId=${filter.statusId}&vendorId=${filter.vendorId}&page=${filter.page}&limit=${PAGE_SIZE}`, 
    fetcher, {
      onSuccess: (data: {items: Calibration[], total: number}) => {
        setCalibrations(data.items || []);
        setTotalItems(data.total || 0);
        setLoading(false);
      },
      onError: (err: Error) => {
        console.error('Error fetching calibrations:', err);
        setError('Failed to load calibration requests. Please try refreshing the page.');
        setLoading(false);
      },
      revalidateOnFocus: false
    });
  
  // Fungsi untuk ganti halaman
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setFilter(prev => ({ ...prev, page }));
  };
  
  // Load data on component mount
  useEffect(() => {
    // Define fetchCalibrations inside useEffect to avoid circular reference
    fetchCalibrations();
  }, [filter, mutate]); // Include mutate in dependencies since it's used inside
  
  // Define the fetchCalibrations function
    const fetchCalibrations = async () => {
      return mutate();
    };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };
  
  const resetFilters = () => {
    setFilter({
      statusId: '',
      vendorId: '',
      page: 1
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
    if (!calibration) return;
    
    setSelectedCalibration(calibration);
    setCompleteForm({
      id: calibration.id,
      
      // Detail Gas Kalibrasi - changed to arrays to support multiple entries
      gasEntries: [{
        gasType: '',
        gasConcentration: '',
        gasBalance: '',
        gasBatchNumber: ''
      }],
      
      // Hasil Test - changed to arrays to support multiple entries
      testEntries: [{
        testSensor: '',
        testSpan: '',
        testResult: 'Pass' as 'Pass' | 'Fail'
      }],
      
      // Detail Alat - auto-filled from item data
      instrumentName: calibration.item?.name || '',
      modelNumber: calibration.item?.partNumber || '',
      configuration: calibration.item?.sensor || '',
      
      // Approval
      approvedBy: '',
      
      // Valid Until - default 1 tahun dari tanggal kalibrasi jika belum diisi
      validUntil: format(new Date(Date.now() + 365*24*60*60*1000), 'yyyy-MM-dd'),
      
      // Certificate Number
      certificateNumber: '',
      
      // Calibration Date
      calibrationDate: format(new Date(), 'yyyy-MM-dd'),
      
      // Notes
      notes: ''
    });
    
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
        return 'bg-purple-100 text-purple-800'; // Changed to purple like the user page
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Update the getDisplayStatus function to handle both object and string status
  const getDisplayStatus = (status: string | { name: string }): string => {
    const statusName = typeof status === 'object' ? status.name : status;
    if (statusName.toLowerCase() === 'pending') {
      return 'IN_CALIBRATION'; // Show PENDING as IN_CALIBRATION like in user page
    }
    return statusName;
  };
  
  const handleCompleteFormChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>, 
    index?: number
  ) => {
    const { name, value } = e.target;
    
    // Handle gas entries fields
    if (name === 'gasType' && index !== undefined) {
      setCompleteForm(prev => {
        const updatedGasEntries = [...prev.gasEntries];
        updatedGasEntries[index] = { 
          ...updatedGasEntries[index], 
          gasType: value 
        };
        return { ...prev, gasEntries: updatedGasEntries };
      });
    } 
    else if (name === 'gasConcentration' && index !== undefined) {
      setCompleteForm(prev => {
        const updatedGasEntries = [...prev.gasEntries];
        updatedGasEntries[index] = { 
          ...updatedGasEntries[index], 
          gasConcentration: value 
        };
        return { ...prev, gasEntries: updatedGasEntries };
      });
    }
    else if (name === 'gasBalance' && index !== undefined) {
      setCompleteForm(prev => {
        const updatedGasEntries = [...prev.gasEntries];
        updatedGasEntries[index] = { 
          ...updatedGasEntries[index], 
          gasBalance: value 
        };
        return { ...prev, gasEntries: updatedGasEntries };
      });
    }
    else if (name === 'gasBatchNumber' && index !== undefined) {
      setCompleteForm(prev => {
        const updatedGasEntries = [...prev.gasEntries];
        updatedGasEntries[index] = { 
          ...updatedGasEntries[index], 
          gasBatchNumber: value 
        };
        return { ...prev, gasEntries: updatedGasEntries };
      });
    }
    // Handle test entries fields
    else if (name === 'testSensor' && index !== undefined) {
      setCompleteForm(prev => {
        const updatedTestEntries = [...prev.testEntries];
        updatedTestEntries[index] = { 
          ...updatedTestEntries[index], 
          testSensor: value 
        };
        return { ...prev, testEntries: updatedTestEntries };
      });
    }
    else if (name === 'testSpan' && index !== undefined) {
      setCompleteForm(prev => {
        const updatedTestEntries = [...prev.testEntries];
        updatedTestEntries[index] = { 
          ...updatedTestEntries[index], 
          testSpan: value 
        };
        return { ...prev, testEntries: updatedTestEntries };
      });
    }
    else if (name === 'testResult' && index !== undefined) {
      setCompleteForm(prev => {
        const updatedTestEntries = [...prev.testEntries];
        updatedTestEntries[index] = { 
          ...updatedTestEntries[index], 
          testResult: value as 'Pass' | 'Fail'
        };
        return { ...prev, testEntries: updatedTestEntries };
      });
    }
    // Handle other fields
    else {
      setCompleteForm(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleComplete = async (id: string) => {
    try {
      setActionInProgress(true);
      
      // Extract the first entries to maintain backward compatibility with the API
      const firstGasEntry = completeForm.gasEntries[0] || { 
        gasType: '', 
        gasConcentration: '', 
        gasBalance: '', 
        gasBatchNumber: '' 
      };
      
      const firstTestEntry = completeForm.testEntries[0] || {
        testSensor: '',
        testSpan: '',
        testResult: 'Pass' as 'Pass' | 'Fail'
      };
      
      const response = await fetch(`/api/admin/calibrations/${id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          status: 'COMPLETED',
          certificateNumber: completeForm.certificateNumber,
          calibrationDate: completeForm.calibrationDate,
          validUntil: completeForm.validUntil,
          
          // Gas calibration details
          gasType: firstGasEntry.gasType,
          gasConcentration: firstGasEntry.gasConcentration,
          gasBalance: firstGasEntry.gasBalance,
          gasBatchNumber: firstGasEntry.gasBatchNumber,
          
          // Test results
          testSensor: firstTestEntry.testSensor,
          testSpan: firstTestEntry.testSpan,
          testResult: firstTestEntry.testResult,
          
          // Instrument details
          instrumentName: completeForm.instrumentName,
          modelNumber: completeForm.modelNumber,
          configuration: completeForm.configuration,
          
          // Approval
          approvedBy: completeForm.approvedBy,
          
          // Notes
          notes: completeForm.notes,
          
          // Include all entries as JSON strings for future API updates
          allGasEntries: JSON.stringify(completeForm.gasEntries),
          allTestEntries: JSON.stringify(completeForm.testEntries)
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
  
  // Fix the handleDeleteCalibration function
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
      
      // Handle empty response bodies
      let data: ApiResponse = {};
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
      }
      
      if (!response.ok) {
        console.error('Delete calibration error response:', data);
        throw new Error(data.error || `Gagal menghapus kalibrasi (${response.status})`);
      }
      
      // Success - even if we got an error but the status is 2xx, consider it a success
      // This helps handle the case where the item is deleted but there's a non-critical error
      toast.success(data.message || 'Kalibrasi berhasil dihapus');
      closeDeleteModal();
      
      // Always refresh the data regardless
      fetchCalibrations();
    } catch (error: Error | unknown) {
      console.error('Error deleting calibration:', error);
      let errorMessage = 'Gagal menghapus kalibrasi';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error details:', error.stack);
      }
      
      toast.error(errorMessage);
      setError(errorMessage);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setError('');
      }, 5000);
      
      // Still refresh the data even after error, in case of partial success
      fetchCalibrations();
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

      // Prepare gas entries and test entries
      const gasEntries = data.certificate.gasEntries || [];
      const testEntries = data.certificate.testEntries || [];
      
      // Set data sertifikat ke state
      setCertificateData({
        // Keep legacy fields for backward compatibility
        gasType: data.certificate.gasType || '',
        gasConcentration: data.certificate.gasConcentration || '',
        gasBalance: data.certificate.gasBalance || '',
        gasBatchNumber: data.certificate.gasBatchNumber || '',
        testSensor: data.certificate.testSensor || '',
        testSpan: data.certificate.testSpan || '',
        testResult: data.certificate.testResult || '',
        
        // Other fields
        manufacturer: data.certificate.manufacturer || '',
        instrumentName: data.certificate.instrumentName || '',
        modelNumber: data.certificate.modelNumber || '',
        configuration: data.certificate.configuration || '',
        approvedBy: data.certificate.approvedBy || '',
        vendorName: data.certificate.vendorName || '',
        vendorAddress: data.certificate.vendorAddress || '',
        vendorPhone: data.certificate.vendorPhone || '',
        
        // Add certificate information fields from calibration record
        certificateNumber: data.certificateNumber || '',
        calibrationDate: data.calibrationDate ? data.calibrationDate.split('T')[0] : '',
        validUntil: data.validUntil ? data.validUntil.split('T')[0] : '',
        
        // Add multiple entries
        gasEntries: gasEntries.length > 0 ? gasEntries : [{ 
          gasType: data.certificate.gasType || '',
          gasConcentration: data.certificate.gasConcentration || '',
          gasBalance: data.certificate.gasBalance || '',
          gasBatchNumber: data.certificate.gasBatchNumber || ''
        }],
        testEntries: testEntries.length > 0 ? testEntries : [{
          testSensor: data.certificate.testSensor || '',
          testSpan: data.certificate.testSpan || '',
          testResult: data.certificate.testResult || ''
        }]
      });
      
      setShowEditCertificateModal(true);
    } catch (error: unknown) {
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
  const handleCertificateFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    index?: number,
    entryType?: 'gas' | 'test'
  ) => {
    const { name, value } = e.target;
    
    if (entryType === 'gas' && typeof index === 'number') {
      // Handle changes to a specific gas entry
      setCertificateData(prev => {
        const newGasEntries = [...prev.gasEntries];
        newGasEntries[index] = {
          ...newGasEntries[index],
          [name]: value
        };
        return {
          ...prev,
          gasEntries: newGasEntries
        };
      });
    } else if (entryType === 'test' && typeof index === 'number') {
      // Handle changes to a specific test entry
      setCertificateData(prev => {
        const newTestEntries = [...prev.testEntries];
        newTestEntries[index] = {
          ...newTestEntries[index],
          [name]: value
        };
        return {
          ...prev,
          testEntries: newTestEntries
        };
      });
    } else {
      // Handle changes to other certificate fields
      setCertificateData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Add functions to handle adding and removing entries
  const addGasEntry = () => {
    setCertificateData(prev => ({
      ...prev,
      gasEntries: [
        ...prev.gasEntries,
        { gasType: '', gasConcentration: '', gasBalance: '', gasBatchNumber: '' }
      ]
    }));
  };
  
  const removeGasEntry = (index: number) => {
    if (certificateData.gasEntries.length <= 1) return; // Keep at least one entry
    
    setCertificateData(prev => {
      const newGasEntries = [...prev.gasEntries];
      newGasEntries.splice(index, 1);
      return {
        ...prev,
        gasEntries: newGasEntries
      };
    });
  };
  
  const addTestEntry = () => {
    setCertificateData(prev => ({
      ...prev,
      testEntries: [
        ...prev.testEntries,
        { testSensor: '', testSpan: '', testResult: 'Pass' }
      ]
    }));
  };
  
  const removeTestEntry = (index: number) => {
    if (certificateData.testEntries.length <= 1) return; // Keep at least one entry
    
    setCertificateData(prev => {
      const newTestEntries = [...prev.testEntries];
      newTestEntries.splice(index, 1);
      return {
        ...prev,
        testEntries: newTestEntries
      };
    });
  };
  
  // Fungsi untuk menyimpan perubahan sertifikat
  const handleUpdateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCalibration) return;
    
    try {
      setActionInProgress(true);
      
      // Kirim data sertifikat yang sudah diupdate dengan multiple entries
      const certificateDataToSend = {
        // Send instrument and approval info
        instrumentName: certificateData.instrumentName,
        modelNumber: certificateData.modelNumber,
        configuration: certificateData.configuration,
        approvedBy: certificateData.approvedBy,
        
        // Add certificate information fields
        certificateNumber: certificateData.certificateNumber,
        calibrationDate: certificateData.calibrationDate,
        validUntil: certificateData.validUntil,
        
        // Send as JSON strings
        allGasEntries: JSON.stringify(certificateData.gasEntries),
        allTestEntries: JSON.stringify(certificateData.testEntries)
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
  
  // Add new state variables for create calibration functionality
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const itemSearchRef = useRef<HTMLDivElement>(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const vendorSearchRef = useRef<HTMLDivElement>(null);
  const [calibrationForm, setCalibrationForm] = useState({
    itemSerial: '',
    vendorId: '',
    address: '',
    phone: '',
    fax: '',
    manufacturer: '',
    instrumentName: '',
    modelNumber: '',
    configuration: '',
    calibrationDate: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });
  
  // Function to fetch available items
  const fetchAvailableItems = async () => {
    try {
      // Add a timestamp parameter to prevent caching
      const res = await fetch(`/api/admin/items?status=AVAILABLE&timestamp=${new Date().getTime()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch available items: ${res.status} ${res.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }
      
      const data = await res.json();
      
      if (data && Array.isArray(data.items)) {
        setItems(data.items);
      } else if (data && typeof data === 'object') {
        setItems(data.items || []);
      } else {
        setItems([]);
        console.error('Unexpected response format from items API:', data);
      }
    } catch (err) {
      console.error('Error fetching available items:', err);
      setItems([]);
    }
  };
  
  // Function to open the calibration modal
  const openCalibrationModal = () => {
    // Always fetch fresh items when opening the modal, don't use cached items
    fetchAvailableItems();
    
    setCalibrationForm({
      itemSerial: '',
      vendorId: '',
      address: '',
      phone: '',
      fax: '',
      manufacturer: '',
      instrumentName: '',
      modelNumber: '',
      configuration: '',
      calibrationDate: format(new Date(), 'yyyy-MM-dd'),
      notes: ''
    });
    
    setShowCalibrationModal(true);
  };
  
  // Function to close the calibration modal
  const closeCalibrationModal = () => {
    setShowCalibrationModal(false);
  };
  
  // Handle changes in calibration form
  const handleCalibrationFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setCalibrationForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle item selection in the search dropdown
  const handleItemSelect = (item: Item) => {
    setItemSearch(''); // Clear search
    setShowItemSuggestions(false);
    
    // Set the selected item in the form
    setCalibrationForm(prev => ({
      ...prev,
      itemSerial: item.serialNumber,
      manufacturer: item.name || '', // Nama produk sebagai manufacturer
      instrumentName: item.partNumber || '', // Part number sebagai instrument name
      modelNumber: '', // Dibiarkan kosong untuk diisi pengguna
      configuration: item.sensor || '' // sensor sebagai configuration
    }));
  };
  
  // Handle vendor selection in the search dropdown
  const handleVendorSelect = (vendor: Vendor) => {
    setVendorSearch(''); // Clear search
    setShowVendorSuggestions(false);
    
    // Set the selected vendor in the form
    setCalibrationForm(prev => ({
      ...prev,
      vendorId: vendor.id,
      // Field address dan phone tetap ada tapi diisi kosong
      // karena data ini sudah ada di data vendor yang dipilih
      address: '',
      phone: '',
      fax: ''
    }));
  };
  
  // Handle calibration form submission
  const handleCalibrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Change to the user API endpoint which has the proper implementation for creating new calibrations
      const response = await fetch('/api/user/calibrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calibrationForm),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // Properly extract and handle error information
        let errorMessage = 'Failed to create calibration';
        if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (typeof errorData.error === 'object') {
            // Format error object into readable message
            errorMessage = Object.entries(errorData.error)
              .filter(([key, value]) => key !== '_errors' && value)
              .map(([key, value]) => {
                const errors = (value as {_errors?: string[]})._errors;
                if (Array.isArray(errors) && errors.length > 0) {
                  return `${key}: ${errors.join(', ')}`;
                }
                return null;
              })
              .filter(Boolean)
              .join('; ');
            
            if (!errorMessage) {
              // If no field errors, check for general errors
              const generalErrors = errorData.error._errors;
              if (Array.isArray(generalErrors) && generalErrors.length > 0) {
                errorMessage = generalErrors.join(', ');
              }
            }
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setSuccess('Calibration request created successfully');
      setCalibrations(prev => [data, ...prev]);
      closeCalibrationModal();
      
      // Reset form
      setCalibrationForm({
        itemSerial: '',
        vendorId: '',
        address: '',
        phone: '',
        fax: '',
        manufacturer: '',
        instrumentName: '',
        modelNumber: '',
        configuration: '',
        calibrationDate: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
      
      // Refresh data
      fetchCalibrations();
      fetchAvailableItems();
    } catch (err: Error | unknown) {
      console.error('Error creating calibration:', err);
      setError(err instanceof Error ? err.message : 'Failed to create calibration request');
    }
  };

  // Add additional useEffect hooks for item and vendor search functionality
  useEffect(() => {
    // Handler for clicking outside the suggestions to close them
    const handleClickOutside = (event: MouseEvent) => {
      if (itemSearchRef.current && !itemSearchRef.current.contains(event.target as Node)) {
        setShowItemSuggestions(false);
      }
      if (vendorSearchRef.current && !vendorSearchRef.current.contains(event.target as Node)) {
        setShowVendorSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Filter items based on search term
  useEffect(() => {
    if (itemSearch.length < 2) {
      setFilteredItems([]);
      setShowItemSuggestions(false);
      return;
    }
    
    const filtered = items.filter(item => 
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
      item.serialNumber.toLowerCase().includes(itemSearch.toLowerCase())
    );
    
    setFilteredItems(filtered);
    setShowItemSuggestions(true);
  }, [itemSearch, items]);
  
  // Filter vendors based on search term
  useEffect(() => {
    if (vendorSearch.length < 2) {
      setFilteredVendors([]);
      setShowVendorSuggestions(false);
      return;
    }
    
    const filtered = vendors.filter(vendor => 
      vendor.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      (vendor.contactName && vendor.contactName.toLowerCase().includes(vendorSearch.toLowerCase()))
    );
    
    setFilteredVendors(filtered);
    setShowVendorSuggestions(true);
  }, [vendorSearch, vendors]);
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-title text-xl md:text-2xl">Calibration Management</h1>
          <div className="flex gap-2">
            <button 
              onClick={openCalibrationModal}
              className="btn btn-primary flex items-center"
              aria-label="Create new calibration"
            >
              <FiPlus className="mr-2" /> New Calibration
            </button>
          <Link href="/admin/vendors" className="btn btn-secondary">
            Manage Vendors
          </Link>
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow-sm" role="alert">
            <p className="font-medium">{error}</p>
            <button 
              onClick={() => fetchCalibrations()}
              className="mt-2 text-sm text-red-700 hover:text-red-600 underline"
            >
              Retry
            </button>
          </div>
        )}
        
        {/* Success message */}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded shadow-sm" role="alert">
            <p className="font-medium">{success}</p>
          </div>
        )}
        
        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status */}
              <div>
              <label htmlFor="statusId" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  id="statusId"
                  name="statusId"
                  value={filter.statusId}
                  onChange={handleFilterChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
                >
                  <option value="">All Statuses</option>
                  {statuses.map(status => (
                  <option key={`status-${status.id}`} value={status.id}>
                    {status.name.toLowerCase() === 'pending' ? 'IN_CALIBRATION' : status.name}
                  </option>
                  ))}
                </select>
              </div>

            {/* Vendor */}
              <div>
              <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <select
                  id="vendorId"
                  name="vendorId"
                  value={filter.vendorId}
                  onChange={handleFilterChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
                >
                  <option value="">All Vendors</option>
                  {vendors.map(vendor => (
                    <option key={`filter-vendor-${vendor.id}`} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
              </div>

            {/* Reset Button */}
              <div className="flex items-end">
                <button
                type="button"
                  onClick={resetFilters}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition duration-150 ease-in-out"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
          
        {/* Loading state */}
          {loading ? (
          <div className="bg-white p-8 rounded-lg shadow flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : calibrations.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-500">No calibrations found.</p>
            </div>
          ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Until
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {calibrations.map((calibration) => (
                      <tr key={calibration.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {calibration.item ? calibration.item.name : 'Item tidak tersedia'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {calibration.item && calibration.item.serialNumber ? 
                              calibration.item.serialNumber : 'No S/N'}
                          </div>
                        </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {calibration.user ? calibration.user.name : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {calibration.vendor?.name || 'Not assigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(typeof calibration.status === 'object' ? calibration.status.name : calibration.status)}`}>
                        {getDisplayStatus(typeof calibration.status === 'object' ? calibration.status.name : calibration.status)}
                          </span>
                        </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(calibration.calibrationDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {calibration.validUntil ? formatDate(calibration.validUntil) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {(typeof calibration.status === 'object' && calibration.status.name === 'COMPLETED') || 
                           calibration.status === 'COMPLETED' ? (
                            <>
                          {/* Download certificate */}
                              <a 
                                href={`/api/admin/calibrations/${calibration.id}/certificate`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 mr-3 inline-flex items-center"
                                title="Download Certificate"
                              >
                            <FiDownload className="mr-1" /> Certificate
                              </a>
                              
                          {/* Edit certificate */}
                          <button
                                onClick={() => openEditCertificateModal(calibration)}
                            className="text-green-600 hover:text-green-900 inline-flex items-center"
                                title="Edit Certificate"
                              >
                            <FiEdit2 className="mr-1" /> Edit
                          </button>
                          
                          {/* Add Delete button for completed calibrations */}
                          <button
                            onClick={() => openDeleteModal(calibration)}
                            className="text-red-600 hover:text-red-900 ml-3 inline-flex items-center"
                            title="Delete Calibration"
                          >
                            <FiX className="mr-1" /> Delete
                          </button>
                            </>
                          ) : (
                            <>
                          {/* Mark as completed */}
                              <button
                                onClick={() => openCompleteModal(calibration)}
                            className="text-green-600 hover:text-green-900 mr-3 inline-flex items-center"
                                title="Mark as Completed"
                              >
                            <FiCheckCircle className="mr-1" /> Complete
                              </button>
                              
                          {/* Edit calibration */}
                          <button
                            onClick={() => openEditModal(calibration)}
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                            title="Edit Calibration"
                          >
                            <FiEdit2 className="mr-1" /> Edit
                          </button>
                          
                          {/* Add Delete button for in-progress calibrations */}
                            <button
                            onClick={() => openDeleteModal(calibration)}
                            className="text-red-600 hover:text-red-900 ml-3 inline-flex items-center"
                            title="Delete Calibration"
                          >
                            <FiX className="mr-1" /> Delete
                            </button>
                        </>
                      )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}
        
        {/* Pagination Controls */}
        {!loading && calibrations.length > 0 && (
          <div className="flex justify-between items-center mt-4 bg-white rounded-lg shadow py-2 px-4">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems} results
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Previous
              </button>
              
              {Array.from({ length: Math.ceil(totalItems / PAGE_SIZE) }, (_, i) => i + 1)
                .filter(page => page === 1 || page === Math.ceil(totalItems / PAGE_SIZE) || (page >= currentPage - 1 && page <= currentPage + 1))
                .map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded ${currentPage === page ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    {page}
                  </button>
                ))}
              
              <button
                onClick={() => handlePageChange(Math.min(Math.ceil(totalItems / PAGE_SIZE), currentPage + 1))}
                disabled={currentPage === Math.ceil(totalItems / PAGE_SIZE)}
                className={`px-3 py-1 rounded ${currentPage === Math.ceil(totalItems / PAGE_SIZE) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {/* Edit Calibration Modal */}
        {showEditModal && selectedCalibration && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center bg-green-600 text-white px-4 py-3 sticky top-0 z-10">
                <h3 className="text-lg font-semibold">
                  {editForm.completed ? 'Complete Calibration' : 'Edit Calibration'}
                </h3>
                <button onClick={closeEditModal} className="text-white hover:text-gray-200" aria-label="Close">
                  <FiX size={20} />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto max-h-[calc(90vh-56px)]">
                <form onSubmit={handleUpdateCalibration} className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Item:</p>
                    <p className="text-sm">{selectedCalibration && selectedCalibration.item ? selectedCalibration.item.name : 'Item tidak tersedia'}</p>
                </div>
                
                  <div>
                    <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <select
                    id="vendorId"
                    name="vendorId"
                    value={editForm.vendorId}
                    onChange={handleEditFormChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select a vendor</option>
                    {vendors.map(vendor => (
                      <option key={`edit-vendor-${vendor.id}`} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                </div>
                
                  <div>
                    <label htmlFor="calibrationDate" className="block text-sm font-medium text-gray-700 mb-1">Calibration Date</label>
                  <input
                    id="calibrationDate"
                    name="calibrationDate"
                    type="date"
                    value={editForm.calibrationDate}
                    onChange={handleEditFormChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                
                  <div>
                    <label htmlFor="result" className="block text-sm font-medium text-gray-700 mb-1">Result / Notes</label>
                  <textarea
                    id="result"
                    name="result"
                    value={editForm.result}
                    onChange={handleEditFormChange}
                    rows={3}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter calibration results or notes..."
                  />
                </div>
                
                  <div>
                    <label htmlFor="certificateUrl" className="block text-sm font-medium text-gray-700 mb-1">Certificate URL (if available)</label>
                  <input
                    id="certificateUrl"
                    name="certificateUrl"
                    type="text"
                    value={editForm.certificateUrl}
                    onChange={handleEditFormChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                    placeholder="https://example.com/certificate.pdf"
                  />
                </div>
                
                {!editForm.completed && (
                    <div>
                      <label htmlFor="statusId" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      id="statusId"
                      name="statusId"
                      value={editForm.statusId}
                      onChange={handleEditFormChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      {statuses.map(status => (
                          <option key={`edit-status-${status.id}`} value={status.id}>
                            {status.name.toLowerCase() === 'pending' ? 'IN_CALIBRATION' : status.name}
                          </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {editForm.completed && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
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
                
                  <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={closeEditModal}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                      className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm"
                  >
                    {editForm.completed ? 'Complete Calibration' : 'Update Calibration'}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </div>
        )}
        
        {/* Complete Modal */}
        {completeModal && selectedCalibration && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex justify-between items-center bg-green-600 text-white px-4 py-3 sticky top-0 z-10">
                <h2 className="text-lg font-semibold">Complete Calibration</h2>
                <button 
                  onClick={closeCompleteModal} 
                  className="text-white hover:text-gray-200"
                  aria-label="Close modal"
                  title="Close complete calibration form"
                >
                  <FiX size={20} />
                </button>
              </div>
              
              <div className="overflow-y-auto flex-grow p-4 max-h-[calc(90vh-56px)]">
                <p className="text-sm mb-4">Please enter the details to complete the calibration for: <strong>{selectedCalibration.item ? selectedCalibration.item.name : 'Item tidak tersedia'}</strong></p>
              
                <form onSubmit={(e) => { e.preventDefault(); handleComplete(selectedCalibration.id.toString()); }} className="space-y-4">
                  {/* Certificate Information */}
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Certificate Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="certificateNumber" className="block text-sm font-medium text-gray-700 mb-1">Certificate Number</label>
                  <input
                    type="text"
                    id="certificateNumber"
                          name="certificateNumber"
                          value={completeForm.certificateNumber}
                          onChange={(e) => handleCompleteFormChange(e)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter certificate number"
                    required
                  />
                </div>
                
                  <div>
                    <label htmlFor="calibrationDate" className="block text-sm font-medium text-gray-700 mb-1">Calibration Date</label>
                  <input
                    type="date"
                    id="calibrationDate"
                          name="calibrationDate"
                          value={completeForm.calibrationDate}
                          onChange={(e) => handleCompleteFormChange(e)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                
                  <div>
                        <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                          id="validUntil"
                          name="validUntil"
                          value={completeForm.validUntil}
                          onChange={(e) => handleCompleteFormChange(e)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                
                  <div>
                        <label htmlFor="approvedBy" className="block text-sm font-medium text-gray-700 mb-1">Approved By</label>
                        <input
                          type="text"
                          id="approvedBy"
                          name="approvedBy"
                          value={completeForm.approvedBy}
                          onChange={(e) => handleCompleteFormChange(e)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                          placeholder="Enter approver name"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Instrument Details Section */}
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Instrument Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Instrument</label>
                        <input
                          type="text"
                          name="instrumentName"
                          value={completeForm.instrumentName}
                          onChange={(e) => handleCompleteFormChange(e)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                          placeholder="Enter instrument name"
                        />
                      </div>
                      
                      <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Manufacturer</label>
                        <div className="bg-gray-100 border border-gray-300 text-gray-700 text-sm rounded-md p-2">
                          {selectedCalibration?.item.name || 'Not specified'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Model</label>
                        <div className="bg-gray-100 border border-gray-300 text-gray-700 text-sm rounded-md p-2">
                          {completeForm.modelNumber || 'Not specified'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Sensor</label>
                        <div className="bg-gray-100 border border-gray-300 text-gray-700 text-sm rounded-md p-2">
                          {completeForm.configuration || 'Not specified'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Calibration Gases Section */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-700">Calibration Gases</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setCompleteForm(prev => ({
                            ...prev,
                            gasEntries: [
                              ...prev.gasEntries,
                              { gasType: '', gasConcentration: '', gasBalance: '', gasBatchNumber: '' }
                            ]
                          }));
                        }}
                        className="flex items-center text-blue-600 hover:text-blue-800 text-xs"
                        aria-label="Add new gas entry"
                        title="Add gas entry"
                      >
                        <FiPlus className="mr-1" size={14} /> Add Gas
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">No</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Gas Type</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Concentration</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Balance</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Batch No.</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {completeForm.gasEntries.map((gasEntry, index) => (
                            <tr key={`gas-${index}`}>
                              <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">{index + 1}</td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  name="gasType"
                                  value={gasEntry.gasType}
                                  onChange={(e) => handleCompleteFormChange(e, index)}
                                  required
                                  className="w-full p-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                  placeholder="H2S"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  name="gasConcentration"
                                  value={gasEntry.gasConcentration}
                                  onChange={(e) => handleCompleteFormChange(e, index)}
                                  required
                                  className="w-full p-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                  placeholder="25 ppm"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  name="gasBalance"
                                  value={gasEntry.gasBalance}
                                  onChange={(e) => handleCompleteFormChange(e, index)}
                                  required
                                  className="w-full p-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                  placeholder="Nitrogen"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  name="gasBatchNumber"
                                  value={gasEntry.gasBatchNumber}
                                  onChange={(e) => handleCompleteFormChange(e, index)}
                                  required
                                  className="w-full p-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                  placeholder="WO261451"
                                />
                              </td>
                              <td className="px-2 py-1 text-right">
                                {completeForm.gasEntries.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCompleteForm(prev => {
                                        const updatedEntries = [...prev.gasEntries];
                                        updatedEntries.splice(index, 1);
                                        return { ...prev, gasEntries: updatedEntries };
                                      });
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                    aria-label="Remove gas entry"
                                    title="Remove"
                                  >
                                    <FiTrash2 size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Test Results Section */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-700">Test Results</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setCompleteForm(prev => ({
                            ...prev,
                            testEntries: [
                              ...prev.testEntries,
                              { testSensor: '', testSpan: '', testResult: 'Pass' }
                            ]
                          }));
                        }}
                        className="flex items-center text-blue-600 hover:text-blue-800 text-xs"
                        aria-label="Add new test result"
                        title="Add test result"
                      >
                        <FiPlus className="mr-1" size={14} /> Add Test Result
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">No</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Sensor</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Span</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Result</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {completeForm.testEntries.map((testEntry, index) => (
                            <tr key={`test-${index}`}>
                              <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">{index + 1}</td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  name="testSensor"
                                  value={testEntry.testSensor}
                                  onChange={(e) => handleCompleteFormChange(e, index)}
                                  required
                                  className="w-full p-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                  placeholder="H2S"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  name="testSpan"
                                  value={testEntry.testSpan}
                                  onChange={(e) => handleCompleteFormChange(e, index)}
                                  required
                                  className="w-full p-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                  placeholder="25 ppm"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <div className="flex items-center space-x-2">
                                  <label className="inline-flex items-center">
                                    <input
                                      type="radio"
                                      name={`testResult-${index}`}
                                      checked={testEntry.testResult === 'Pass'}
                                      onChange={() => {
                                        setCompleteForm(prev => {
                                          const updatedTestEntries = [...prev.testEntries];
                                          updatedTestEntries[index] = { 
                                            ...updatedTestEntries[index], 
                                            testResult: 'Pass' 
                                          };
                                          return { ...prev, testEntries: updatedTestEntries };
                                        });
                                      }}
                                      className="form-radio h-3 w-3 text-green-600"
                                    />
                                    <span className="ml-1 text-xs">Pass</span>
                                  </label>
                                  <label className="inline-flex items-center">
                                    <input
                                      type="radio"
                                      name={`testResult-${index}`}
                                      checked={testEntry.testResult === 'Fail'}
                                      onChange={() => {
                                        setCompleteForm(prev => {
                                          const updatedTestEntries = [...prev.testEntries];
                                          updatedTestEntries[index] = { 
                                            ...updatedTestEntries[index], 
                                            testResult: 'Fail' 
                                          };
                                          return { ...prev, testEntries: updatedTestEntries };
                                        });
                                      }}
                                      className="form-radio h-3 w-3 text-red-600"
                                    />
                                    <span className="ml-1 text-xs">Fail</span>
                                  </label>
                                </div>
                              </td>
                              <td className="px-2 py-1 text-right">
                                {completeForm.testEntries.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCompleteForm(prev => {
                                        const updatedEntries = [...prev.testEntries];
                                        updatedEntries.splice(index, 1);
                                        return { ...prev, testEntries: updatedEntries };
                                      });
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                    aria-label="Remove test entry"
                                    title="Remove"
                                  >
                                    <FiTrash2 size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Notes Section */}
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                      id="notes"
                      name="notes"
                      value={completeForm.notes}
                      onChange={(e) => handleCompleteFormChange(e)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                      placeholder="Enter any additional notes"
                  ></textarea>
                </div>
                
                  <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={closeCompleteModal}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                      className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm"
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
                  </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedCalibration && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center bg-green-600 text-white px-4 py-3 sticky top-0 z-10">
                <h3 className="text-lg font-semibold">Delete Calibration</h3>
                <button onClick={closeDeleteModal} className="text-white hover:text-gray-200" aria-label="Close">
                  <FiX size={20} />
                </button>
                </div>
                
              <div className="p-4 overflow-y-auto max-h-[calc(90vh-56px)]">
                <div className="flex flex-col items-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mt-4">
                    Delete Calibration
                </h3>
              </div>
                
                <div className="text-sm text-gray-500 mb-6">
                  Are you sure you want to delete the calibration for {selectedCalibration.item?.name || "this item"}? 
                  This action cannot be undone and will delete all related data including certificates.
                </div>
                
                <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm"
                    onClick={closeDeleteModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm"
                    onClick={handleDeleteCalibration}
                    disabled={actionInProgress}
                  >
                    {actionInProgress ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Certificate Modal */}
        {showEditCertificateModal && selectedCalibration && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex justify-between items-center bg-green-600 text-white px-4 py-3 sticky top-0 z-10">
                <h2 className="text-lg font-semibold">Edit Calibration Certificate</h2>
                <button 
                  onClick={closeEditCertificateModal} 
                  className="text-white hover:text-gray-200"
                  aria-label="Close modal"
                  title="Close edit certificate form"
                >
                  <FiX size={20} />
                </button>
              </div>
              
              <div className="overflow-y-auto flex-grow p-4 max-h-[calc(90vh-56px)]">
                <p className="text-sm mb-4">Edit calibration certificate for: <strong>{selectedCalibration.item ? selectedCalibration.item.name : 'Item not available'}</strong></p>
              
                <form onSubmit={handleUpdateCertificate} className="space-y-4">
                  {/* Certificate Information */}
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Certificate Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="certificateNumber" className="block text-sm font-medium text-gray-700 mb-1">Certificate Number</label>
                        <input
                          type="text"
                          id="certificateNumber"
                          name="certificateNumber"
                          value={certificateData.certificateNumber}
                          onChange={handleCertificateFormChange}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          placeholder="Enter certificate number"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="calibrationDate" className="block text-sm font-medium text-gray-700 mb-1">Calibration Date</label>
                        <input
                          type="date"
                          id="calibrationDate"
                          name="calibrationDate"
                          value={certificateData.calibrationDate}
                          onChange={handleCertificateFormChange}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                        <input
                          type="date"
                          id="validUntil"
                          name="validUntil"
                          value={certificateData.validUntil}
                          onChange={handleCertificateFormChange}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Vendor Information */}
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Vendor Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg">
                      <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Vendor</label>
                        <div className="bg-gray-100 border border-gray-300 text-gray-700 text-sm rounded-md p-2">
                          {certificateData.vendorName || 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Address</label>
                        <div className="bg-gray-100 border border-gray-300 text-gray-700 text-sm rounded-md p-2">
                          {certificateData.vendorAddress || 'Not specified'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Instrument Details */}
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Instrument Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="instrumentName" className="block text-sm font-medium text-gray-700 mb-1">Instrument</label>
                        <input
                          type="text"
                          id="instrumentName"
                          name="instrumentName"
                          value={certificateData.instrumentName}
                          onChange={handleCertificateFormChange}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          placeholder="MeshGuard H2S"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="modelNumber" className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                        <input
                          type="text"
                          id="modelNumber"
                          name="modelNumber"
                          value={certificateData.modelNumber}
                          onChange={handleCertificateFormChange}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          placeholder="FTD 2000 S"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="configuration" className="block text-sm font-medium text-gray-700 mb-1">Configuration</label>
                        <input
                          type="text"
                          id="configuration"
                          name="configuration"
                          value={certificateData.configuration}
                          onChange={handleCertificateFormChange}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          placeholder="H2S"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="approvedBy" className="block text-sm font-medium text-gray-700 mb-1">Approved By</label>
                        <input
                          type="text"
                          id="approvedBy"
                          name="approvedBy"
                          value={certificateData.approvedBy}
                          onChange={handleCertificateFormChange}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Calibration Gases Section with Multiple Entries */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-700">Calibration Gases</h3>
                      <button
                        type="button"
                        onClick={addGasEntry}
                        className="flex items-center text-blue-600 hover:text-blue-800 text-xs"
                        aria-label="Add new gas entry"
                        title="Add gas entry"
                      >
                        <FiPlus className="mr-1" size={14} /> Add Gas
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">No</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Gas Type</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Concentration</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Balance</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Batch No.</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {certificateData.gasEntries.map((gasEntry, index) => (
                            <tr key={`gas-${index}`}>
                              <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">{index + 1}</td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  name="gasType"
                                  value={gasEntry.gasType}
                                  onChange={(e) => handleCertificateFormChange(e, index, 'gas')}
                                  required
                                  className="w-full p-1 text-xs border border-gray-300 rounded-md"
                                  placeholder="H2S"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  name="gasConcentration"
                                  value={gasEntry.gasConcentration}
                                  onChange={(e) => handleCertificateFormChange(e, index, 'gas')}
                                  required
                                  className="w-full p-1 text-xs border border-gray-300 rounded-md"
                                  placeholder="25 ppm"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  name="gasBalance"
                                  value={gasEntry.gasBalance}
                                  onChange={(e) => handleCertificateFormChange(e, index, 'gas')}
                                  required
                                  className="w-full p-1 text-xs border border-gray-300 rounded-md"
                                  placeholder="Nitrogen"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  name="gasBatchNumber"
                                  value={gasEntry.gasBatchNumber}
                                  onChange={(e) => handleCertificateFormChange(e, index, 'gas')}
                                  required
                                  className="w-full p-1 text-xs border border-gray-300 rounded-md"
                                  placeholder="WO261451-1"
                                />
                              </td>
                              <td className="px-2 py-1 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeGasEntry(index)}
                                  disabled={certificateData.gasEntries.length <= 1}
                                  className={`p-1 rounded-full ${certificateData.gasEntries.length <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                                  aria-label="Remove gas entry"
                                  title="Remove gas entry"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Test Results Section with Multiple Entries */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-700">Test Results</h3>
                      <button
                        type="button"
                        onClick={addTestEntry}
                        className="flex items-center text-blue-600 hover:text-blue-800 text-xs"
                        aria-label="Add new test entry"
                        title="Add test result"
                      >
                        <FiPlus className="mr-1" size={14} /> Add Test
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">No</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Sensor</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Span</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Result</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {certificateData.testEntries.map((testEntry, index) => (
                            <tr key={`test-${index}`}>
                              <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">{index + 1}</td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  name="testSensor"
                                  value={testEntry.testSensor}
                                  onChange={(e) => handleCertificateFormChange(e, index, 'test')}
                                  required
                                  className="w-full p-1 text-xs border border-gray-300 rounded-md"
                                  placeholder="H2S"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  name="testSpan"
                                  value={testEntry.testSpan}
                                  onChange={(e) => handleCertificateFormChange(e, index, 'test')}
                                  required
                                  className="w-full p-1 text-xs border border-gray-300 rounded-md"
                                  placeholder="25 ppm"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <select
                                  name="testResult"
                                  value={testEntry.testResult}
                                  onChange={(e) => handleCertificateFormChange(e, index, 'test')}
                                  required
                                  className="w-full p-1 text-xs border border-gray-300 rounded-md"
                                  aria-label={`Test result for ${testEntry.testSensor || 'entry'} ${index + 1}`}
                                >
                                  <option value="Pass">Pass</option>
                                  <option value="Fail">Fail</option>
                                </select>
                              </td>
                              <td className="px-2 py-1 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeTestEntry(index)}
                                  disabled={certificateData.testEntries.length <= 1}
                                  className={`p-1 rounded-full ${certificateData.testEntries.length <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                                  aria-label="Remove test entry"
                                  title="Remove test entry"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    <button
                      type="button"
                      onClick={closeEditCertificateModal}
                      className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                      disabled={actionInProgress}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      disabled={actionInProgress}
                    >
                      {actionInProgress ? (
                        <>
                          <svg className="inline w-4 h-4 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        
        {/* New Calibration Modal */}
        {showCalibrationModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-center bg-green-600 text-white px-4 py-3 sticky top-0 z-10">
                <h2 className="text-lg font-semibold">New Calibration</h2>
                <button 
                  onClick={closeCalibrationModal} 
                  className="text-white hover:text-gray-200"
                  aria-label="Close modal"
                  title="Close calibration form"
                >
                  <FiX size={20} />
                </button>
              </div>
              
              {/* Form */}
              <form onSubmit={handleCalibrationSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-56px)]">
                <div className="grid grid-cols-1 gap-4">
                  {/* Item Details */}
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Item Details</h3>

                    {/* Item Selection */}
                    <div className="mb-3" ref={itemSearchRef}>
                      <label className="block mb-1 text-sm font-medium text-gray-700" id="item-label">Item</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={itemSearch}
                          onChange={(e) => setItemSearch(e.target.value)}
                          placeholder="Search for item by name or serial number"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                          aria-labelledby="item-label"
                          onFocus={() => itemSearch.length >= 2 && setShowItemSuggestions(true)}
                        />
                        
                        {/* Show selected item if any */}
                        {calibrationForm.itemSerial && (
                          <div className="mt-2 p-2 border border-green-200 bg-green-50 rounded-md">
                            <p className="font-medium text-sm">
                              {items.find(item => item.serialNumber === calibrationForm.itemSerial)?.name || "Selected Item"}
                            </p>
                            <p className="text-xs text-gray-600">
                              SN: {calibrationForm.itemSerial}
                            </p>
                          </div>
                        )}
                        
                        {/* Suggestions dropdown */}
                        {showItemSuggestions && (
                          <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {filteredItems.length > 0 ? (
                              <ul className="py-1">
                                {filteredItems.map((item) => (
                                  <li 
                                    key={item.serialNumber}
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleItemSelect(item)}
                                  >
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-sm text-gray-600">SN: {item.serialNumber}</div>
                                      </div>
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800`}>
                                        Available
                                      </span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="p-4 text-center text-gray-500">
                                No matching items found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {!calibrationForm.itemSerial && (
                        <p className="text-xs text-gray-500 mt-1">Search and select an item for calibration</p>
                      )}
                    </div>

                    {/* Other Inputs */}
                    <div className="mb-3">
                      <label className="block mb-1 text-sm font-medium text-gray-700">Nama Produk</label>
                      <input
                        type="text"
                        name="manufacturer"
                        value={calibrationForm.manufacturer}
                        onChange={handleCalibrationFormChange}
                        placeholder="RAE Systems"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="block mb-1 text-sm font-medium text-gray-700">Part Number</label>
                      <input
                        type="text"
                        name="instrumentName"
                        value={calibrationForm.instrumentName}
                        onChange={handleCalibrationFormChange}
                        placeholder="MeshGuard H2S"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="block mb-1 text-sm font-medium text-gray-700">Configuration</label>
                      <input
                        type="text"
                        name="configuration"
                        value={calibrationForm.configuration}
                        onChange={handleCalibrationFormChange}
                        placeholder="H2S, O2, CO, dll"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    {/* Date */}
                    <div className="mb-3">
                      <label className="block mb-1 text-sm font-medium text-gray-700" id="calibration-date-label">Calibration Date</label>
                      <input
                        type="date"
                        name="calibrationDate"
                        value={calibrationForm.calibrationDate}
                        onChange={handleCalibrationFormChange}
                        required
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        aria-labelledby="calibration-date-label"
                        title="Select the calibration date"
                      />
                    </div>
                  </div>

                  {/* Vendor Details */}
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Vendor Details</h3>

                    {/* Vendor */}
                    <div className="mb-3" ref={vendorSearchRef}>
                      <label className="block mb-1 text-sm font-medium text-gray-700" id="vendor-label">Vendor</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={vendorSearch}
                          onChange={(e) => setVendorSearch(e.target.value)}
                          placeholder="Search for vendor by name"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                          aria-labelledby="vendor-label"
                          onFocus={() => vendorSearch.length >= 2 && setShowVendorSuggestions(true)}
                        />
                        
                        {/* Show selected vendor if any */}
                        {calibrationForm.vendorId && (
                          <div className="mt-2 p-2 border border-green-200 bg-green-50 rounded-md">
                            <p className="font-medium text-sm">
                              {vendors.find(vendor => vendor.id === calibrationForm.vendorId)?.name || "Selected Vendor"}
                            </p>
                            {vendors.find(vendor => vendor.id === calibrationForm.vendorId)?.contactName && (
                              <p className="text-xs text-gray-600">
                                Contact: {vendors.find(vendor => vendor.id === calibrationForm.vendorId)?.contactName}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Suggestions dropdown */}
                        {showVendorSuggestions && (
                          <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {filteredVendors.length > 0 ? (
                              <ul className="py-1">
                                {filteredVendors.map((vendor) => (
                                  <li 
                                    key={vendor.id}
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleVendorSelect(vendor)}
                                  >
                                    <div>
                                      <div className="font-medium">{vendor.name}</div>
                                      {vendor.contactName && (
                                        <div className="text-sm text-gray-600">Contact: {vendor.contactName}</div>
                                      )}
                                      {vendor.contactPhone && (
                                        <div className="text-xs text-gray-500">Phone: {vendor.contactPhone}</div>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="p-4 text-center text-gray-500">
                                No matching vendors found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {!calibrationForm.vendorId && (
                        <p className="text-xs text-gray-500 mt-1">Search and select a vendor for calibration</p>
                      )}
                    </div>

                    {/* Fax */}
                    <div className="mb-3">
                      <label className="block mb-1 text-sm font-medium text-gray-700">Fax</label>
                      <input
                        type="text"
                        name="fax"
                        value={calibrationForm.fax}
                        onChange={handleCalibrationFormChange}
                        placeholder="Fax number"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">Notes</label>
                      <textarea
                        name="notes"
                        value={calibrationForm.notes}
                        onChange={handleCalibrationFormChange}
                        placeholder="Additional notes"
                        rows={3}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      ></textarea>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="mt-6 flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={closeCalibrationModal}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                  >
                      Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                  >
                    Start Calibration
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