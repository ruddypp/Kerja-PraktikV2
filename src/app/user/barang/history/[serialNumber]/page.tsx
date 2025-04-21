'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';
import { FiArrowLeft, FiFileText, FiActivity, FiTool, FiCalendar } from 'react-icons/fi';

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

interface HistoryData {
  item: Item;
  itemHistory: ItemHistory[];
  activityLogs: ActivityLog[];
  calibrations: Calibration[];
  maintenances: Maintenance[];
}

export default function UserItemHistoryPage() {
  const params = useParams();
  const serialNumber = params.serialNumber as string;
  
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  useEffect(() => {
    const fetchItemHistory = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/user/items/history?serialNumber=${encodeURIComponent(serialNumber)}`);
        
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
  }, [serialNumber]);
  
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
            className="flex items-center text-green-600 hover:text-green-800"
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
        
        {loading ? (
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
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="font-medium">{historyData.item.description || 'N/A'}</p>
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
                    onClick={() => setActiveTab('all')}
                    className={`px-6 py-3 border-b-2 text-sm font-medium ${
                      activeTab === 'all'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FiActivity className="inline-block mr-2" />
                    All Activities
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 border-b-2 text-sm font-medium ${
                      activeTab === 'history'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FiFileText className="inline-block mr-2" />
                    Product History
                  </button>
                  <button
                    onClick={() => setActiveTab('calibrations')}
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
                    onClick={() => setActiveTab('maintenances')}
                    className={`px-6 py-3 border-b-2 text-sm font-medium ${
                      activeTab === 'maintenances'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FiTool className="inline-block mr-2" />
                    Maintenance
                  </button>
                </nav>
              </div>
              
              <div className="p-6">
                {/* All Activities Tab */}
                {activeTab === 'all' && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">All Activities</h3>
                    {historyData.itemHistory.length === 0 && 
                     historyData.activityLogs.length === 0 && 
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
                                Action
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Details
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                By
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {/* ActivityLogs */}
                            {historyData.activityLogs.map(log => (
                              <tr key={`activity-${log.id}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(log.createdAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {log.action}
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
                              <tr key={`history-${history.id}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(history.startDate)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {history.action}
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
                            {historyData.calibrations.map(calibration => (
                              <tr key={`calibration-${calibration.id}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(calibration.createdAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  CALIBRATION
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  Status: {calibration.status}
                                  {calibration.notes && (
                                    <div className="mt-1">
                                      Notes: {calibration.notes}
                                    </div>
                                  )}
                                  <div className="mt-1">
                                    Vendor: {calibration.vendor.name}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {calibration.user.name}
                                </td>
                              </tr>
                            ))}
                            
                            {/* Maintenances */}
                            {historyData.maintenances.map(maintenance => (
                              <tr key={`maintenance-${maintenance.id}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(maintenance.startDate)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  MAINTENANCE
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  Issue: {maintenance.issue}
                                  <div className="mt-1">
                                    Status: {maintenance.status}
                                  </div>
                                  {maintenance.endDate && (
                                    <div className="mt-1 text-green-600">
                                      Completed: {formatDate(maintenance.endDate)}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  Staff
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Item History Tab */}
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
                              <tr key={history.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(history.startDate)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {history.action}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {history.details || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {history.endDate ? 'Completed' : 'In Progress'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Calibrations Tab */}
                {activeTab === 'calibrations' && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Calibration History</h3>
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
                                Notes
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Requested By
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {historyData.calibrations.map(calibration => (
                              <tr key={calibration.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(calibration.createdAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${calibration.status === 'COMPLETED' 
                                      ? 'bg-green-100 text-green-800' 
                                      : calibration.status === 'PENDING' 
                                        ? 'bg-yellow-100 text-yellow-800' 
                                        : 'bg-blue-100 text-blue-800'}`}
                                  >
                                    {calibration.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {calibration.vendor.name}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {calibration.notes || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {calibration.user.name}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Maintenances Tab */}
                {activeTab === 'maintenances' && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Maintenance History</h3>
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
                                Issue
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {historyData.maintenances.map(maintenance => (
                              <tr key={maintenance.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(maintenance.startDate)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {maintenance.endDate ? formatDate(maintenance.endDate) : 'In Progress'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {maintenance.issue}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${maintenance.status === 'COMPLETED' 
                                      ? 'bg-green-100 text-green-800' 
                                      : maintenance.status === 'PENDING' 
                                        ? 'bg-yellow-100 text-yellow-800' 
                                        : 'bg-blue-100 text-blue-800'}`}
                                  >
                                    {maintenance.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
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