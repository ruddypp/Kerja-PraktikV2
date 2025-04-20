'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { FiPlus, FiFileText, FiDownload, FiX, FiSearch } from 'react-icons/fi';

// Define Types and Interfaces
enum RequestStatus {
  PENDING = 'PENDING', // Status di database - akan ditampilkan sebagai IN_CALIBRATION di UI
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

enum ItemStatus {
  AVAILABLE = 'AVAILABLE',
  IN_CALIBRATION = 'IN_CALIBRATION',
  RENTED = 'RENTED',
  IN_MAINTENANCE = 'IN_MAINTENANCE'
}

interface Item {
  serialNumber: string;
  name: string;
  partNumber: string;
  status: ItemStatus;
  sensor?: string;
}

interface Vendor {
  id: string;
  name: string;
  contactName?: string;
  contactPhone?: string;
}

interface StatusLog {
  id: string;
  status: RequestStatus;
  notes: string | null;
  createdAt: string;
  changedBy: {
    id: string;
  name: string;
  };
}

interface Calibration {
  id: string;
  itemSerial: string;
  userId: string;
  status: RequestStatus | string;
  calibrationDate: string;
  validUntil: string | null;
  
  // Informasi Sertifikat
  certificateNumber: string | null;
  certificateUrl: string | null;
  
  // Detail Gas Kalibrasi
  gasType: string | null;
  gasConcentration: string | null;
  gasBalance: string | null;
  gasBatchNumber: string | null;
  
  // Hasil Test
  testSensor: string | null;
  testSpan: string | null;
  testResult: string | null;
  
  // Detail Alat
  manufacturer: string | null;
  instrumentName: string | null;
  modelNumber: string | null;
  configuration: string | null;
  
  // Approval
  approvedBy: string | null;
  
  // Misc
  createdAt: string;
  updatedAt: string;
  item: Item;
  vendor: Vendor;
  statusLogs: StatusLog[];
  notes: string | null;
}

export default function UserCalibrationPage() {
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedCalibration, setSelectedCalibration] = useState<Calibration | null>(null);
  const router = useRouter();
  
  // Simplified form for direct calibration
  const [calibrationForm, setCalibrationForm] = useState({
    itemSerial: '',
    vendorId: '',
    
    // Form fields tambahan sesuai alur
    address: '',
    phone: '',
    fax: '',
    
    // Detail alat (dapat diisi otomatis dari item yang dipilih)
    manufacturer: '',
    instrumentName: '',
    modelNumber: '',
    configuration: '',
    
    // Tanggal kalibrasi
    calibrationDate: format(new Date(), 'yyyy-MM-dd'),
    
    notes: ''
  });
  
  // Complete calibration form
  const [completeForm, setCompleteForm] = useState({
    id: '',
    // Detail Gas Kalibrasi
    gasType: '',
    gasConcentration: '',
    gasBalance: '',
    gasBatchNumber: '',
    
    // Hasil Test
    testSensor: '',
    testSpan: '',
    testResult: 'Pass' as 'Pass' | 'Fail',
    
    // Detail Alat - tambahkan fields baru
    instrumentName: '',
    modelNumber: '',
    configuration: '',
    
    // Approval
    approvedBy: '',
    
    // Valid Until - default 1 tahun dari tanggal kalibrasi jika belum diisi
    validUntil: format(new Date(Date.now() + 365*24*60*60*1000), 'yyyy-MM-dd'),
    
    // Notes
    notes: ''
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    item: '',
    dateFrom: '',
    dateTo: ''
  });
  
  useEffect(() => {
    fetchCalibrations();
    fetchAvailableItems();
    fetchVendors();
  }, []);
  
  const fetchCalibrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/calibrations', {
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
      
      // Validate that data is an array
      if (Array.isArray(data)) {
      setCalibrations(data);
      } else if (data && typeof data === 'object' && Array.isArray(data.calibrations)) {
        // Handle if API returns { calibrations: [...] }
        setCalibrations(data.calibrations);
      } else {
        // Set to empty array if format is unknown
        console.error('Unexpected data format from calibrations API:', data);
        setCalibrations([]);
      }
      
