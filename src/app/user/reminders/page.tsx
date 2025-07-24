'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import { useUser } from '@/app/context/UserContext';
import { differenceInDays } from 'date-fns';

export default function UserRemindersPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait until user is loaded
    if (userLoading) return;
    
    // Redirect if not logged in
    if (user === null) {
      router.push('/login');
      return;
    }

    // Fetch reminders
    const fetchReminders = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user/reminders', {
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
        
        const data = await response.json();
        console.log('Fetched reminders data:', data);
        
        // Ensure data.reminders is an array
        const remindersArray = Array.isArray(data.reminders) ? data.reminders : [];
        setReminders(remindersArray);
      } catch (err) {
        console.error('Error fetching reminders:', err);
        setError('Failed to load reminders');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchReminders();
    }
  }, [user, router, userLoading]);

  const getReminderPath = (reminder: any) => {
    switch (reminder.type) {
      case 'CALIBRATION':
        return `/user/calibrations/${reminder.calibrationId}`;
      case 'RENTAL':
        return `/user/rentals`;
      case 'MAINTENANCE':
        return `/user/maintenance/${reminder.maintenanceId}`;
      case 'SCHEDULE':
        return `/user/barang`;
      default:
        return '#';
    }
  };

  const getStatusBadgeClass = (status: string) => {
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

  const handleAcknowledgeReminder = async (id: string) => {
    try {
      const response = await fetch(`/api/user/reminders/${id}`, {
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

  // Calculate days remaining until due date
  const getDaysRemaining = (dueDate: string | Date | undefined) => {
    if (!dueDate) return null;
    
    try {
      const today = new Date();
      const due = new Date(dueDate);
      return differenceInDays(due, today);
    } catch (error) {
      console.error('Error calculating days remaining:', error);
      return null;
    }
  };

  // Get countdown display with appropriate color
  const getCountdownDisplay = (dueDate: string | Date | undefined) => {
    if (!dueDate) return null;
    
    try {
      const daysRemaining = getDaysRemaining(dueDate);
      
      if (daysRemaining === null) return null;
      
      let colorClass = 'text-green-600';
      if (daysRemaining <= 7) {
        colorClass = 'text-red-600 font-bold';
      } else if (daysRemaining <= 30) {
        colorClass = 'text-orange-500';
      }
      
      if (daysRemaining < 0) {
        return <span className="text-red-600 font-bold">Terlambat {Math.abs(daysRemaining)} hari</span>;
      }
      
      return <span className={colorClass}>{daysRemaining} hari lagi</span>;
    } catch (error) {
      console.error('Error generating countdown display:', error);
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
          <h2 className="text-lg font-medium">All Reminders</h2>
        </div>

        {reminders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No reminders found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reminder Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Countdown
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reminders.map((reminder) => {
                  const details = getReminderDetails(reminder);
                  const reminderPath = getReminderPath(reminder);
                  
                  return (
                    <tr key={reminder.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100">
                          {reminder.type}
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
                            {details.name && <div>Schedule: {details.name}</div>}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reminder.dueDate ? format(new Date(reminder.dueDate), 'dd MMM yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reminder.reminderDate ? format(new Date(reminder.reminderDate), 'dd MMM yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(reminder.status)}`}>
                          {reminder.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {details && details.dueDate && getCountdownDisplay(details.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-2">
                          {reminderPath !== '#' && (
                            <Link
                              href={reminderPath}
                              className="px-3 py-1 bg-blue-500 text-white rounded-md text-center hover:bg-blue-600 transition-colors"
                            >
                              Lihat Detail
                            </Link>
                          )}
                          
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 