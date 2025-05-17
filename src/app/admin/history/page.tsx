'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
// @ts-expect-error jspdf-autotable doesn't have proper TypeScript types
import autoTable from 'jspdf-autotable';
import { FiDownload, FiFilter, FiRefreshCw, FiCalendar, FiUser, FiList, FiPackage } from 'react-icons/fi';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Define ActivityType enum to match Prisma schema
enum ActivityType {
  ITEM_CREATED = 'ITEM_CREATED',
  ITEM_UPDATED = 'ITEM_UPDATED',
  ITEM_DELETED = 'ITEM_DELETED',
  CALIBRATION_CREATED = 'CALIBRATION_CREATED',
  CALIBRATION_UPDATED = 'CALIBRATION_UPDATED',
  CALIBRATION_DELETED = 'CALIBRATION_DELETED',
  MAINTENANCE_CREATED = 'MAINTENANCE_CREATED',
  MAINTENANCE_UPDATED = 'MAINTENANCE_UPDATED',
  MAINTENANCE_DELETED = 'MAINTENANCE_DELETED',
  RENTAL_CREATED = 'RENTAL_CREATED',
  RENTAL_UPDATED = 'RENTAL_UPDATED',
  RENTAL_DELETED = 'RENTAL_DELETED',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  VENDOR_CREATED = 'VENDOR_CREATED',
  VENDOR_UPDATED = 'VENDOR_UPDATED',
  VENDOR_DELETED = 'VENDOR_DELETED'
}

interface User {
  id: string;
  name: string;
}

interface ActivityLog {
  id: string;
  type: ActivityType;
  userId: string;
  action: string;
  details?: string;
  itemSerial?: string;
  rentalId?: string;
  calibrationId?: string;
  maintenanceId?: string;
  affectedUserId?: string;
  vendorId?: string;
  createdAt: string;
  user: User;
  affectedUser?: User;
}

interface PaginatedResponse {
  items: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Debounce function to prevent too many API calls
function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): {
  (...args: Parameters<T>): void;
  cancel?: () => void;
} {
  let timeout: NodeJS.Timeout | null = null;
  
  const debouncedFunction = function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  
  debouncedFunction.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debouncedFunction;
}

