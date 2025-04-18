'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { FiPlus, FiFileText, FiDownload, FiX, FiSearch } from 'react-icons/fi';

// Define Types and Interfaces
enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
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
  status: RequestStatus;
  calibrationDate: string;
  validUntil: string | null;
  certificateUrl: string | null;
  createdAt: string;
  updatedAt: string;
  item: Item;
  vendor: Vendor;
  statusLogs: StatusLog[];
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
  const [selectedCalibration, setSelectedCalibration] = useState<Calibration | null>(null);
  const router = useRouter();
  
  // Simplified form for direct calibration
  const [calibrationForm, setCalibrationForm] = useState({
    itemSerial: '',
    vendorId: '',
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
  };
  
  const openCalibrationModal = () => {
    if (!items || items.length === 0) {
      fetchAvailableItems();
    }
    
    setCalibrationForm({
      itemSerial: '',
      vendorId: '',
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
      if (!calibrationForm.itemSerial) {
        throw new Error('Please select an item for calibration');
      }
      
      if (!calibrationForm.vendorId) {
        throw new Error('Please select a vendor for calibration');
      }
      
      // Check if selected item is still available
      const selectedItem = items.find(item => item.serialNumber === calibrationForm.itemSerial);
      
      if (!selectedItem) {
        throw new Error('Selected item not found. Please try again.');
      }
      
      // Check specifically for Available status
      if (selectedItem.status !== ItemStatus.AVAILABLE) {
        throw new Error(`Item is not available for calibration. Current status: ${selectedItem.status}`);
      }
      
      const res = await fetch('/api/user/calibrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(calibrationForm)
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to submit calibration');
      }
      
      // Success
      setSuccess('Calibration submitted successfully!');
      closeCalibrationModal();
      
      // Refresh calibrations
      fetchCalibrations();
      fetchAvailableItems();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error('Error submitting calibration:', err);
      setError(err.message || 'Failed to submit calibration');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
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
  
  // Get status badge style based on status
  const getStatusBadgeStyle = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case RequestStatus.APPROVED:
        return 'bg-blue-100 text-blue-800';
      case RequestStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case RequestStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
                          {calibration.status}
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
                          ) : (
                            <span className="text-gray-400">Pending</span>
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
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">New Calibration</h3>
                <button onClick={closeCalibrationModal} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleCalibrationSubmit}>
                <div className="mb-4">
                  <label htmlFor="itemSerial" className="block text-sm font-medium text-gray-700 mb-1">
                    Item <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="itemSerial"
                    name="itemSerial"
                    value={calibrationForm.itemSerial}
                    onChange={handleCalibrationFormChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  >
                    <option value="">Select an item</option>
                    {Array.isArray(items) && items.length > 0 ? (
                      items.map((item) => (
                        <option key={item.serialNumber} value={item.serialNumber}>
                          {item.name} - {item.serialNumber}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No available items found</option>
                    )}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="vendorId"
                    name="vendorId"
                    value={calibrationForm.vendorId}
                    onChange={handleCalibrationFormChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  >
                    <option value="">Select a vendor</option>
                    {Array.isArray(vendors) && vendors.length > 0 ? (
                      vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No vendors available</option>
                    )}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={calibrationForm.notes}
                    onChange={handleCalibrationFormChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Any special instructions or notes for this calibration"
                  />
                </div>
                
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={closeCalibrationModal}
                    className="btn btn-secondary mr-2"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                  >
                    Submit Calibration
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
                </div>
                
                {/* Download button */}
                {selectedCalibration.certificateUrl ? (
                  <a
                    href={selectedCalibration.certificateUrl}
                    download={`Calibration_Certificate_${selectedCalibration.item.serialNumber}.pdf`}
                    className="btn btn-primary w-full flex justify-center items-center"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FiDownload className="mr-2" /> Download Certificate
                  </a>
                ) : (
                  <p className="text-center text-gray-500 py-2">
                    Certificate is being processed and will be available soon.
                  </p>
                )}
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
      </div>
    </DashboardLayout>
  );
}