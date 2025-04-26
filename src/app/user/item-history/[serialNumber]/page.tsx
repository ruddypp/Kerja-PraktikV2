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
        
        const url = `/api/user/items/history?serialNumber=${encodeURIComponent(serialNumber)}&page=${currentPage}&limit=${itemsPerPage}&type=${type}`;
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
                  <p className="font-medium">{historyData.item.partNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{historyData.item.customer?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{historyData.item.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Verified</p>
                  <p className="font-medium">{historyData.item.lastVerifiedAt ? formatDate(historyData.item.lastVerifiedAt) : 'N/A'}</p>
                </div>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex border-b mb-6">
              <button 
                className={`px-4 py-2 font-medium ${activeTab === 'all' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}
                onClick={() => handleTabChange('all')}
              >
                All History
              </button>
              <button 
                className={`px-4 py-2 font-medium ${activeTab === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}
                onClick={() => handleTabChange('history')}
              >
                <FiFileText className="inline mr-1" />
                Status History
              </button>
              <button 
                className={`px-4 py-2 font-medium ${activeTab === 'activity' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}
                onClick={() => handleTabChange('activity')}
              >
                <FiActivity className="inline mr-1" />
                Activity Logs
              </button>
              <button 
                className={`px-4 py-2 font-medium ${activeTab === 'calibrations' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}
                onClick={() => handleTabChange('calibrations')}
              >
                <FiCalendar className="inline mr-1" />
                Calibrations
              </button>
              <button 
                className={`px-4 py-2 font-medium ${activeTab === 'maintenances' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}
                onClick={() => handleTabChange('maintenances')}
              >
                <FiTool className="inline mr-1" />
                Maintenance
              </button>
            </div>
            
            {/* History Content */}
            <div className="bg-white shadow rounded-lg p-6">
              {/* All History or Status History */}
              {(activeTab === 'all' || activeTab === 'history') && historyData.itemHistory.length > 0 && (
                <div className="mb-6">
                  {activeTab === 'all' && <h3 className="text-lg font-medium mb-4">Status History</h3>}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {historyData.itemHistory.map((history) => (
                          <tr key={history.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(history.createdAt)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{history.action}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{history.details || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {history.startDate && (
                                <>
                                  Start: {formatDate(history.startDate)}
                                  <br />
                                  End: {history.endDate ? formatDate(history.endDate) : 'Ongoing'}
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Activity Logs */}
              {(activeTab === 'all' || activeTab === 'activity') && historyData.activityLogs.length > 0 && (
                <div className="mb-6">
                  {activeTab === 'all' && <h3 className="text-lg font-medium mb-4">Activity Logs</h3>}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {historyData.activityLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(log.createdAt)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.user.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.action}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{log.details || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Calibrations */}
              {(activeTab === 'all' || activeTab === 'calibrations') && historyData.calibrations.length > 0 && (
                <div className="mb-6">
                  {activeTab === 'all' && <h3 className="text-lg font-medium mb-4">Calibrations</h3>}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {historyData.calibrations.map((cal) => (
                          <tr key={cal.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(cal.createdAt)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cal.vendor.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                cal.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                                cal.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {cal.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{cal.notes || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cal.user.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Maintenances */}
              {(activeTab === 'all' || activeTab === 'maintenances') && historyData.maintenances.length > 0 && (
                <div>
                  {activeTab === 'all' && <h3 className="text-lg font-medium mb-4">Maintenance</h3>}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {historyData.maintenances.map((maint) => (
                          <tr key={maint.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(maint.startDate)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{maint.endDate ? formatDate(maint.endDate) : 'Ongoing'}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{maint.issue}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                maint.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                                maint.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 
                                maint.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {maint.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Link href={`/user/maintenance/${maint.id}`} className="text-indigo-600 hover:text-indigo-900">
                                View Details
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* No data message */}
              {((activeTab === 'history' && historyData.itemHistory.length === 0) ||
                (activeTab === 'activity' && historyData.activityLogs.length === 0) ||
                (activeTab === 'calibrations' && historyData.calibrations.length === 0) ||
                (activeTab === 'maintenances' && historyData.maintenances.length === 0) ||
                (activeTab === 'all' && 
                 historyData.itemHistory.length === 0 &&
                 historyData.activityLogs.length === 0 &&
                 historyData.calibrations.length === 0 &&
                 historyData.maintenances.length === 0)) && (
                <div className="text-center py-10">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No history found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    There is no {activeTab === 'all' ? '' : activeTab} history for this product.
                  </p>
                </div>
              )}
              
              {/* Pagination */}
              {historyData.pagination && historyData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 mt-4">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === historyData.pagination.totalPages}
                      className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        currentPage === historyData.pagination.totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{historyData.pagination.totalPages}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                            currentPage === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span className="sr-only">Previous</span>
                          <FiChevronLeft className="h-5 w-5" />
                        </button>
                        
                        {/* Page number buttons */}
                        {Array.from({ length: historyData.pagination.totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            // Show first page, last page, current page, and pages around current page
                            return page === 1 || 
                                   page === historyData.pagination.totalPages || 
                                   (page >= currentPage - 1 && page <= currentPage + 1);
                          })
                          .map((page, i, filteredPages) => {
                            // Add ellipsis when there are gaps in the sequence
                            const showEllipsisBefore = i > 0 && page > filteredPages[i - 1] + 1;
                            const showEllipsisAfter = i < filteredPages.length - 1 && page < filteredPages[i + 1] - 1;
                            
                            return (
                              <div key={page}>
                                {showEllipsisBefore && (
                                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                    ...
                                  </span>
                                )}
                                
                                <button
                                  onClick={() => handlePageChange(page)}
                                  className={`relative inline-flex items-center px-4 py-2 border ${
                                    currentPage === page 
                                      ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' 
                                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                  } text-sm font-medium`}
                                >
                                  {page}
                                </button>
                                
                                {showEllipsisAfter && (
                                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                    ...
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === historyData.pagination.totalPages}
                          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                            currentPage === historyData.pagination.totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span className="sr-only">Next</span>
                          <FiChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
} 