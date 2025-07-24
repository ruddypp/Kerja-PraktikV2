'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiPlus, FiEdit2, FiTrash2, FiArrowLeft, FiLoader } from 'react-icons/fi';
import { useNotifications } from '@/app/context/NotificationContext';

// Updated interface to match InventoryCheck model
interface InventoryCheck {
  id: string;
  name: string | null;
  scheduledDate: string;
  completedDate: string | null;
  notes: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isRecurring: boolean;
  recurrenceType: string | null;
  nextDate: string | null;
  createdBy?: {
    name: string;
    role: string;
  };
}

export default function InventorySchedulesPage() {
  const [schedules, setSchedules] = useState<InventoryCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    nextDate: new Date().toISOString().split('T')[0],
    isRecurring: false,
    recurrenceType: 'MONTHLY' // Default to monthly
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const { triggerCronCheck } = useNotifications();

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/inventory-schedules');
      
      if (!res.ok) {
        throw new Error('Failed to fetch inventory schedules');
      }
      
      const data = await res.json();
      setSchedules(data);
    } catch (err) {
      setError('Error loading schedules. Please try again.');
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: checkbox.checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError('');
      
      const url = isEditing 
        ? `/api/admin/inventory-schedules/${formData.id}` 
        : '/api/admin/inventory-schedules';
      
      const method = isEditing ? 'PATCH' : 'POST';

      const nextDate = new Date(formData.nextDate).toISOString();

      console.log('Submitting form data:', {
        id: formData.id,
        name: formData.name,
        description: formData.description,
        nextDate
      });

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          nextDate
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save schedule');
      }
      
      // Reset form and refresh data
      setFormData({ 
        id: '', 
        name: '', 
        description: '', 
        nextDate: new Date().toISOString().split('T')[0],
        isRecurring: false,
        recurrenceType: 'MONTHLY'
      });
      setIsEditing(false);
      setShowForm(false);
      
      // Fetch schedules and then trigger a notification check
      await fetchSchedules();
      triggerCronCheck(true); // Proactively check for new notifications
      
      const message = isEditing ? 'Schedule updated successfully' : 'Schedule created successfully';
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 3000);
      toast.success(message);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save schedule. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (schedule: InventoryCheck) => {
    const nextDate = new Date(schedule.scheduledDate).toISOString().split('T')[0];
    
    setFormData({
      id: schedule.id,
      name: schedule.name || '',
      description: schedule.notes || '',
      nextDate,
      isRecurring: schedule.isRecurring || false,
      recurrenceType: schedule.recurrenceType || 'MONTHLY'
    });
    setIsEditing(true);
    setShowForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (id: string) => {
    setScheduleToDelete(id);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    
    try {
      setIsSubmitting(true);
      setError('');
      setSuccessMessage('');
      
      const res = await fetch(`/api/admin/inventory-schedules/${scheduleToDelete}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete schedule');
      }
      
      // Update the UI immediately by filtering out the deleted schedule
      setSchedules(prevSchedules => prevSchedules.filter(schedule => schedule.id !== scheduleToDelete));
      
      const message = 'Schedule deleted successfully';
      toast.success(message);
      
      // Reset all states immediately
      setShowDeleteConfirmation(false);
      setScheduleToDelete(null);
      setIsSubmitting(false);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete schedule. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Reset states even on error
      setShowDeleteConfirmation(false);
      setScheduleToDelete(null);
      setIsSubmitting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setScheduleToDelete(null);
    setIsSubmitting(false);
    setError('');
  };

  const cancelForm = () => {
    setFormData({ 
      id: '', 
      name: '', 
      description: '', 
      nextDate: new Date().toISOString().split('T')[0],
      isRecurring: false,
      recurrenceType: 'MONTHLY'
    });
    setIsEditing(false);
    setShowForm(false);
    setError('');
  };

  const clearForm = useCallback(() => {
    setFormData({
      id: '',
      name: '',
      description: '',
      nextDate: new Date().toISOString().split('T')[0],
      isRecurring: false,
      recurrenceType: 'MONTHLY'
    });
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Inventory Schedules</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/inventory"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
            >
              <FiArrowLeft size={16} />
              Back to Inventory
            </Link>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
              >
                <FiPlus size={16} />
                Add Schedule
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{isEditing ? 'Edit Schedule' : 'Create New Schedule'}</h2>
              <button
                onClick={cancelForm}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Cancel"
              >
                <FiArrowLeft size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Name*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="nextDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Date*
                </label>
                <input
                  type="date"
                  id="nextDate"
                  name="nextDate"
                  value={formData.nextDate}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    name="isRecurring"
                    checked={formData.isRecurring}
                    onChange={handleFormChange}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                    Recurring Schedule
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Recurring schedules will automatically be recreated at the specified interval
                </p>
              </div>

              {formData.isRecurring && (
                <div className="mb-4">
                  <label htmlFor="recurrenceType" className="block text-sm font-medium text-gray-700 mb-1">
                    Recurrence Type*
                  </label>
                  <select
                    id="recurrenceType"
                    name="recurrenceType"
                    value={formData.recurrenceType}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="mr-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <FiLoader className="animate-spin mr-2" /> Saving...
                    </>
                  ) : (
                    <>
                      <FiPlus className="mr-2" /> {isEditing ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {showDeleteConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="fixed inset-0 bg-transparent pointer-events-auto" 
              onClick={cancelDelete}
            ></div>
            <div className="bg-white rounded-lg p-6 max-w-md w-full pointer-events-auto relative z-10 shadow-xl">
              <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
              <p className="mb-6">Are you sure you want to delete this schedule? This action cannot be undone.</p>
              <div className="flex justify-end">
                <button
                  onClick={cancelDelete}
                  className="mr-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <FiLoader className="animate-spin mr-2" /> Deleting...
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="mr-2" /> Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {!showForm && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="p-6 text-center">
                <FiLoader className="animate-spin inline-block mr-2" /> Loading schedules...
              </div>
            ) : schedules.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No inventory schedules found.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-flex items-center"
                >
                  <FiPlus className="mr-2" /> Create First Schedule
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recurrence
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created By
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {schedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{schedule.name || 'Unnamed Schedule'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(schedule.scheduledDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {schedule.notes || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {schedule.isRecurring ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {schedule.recurrenceType === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                              </span>
                            ) : (
                              'One-time'
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {schedule.createdBy?.name || 'Unknown'}
                            {schedule.createdBy?.role === 'ADMIN' && 
                              <span className="ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Admin</span>
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(schedule)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit"
                            >
                              <FiEdit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(schedule.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
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
    </DashboardLayout>
  );
}