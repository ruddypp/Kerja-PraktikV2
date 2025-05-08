'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [itemSearch, setItemSearch] = useState('');
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const itemSearchRef = useRef<HTMLDivElement>(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const vendorSearchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  // Simplified form for direct calibration
  const [calibrationForm, setCalibrationForm] = useState({
    itemSerial: '',
    vendorId: '',
    
    // Form fields tambahan sesuai alur - field address dan phone tetap ada
    // dalam state tetapi tidak ditampilkan di UI
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
      const response = await fetch('/api/vendors', {
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
    
    // We'll handle itemSerial selection in the handleItemSelect function instead
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
  
  const handleItemSelect = (item: Item) => {
    setItemSearch(''); // Clear search
    setShowItemSuggestions(false);
    
    // Set the selected item in the form
    setCalibrationForm(prev => ({
      ...prev,
      itemSerial: item.serialNumber,
      manufacturer: item.name || '', // Nama produk sebagai manufacturer
      instrumentName: item.partNumber || '', // Part number sebagai instrument name
      modelNumber: item.sensor || '', // Sensor sebagai model number
      configuration: '' // Dibiarkan kosong untuk diisi pengguna
    }));
  };
  
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
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-title text-xl md:text-2xl">Calibration Management</h1>
          <button 
            onClick={openCalibrationModal}
            className="btn btn-primary flex items-center"
            aria-label="Create new calibration"
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
<div className="bg-white rounded-2xl shadow-md p-6 mb-6">
  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
    {/* Status */}
    <div>
      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
      <select
        id="status"
        name="status"
        value={filters.status}
        onChange={handleFilterChange}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
      >
        <option value="">All Statuses</option>
        {Object.values(RequestStatus).map(status => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
    </div>

    {/* Item */}
    <div>
      <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">Item</label>
      <input
        type="text"
        id="item"
        name="item"
        placeholder="Search by name or serial"
        value={filters.item}
        onChange={handleFilterChange}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
      />
            </div>

    {/* From Date */}
    <div>
      <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
      <input
        type="date"
        id="dateFrom"
        name="dateFrom"
        value={filters.dateFrom}
        onChange={handleFilterChange}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
      />
            </div>

    {/* To Date */}
    <div>
      <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
      <input
        type="date"
        id="dateTo"
        name="dateTo"
        value={filters.dateTo}
        onChange={handleFilterChange}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
      />
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
  <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center bg-green-600 text-white px-4 py-3 rounded-t-lg">
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
      <form onSubmit={handleCalibrationSubmit} className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Item Details */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700">Item Details</h3>

            {/* Item Selection */}
            <div className="space-y-2" ref={itemSearchRef}>
              <label className="block mb-1 text-sm font-medium text-gray-700" id="item-label">Item</label>
              <div className="relative">
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Search for item by name or serial number"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
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
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-y-auto">
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
            {[
              { name: 'manufacturer', placeholder: 'RAE Systems', label: 'Nama Produk' },
              { name: 'instrumentName', placeholder: 'MeshGuard H2S', label: 'Part Number' },
              { name: 'modelNumber', placeholder: 'FTD 2000 S', label: 'Sensor' },
              { name: 'configuration', placeholder: 'H2S, O2, CO, dll', label: 'Configuration' },
            ].map(({ name, label, placeholder }) => (
              <div key={name}>
                <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
                <input
                  type="text"
                  name={name}
                  value={calibrationForm[name]}
                  onChange={handleCalibrationFormChange}
                  placeholder={placeholder}
                  className="form-input w-full text-sm"
                />
              </div>
            ))}

            {/* Date */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700" id="calibration-date-label">Calibration Date</label>
              <input
                type="date"
                name="calibrationDate"
                value={calibrationForm.calibrationDate}
                onChange={handleCalibrationFormChange}
                required
                className="form-input w-full text-sm"
                aria-labelledby="calibration-date-label"
                title="Select the calibration date"
              />
            </div>
          </div>

          {/* Right: Vendor Details */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700">Vendor Details</h3>

            {/* Vendor */}
            <div className="space-y-2" ref={vendorSearchRef}>
              <label className="block mb-1 text-sm font-medium text-gray-700" id="vendor-label">Vendor</label>
              <div className="relative">
                <input
                  type="text"
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  placeholder="Search for vendor by name"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
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
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-y-auto">
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

            {/* Other Inputs - Tampilkan hanya fax */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Fax</label>
              <input
                type="text"
                name="fax"
                value={calibrationForm.fax}
                onChange={handleCalibrationFormChange}
                placeholder="Fax number"
                className="form-input w-full text-sm"
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
                rows={2}
                className="form-input w-full text-sm"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-4 flex justify-end gap-2">
                  <button 
                    type="button" 
            onClick={closeCalibrationModal}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
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
  <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-2">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl h-5/6 flex flex-col overflow-hidden">
      <div className="flex justify-between items-center bg-green-600 text-white px-4 py-3">
        <h2 className="text-lg font-semibold">Complete Calibration</h2>
        <button 
          onClick={closeCompleteModal} 
          className="text-white"
          aria-label="Close modal"
          title="Close complete calibration form"
        >
          <FiX size={20} />
        </button>
      </div>
      
      <div className="overflow-y-auto flex-grow">
        <form onSubmit={handleCompleteSubmit} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700">Calibration Gases</h3>
              
              <div className="border rounded-lg p-3">
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium text-gray-900">Gas Type</label>
                  <input
                    type="text"
                    name="gasType"
                    value={completeForm.gasType}
                    onChange={handleCompleteFormChange}
                    required
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                    placeholder="Contoh: Hydrogen Sulphide (H2S)"
                  />
                </div>
                
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium text-gray-900">Concentration</label>
                  <input
                    type="text"
                    name="gasConcentration"
                    value={completeForm.gasConcentration}
                    onChange={handleCompleteFormChange}
                    required
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                    placeholder="Contoh: 25 ppm"
                  />
                </div>
                
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium text-gray-900">Balance</label>
                  <input
                    type="text"
                    name="gasBalance"
                    value={completeForm.gasBalance}
                    onChange={handleCompleteFormChange}
                    required
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                    placeholder="Contoh: Nitrogen"
                  />
                </div>
                
                  <div>
                  <label className="block mb-1 text-sm font-medium text-gray-900">Batch/Lot No.</label>
                  <input
                    type="text"
                    name="gasBatchNumber"
                    value={completeForm.gasBatchNumber}
                    onChange={handleCompleteFormChange}
                    required
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                    placeholder="Contoh: WO261451-1"
                  />
                  </div>
                </div>
              
              <h3 className="font-medium text-gray-700">Instrument Details</h3>
              
              <div className="border rounded-lg p-3">
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium text-gray-900">Instrument Name</label>
                  <input
                    type="text"
                    name="instrumentName"
                    value={completeForm.instrumentName}
                    onChange={handleCompleteFormChange}
                    required
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                    placeholder="Contoh: Digital Multimeter"
                  />
              </div>
              
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium text-gray-900">Model Number</label>
                  <input
                    type="text"
                    name="modelNumber"
                    value={completeForm.modelNumber}
                    onChange={handleCompleteFormChange}
                    required
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                    placeholder="Contoh: DMM-X500"
                  />
                </div>
                
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-900">Configuration</label>
                  <input
                    type="text"
                    name="configuration"
                    value={completeForm.configuration}
                    onChange={handleCompleteFormChange}
                    required
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                    placeholder="Contoh: Electronic"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700">Test Results</h3>
              
              <div className="border rounded-lg p-3">
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium text-gray-900">Sensor</label>
                  <input
                    type="text"
                    name="testSensor"
                    value={completeForm.testSensor}
                    onChange={handleCompleteFormChange}
                    required
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                    placeholder="Contoh: Hydrogen Sulphide (H2S)"
                  />
                </div>
                
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium text-gray-900">Span</label>
                  <input
                    type="text"
                    name="testSpan"
                    value={completeForm.testSpan}
                    onChange={handleCompleteFormChange}
                    required
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                    placeholder="Contoh: 25 ppm"
                  />
                </div>
                
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-900">Test Result</label>
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
                      <span className="ml-2 text-sm">Pass</span>
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
                      <span className="ml-2 text-sm">Fail</span>
                    </label>
                  </div>
                </div>
              </div>
            
              <h3 className="font-medium text-gray-700">Certificate Information</h3>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900">Approved By</label>
                <input
                  type="text"
                  name="approvedBy"
                  value={completeForm.approvedBy}
                  onChange={handleCompleteFormChange}
                  required
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                  placeholder="Contoh: Fachmi R.F"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900" id="valid-until-label">Valid Until</label>
                <input
                  type="date"
                  name="validUntil"
                  value={completeForm.validUntil}
                  onChange={handleCompleteFormChange}
                  required
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                  aria-labelledby="valid-until-label"
                  title="Select the date until which the calibration is valid"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900">Notes</label>
                <textarea
                  name="notes"
                  value={completeForm.notes}
                  onChange={handleCompleteFormChange}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                  placeholder="This instrument has been calibrated using valid calibration gases and instrument manual operation procedure."
                  rows={3}
                ></textarea>
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                <p className="text-xs text-yellow-700">
                  <strong>Note:</strong> Once you complete this calibration, a certificate will be generated automatically. 
                  You will be able to download it after completion.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end space-x-2">
                <button
              type="button"
              onClick={closeCompleteModal}
              className="px-3 py-1.5 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              Complete Calibration & Generate Certificate
                </button>
          </div>
        </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}