      setError('');
    } catch (err) {
      console.error('Error fetching calibrations:', err);
      setError('Failed to load calibration requests. Please try refreshing the page.');
      setCalibrations([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAvailableItems = async () => {
    try {
      const res = await fetch('/api/user/items?status=AVAILABLE', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
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
      setItems([]); // Set empty array sebagai fallback
    }
  };
  
  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/user/vendors', {
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
  
  const handleCalibrationFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setCalibrationForm(prev => ({ ...prev, [name]: value }));
    
    // Jika memilih item, isi otomatis data item
    if (name === 'itemSerial') {
      const selectedItem = items.find(item => item.serialNumber === value);
      if (selectedItem) {
        setCalibrationForm(prev => ({
          ...prev,
          manufacturer: selectedItem.name || '', // Nama produk sebagai manufacturer
          instrumentName: selectedItem.partNumber || '', // Part number sebagai instrument name
          modelNumber: selectedItem.sensor || '', // Sensor sebagai model number
          configuration: '' // Dibiarkan kosong untuk diisi pengguna
        }));
      }
    }
  };
  
  const openCalibrationModal = () => {
    if (!items || items.length === 0) {
      fetchAvailableItems();
    }
    
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
  
  const closeCalibrationModal = () => {
    setShowCalibrationModal(false);
  };
  
  const openCertificateModal = (calibration: Calibration) => {
    setSelectedCalibration(calibration);
    setShowCertificateModal(true);
  };
  
  const closeCertificateModal = () => {
    setShowCertificateModal(false);
    setSelectedCalibration(null);
  };
  
  const handleCalibrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
        throw new Error(errorData.error || 'Failed to create calibration');
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
    } catch (err: any) {
      console.error('Error creating calibration:', err);
      setError(err.message || 'Failed to create calibration request');
    }
  };
  
  const isStatusMatching = (status: any, target: RequestStatus) => {
    // Handle both string and enum comparison
    if (typeof status === 'string') {
      return status === target;
    }
    return status === target;
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const resetFilters = () => {
    setFilters({
      status: '',
      item: '',
      dateFrom: '',
      dateTo: ''
    });
  };
  
  // Apply filters to calibrations
  const filteredCalibrations = Array.isArray(calibrations) 
    ? calibrations.filter(calibration => {
        // Status filter
        if (filters.status && calibration.status !== filters.status) {
          return false;
        }
        
        // Item filter
        if (filters.item && !calibration.item.name.toLowerCase().includes(filters.item.toLowerCase()) &&
            !calibration.item.serialNumber.toLowerCase().includes(filters.item.toLowerCase())) {
          return false;
        }
        
        // Date range filter
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          const calibrationDate = new Date(calibration.calibrationDate);
          if (calibrationDate < fromDate) {
            return false;
          }
        }
        
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59); // End of the day
          const calibrationDate = new Date(calibration.calibrationDate);
          if (calibrationDate > toDate) {
            return false;
          }
        }
        
        return true;
      })
    : [];
  
  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd MMM yyyy');
  };
  
  // Konversi status dari database ke tampilan UI
  const getDisplayStatus = (status: RequestStatus | string): string => {
    if (status === RequestStatus.PENDING || status === 'PENDING') {
      return 'IN_CALIBRATION'; // PENDING ditampilkan sebagai IN_CALIBRATION
    }
    return status.toString();
  };
  
  // Get status badge style based on status
  const getStatusBadgeStyle = (status: RequestStatus | string) => {
    switch (status) {
      case RequestStatus.PENDING:
      case 'PENDING':
        return 'bg-purple-100 text-purple-800'; // PENDING ditampilkan dengan warna IN_CALIBRATION
      case RequestStatus.COMPLETED:
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case RequestStatus.CANCELLED:
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Function to open the complete calibration modal
  const openCompleteModal = (calibration: Calibration) => {
    if (!calibration) return;
    
    setSelectedCalibration(calibration);
    setCompleteForm({
      id: calibration.id,
      
      // Detail Gas Kalibrasi
      gasType: calibration.gasType || '',
      gasConcentration: calibration.gasConcentration || '',
      gasBalance: calibration.gasBalance || '',
      gasBatchNumber: calibration.gasBatchNumber || '',
      
      // Hasil Test
      testSensor: calibration.testSensor || '',
      testSpan: calibration.testSpan || '',
      testResult: (calibration.testResult as 'Pass' | 'Fail') || 'Pass',
      
      // Detail Alat - tambahkan fields baru
      instrumentName: calibration.instrumentName || 'Digital Multimeter', // Default examples
      modelNumber: calibration.modelNumber || 'DMM-X500',
      configuration: calibration.configuration || 'Electronic',
      
      // Approval
      approvedBy: calibration.approvedBy || '',
      
      // Valid Until - default 1 tahun dari tanggal kalibrasi jika belum diisi
      validUntil: calibration.validUntil ? 
        format(new Date(calibration.validUntil), 'yyyy-MM-dd') : 
        format(new Date(Date.now() + 365*24*60*60*1000), 'yyyy-MM-dd'),
      
      // Notes
      notes: calibration.notes || ''
    });
    
    setShowCompleteModal(true);
  };
  
  // Function to close the complete calibration modal
  const closeCompleteModal = () => {
    setShowCompleteModal(false);
    setSelectedCalibration(null);
  };
  
  // Handle changes in the complete form
  const handleCompleteFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setCompleteForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle the submission of the complete calibration form
  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Submitting calibration completion form:', completeForm);
    
    try {
      const response = await fetch(`/api/user/calibrations`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeForm),
        credentials: 'include'
      });
      
      // Get response details for debugging
      console.log('Response status:', response.status);
      
      // Try to get text first to debug any issues
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let data;
      try {
        // Parse the text response as JSON
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', responseText);
        throw new Error('Server returned invalid response format');
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete calibration');
      }
      
      setSuccess('Calibration completed successfully. Certificate has been generated.');
      setCalibrations(prev => prev.map(c => c.id === data.id ? data : c));
      closeCompleteModal();
      
      // Refresh data
      fetchCalibrations();
    } catch (err: any) {
      console.error('Error completing calibration:', err);
      setError(err.message || 'Failed to complete calibration');
    }
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-title text-xl md:text-2xl">Calibration Management</h1>
          <button 
            onClick={openCalibrationModal}
            className="btn btn-primary flex items-center"
          >
            <FiPlus className="mr-2" /> New Calibration
          </button>
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
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/4">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {Object.values(RequestStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            
            <div className="w-full md:w-1/4">
              <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">Item</label>
              <input
                type="text"
                id="item"
                name="item"
                placeholder="Search by name or serial"
                value={filters.item}
                onChange={handleFilterChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div className="w-full md:w-1/4">
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                id="dateFrom"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div className="w-full md:w-1/4">
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                id="dateTo"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              </div>
            
            <button
              onClick={resetFilters}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md transition-colors duration-150 ease-in-out whitespace-nowrap"
            >
              Reset Filters
            </button>
            </div>
        </div>
        
        {/* All Calibrations Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">My Calibrations</h2>
          
          {loading ? (
            <div className="bg-white p-8 rounded-lg shadow flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredCalibrations.length === 0 ? (
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
                      Certificate
                    </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(filteredCalibrations) && filteredCalibrations.map((calibration) => (
                      <tr key={calibration.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {calibration.item.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {calibration.item.serialNumber}
                            </div>
                          </div>
                        </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{calibration.vendor.name}</div>
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(calibration.status)}`}>
                          {getDisplayStatus(calibration.status)}
                        </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(calibration.calibrationDate)}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(calibration.validUntil)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isStatusMatching(calibration.status, RequestStatus.COMPLETED) ? (
                            <button
                              onClick={() => openCertificateModal(calibration)}
                              className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                            >
                              <FiFileText className="mr-1" />
                              Certificate
                            </button>
                          ) : isStatusMatching(calibration.status, RequestStatus.PENDING) ? (
                            <button
                              onClick={() => openCompleteModal(calibration)}
                              className="text-green-600 hover:text-green-900 inline-flex items-center"
                            >
                              <FiFileText className="mr-1" />
                              Complete
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}
        </div>
        
        {/* Calibration Modal */}
        {showCalibrationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl overflow-hidden">
              <div className="flex justify-between items-center bg-blue-600 text-white px-6 py-4">
                <h2 className="text-xl font-bold">New Calibration</h2>
                <button onClick={closeCalibrationModal} className="text-white">
                  <FiX size={24} />
                </button>
              </div>
              
              <form onSubmit={handleCalibrationSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-700 mb-2">Item Details</h3>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Item</label>
                  <select
                        name="itemSerial"
                        value={calibrationForm.itemSerial}
                        onChange={handleCalibrationFormChange}
                    required
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      >
                        <option value="">Select Item</option>
                        {items.map((item) => (
                          <option key={item.serialNumber} value={item.serialNumber}>
                            {item.name} - {item.serialNumber}
                      </option>
                    ))}
                  </select>
                </div>
                
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Nama Produk</label>
                      <input
                        type="text"
                        name="manufacturer"
                        value={calibrationForm.manufacturer}
                        onChange={handleCalibrationFormChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        placeholder="Nama produk (contoh: RAE Systems)"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Part Number</label>
                      <input
                        type="text"
                        name="instrumentName"
                        value={calibrationForm.instrumentName}
                        onChange={handleCalibrationFormChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        placeholder="Part number (contoh: MeshGuard H2S)"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Sensor</label>
                      <input
                        type="text"
                        name="modelNumber"
                        value={calibrationForm.modelNumber}
                        onChange={handleCalibrationFormChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        placeholder="Sensor (contoh: FTD 2000 S)"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Configuration</label>
                      <input
                        type="text"
                        name="configuration"
                        value={calibrationForm.configuration}
                        onChange={handleCalibrationFormChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        placeholder="Jenis gas (contoh: H2S, O2, CO, dll)"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Calibration Date</label>
                      <input
                        type="date"
                        name="calibrationDate"
                        value={calibrationForm.calibrationDate}
                        onChange={handleCalibrationFormChange}
                        required
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-700 mb-2">Vendor Details</h3>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Vendor</label>
                  <select
                    name="vendorId"
                        value={calibrationForm.vendorId}
                        onChange={handleCalibrationFormChange}
                        required
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      >
                        <option value="">Select Vendor</option>
                        {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                            {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Address</label>
                      <input
                        type="text"
                        name="address"
                        value={calibrationForm.address}
                        onChange={handleCalibrationFormChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        placeholder="Vendor address"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Phone</label>
                      <input
                        type="text"
                        name="phone"
                        value={calibrationForm.phone}
                        onChange={handleCalibrationFormChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        placeholder="Phone number"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Fax</label>
                      <input
                        type="text"
                        name="fax"
                        value={calibrationForm.fax}
                        onChange={handleCalibrationFormChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        placeholder="Fax number"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Notes</label>
                  <textarea
                        name="notes"
                        value={calibrationForm.notes}
                        onChange={handleCalibrationFormChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        placeholder="Additional notes"
                    rows={3}
                      ></textarea>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button 
                    type="button" 
                    onClick={closeCalibrationModal}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Start Calibration
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Certificate Modal */}
        {showCertificateModal && selectedCalibration && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Calibration Certificate</h3>
                <button onClick={closeCertificateModal} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4 p-4 border border-gray-200 rounded-md">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Item Name</p>
                    <p className="font-medium">{selectedCalibration.item.name}</p>
                </div>
                  <div>
                    <p className="text-sm text-gray-500">Serial Number</p>
                    <p className="font-medium">{selectedCalibration.item.serialNumber}</p>
                </div>
                  <div>
                    <p className="text-sm text-gray-500">Calibration Date</p>
                    <p className="font-medium">{formatDate(selectedCalibration.calibrationDate)}</p>
                </div>
                  <div>
                    <p className="text-sm text-gray-500">Valid Until</p>
                    <p className="font-medium">{formatDate(selectedCalibration.validUntil)}</p>
                </div>
                  <div>
                    <p className="text-sm text-gray-500">Vendor</p>
                    <p className="font-medium">{selectedCalibration.vendor.name}</p>
                  </div>
                  {selectedCalibration.certificateNumber && (
                    <div>
                      <p className="text-sm text-gray-500">Certificate Number</p>
                      <p className="font-medium">{selectedCalibration.certificateNumber}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2">
                  {/* View certificate button */}
                  <a
                    href={`/api/user/calibrations/${selectedCalibration.id}/certificate`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary w-full flex justify-center items-center"
                  >
                    <FiFileText className="mr-2" /> View Certificate
                  </a>
                  
                  {/* Download button */}
                  <a
                    href={`/api/user/calibrations/${selectedCalibration.id}/certificate`}
                    download={`Calibration_Certificate_${selectedCalibration.item.serialNumber}.pdf`}
                    className="btn btn-secondary w-full flex justify-center items-center"
                  >
                    <FiDownload className="mr-2" /> Download Certificate
                  </a>
                </div>
                </div>
                
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeCertificateModal}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                </div>
            </div>
          </div>
        )}
        
        {/* Complete Modal */}
        {showCompleteModal && selectedCalibration && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl overflow-hidden">
              <div className="flex justify-between items-center bg-green-600 text-white px-6 py-4">
                <h2 className="text-xl font-bold">Complete Calibration</h2>
                <button onClick={closeCompleteModal} className="text-white">
                  <FiX size={24} />
                </button>
                </div>
                
              <form onSubmit={handleCompleteSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-700 mb-2">Calibration Gases</h3>
                    
                    <div className="border rounded-lg p-4">
                      <div className="mb-3">
                        <label className="block mb-2 text-sm font-medium text-gray-900">Gas Type</label>
                        <input
                          type="text"
                          name="gasType"
                          value={completeForm.gasType}
                          onChange={handleCompleteFormChange}
                          required
                          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                          placeholder="Contoh: Hydrogen Sulphide (H2S)"
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label className="block mb-2 text-sm font-medium text-gray-900">Concentration</label>
                        <input
                          type="text"
                          name="gasConcentration"
                          value={completeForm.gasConcentration}
                          onChange={handleCompleteFormChange}
                          required
                          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                          placeholder="Contoh: 25 ppm"
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label className="block mb-2 text-sm font-medium text-gray-900">Balance</label>
                        <input
                          type="text"
                          name="gasBalance"
                          value={completeForm.gasBalance}
                          onChange={handleCompleteFormChange}
                          required
                          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                          placeholder="Contoh: Nitrogen"
                        />
                      </div>
                      
                  <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900">Batch/Lot No.</label>
                        <input
                          type="text"
                          name="gasBatchNumber"
                          value={completeForm.gasBatchNumber}
                          onChange={handleCompleteFormChange}
                          required
                          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                          placeholder="Contoh: WO261451-1"
                        />
                  </div>
                </div>
                    
                    <h3 className="font-bold text-gray-700 mb-2">Instrument Details</h3>
                    
                    <div className="border rounded-lg p-4">
                      <div className="mb-3">
                        <label className="block mb-2 text-sm font-medium text-gray-900">Instrument Name</label>
                        <input
                          type="text"
                          name="instrumentName"
                          value={completeForm.instrumentName}
                          onChange={handleCompleteFormChange}
                          required
                          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                          placeholder="Contoh: Digital Multimeter"
                        />
              </div>
              
                      <div className="mb-3">
                        <label className="block mb-2 text-sm font-medium text-gray-900">Model Number</label>
                        <input
                          type="text"
                          name="modelNumber"
                          value={completeForm.modelNumber}
                          onChange={handleCompleteFormChange}
                          required
                          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                          placeholder="Contoh: DMM-X500"
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label className="block mb-2 text-sm font-medium text-gray-900">Configuration</label>
                        <input
                          type="text"
                          name="configuration"
                          value={completeForm.configuration}
                          onChange={handleCompleteFormChange}
                          required
                          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                          placeholder="Contoh: Electronic"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-700 mb-2">Test Results</h3>
                    
                    <div className="border rounded-lg p-4">
                      <div className="mb-3">
                        <label className="block mb-2 text-sm font-medium text-gray-900">Sensor</label>
                        <input
                          type="text"
                          name="testSensor"
                          value={completeForm.testSensor}
                          onChange={handleCompleteFormChange}
                          required
                          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                          placeholder="Contoh: Hydrogen Sulphide (H2S)"
                        />
              </div>
              
                      <div className="mb-3">
                        <label className="block mb-2 text-sm font-medium text-gray-900">Span</label>
                        <input
                          type="text"
                          name="testSpan"
                          value={completeForm.testSpan}
                          onChange={handleCompleteFormChange}
                          required
                          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                          placeholder="Contoh: 25 ppm"
                        />
                      </div>
                      
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900">Test Result</label>
                        <div className="flex space-x-4">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="testResult"
                              value="Pass"
                              checked={completeForm.testResult === 'Pass'}
                              onChange={handleCompleteFormChange}
                              className="form-radio h-4 w-4 text-blue-600"
                            />
                            <span className="ml-2">Pass</span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="testResult"
                              value="Fail"
                              checked={completeForm.testResult === 'Fail'}
                              onChange={handleCompleteFormChange}
                              className="form-radio h-4 w-4 text-red-600"
                            />
                            <span className="ml-2">Fail</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-700 mb-2">Certificate Information</h3>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Approved By</label>
                      <input
                        type="text"
                        name="approvedBy"
                        value={completeForm.approvedBy}
                        onChange={handleCompleteFormChange}
                        required
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        placeholder="Contoh: Fachmi R.F"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Valid Until</label>
                      <input
                        type="date"
                        name="validUntil"
                        value={completeForm.validUntil}
                        onChange={handleCompleteFormChange}
                        required
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Notes</label>
                      <textarea
                        name="notes"
                        value={completeForm.notes}
                        onChange={handleCompleteFormChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        placeholder="This instrument has been calibrated using valid calibration gases and instrument manual operation procedure."
                        rows={5}
                      ></textarea>
                    </div>
                    
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        <strong>Note:</strong> Once you complete this calibration, a certificate will be generated automatically. 
                        You will be able to download it after completion.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={closeCompleteModal}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Complete Calibration & Generate Certificate
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