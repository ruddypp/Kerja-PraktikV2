'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FiDownload, FiFilter, FiRefreshCw, FiCalendar, FiUser, FiList, FiPackage } from 'react-icons/fi';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Define ActivityType enum to match Prisma schema
enum ActivityType {
  LOGIN = 'LOGIN',
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
  customer_CREATED = 'customer_CREATED',
  customer_UPDATED = 'customer_UPDATED',
  customer_DELETED = 'customer_DELETED'
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
  customerId?: string;
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
  const [showClearModal, setShowClearModal] = useState(false);
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
      const cacheKey = `admin_history_${queryString}`;
      
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
      
      const res = await fetch(`/api/admin/history${queryString}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch history: ${res.statusText}`);
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
      console.error('Error fetching history:', err);
      setError('Failed to load history. Please try again.');
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

  const clearAllHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await fetch('/api/admin/history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to clear history');
      }
      
      // Refresh data after clearing
      setActivityLogs([]);
      setPagination({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      });
      
      setSuccess('History berhasil dihapus semua');
      setShowClearModal(false);
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error clearing history:', err);
      setError('Gagal menghapus history. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy HH:mm');
  };

  const generatePDF = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch ALL data for export (not just current page)
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.activityType) params.append('activityType', filters.activityType);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.itemSerial) params.append('itemSerial', filters.itemSerial);
      
      // Get all data for export (set high limit)
      params.append('page', '1');
      params.append('limit', '10000'); // Get all records
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/admin/history${queryString}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch data for export: ${res.statusText}`);
      }
      
      const allData = await res.json() as PaginatedResponse;
      const allActivityLogs = allData.items;
      
      const doc = new jsPDF('landscape'); // Use landscape for better table layout
            
      // Add title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN AKTIVITAS SISTEM', 14, 45);
      doc.text('PT PARAMATA', 14, 53);
      
      // Add report details
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let yPos = 65;
      
      doc.text(`Tanggal Dibuat / Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, yPos);
      yPos += 5;
      
      doc.text(`Total Records: ${allActivityLogs.length}`, 14, yPos);
      yPos += 5;

      // Add line separator
      doc.setLineWidth(0.5);
      doc.line(14, 60, 280, 60);
      
      if (filters.startDate) {
        doc.text(`Periode Dari / From: ${format(new Date(filters.startDate), 'dd MMM yyyy')}`, 14, yPos);
        yPos += 5;
      }
      
      if (filters.endDate) {
        doc.text(`Periode Sampai / To: ${format(new Date(filters.endDate), 'dd MMM yyyy')}`, 14, yPos);
        yPos += 5;
      }
      
      if (filters.activityType) {
        doc.text(`Jenis Aktivitas / Activity Type: ${filters.activityType.replace(/_/g, ' ')}`, 14, yPos);
        yPos += 5;
      }
      
      if (filters.userId) {
        doc.text(`Filter User: ${filters.userId}`, 14, yPos);
        yPos += 5;
      }
      
      if (filters.itemSerial) {
        doc.text(`Filter Item Serial: ${filters.itemSerial}`, 14, yPos);
        yPos += 5;
      }
      
      // Table data with improved layout
      const tableColumn = ['No.', 'Tanggal & Waktu\nDate & Time', 'Pengguna\nUser', 'Jenis\nType', 'Aktivitas\nActivity', 'Detail\nDetails', 'ID Terkait\nRelated ID'];
      const tableRows = allActivityLogs.map((log, index) => [
        (index + 1).toString(),
        formatDate(log.createdAt),
        log.user?.name || 'Unknown',
        log.type.replace(/_/g, ' '),
        log.action,
        log.details || '-',
        log.itemSerial ? `Item: ${log.itemSerial}` : 
        log.rentalId ? `Rental: ${log.rentalId.substring(0, 8)}...` :
        log.calibrationId ? `Calibration: ${log.calibrationId.substring(0, 8)}...` :
        log.maintenanceId ? `Maintenance: ${log.maintenanceId.substring(0, 8)}...` :
        log.affectedUserId ? `User: ${log.affectedUserId.substring(0, 8)}...` :
        log.customerId ? `Customer: ${log.customerId.substring(0, 8)}...` : '-'
      ]);
      
      // Add table with improved styling and proper column widths
      autoTable(doc, {
        startY: yPos + 10,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { 
          fillColor: [41, 128, 185], // Professional blue color
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        styles: { 
          overflow: 'linebreak', 
          cellWidth: 'wrap',
          fontSize: 8,
          cellPadding: 3,
          valign: 'top'
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' }, // No.
          1: { cellWidth: 35, halign: 'center' }, // Date & Time
          2: { cellWidth: 30, halign: 'left' },   // User
          3: { cellWidth: 35, halign: 'center' }, // Type
          4: { cellWidth: 45, halign: 'left' },   // Activity
          5: { cellWidth: 70, halign: 'left' },   // Details
          6: { cellWidth: 40, halign: 'left' }    // Related ID
        },
        margin: { left: 14, right: 14 },
        didDrawPage: function (data) {
          // Add page numbers (simplified approach)
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          
          doc.setFontSize(8);
          doc.text(`Halaman ${data.pageNumber} | Page ${data.pageNumber}`, 
                   pageSize.width - 60, pageHeight - 10);
          
          // Add footer
          doc.text('PT PARAMATA - System Activity Report', 14, pageHeight - 10);
        }
      });
      
      // Save file with descriptive name
      const fileName = `PT_Paramata_System_Activity_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
      doc.save(fileName);
      
      setSuccess(`PDF report berhasil dibuat dengan ${allActivityLogs.length} records`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Gagal membuat PDF. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const getActivityTypeDisplayClass = (type: ActivityType): string => {
    if (type === ActivityType.LOGIN) {
      return 'bg-purple-100 text-purple-800';
    } else if (type.includes('CREATED')) {
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
          <h1 className="text-2xl font-bold">Riwayat Aktivitas Sistem</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFilters}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
            >
              <FiFilter size={16} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
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
            
            <button
              onClick={() => setShowClearModal(true)}
              disabled={loading || activityLogs.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-white ${
                loading || activityLogs.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <FiRefreshCw size={16} />
              Clear History
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
                  <option value={ActivityType.LOGIN}>Login</option>
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
                  <optgroup label="customer Activities">
                    <option value={ActivityType.customer_CREATED}>customer Created</option>
                    <option value={ActivityType.customer_UPDATED}>customer Updated</option>
                    <option value={ActivityType.customer_DELETED}>customer Deleted</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-1">
                    <FiUser size={16} className="text-gray-500" />
                    User
                  </div>
                </label>
                <input
                  type="text"
                  id="userId"
                  name="userId"
                  value={filters.userId}
                  onChange={handleFilterChange}
                  placeholder="Filter by user name or ID"
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
                        log.calibrationId ? `Calibration: ${log.calibrationId.substring(0, 8)}...` :
                        log.maintenanceId ? `Maintenance: ${log.maintenanceId.substring(0, 8)}...` :
                        log.affectedUserId ? `User: ${log.affectedUserId.substring(0, 8)}...` :
                        log.customerId ? `customer: ${log.customerId.substring(0, 8)}...` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {!loading && activityLogs.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{activityLogs.length}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                    pagination.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                    pagination.page >= pagination.totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clear History Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Konfirmasi Hapus Semua History
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus semua data history? 
              Tindakan ini tidak dapat dibatalkan dan akan menghapus semua record aktivitas sistem.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                disabled={loading}
              >
                Batal
              </button>
              <button
                onClick={clearAllHistory}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                disabled={loading}
              >
                {loading ? 'Menghapus...' : 'Ya, Hapus Semua'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}