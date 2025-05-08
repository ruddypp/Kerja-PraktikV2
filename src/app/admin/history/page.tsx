'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
// @ts-expect-error jspdf-autotable doesn't have proper TypeScript types
import autoTable from 'jspdf-autotable';

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

export default function AdminHistoryPage() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const fetchActivityLogs = async () => {
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
  };

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  // Debounce filter changes to prevent too many API calls
  const debouncedFetchLogs = useCallback(
    debounce(() => {
      // Reset page to 1 when filters change
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchActivityLogs();
    }, 500),
    []
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

  return (
    <DashboardLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-title text-xl md:text-2xl">System Activity History</h1>
          <div className="space-x-2">
            <button
              onClick={generatePDF}
              className="btn btn-primary"
              disabled={loading || activityLogs.length === 0}
            >
              Export PDF
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{success}</p>
          </div>
        )}

        {/* Filters */}
        <div className="card mb-6 border border-gray-200 p-4">
          <h2 className="text-subtitle mb-4">Filter History</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="startDate" className="form-label">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="form-input w-full"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="form-label">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="form-input w-full"
              />
            </div>
            <div>
              <label htmlFor="activityType" className="form-label">
                Activity Type
              </label>
              <select
                id="activityType"
                name="activityType"
                value={filters.activityType}
                onChange={handleFilterChange}
                className="form-select w-full"
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
              <label htmlFor="userId" className="form-label">
                User ID
              </label>
              <input
                type="text"
                id="userId"
                name="userId"
                value={filters.userId}
                onChange={handleFilterChange}
                placeholder="Filter by user ID"
                className="form-input w-full"
              />
            </div>
            <div>
              <label htmlFor="itemSerial" className="form-label">
                Item Serial
              </label>
              <input
                type="text"
                id="itemSerial"
                name="itemSerial"
                value={filters.itemSerial}
                onChange={handleFilterChange}
                placeholder="Filter by item serial"
                className="form-input w-full"
              />
            </div>
            <div className="flex items-end">
              <div className="mt-6 space-x-2">
                <button onClick={resetFilters} className="btn btn-secondary">
                  Reset Filters
                </button>
                <button onClick={() => fetchActivityLogs()} className="btn btn-primary">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Display Activity Logs */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="loader"></div>
          </div>
        ) : activityLogs.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No activity logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Date & Time</th>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Activity</th>
                  <th className="px-4 py-2 text-left">Details</th>
                  <th className="px-4 py-2 text-left">Related ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3">{log.user?.name || 'Unknown'}</td>
                    <td className="px-4 py-3">{log.type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">{log.action}</td>
                    <td className="px-4 py-3">{log.details || '-'}</td>
                    <td className="px-4 py-3">
                      {log.itemSerial ? `Item: ${log.itemSerial}` : 
                       log.rentalId ? `Rental: ${log.rentalId.substring(0, 8)}...` :
                       log.calibrationId ? `Calibration: ${log.calibrationId.substring(0, 8)}...` :
                       log.maintenanceId ? `Maintenance: ${log.maintenanceId.substring(0, 8)}...` :
                       log.affectedUserId ? `User: ${log.affectedUser?.name || log.affectedUserId.substring(0, 8)}...` :
                       log.vendorId ? `Vendor: ${log.vendorId.substring(0, 8)}...` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <nav className="inline-flex">
              <button
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1}
                className="btn btn-icon btn-sm"
              >
                &laquo;
              </button>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="btn btn-icon btn-sm mx-1"
              >
                &lt;
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => handlePageChange(pageNum)}
                    className={`btn btn-sm mx-1 ${pagination.page === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="btn btn-icon btn-sm mx-1"
              >
                &gt;
              </button>
              <button
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
                className="btn btn-icon btn-sm"
              >
                &raquo;
              </button>
            </nav>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Debounce function to prevent too many API calls
function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
} 