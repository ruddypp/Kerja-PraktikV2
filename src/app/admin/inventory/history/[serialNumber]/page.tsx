'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';
import { FiArrowLeft, FiFileText, FiActivity, FiTool, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

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

export default function ItemHistoryPage() {
  const params = useParams();
  const serialNumber = params.serialNumber as string;
  
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  useEffect(() => {
    const fetchItemHistory = async () => {
      try {
        setLoading(true);
        const type = activeTab === 'all' ? 'all' : 
                   activeTab === 'history' ? 'history' : 
                   activeTab === 'calibrations' ? 'calibration' : 
                   activeTab === 'maintenances' ? 'maintenance' : 'activity';
        
        const url = `/api/admin/items/history?serialNumber=${encodeURIComponent(serialNumber)}&page=${currentPage}&limit=${itemsPerPage}&type=${type}`;
        const res = await fetch(url);
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch item history');
        }
        
        const data = await res.json();
        setHistoryData(data);
      } catch (err) {
        console.error('Error fetching item history:', err);
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    if (serialNumber) {
      fetchItemHistory();
    }
  }, [serialNumber, activeTab, currentPage, itemsPerPage]);
  
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
            href="/admin/inventory" 
            className="flex items-center text-green-600 hover:text-green-800 transition-colors duration-200 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-md"
          >
            <FiArrowLeft className="mr-2" />
            Back to Inventory
          </Link>
        </div>
        
        <h1 className="text-2xl font-bold mb-6">
          Item History
          {historyData?.item && (
            <span className="ml-2 text-gray-600">
              ({historyData.item.name} - {historyData.item.serialNumber})
            </span>
          )}
        </h1>
        
        {loading && !historyData ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        ) : historyData ? (
          <div>
            {/* Item Details */}
            <div className="bg-white shadow rounded-lg mb-6 p-6">
              <h2 className="text-lg font-medium mb-4">Item Details</h2>
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
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="font-medium">{historyData.item.description || 'N/A'}</p>
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
                        ? 'bg-yellow-100 text-yellow-800'
                        : historyData.item.status === 'IN_MAINTENANCE'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {historyData.item.status}
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
            </div>
            
            {/* History Tabs */}
            <div className="bg-white shadow rounded-lg">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => handleTabChange('all')}
                    className={`px-6 py-3 border-b-2 text-sm font-medium ${
                      activeTab === 'all'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FiActivity className="inline-block mr-2" />
                    All Activities
                  </button>
                  <button
                    onClick={() => handleTabChange('history')}
                    className={`px-6 py-3 border-b-2 text-sm font-medium ${
                      activeTab === 'history'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FiFileText className="inline-block mr-2" />
                    Item History
                  </button>
                  <button
                    onClick={() => handleTabChange('calibrations')}
                    className={`px-6 py-3 border-b-2 text-sm font-medium ${
                      activeTab === 'calibrations'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FiCalendar className="inline-block mr-2" />
                    Calibrations
                  </button>
                  <button
                    onClick={() => handleTabChange('maintenances')}
                    className={`px-6 py-3 border-b-2 text-sm font-medium ${
                      activeTab === 'maintenances'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FiTool className="inline-block mr-2" />
                    Maintenances
                  </button>
                </nav>
              </div>
              
              <div className="p-6">
                {loading && historyData && (
                  <div className="flex justify-center items-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
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
                          <p className="text-gray-500">No activity records found for this item.</p>
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
                                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
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
                                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
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
                        <h3 className="text-lg font-medium mb-4">Item History</h3>
                        {historyData.itemHistory.length === 0 ? (
                          <p className="text-gray-500">No history records found for this item.</p>
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
                          <p className="text-gray-500">No calibration records found for this item.</p>
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
                                          : 'bg-yellow-100 text-yellow-800'
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
                          <p className="text-gray-500">No maintenance records found for this item.</p>
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
                                          : 'bg-yellow-100 text-yellow-800'
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
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
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
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
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
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            <FiChevronRight />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
} 