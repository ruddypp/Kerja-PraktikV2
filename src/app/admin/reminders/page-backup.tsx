'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useUser } from '@/app/context/UserContext';

interface PaginationData {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface RemindersResponse {
  reminders: any[];
  pagination: PaginationData;
}

export default function AdminRemindersPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [reminders, setReminders] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait until user is loaded
    if (userLoading) return;
    
    // Redirect if not admin
    if (user === null) {
      router.push('/login');
      return;
    }
    
    if (user && user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }
  }, [user, router, userLoading]);

  // Fetch reminders with pagination
  const fetchReminders = useCallback(async (page: number, limit: number) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      const response = await fetch(`/api/admin/reminders?${params}`, {
        credentials: 'include', // Include cookies for auth
      });
      
      if (response.status === 401) {
        // Handle unauthorized specifically
        console.error('Unauthorized access - redirecting to login');
        router.push('/login');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: RemindersResponse = await response.json();
      console.log('Fetched reminders data:', data);
      
      // Ensure data.reminders is an array
      const remindersArray = Array.isArray(data.reminders) ? data.reminders : [];
      setReminders(remindersArray);
      
      // Update pagination state
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Error fetching reminders:', err);
      setError('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Initial fetch when user is loaded
  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchReminders(1, 20);
    }
  }, [user, fetchReminders]);

  // Separate effect for pagination changes
  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchReminders(pagination.page, pagination.limit);
    }
  }, [pagination.page, pagination.limit, user, fetchReminders]);

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(event.target.value);
    setPagination(prev => ({ ...prev, page: 1, limit: newLimit }));
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/reminders/${id}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for auth
      });

      if (response.status === 401) {
        // Handle unauthorized specifically
        console.error('Unauthorized access - redirecting to login');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Remove the deleted reminder from the list
      setReminders(reminders.filter(r => r.id !== id));
      
      // If current page becomes empty and it's not the first page, go to previous page
      if (reminders.length === 1 && pagination.page > 1) {
        setPagination(prev => ({ ...prev, page: prev.page - 1 }));
      } else {
        // Refresh the current page to update pagination info
        fetchReminders(pagination.page, pagination.limit);
      }
    } catch (err) {
      console.error('Error deleting reminder:', err);
      setError('Failed to delete reminder');
    }
  };

  // Tambahkan fungsi handleAcknowledgeReminder
  const handleAcknowledgeReminder = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/reminders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'ACKNOWLEDGED' }),
      });

      if (response.status === 401) {
        // Handle unauthorized specifically
        console.error('Unauthorized access - redirecting to login');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update reminder in the list
      setReminders(reminders.map(r => 
        r.id === id ? { ...r, status: 'ACKNOWLEDGED' } : r
      ));
    } catch (err) {
      console.error('Error acknowledging reminder:', err);
      setError('Failed to acknowledge reminder');
    }
  };

  const getReminderPath = (reminder: any) => {
    switch (reminder.type) {
      case 'CALIBRATION':
        return `/admin/calibrations/${reminder.calibrationId}`;
      case 'RENTAL':
        return `/admin/rentals/`;
      case 'MAINTENANCE':
        return `/admin/maintenance/${reminder.maintenanceId}`;
      case 'SCHEDULE':
        return `/admin/inventory/schedules`;
      default:
        return '#';
    }
  };

  // Calculate days remaining until due date
  const getDaysRemaining = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Get countdown display with appropriate color
  const getCountdownDisplay = (dueDate: string) => {
    const daysRemaining = getDaysRemaining(dueDate);
    
    if (daysRemaining < 0) {
      return <span className="text-red-600 font-bold">Terlambat {Math.abs(daysRemaining)} hari</span>;
    }
    
    if (daysRemaining === 0) {
      return <span className="text-red-600 font-bold">0 hari lagi</span>;
    }
    
    let colorClass = 'text-green-600';
    if (daysRemaining <= 7) {
      colorClass = 'text-red-600 font-bold';
    } else if (daysRemaining <= 30) {
      colorClass = 'text-orange-500';
    }
    
    return <span className={colorClass}>{daysRemaining} hari lagi</span>;
  };

  const getEmailLink = (reminder: any) => {
    if (reminder.type !== 'CALIBRATION' || !reminder.calibration || !reminder.calibration.customer) {
      return null;
    }
    
    const calibration = reminder.calibration;
    const customer = calibration.customer;
    
    if (!customer.contactEmail) return null;
    
    // Buat template email langsung di client-side tanpa memanggil API
    const dueDate = calibration.validUntil || calibration.calibrationDate;
    if (!dueDate) return null;
    
    const itemName = calibration.item?.name || 'Peralatan';
    const serialNumber = calibration.item?.serialNumber || 'Tidak diketahui';
    const partNumber = calibration.item?.partNumber || 'Tidak diketahui';
    const sensorInfo = calibration.item?.sensor ? `- Sensor: ${calibration.item.sensor}` : '';
    
    const subject = `Pengingat Kalibrasi: ${itemName} (${serialNumber})`;
    const body = `
Yth. ${customer.contactName || customer.name},

Kami ingin mengingatkan bahwa kalibrasi untuk peralatan ${itemName} (Nomor Seri: ${serialNumber}) akan jatuh tempo pada ${format(new Date(dueDate), 'dd MMM yyyy')}.

Mohon hubungi kami untuk menjadwalkan layanan kalibrasi.

Detail Peralatan:
- Nama: ${itemName}
- Nomor Seri: ${serialNumber}
- Nomor Part: ${partNumber}
${sensorInfo}

Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.

Salam hormat,
Tim Paramata
    `;
    
    // Gunakan Gmail URL scheme untuk membuka Gmail di browser
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(customer.contactEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    return gmailUrl;
  };

  const getStatusBadgeClass = (status: string, dueDate: string) => {
    // Check if the reminder is due today or past due
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const isDueOrPastDue = due.getTime() <= today.getTime();
    
    // For reminders that are due today or past due, show a special status
    if (isDueOrPastDue && status === 'PENDING') {
      return 'bg-red-100 text-red-800';
    }
    
    // Regular status classes
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      case 'ACKNOWLEDGED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReminderDetails = (reminder: any) => {
    switch (reminder.type) {
      case 'CALIBRATION': {
        const calibration = reminder.calibration;
        if (!calibration) return null;

        return {
          itemName: calibration.item?.name,
          serialNumber: calibration.item?.serialNumber,
          customer: calibration.customer?.name,
          dueDate: calibration.validUntil || calibration.calibrationDate,
        };
      }
      case 'RENTAL': {
        const rental = reminder.rental;
        if (!rental) return null;

        return {
          itemName: rental.item?.name,
          serialNumber: rental.item?.serialNumber,
          customer: rental.customer?.name,
          dueDate: rental.endDate,
        };
      }
      case 'MAINTENANCE': {
        const maintenance = reminder.maintenance;
        if (!maintenance) return null;

        return {
          itemName: maintenance.item?.name,
          serialNumber: maintenance.item?.serialNumber,
          dueDate: reminder.dueDate,
        };
      }
      case 'SCHEDULE': {
        const schedule = reminder.inventoryCheck;
        if (!schedule) return null;

        return {
          name: schedule.name || 'Inventory Check',
          dueDate: schedule.scheduledDate,
        };
      }
      default:
        return null;
    }
  };

  if (userLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Reminders</h1>
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p>Loading user information...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Reminders</h1>
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p>Loading reminders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Reminders</h1>
        <div className="bg-white shadow rounded-lg p-6 text-center text-red-600">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Reminders</h1>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Semua Reminder</h2>
        </div>

        {reminders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Tidak ada reminder
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detail
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal Jatuh Tempo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Countdown
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reminders.map((reminder) => {
                  const details = getReminderDetails(reminder);
                  const reminderPath = getReminderPath(reminder);
                  const emailLink = getEmailLink(reminder);
                  
                  return (
                    <tr key={reminder.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100">
                          {reminder.type === 'CALIBRATION' ? 'KALIBRASI' : 
                           reminder.type === 'RENTAL' ? 'RENTAL' : 
                           reminder.type === 'MAINTENANCE' ? 'MAINTENANCE' :
                           'JADWAL'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{reminder.title}</div>
                        <div className="text-sm text-gray-500">{reminder.message}</div>
                        
                        {details && (
                          <div className="mt-1 text-xs text-gray-500">
                            {details.itemName && (
                              <div>Item: {details.itemName} {details.serialNumber && `(${details.serialNumber})`}</div>
                            )}
                            {details.customer && <div>Customer: {details.customer}</div>}
                            {details.name && <div>Jadwal: {details.name}</div>}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(reminder.dueDate), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {details && details.dueDate && getCountdownDisplay(details.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(reminder.status, reminder.dueDate)}`}>
                          {reminder.status === 'PENDING' 
                            ? (getDaysRemaining(reminder.dueDate) <= 0 ? 'JATUH TEMPO' : 'MENUNGGU')
                            : reminder.status === 'SENT' 
                              ? 'TERKIRIM' 
                              : 'DIAKUI'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-2">
                          <div className="flex space-x-2">
                            {reminderPath !== '#' && (
                              <Link
                                href={reminderPath}
                                className="px-3 py-1 bg-blue-500 text-white rounded-md text-center hover:bg-blue-600 transition-colors"
                              >
                                Lihat Detail
                              </Link>
                            )}
                            
                            <button
                              onClick={() => handleDeleteReminder(reminder.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded-md text-center hover:bg-red-600 transition-colors"
                            >
                              Hapus
                            </button>
                          </div>
                          
                          {reminder.status !== 'ACKNOWLEDGED' ? (
                            <button
                              onClick={() => handleAcknowledgeReminder(reminder.id)}
                              className="px-3 py-1 bg-green-500 text-white rounded-md text-center hover:bg-green-600 transition-colors flex items-center justify-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Tandai Sudah
                            </button>
                          ) : (
                            <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-md text-center flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Sudah Ditandai
                            </span>
                          )}
                          
                          {emailLink && (
                            <a
                              href={emailLink}
                              className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-xs flex items-center justify-center"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                // Track that the email was sent
                                fetch(`/api/admin/reminders/${reminder.id}/email-template`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include'
                                }).catch(err => console.error('Error marking email as sent:', err));
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Kirim Email
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {pagination.totalPages > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700 flex items-center">
                <span className="mr-2">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} reminders
                </span>
                <select 
                  value={pagination.limit} 
                  onChange={handleLimitChange}
                  className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  aria-label="Number of items per page"
                >
                  <option value="10">10 per page</option>
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
              </div>
              
              {pagination.totalPages > 1 && (
                <div className="flex space-x-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.page === 1}
                    className={`px-3 py-1 rounded ${pagination.page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    title="First page"
                  >
                    &laquo;
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`px-3 py-1 rounded ${pagination.page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    title="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === pagination.totalPages || 
                      (page >= pagination.page - 1 && page <= pagination.page + 1)
                    )
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-1 text-gray-500">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 rounded ${pagination.page === page ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                          {page}
                        </button>
                      </div>
                    ))}

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className={`px-3 py-1 rounded ${pagination.page === pagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    title="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.page === pagination.totalPages}
                    className={`px-3 py-1 rounded ${pagination.page === pagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    title="Last page"
                  >
                    &raquo;
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 