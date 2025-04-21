'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiPlus, FiEdit2, FiTrash2, FiCheckCircle } from 'react-icons/fi';

// Updated interface to match InventoryCheck model
interface InventoryCheck {
  id: string;
  scheduledDate: string;
  completedDate: string | null;
  notes: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
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
    frequency: 'MONTHLY' as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
    nextDate: new Date().toISOString().split('T')[0]
  });
  const [isEditing, setIsEditing] = useState(false);
  const [performingInventory, setPerformingInventory] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<InventoryCheck | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
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
          frequency: formData.frequency,
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
        frequency: 'MONTHLY',
        nextDate: new Date().toISOString().split('T')[0]
      });
      setIsEditing(false);
      setShowForm(false);
      fetchSchedules();
      toast.success(isEditing ? 'Schedule updated successfully' : 'Schedule created successfully');
    } catch (err: any) {
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
      name: 'Inventory Check', // Default name
      description: schedule.notes || '',
      frequency: 'MONTHLY', // Default frequency
      nextDate
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/inventory-schedules/${id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete schedule');
      }
      
      fetchSchedules();
      toast.success('Schedule deleted successfully');
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete schedule. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelForm = () => {
    setFormData({ 
      id: '', 
      name: '', 
      description: '', 
      frequency: 'MONTHLY',
      nextDate: new Date().toISOString().split('T')[0]
    });
    setIsEditing(false);
    setShowForm(false);
  };

  const startInventoryCheck = (schedule: InventoryCheck) => {
    setSelectedSchedule(schedule);
    setPerformingInventory(true);
  };

  const cancelInventoryCheck = () => {
    setSelectedSchedule(null);
    setPerformingInventory(false);
  };

  const completeInventoryCheck = async () => {
    if (!selectedSchedule) return;
    
    try {
      setIsSubmitting(true);
      
      const res = await fetch(`/api/admin/inventory-schedules/perform-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleId: selectedSchedule.id
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete inventory check');
      }
      
      cancelInventoryCheck();
      fetchSchedules();
      toast.success('Inventory check completed successfully');
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Error completing inventory check';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Get frequency display name
  const getFrequencyDisplay = (frequency: string) => {
    switch (frequency) {
      case 'MONTHLY': return 'Monthly';
      case 'QUARTERLY': return 'Quarterly';
      case 'YEARLY': return 'Yearly';
      default: return frequency;
    }
  };

  return (
    <DashboardLayout>
    <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory Schedules</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/inventory"
            className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            Back to Inventory
          </Link>
          {!showForm && !performingInventory && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm flex items-center"
            >
              <FiPlus className="mr-1" /> Add Schedule
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
          <p>{successMessage}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-medium mb-4 text-green-700">
            {isEditing ? 'Edit Schedule' : 'Add New Inventory Schedule'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder=" "
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 peer"
                  required
                />
                <label
                  htmlFor="name"
                  className="absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-green-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-2 peer-focus:-top-2 peer-focus:text-green-600 peer-focus:text-xs"
                >
                  Schedule Name <span className="text-red-500">*</span>
                </label>
              </div>
              
              <div className="relative">
                <select
                  id="frequency"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleFormChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 appearance-none peer"
                  required
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
                <label
                  htmlFor="frequency"
                  className="absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-green-600 transition-all peer-focus:text-green-600"
                >
                  Frequency <span className="text-red-500">*</span>
                </label>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="mb-4 relative">
              <input
                type="date"
                id="nextDate"
                name="nextDate"
                value={formData.nextDate}
                onChange={handleFormChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 peer"
                required
              />
              <label
                htmlFor="nextDate"
                className="absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-green-600 transition-all peer-focus:text-green-600"
              >
                Next Scheduled Date <span className="text-red-500">*</span>
              </label>
            </div>
            
            <div className="mb-4 relative">
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                rows={3}
                placeholder=" "
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 peer"
              ></textarea>
              <label
                htmlFor="description"
                className="absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-green-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-2 peer-focus:-top-2 peer-focus:text-green-600 peer-focus:text-xs"
              >
                Description
              </label>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Schedule' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {performingInventory && selectedSchedule && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-medium mb-4 text-green-700">Perform Inventory Check</h2>
          <p className="mb-4">
            You are about to perform the inventory check scheduled for <strong>{formatDate(selectedSchedule.scheduledDate)}</strong>.
            This action will:
          </p>
          <ul className="list-disc pl-5 mb-4 text-gray-600">
            <li>Mark all items as verified today</li>
            <li>Record the check in item history</li>
            <li>Mark this schedule as completed</li>
          </ul>
          {selectedSchedule.notes && (
            <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm text-gray-600 font-medium">Notes:</p>
              <p className="text-sm text-gray-800">{selectedSchedule.notes}</p>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelInventoryCheck}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={completeInventoryCheck}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Processing...'
              ) : (
                <>
                  <FiCheckCircle className="mr-1" /> Complete Inventory Check
                </>
              )}
            </button>
          </div>
        </div>
      )}
            
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-500 mb-4">No inventory schedules found.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700"
          >
            <FiPlus className="inline mr-1" /> Create Your First Schedule
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-green-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                  Scheduled Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                  Notes
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-green-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatDate(schedule.scheduledDate)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      schedule.completedDate 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {schedule.completedDate ? 'Completed' : 'Scheduled'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{schedule.notes || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!schedule.completedDate && (
                      <>
                        <button
                          onClick={() => startInventoryCheck(schedule)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Perform Inventory Check"
                        >
                          <FiCheckCircle />
                        </button>
                        <button
                          onClick={() => handleEdit(schedule)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Edit Schedule"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Schedule"
                        >
                          <FiTrash2 />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
} 