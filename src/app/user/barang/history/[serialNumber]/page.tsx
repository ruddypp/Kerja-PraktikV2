'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';
import { FiArrowLeft, FiFileText, FiActivity, FiTool, FiCalendar, FiChevronLeft, FiChevronRight, FiInfo, FiClock, FiUser, FiHash, FiTag, FiBox } from 'react-icons/fi';

// Types
interface Item {
  serialNumber: string;
  name: string;
  partNumber: string;
  sensor: string | null;
  description: string | null;
  customerId: string | null;
  customer: {
    id: string;
    name: string;
  } | null;
  status: string;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ItemHistory {
  id: string;
  itemSerial: string;
  action: string;
  details: string | null;
  relatedId: string | null;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

interface ActivityLog {
  id: string;
  userId: string;
  itemSerial: string;
  action: string;
  details: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

interface Calibration {
  id: string;
  itemSerial: string;
  userId: string;
  vendorId: string;
  status: string;
  notes: string | null;
  createdAt: string;
  vendor: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
  };
}

interface Maintenance {
  id: string;
  itemSerial: string;
  issue: string;
  status: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
  type: string;
}

interface HistoryData {
  item: Item;
  itemHistory: ItemHistory[];
  activityLogs: ActivityLog[];
  calibrations: Calibration[];
  maintenances: Maintenance[];
  pagination: Pagination;
}

export default function UserItemHistoryPage() {
  const params = useParams();
  const serialNumber = params.serialNumber as string;
  
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Changed from useState to constant since we don't change it
  const [isTabLoading, setIsTabLoading] = useState(false);
  
  // Separate function to fetch basic item details - this loads first
  const fetchItemDetails = useCallback(async () => {
    try {
      if (!serialNumber) return;
      
      // Use a simpler endpoint or query parameter to fetch only the item details
      const url = `/api/user/items?serialNumber=${encodeURIComponent(serialNumber)}&basicDetails=true`;
      const res = await fetch(url, {
        // Add cache control headers to prevent browser caching
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch item details');
      }
      
      const itemData = await res.json();
      
      // If we already have history data, just update the item part
      setHistoryData(prevData => prevData ? { ...prevData, item: itemData } : {
        item: itemData,
        itemHistory: [],
        activityLogs: [],
        calibrations: [],
        maintenances: [],
        pagination: {
          page: 1,
          limit: itemsPerPage,
          totalPages: 1,
          totalItems: 0,
          type: 'all'
        }
      } as HistoryData);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching item details:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  }, [serialNumber, itemsPerPage]);
  
  // Fetch item details on initial load
  useEffect(() => {
    // Prefetch item details as soon as component mounts
    fetchItemDetails();
  }, [fetchItemDetails]);
  
  // Separate hook for fetching history data - only runs when tab/page changes
  useEffect(() => {
    const fetchItemHistory = async () => {
      try {
        if (!serialNumber) return;
        
        setIsTabLoading(true);
        // Fix type comparison by using explicit string type
        let type: string;
        if (activeTab === 'all') {
          type = 'all';
        } else if (activeTab === 'history') {
          type = 'history';
        } else if (activeTab === 'calibrations') {
          type = 'calibration';
        } else if (activeTab === 'maintenances') {
          type = 'maintenance';
        } else {
          type = 'activity';
        }
        
        // Use a timestamp to prevent browser caching
        const timestamp = new Date().getTime();
        const url = `/api/user/items/history?serialNumber=${encodeURIComponent(serialNumber)}&page=${currentPage}&limit=${itemsPerPage}&type=${type}&t=${timestamp}`;
        
        const res = await fetch(url, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch item history');
        }
        
        const data = await res.json();
        setHistoryData(prev => ({
          ...data,
          // Keep the item data from the previous state or use the new one if available
          item: prev?.item || data.item
        }));
      } catch (err) {
        console.error('Error fetching item history:', err);
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsTabLoading(false);
      }
    };
    
    if (serialNumber && !loading) {
      fetchItemHistory();
    }
  }, [serialNumber, activeTab, currentPage, itemsPerPage, loading]);
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when changing tabs
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd MMM yyyy HH:mm');
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link 
            href="/user/barang" 
            className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-200 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-md"
          >
            <FiArrowLeft className="mr-2" />
            Back to Products
          </Link>
        </div>
        
        <h1 className="text-2xl font-bold mb-6">
          Product History
          {historyData?.item && (
            <span className="ml-2 text-gray-600">
              ({historyData.item.name} - {historyData.item.serialNumber})
            </span>
          )}
        </h1>
        
        {loading && !historyData ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        ) : historyData ? (
          <div>
            {/* Item Details */}
            <div className="bg-white shadow rounded-lg mb-6 p-6">
              <h2 className="text-lg font-medium mb-4">Product Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Serial Number</p>
                  <p className="font-medium">{historyData.item.serialNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{historyData.item.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Part Number</p>
                  <p className="font-medium">{historyData.item.partNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sensor</p>
                  <p className="font-medium">{historyData.item.sensor || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{historyData.item.customer?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      historyData.item.status === 'AVAILABLE' 
                        ? 'bg-green-100 text-green-800'
                        : historyData.item.status === 'IN_USE'
                        ? 'bg-blue-100 text-blue-800'
                        : historyData.item.status === 'IN_CALIBRATION'
                        ? 'bg-purple-100 text-purple-800'
                        : historyData.item.status === 'IN_MAINTENANCE'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {historyData.item.status === 'AVAILABLE' 
                        ? 'Available'
                        : historyData.item.status === 'IN_USE'
                        ? 'In Use'
                        : historyData.item.status === 'IN_CALIBRATION'
                        ? 'In Calibration'
                        : historyData.item.status === 'IN_MAINTENANCE'
                        ? 'In Maintenance'
                        : historyData.item.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Verified</p>
                  <p className="font-medium">{historyData.item.lastVerifiedAt ? formatDate(historyData.item.lastVerifiedAt) : 'Never'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created At</p>
                  <p className="font-medium">{formatDate(historyData.item.createdAt)}</p>
                </div>
              </div>

              {/* Added expanded description section */}
              {historyData.item.description && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-md font-medium mb-2 flex items-center">
                    <FiInfo className="mr-2 text-indigo-500" />
                    Detailed Description
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 shadow-sm">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{historyData.item.description}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Add Technical Specifications Card if there's a description */}
            {historyData.item.description && (
              <div className="bg-white shadow rounded-lg mb-6 p-6">
                <h2 className="text-lg font-medium mb-4 flex items-center">
                  <FiBox className="mr-2 text-indigo-500" />
                  Technical Specifications
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h3 className="font-medium flex items-center mb-2">
                      <FiHash className="mr-2 text-indigo-600" />
                      Serial Number
                    </h3>
                    <p className="text-gray-700">{historyData.item.serialNumber}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h3 className="font-medium flex items-center mb-2">
                      <FiTag className="mr-2 text-indigo-600" />
                      Part Number
                    </h3>
                    <p className="text-gray-700">{historyData.item.partNumber}</p>
                  </div>
                  {historyData.item.sensor && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <h3 className="font-medium flex items-center mb-2">
                        <FiTool className="mr-2 text-indigo-600" /> 
                        Sensor
                      </h3>
                      <p className="text-gray-700">{historyData.item.sensor}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h3 className="font-medium flex items-center mb-2">
                      <FiClock className="mr-2 text-indigo-600" />
                      Last Verified
                    </h3>
                    <p className="text-gray-700">{historyData.item.lastVerifiedAt ? formatDate(historyData.item.lastVerifiedAt) : 'Never'}</p>
                  </div>
                  {historyData.item.customer?.name && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <h3 className="font-medium flex items-center mb-2">
                        <FiUser className="mr-2 text-indigo-600" />
                        Customer
                      </h3>
                      <p className="text-gray-700">{historyData.item.customer.name}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* History Tabs */}
            <div className="bg-white shadow rounded-lg">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => handleTabChange('all')}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'all'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    aria-label="All Activity"
                  >
                    <FiActivity className="inline-block mr-2" />
                    All Activity
                  </button>
                  <button
                    onClick={() => handleTabChange('history')}
                    className={`px-6 py-3 border-b-2 text-sm font-medium ${
                      activeTab === 'history'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    aria-label="Product History"
                  >
                    <FiFileText className="inline-block mr-2" />
                    Product History
                  </button>
                  <button
                    onClick={() => handleTabChange('calibrations')}
                    className={`px-6 py-3 border-b-2 text-sm font-medium ${
                      activeTab === 'calibrations'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    aria-label="Calibrations"
                  >
                    <FiCalendar className="inline-block mr-2" />
                    Calibrations
                  </button>
                  <button
                    onClick={() => handleTabChange('maintenances')}
                    className={`px-6 py-3 border-b-2 text-sm font-medium ${
                      activeTab === 'maintenances'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    aria-label="Maintenances"
                  >
                    <FiTool className="inline-block mr-2" />
                    Maintenances
                  </button>
                </nav>
              </div>
              
              {/* Loading state for tab content */}
              {isTabLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                  <span className="ml-2 text-gray-500">Loading...</span>
                </div>
              ) : (
                <div className="p-6">
                  {loading && historyData && (
                    <div className="flex justify-center items-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                  )}
                  
                  {!loading && (
                    <>
                      {/* All Activities */}
                      {activeTab === 'all' && (
                        <div>
                          <h3 className="text-lg font-medium mb-4">All Activities</h3>
                          {historyData.activityLogs.length === 0 && 
                           historyData.itemHistory.length === 0 && 
                           historyData.calibrations.length === 0 && 
                           historyData.maintenances.length === 0 ? (
                            <p className="text-gray-500">No activity records found for this product.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Activity Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      User
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {/* ActivityLogs */}
                                  {historyData.activityLogs.map(log => (
                                    <tr key={`activity-${log.id}`} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(log.createdAt)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                          {log.action}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-500">
                                        {log.details || 'N/A'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {log.user.name}
                                      </td>
                                    </tr>
                                  ))}
                                  
                                  {/* ItemHistory */}
                                  {historyData.itemHistory.map(history => (
                                    <tr key={`history-${history.id}`} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(history.startDate)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                          {history.action}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-500">
                                        {history.details || 'N/A'}
                                        {history.endDate && (
                                          <span className="ml-2 text-green-600">
                                            (Completed: {formatDate(history.endDate)})
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        System
                                      </td>
                                    </tr>
                                  ))}
                                  
                                  {/* Calibrations */}
                                  {historyData.calibrations.map(cal => (
                                    <tr key={`calibration-${cal.id}`} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(cal.createdAt)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                          CALIBRATION ({cal.status})
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-500">
                                        Vendor: {cal.vendor?.name || 'N/A'} {cal.notes ? `- ${cal.notes}` : ''}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {cal.user.name}
                                      </td>
                                    </tr>
                                  ))}
                                  
                                  {/* Maintenances */}
                                  {historyData.maintenances.map(maintenance => (
                                    <tr key={`maintenance-${maintenance.id}`} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(maintenance.startDate)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                          MAINTENANCE ({maintenance.status})
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-500">
                                        {maintenance.issue}
                                        {maintenance.endDate && (
                                          <span className="ml-2 text-green-600">
                                            (Completed: {formatDate(maintenance.endDate)})
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        System
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Item History */}
                      {activeTab === 'history' && (
                        <div>
                          <h3 className="text-lg font-medium mb-4">Product History</h3>
                          {historyData.itemHistory.length === 0 ? (
                            <p className="text-gray-500">No history records found for this product.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Action
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {historyData.itemHistory.map(history => (
                                    <tr key={history.id} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(history.startDate)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                          {history.action}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-500">
                                        {history.details || 'N/A'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                          history.endDate 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-blue-100 text-blue-800'
                                        }`}>
                                          {history.endDate ? 'Completed' : 'Active'}
                                        </span>
                                        {history.endDate && <span className="ml-2">({formatDate(history.endDate)})</span>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Calibrations */}
                      {activeTab === 'calibrations' && (
                        <div>
                          <h3 className="text-lg font-medium mb-4">Calibrations</h3>
                          {historyData.calibrations.length === 0 ? (
                            <p className="text-gray-500">No calibration records found for this product.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Vendor
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Requested By
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Notes
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {historyData.calibrations.map(cal => (
                                    <tr key={cal.id} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(cal.createdAt)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                          cal.status === 'COMPLETED' 
                                            ? 'bg-green-100 text-green-800' 
                                            : cal.status === 'CANCELLED'
                                            ? 'bg-red-100 text-red-800'
                                            : cal.status === 'IN_PROGRESS'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-purple-100 text-purple-800'
                                        }`}>
                                          {cal.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {cal.vendor?.name || 'N/A'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {cal.user.name}
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-500">
                                        {cal.notes || 'N/A'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Maintenances */}
                      {activeTab === 'maintenances' && (
                        <div>
                          <h3 className="text-lg font-medium mb-4">Maintenances</h3>
                          {historyData.maintenances.length === 0 ? (
                            <p className="text-gray-500">No maintenance records found for this product.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Start Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      End Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Issue
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {historyData.maintenances.map(maintenance => (
                                    <tr key={maintenance.id} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(maintenance.startDate)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {maintenance.endDate ? formatDate(maintenance.endDate) : 'Ongoing'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                          maintenance.status === 'COMPLETED' 
                                            ? 'bg-green-100 text-green-800' 
                                            : maintenance.status === 'CANCELLED'
                                            ? 'bg-red-100 text-red-800'
                                            : maintenance.status === 'IN_PROGRESS'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                          {maintenance.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-500">
                                        {maintenance.issue}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Pagination Controls */}
                      {historyData.pagination && historyData.pagination.totalPages > 1 && (
                        <div className="mt-6 flex justify-between items-center">
                          <div className="text-sm text-gray-500">
                            Showing {historyData.pagination.page} of {historyData.pagination.totalPages} pages
                            ({historyData.pagination.totalItems} items total)
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className={`px-3 py-2 rounded-md ${
                                currentPage === 1
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-indigo-500 text-white hover:bg-indigo-600'
                              }`}
                              aria-label="Previous page"
                              title="Previous page"
                            >
                              <FiChevronLeft />
                            </button>
                            
                            {/* Page Numbers */}
                            {Array.from({ length: Math.min(5, historyData.pagination.totalPages) }, (_, i) => {
                              // Calculate page numbers to show (centered around current page if possible)
                              let pageNum;
                              if (historyData.pagination.totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= historyData.pagination.totalPages - 2) {
                                pageNum = historyData.pagination.totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => handlePageChange(pageNum)}
                                  className={`px-3 py-2 rounded-md ${
                                    currentPage === pageNum
                                      ? 'bg-indigo-500 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                  aria-label={`Page ${pageNum}`}
                                  title={`Page ${pageNum}`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            
                            <button
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === historyData.pagination.totalPages}
                              className={`px-3 py-2 rounded-md ${
                                currentPage === historyData.pagination.totalPages
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-indigo-500 text-white hover:bg-indigo-600'
                              }`}
                              aria-label="Next page"
                              title="Next page"
                            >
                              <FiChevronRight />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <p className="text-red-700">Failed to load product history data.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 