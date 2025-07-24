'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';
import { FiArrowLeft, FiFileText, FiActivity, FiTool, FiCalendar, FiChevronLeft, FiChevronRight, FiInfo, FiClock, FiUser, FiHash, FiTag, FiBox, FiShoppingBag } from 'react-icons/fi';

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
  customerId: string;
  status: string;
  notes: string | null;
  createdAt: string;
  customer: {
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

interface Rental {
  id: string;
  itemSerial: string;
  status: string;
  startDate: string;
  endDate: string | null;
  returnDate: string | null;
  createdAt: string;
  renterName: string | null;
  user: {
    id: string;
    name: string;
  };
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
  rentals: Rental[];
  pagination: Pagination;
}

export default function UserItemHistoryPage() {
  const params = useParams();
  const serialNumber = params.serialNumber as string;
  
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('history');
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
        rentals: [],
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
        if (activeTab === 'history') {
          type = 'all';
        } else if (activeTab === 'calibrations') {
          type = 'calibration';
        } else if (activeTab === 'maintenances') {
          type = 'maintenance';
        } else if (activeTab === 'rentals') {
          type = 'rental';
        } else {
          type = 'all';
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
      <div className="container mx-auto px-4 py-6 bg-gray-50 min-h-screen">
        <div className="flex items-center mb-6">
          <Link 
            href="/user/barang" 
            className="flex items-center text-green-600 hover:text-green-800 transition-colors duration-200 bg-white hover:bg-green-50 px-4 py-2 rounded-lg shadow-sm"
          >
            <FiArrowLeft className="mr-2" />
            Back to Products
          </Link>
        </div>
        
        <h1 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
          <FiFileText className="mr-3 text-green-500" />
          Product History
          {historyData?.item && (
            <span className="ml-2 text-gray-600 font-normal">
              ({historyData.item.name} - {historyData.item.serialNumber})
            </span>
          )}
        </h1>
        
        {loading && !historyData ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg shadow-sm">
            <p className="text-red-700">{error}</p>
          </div>
        ) : historyData ? (
          <div>
            {/* Item Details */}
            <div className="bg-white shadow-md rounded-xl mb-6 overflow-hidden">
              <div className="border-b border-gray-100 bg-green-50 px-6 py-4">
                <h2 className="text-lg font-medium text-gray-800 flex items-center">
                  <FiBox className="mr-2 text-green-500" />
                  Product Details
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Serial Number</p>
                    <p className="font-medium text-gray-800 flex items-center">
                      <FiHash className="mr-2 text-green-500 flex-shrink-0" />
                      {historyData.item.serialNumber}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Name</p>
                    <p className="font-medium text-gray-800 flex items-center">
                      <FiTag className="mr-2 text-green-500 flex-shrink-0" />
                      {historyData.item.name}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Part Number</p>
                    <p className="font-medium text-gray-800 flex items-center">
                      <FiInfo className="mr-2 text-green-500 flex-shrink-0" />
                      {historyData.item.partNumber}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Sensor</p>
                    <p className="font-medium text-gray-800 flex items-center">
                      <FiTool className="mr-2 text-green-500 flex-shrink-0" />
                      {historyData.item.sensor || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Customer</p>
                    <p className="font-medium text-gray-800 flex items-center">
                      <FiUser className="mr-2 text-green-500 flex-shrink-0" />
                      {historyData.item.customer?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Status</p>
                    <p className="font-medium">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center ${
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
                        <span className={`w-2 h-2 rounded-full mr-1.5 ${
                          historyData.item.status === 'AVAILABLE' 
                            ? 'bg-green-500'
                            : historyData.item.status === 'IN_USE'
                            ? 'bg-blue-500'
                            : historyData.item.status === 'IN_CALIBRATION'
                            ? 'bg-purple-500'
                            : historyData.item.status === 'IN_MAINTENANCE'
                            ? 'bg-red-500'
                            : 'bg-gray-500'
                        }`}></span>
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
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Last Verified</p>
                    <p className="font-medium text-gray-800 flex items-center">
                      <FiClock className="mr-2 text-green-500 flex-shrink-0" />
                      {historyData.item.lastVerifiedAt ? formatDate(historyData.item.lastVerifiedAt) : 'Never'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Created At</p>
                    <p className="font-medium text-gray-800 flex items-center">
                      <FiCalendar className="mr-2 text-green-500 flex-shrink-0" />
                      {formatDate(historyData.item.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Description section if available */}
                {historyData.item.description && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h3 className="text-md font-medium mb-3 flex items-center text-gray-800">
                      <FiInfo className="mr-2 text-green-500" />
                      Detailed Description
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{historyData.item.description}</p>
                    </div>
                  </div>
                )}
              </div>
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
            <div className="bg-white shadow-md rounded-xl overflow-hidden">
              <div className="border-b border-gray-100">
                <nav className="flex flex-wrap">
                  <button
                    onClick={() => handleTabChange('history')}
                    className={`px-6 py-4 text-center border-b-2 font-medium text-sm flex items-center ${
                      activeTab === 'history'
                        ? 'border-green-500 text-green-600 bg-green-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    aria-label="View product history"
                  >
                    <FiFileText className="mr-2" />
                    Product History
                  </button>
                  <button
                    onClick={() => handleTabChange('calibrations')}
                    className={`px-6 py-4 text-center border-b-2 font-medium text-sm flex items-center ${
                      activeTab === 'calibrations'
                        ? 'border-green-500 text-green-600 bg-green-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    aria-label="Calibrations"
                  >
                    <FiCalendar className="mr-2" />
                    Calibrations
                  </button>
                  <button
                    onClick={() => handleTabChange('maintenances')}
                    className={`px-6 py-4 text-center border-b-2 font-medium text-sm flex items-center ${
                      activeTab === 'maintenances'
                        ? 'border-green-500 text-green-600 bg-green-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    aria-label="View maintenances"
                  >
                    <FiTool className="mr-2" />
                    Maintenances
                  </button>
                  <button
                    onClick={() => handleTabChange('rentals')}
                    className={`px-6 py-4 text-center border-b-2 font-medium text-sm flex items-center ${
                      activeTab === 'rentals'
                        ? 'border-green-500 text-green-600 bg-green-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    aria-label="View rentals"
                  >
                    <FiShoppingBag className="mr-2" />
                    Rentals
                  </button>
                </nav>
              </div>
              
              {/* Loading state for tab content */}
              {isTabLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                  <span className="ml-2 text-gray-500">Loading...</span>
                </div>
              ) : (
                <div className="p-6">
                  {loading && historyData && (
                    <div className="flex justify-center items-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                    </div>
                  )}
                  
                  {!loading && (
                    <>
                      {/* Product History - Now shows all activities */}
                      {activeTab === 'history' && (
                        <div>
                          <h3 className="text-lg font-medium mb-4 text-gray-800 flex items-center">
                            <FiActivity className="mr-2 text-green-500" />
                            Product History
                          </h3>
                          {historyData.activityLogs.length === 0 && 
                           historyData.itemHistory.length === 0 && 
                           historyData.calibrations.length === 0 && 
                           historyData.maintenances.length === 0 &&
                           historyData.rentals.length === 0 ? (
                            <div className="bg-gray-50 rounded-lg p-8 text-center">
                              <FiInfo className="mx-auto text-gray-400 text-4xl mb-2" />
                              <p className="text-gray-500">No history records found for this product.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 border border-gray-100 rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Activity Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      User
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                  {/* ActivityLogs */}
                                  {historyData.activityLogs.map(log => (
                                    <tr key={`activity-${log.id}`} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {formatDate(log.createdAt)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-3 py-1 inline-flex items-center text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                                          {log.action}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-600">
                                        {log.details || 'N/A'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className="px-3 py-1 inline-flex items-center text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-100">
                                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                                          COMPLETED
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {log.user.name}
                                      </td>
                                    </tr>
                                  ))}
                                  
                                  {/* ItemHistory */}
                                  {historyData.itemHistory.map(history => (
                                    <tr key={`history-${history.id}`} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {formatDate(history.startDate)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-3 py-1 inline-flex items-center text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-100">
                                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                                          {history.action}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-600">
                                        {history.details || 'N/A'}
                                        {history.endDate && (
                                          <span className="ml-2 text-green-600">
                                            (Completed: {formatDate(history.endDate)})
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-3 py-1 inline-flex items-center text-xs font-medium rounded-full border ${
                                          history.endDate 
                                            ? 'bg-green-50 text-green-700 border-green-100' 
                                            : 'bg-blue-50 text-blue-700 border-blue-100'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                            history.endDate ? 'bg-green-500' : 'bg-blue-500'
                                          }`}></span>
                                          {history.endDate ? 'COMPLETED' : 'ACTIVE'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        System
                                      </td>
                                    </tr>
                                  ))}
                                  
                                  {/* Calibrations */}
                                  {historyData.calibrations.map(cal => (
                                    <tr key={`calibration-${cal.id}`} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {formatDate(cal.createdAt)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-3 py-1 inline-flex items-center text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>
                                          CALIBRATION
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-600">
                                        customer: {cal.customer?.name || 'N/A'} {cal.notes ? `- ${cal.notes}` : ''}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex items-center text-xs font-medium rounded-full border ${
                                          cal.status === 'COMPLETED' 
                                            ? 'bg-green-50 text-green-700 border-green-100' 
                                            : cal.status === 'CANCELLED'
                                            ? 'bg-red-50 text-red-700 border-red-100'
                                            : cal.status === 'IN_PROGRESS'
                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                            : 'bg-purple-50 text-purple-700 border-purple-100'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                            cal.status === 'COMPLETED' 
                                              ? 'bg-green-500' 
                                              : cal.status === 'CANCELLED'
                                              ? 'bg-red-500'
                                              : cal.status === 'IN_PROGRESS'
                                              ? 'bg-blue-500'
                                              : 'bg-purple-500'
                                          }`}></span>
                                          {cal.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {cal.user.name}
                                      </td>
                                    </tr>
                                  ))}
                                  
                                  {/* Maintenances */}
                                  {historyData.maintenances.map(maintenance => (
                                    <tr key={`maintenance-${maintenance.id}`} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {formatDate(maintenance.startDate)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-3 py-1 inline-flex items-center text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-100">
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                                          MAINTENANCE
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-600">
                                        {maintenance.issue}
                                        {maintenance.endDate && (
                                          <span className="ml-2 text-green-600">
                                            (Completed: {formatDate(maintenance.endDate)})
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex items-center text-xs font-medium rounded-full border ${
                                          maintenance.status === 'COMPLETED' 
                                            ? 'bg-green-50 text-green-700 border-green-100' 
                                            : maintenance.status === 'CANCELLED'
                                            ? 'bg-red-50 text-red-700 border-red-100'
                                            : maintenance.status === 'IN_PROGRESS'
                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                            : 'bg-red-50 text-red-700 border-red-100'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                            maintenance.status === 'COMPLETED' 
                                              ? 'bg-green-500' 
                                              : maintenance.status === 'CANCELLED'
                                              ? 'bg-red-500'
                                              : maintenance.status === 'IN_PROGRESS'
                                              ? 'bg-blue-500'
                                              : 'bg-red-500'
                                          }`}></span>
                                          {maintenance.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        System
                                      </td>
                                    </tr>
                                  ))}
                                  
                                  {/* Rentals */}
                                  {historyData.rentals.map(rental => (
                                    <tr key={`rental-${rental.id}`} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {formatDate(rental.startDate)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-3 py-1 inline-flex items-center text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-100">
                                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                                          RENTAL
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-600">
                                        {rental.renterName ? `Renter: ${rental.renterName}` : ''}
                                        {rental.endDate && <span className="ml-2">End: {formatDate(rental.endDate)}</span>}
                                        {rental.returnDate && <span className="ml-2">Returned: {formatDate(rental.returnDate)}</span>}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex items-center text-xs font-medium rounded-full border ${
                                          rental.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-100' :
                                          rental.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                          rental.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                          rental.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                                          rental.status === 'CANCELLED' ? 'bg-gray-50 text-gray-700 border-gray-100' :
                                          'bg-gray-50 text-gray-700 border-gray-100'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                            rental.status === 'APPROVED' ? 'bg-green-500' :
                                            rental.status === 'COMPLETED' ? 'bg-blue-500' :
                                            rental.status === 'PENDING' ? 'bg-yellow-500' :
                                            rental.status === 'REJECTED' ? 'bg-red-500' :
                                            rental.status === 'CANCELLED' ? 'bg-gray-500' :
                                            'bg-gray-500'
                                          }`}></span>
                                          {rental.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {rental.user.name}
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
                          <h3 className="text-lg font-medium mb-4 text-gray-800 flex items-center">
                            <FiCalendar className="mr-2 text-green-500" />
                            Calibrations
                          </h3>
                          {historyData.calibrations.length === 0 ? (
                            <div className="bg-gray-50 rounded-lg p-8 text-center">
                              <FiInfo className="mx-auto text-gray-400 text-4xl mb-2" />
                              <p className="text-gray-500">No calibration records found for this product.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 border border-gray-100 rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      customer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Requested By
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Notes
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                  {historyData.calibrations.map(cal => (
                                    <tr key={cal.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {formatDate(cal.createdAt)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex items-center text-xs font-medium rounded-full border ${
                                          cal.status === 'COMPLETED' 
                                            ? 'bg-green-50 text-green-700 border-green-100' 
                                            : cal.status === 'CANCELLED'
                                            ? 'bg-red-50 text-red-700 border-red-100'
                                            : cal.status === 'IN_PROGRESS'
                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                            : 'bg-purple-50 text-purple-700 border-purple-100'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                            cal.status === 'COMPLETED' 
                                              ? 'bg-green-500' 
                                              : cal.status === 'CANCELLED'
                                              ? 'bg-red-500'
                                              : cal.status === 'IN_PROGRESS'
                                              ? 'bg-blue-500'
                                              : 'bg-purple-500'
                                          }`}></span>
                                          {cal.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {cal.customer?.name || 'N/A'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {cal.user.name}
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-600">
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
                          <h3 className="text-lg font-medium mb-4 text-gray-800 flex items-center">
                            <FiTool className="mr-2 text-green-500" />
                            Maintenances
                          </h3>
                          {historyData.maintenances.length === 0 ? (
                            <div className="bg-gray-50 rounded-lg p-8 text-center">
                              <FiInfo className="mx-auto text-gray-400 text-4xl mb-2" />
                              <p className="text-gray-500">No maintenance records found for this product.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 border border-gray-100 rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Start Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      End Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Issue
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                  {historyData.maintenances.map(maintenance => (
                                    <tr key={maintenance.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {formatDate(maintenance.startDate)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {maintenance.endDate ? formatDate(maintenance.endDate) : 
                                        <span className="inline-flex items-center text-blue-600">
                                          <FiClock className="mr-1 text-blue-500" /> Ongoing
                                        </span>}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex items-center text-xs font-medium rounded-full border ${
                                          maintenance.status === 'COMPLETED' 
                                            ? 'bg-green-50 text-green-700 border-green-100' 
                                            : maintenance.status === 'CANCELLED'
                                            ? 'bg-red-50 text-red-700 border-red-100'
                                            : maintenance.status === 'IN_PROGRESS'
                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                            : 'bg-red-50 text-red-700 border-red-100'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                            maintenance.status === 'COMPLETED' 
                                              ? 'bg-green-500' 
                                              : maintenance.status === 'CANCELLED'
                                              ? 'bg-red-500'
                                              : maintenance.status === 'IN_PROGRESS'
                                              ? 'bg-blue-500'
                                              : 'bg-red-500'
                                          }`}></span>
                                          {maintenance.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-600">
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
                      
                      {/* Rentals */}
                      {activeTab === 'rentals' && (
                        <div>
                          <h3 className="text-lg font-medium mb-4 text-gray-800 flex items-center">
                            <FiShoppingBag className="mr-2 text-green-500" />
                            Rentals
                          </h3>
                          {historyData.rentals.length === 0 ? (
                            <div className="bg-gray-50 rounded-lg p-8 text-center">
                              <FiInfo className="mx-auto text-gray-400 text-4xl mb-2" />
                              <p className="text-gray-500">No rental records found for this item.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 border border-gray-100 rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Start Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      End Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Return Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                      Renter
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                  {historyData.rentals.map(rental => (
                                    <tr key={rental.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {formatDate(rental.startDate)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {rental.endDate ? formatDate(rental.endDate) : '-'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {rental.returnDate ? formatDate(rental.returnDate) : '-'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex items-center text-xs font-medium rounded-full border ${
                                          rental.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-100' :
                                          rental.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                          rental.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                          rental.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                                          rental.status === 'CANCELLED' ? 'bg-gray-50 text-gray-700 border-gray-100' :
                                          'bg-gray-50 text-gray-700 border-gray-100'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                            rental.status === 'APPROVED' ? 'bg-green-500' :
                                            rental.status === 'COMPLETED' ? 'bg-blue-500' :
                                            rental.status === 'PENDING' ? 'bg-yellow-500' :
                                            rental.status === 'REJECTED' ? 'bg-red-500' :
                                            rental.status === 'CANCELLED' ? 'bg-gray-500' :
                                            'bg-gray-500'
                                          }`}></span>
                                          {rental.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {rental.user.name} {rental.renterName ? `(${rental.renterName})` : ''}
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
                        <div className="mt-6 flex flex-wrap justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                          <div className="text-sm text-gray-600 mb-2 md:mb-0">
                            Showing page <span className="font-medium text-green-600">{historyData.pagination.page}</span> of <span className="font-medium">{historyData.pagination.totalPages}</span> pages
                            (<span className="font-medium">{historyData.pagination.totalItems}</span> items total)
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className={`px-3 py-2 rounded-md flex items-center ${
                                currentPage === 1
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
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
                                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                                    currentPage === pageNum
                                      ? 'bg-green-600 text-white'
                                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
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
                              className={`px-3 py-2 rounded-md flex items-center ${
                                currentPage === historyData.pagination.totalPages
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
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
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
            <p className="text-red-700">Failed to load product history data.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 