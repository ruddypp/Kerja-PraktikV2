'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
// @ts-expect-error jspdf-autotable doesn't have proper TypeScript types
import autoTable from 'jspdf-autotable';

interface ActivityLog {
  id: number;
  userId: number;
  activity: string;
  createdAt: string;
}

export default function UserHistoryPage() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    activityType: ''
  });

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      
      // Build query params for filtering
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.activityType) params.append('activityType', filters.activityType);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      const res = await fetch(`/api/user/activity-logs${queryString}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch activity logs: ${res.statusText}`);
      }
      
      const data = await res.json();
      setActivityLogs(data);
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

  useEffect(() => {
    const applyFilters = async () => {
      try {
        await fetchActivityLogs();
      } catch (error) {
        console.error('Error applying filters:', error);
      }
    };
    
    applyFilters();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      activityType: ''
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
      doc.text('Activity Report', 14, 15);
      
      // Add filters information
      doc.setFontSize(10);
      let yPos = 25;
      
      doc.text(`Created on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, yPos);
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
        doc.text(`Activity Type: ${filters.activityType}`, 14, yPos);
        yPos += 5;
      }
      
      // Table data
      const tableColumn = ['#', 'Date & Time', 'Activity'];
      const tableRows = activityLogs.map((log, index) => [
        (index + 1).toString(),
        formatDate(log.createdAt),
        log.activity
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
          1: { cellWidth: 50 },
          2: { cellWidth: 'auto' }
        }
      });
      
      // Save file
      doc.save('activity-history.pdf');
      
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
          <h1 className="text-title text-xl md:text-2xl">Activity History</h1>
          <button
            onClick={generatePDF}
            className="btn btn-primary"
            disabled={loading || activityLogs.length === 0}
          >
            Export PDF
          </button>
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
        <div className="card mb-6 border border-gray-200">
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
                className="form-input"
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
                className="form-input"
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
                className="form-input"
              >
                <option value="">All Activities</option>
                <option value="request">Request</option>
                <option value="rental">Rental</option>
                <option value="calibration">Calibration</option>
                <option value="return">Return</option>
              </select>
            </div>
            <div className="flex items-end md:col-span-3">
              <button
                onClick={resetFilters}
                className="btn btn-secondary"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-subtitle">Loading activity history...</p>
          </div>
        ) : activityLogs.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
            <p className="text-yellow-700 font-medium">No activity history found. Please change your filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="table-container bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="table-header">#</th>
                    <th className="table-header">Date & Time</th>
                    <th className="table-header">Activity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activityLogs.map((log, index) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="table-cell text-center">{index + 1}</td>
                      <td className="table-cell whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="table-cell">{log.activity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 