export default function AdminHistoryPage() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    activityType: '',
    userId: '',
    itemSerial: '',
  });

  const fetchActivityLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Build query params for filtering
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.activityType) params.append('activityType', filters.activityType);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.itemSerial) params.append('itemSerial', filters.itemSerial);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const cacheKey = `admin_activity_logs_${queryString}`;
      
      // Check if we have cached data first
      const cachedData = sessionStorage.getItem(cacheKey);
      const lastFetch = sessionStorage.getItem(`${cacheKey}_timestamp`);
      const now = Date.now();
      
      // Use cache if available and less than 1 minute old
      if (cachedData && lastFetch && now - parseInt(lastFetch) < 60000) {
        const parsedData = JSON.parse(cachedData) as PaginatedResponse;
        setActivityLogs(parsedData.items);
        setPagination({
          page: parsedData.page,
          limit: parsedData.limit,
          total: parsedData.total,
          totalPages: parsedData.totalPages
        });
        setLoading(false);
        return;
      }
      
      const res = await fetch(`/api/admin/activity-logs${queryString}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch activity logs: ${res.statusText}`);
      }
      
      const data = await res.json() as PaginatedResponse;
      setActivityLogs(data.items);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages
      });
      
      // Cache the results
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      sessionStorage.setItem(`${cacheKey}_timestamp`, now.toString());
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError('Failed to load activity history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  // Create a debounced function that is memoized
  const debouncedFetchLogs = useCallback(
    () => {
      const debounced = debounce(() => {
        // Reset page to 1 when filters change
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchActivityLogs();
      }, 500);
      debounced();
      // Clean up the debounced function
      return () => {
        debounced.cancel?.();
      };
    },
    [fetchActivityLogs]
  );

  // Apply filters with debounce
  useEffect(() => {
    debouncedFetchLogs();
  }, [filters, debouncedFetchLogs]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchActivityLogs();
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      activityType: '',
      userId: '',
      itemSerial: '',
    });
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy HH:mm');
  };

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('System Activity Report', 14, 15);
      
      // Add filters information
      doc.setFontSize(10);
      let yPos = 25;
      
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, yPos);
      yPos += 5;
      
      if (filters.startDate) {
        doc.text(`From: ${format(new Date(filters.startDate), 'dd MMM yyyy')}`, 14, yPos);
        yPos += 5;
      }
      
      if (filters.endDate) {
        doc.text(`To: ${format(new Date(filters.endDate), 'dd MMM yyyy')}`, 14, yPos);
        yPos += 5;
      }
      
      if (filters.activityType) {
        doc.text(`Activity Type: ${filters.activityType.replace(/_/g, ' ')}`, 14, yPos);
        yPos += 5;
      }
      
      if (filters.userId) {
        doc.text(`User ID: ${filters.userId}`, 14, yPos);
        yPos += 5;
      }
      
      if (filters.itemSerial) {
        doc.text(`Item Serial: ${filters.itemSerial}`, 14, yPos);
        yPos += 5;
      }
      
      // Table data
      const tableColumn = ['#', 'Date & Time', 'User', 'Type', 'Action', 'Details'];
      const tableRows = activityLogs.map((log, index) => [
        (index + 1).toString(),
        formatDate(log.createdAt),
        log.user?.name || 'Unknown',
        log.type.replace(/_/g, ' '),
        log.action,
        log.details || '-'
      ]);
      
      // Add table with properly imported autoTable
      autoTable(doc, {
        startY: yPos + 5,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [39, 174, 96], textColor: 255 },
        styles: { overflow: 'linebreak', cellWidth: 'wrap' },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 },
          4: { cellWidth: 35 },
          5: { cellWidth: 60 }
        }
      });
      
      // Save file
      doc.save('system-activity-report.pdf');
      
      setSuccess('PDF report successfully created');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to create PDF. Please try again.');
    }
  };

  const getActivityTypeDisplayClass = (type: ActivityType): string => {
    if (type.includes('CREATED')) {
      return 'bg-green-100 text-green-800';
    } else if (type.includes('UPDATED')) {
      return 'bg-blue-100 text-blue-800';
    } else if (type.includes('DELETED')) {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">System Activity History</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFilters}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
            >
              <FiFilter size={16} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            
            <button
              onClick={fetchActivityLogs}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
              disabled={loading}
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} size={16} />
              {loading ? "Loading..." : "Refresh"}
            </button>
            
            <button
              onClick={generatePDF}
              disabled={loading || activityLogs.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-white ${
                loading || activityLogs.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <FiDownload size={16} />
              Export PDF
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">Filter History</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    <div className="flex items-center gap-1">
                      <FiCalendar size={16} className="text-gray-500" />
                  Start Date
                    </div>
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    <div className="flex items-center gap-1">
                      <FiCalendar size={16} className="text-gray-500" />
                  End Date
                    </div>
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                  <label htmlFor="activityType" className="block text-sm font-medium text-gray-700 mb-1">
                    <div className="flex items-center gap-1">
                      <FiList size={16} className="text-gray-500" />
                  Activity Type
                    </div>
                </label>
                <select
                  id="activityType"
                  name="activityType"
                  value={filters.activityType}
                  onChange={handleFilterChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">All Activities</option>
                  <optgroup label="Item Activities">
                    <option value={ActivityType.ITEM_CREATED}>Item Created</option>
                    <option value={ActivityType.ITEM_UPDATED}>Item Updated</option>
                    <option value={ActivityType.ITEM_DELETED}>Item Deleted</option>
                  </optgroup>
                  <optgroup label="Calibration Activities">
                    <option value={ActivityType.CALIBRATION_CREATED}>Calibration Created</option>
                    <option value={ActivityType.CALIBRATION_UPDATED}>Calibration Updated</option>
                    <option value={ActivityType.CALIBRATION_DELETED}>Calibration Deleted</option>
                  </optgroup>
                  <optgroup label="Maintenance Activities">
                    <option value={ActivityType.MAINTENANCE_CREATED}>Maintenance Created</option>
                    <option value={ActivityType.MAINTENANCE_UPDATED}>Maintenance Updated</option>
                    <option value={ActivityType.MAINTENANCE_DELETED}>Maintenance Deleted</option>
                  </optgroup>
                  <optgroup label="Rental Activities">
                    <option value={ActivityType.RENTAL_CREATED}>Rental Created</option>
                    <option value={ActivityType.RENTAL_UPDATED}>Rental Updated</option>
                    <option value={ActivityType.RENTAL_DELETED}>Rental Deleted</option>
                  </optgroup>
                  <optgroup label="User Activities">
                    <option value={ActivityType.USER_CREATED}>User Created</option>
                    <option value={ActivityType.USER_UPDATED}>User Updated</option>
                    <option value={ActivityType.USER_DELETED}>User Deleted</option>
                  </optgroup>
                  <optgroup label="Vendor Activities">
                    <option value={ActivityType.VENDOR_CREATED}>Vendor Created</option>
                    <option value={ActivityType.VENDOR_UPDATED}>Vendor Updated</option>
                    <option value={ActivityType.VENDOR_DELETED}>Vendor Deleted</option>
                  </optgroup>
                </select>
              </div>
              <div>
                  <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
                    <div className="flex items-center gap-1">
                      <FiUser size={16} className="text-gray-500" />
                  User ID
                    </div>
                </label>
                <input
                  type="text"
                  id="userId"
                  name="userId"
                  value={filters.userId}
                  onChange={handleFilterChange}
                  placeholder="Filter by user ID"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                  <label htmlFor="itemSerial" className="block text-sm font-medium text-gray-700 mb-1">
                    <div className="flex items-center gap-1">
                      <FiPackage size={16} className="text-gray-500" />
                  Item Serial
                    </div>
                </label>
                <input
                  type="text"
                  id="itemSerial"
                  name="itemSerial"
                  value={filters.itemSerial}
                  onChange={handleFilterChange}
                  placeholder="Filter by item serial"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="flex items-end">
                  <div className="space-x-2">
                    <button 
                      onClick={resetFilters} 
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                    Reset Filters
                  </button>
                    <button 
                      onClick={() => fetchActivityLogs()} 
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Display Activity Logs */}
        <div className="bg-white rounded-lg border border-gray-100 p-6">
        {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : activityLogs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No activity logs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try changing your filter criteria or refresh the page.
              </p>
          </div>
        ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Related ID
                    </th>
                </tr>
              </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.user?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActivityTypeDisplayClass(log.type)}`}>
                          {log.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.details || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.itemSerial ? `Item: ${log.itemSerial}` : 
                       log.rentalId ? `Rental: ${log.rentalId.substring(0, 8)}...` :
                       log.calibrationId ? `Calibration: ${log.calibrationId.substring(0, 8)}...`