'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiPlus, FiEdit2, FiTrash2, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';

// Updated interface to match InventoryCheck model with recurring fields
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
  frequency: 'MONTHLY' | 'YEARLY' | null;
  nextScheduleDate: string | null;
  lastNotificationSent: string | null;
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
    isRecurring: false,
    frequency: 'MONTHLY' as 'MONTHLY' | 'YEARLY',
    nextDate: new Date().toISOString().split('T')[0]
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

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

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          isRecurring: formData.isRecurring,
          frequency: formData.isRecurring ? formData.frequency : null,
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
        isRecurring: false,
        frequency: 'MONTHLY',
        nextDate: new Date().toISOString().split('T')[0]
      });
      setIsEditing(false);
      setShowForm(false);
      fetchSchedules();
      
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
      isRecurring: schedule.isRecurring || false,
      frequency: schedule.frequency || 'MONTHLY',
      nextDate
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
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 3000);
      toast.success(message);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete schedule. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      
      // If there was an error, refresh the schedules to ensure UI is in sync
      fetchSchedules();
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirmation(false);
      setScheduleToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setScheduleToDelete(null);
  };

  const cancelForm = () => {
    setFormData({ 
      id: '', 
      name: '', 
      description: '', 
      isRecurring: false,
      frequency: 'MONTHLY',
      nextDate: new Date().toISOString().split('T')[0]
    });
    setIsEditing(false);
    setShowForm(false);
    setError('');
  };

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
            <button
              onClick={() => fetchSchedules()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
              disabled={loading}
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} size={16} />
              {loading ? "Loading..." : "Refresh"}
            </button>
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

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
            {successMessage}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg border border-gray-100 p-4 md:p-6">
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="frequency"
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleFormChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="nextDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Next Scheduled Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="nextDate"
                  name="nextDate"
                  value={formData.nextDate}
                  onChange={handleFormChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : isEditing ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        )}

        {showDeleteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
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
                      <FiRefreshCw className="animate-spin mr-2" /> Deleting...
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
                <FiRefreshCw className="animate-spin inline-block mr-2" /> Loading schedules...
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
                        Recurring
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
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
                          {schedule.nextScheduleDate && (
                            <div className="text-sm text-gray-500">
                              Next: {new Date(schedule.nextScheduleDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {schedule.isRecurring ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {schedule.frequency === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              One-time
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {schedule.notes || '-'}
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