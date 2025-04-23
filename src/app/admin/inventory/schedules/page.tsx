'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiPlus, FiEdit2, FiTrash2, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';

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
      name: 'Inventory Check', // Default name
      description: schedule.notes || '',
      frequency: 'MONTHLY', // Default frequency
      nextDate
    });
    setIsEditing(true);
    setShowForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      const res = await fetch(`/api/admin/inventory-schedules/${id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete schedule');
      }
      
      fetchSchedules();
      
      const message = 'Schedule deleted successfully';
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 3000);
      toast.success(message);
    } catch (err: unknown) {
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
    setError('');
  };

  const startInventoryCheck = (schedule: InventoryCheck) => {
    setSelectedSchedule(schedule);
    setPerformingInventory(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelInventoryCheck = () => {
    setSelectedSchedule(null);
    setPerformingInventory(false);
  };

  const completeInventoryCheck = async () => {
    if (!selectedSchedule) return;
    
    try {
      setIsSubmitting(true);
      setError('');
      
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
      
      const message = 'Inventory check completed successfully';
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 3000);
      toast.success(message);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error completing inventory check';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory Schedules</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/inventory"
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
              <FiArrowLeft className="mr-2" /> Back to Inventory
          </Link>
          {!showForm && !performingInventory && (
            <button
              onClick={() => setShowForm(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
            >
                <FiPlus className="mr-2" /> Add Schedule
            </button>
          )}
        </div>
      </div>

      {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-sm animate-fadeIn" role="alert">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm-1-5a1 1 0 112 0v2a1 1 0 11-2 0v-2zm0-6a1 1 0 112 0v2a1 1 0 11-2 0V5z" clipRule="evenodd" />
              </svg>
              <p className="font-medium">{error}</p>
            </div>
        </div>
      )}

      {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md shadow-sm animate-fadeIn" role="alert">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.707-6.707a1 1 0 011.414 0L11 12.586V8a1 1 0 112 0v4.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <p className="font-medium">{successMessage}</p>
            </div>
        </div>
      )}

      {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6 animate-fadeIn">
            <h2 className="text-lg font-medium mb-4 text-green-700 border-b pb-2">
            {isEditing ? 'Edit Schedule' : 'Add New Inventory Schedule'}
          </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
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
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  required
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
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
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 inline-flex items-center"
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

        {performingInventory && selectedSchedule && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6 animate-fadeIn">
            <h2 className="text-lg font-medium mb-4 text-green-700 border-b pb-2">Perform Inventory Check</h2>
            <div className="rounded-md bg-blue-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    You are about to perform the inventory check scheduled for <span className="font-semibold">{formatDate(selectedSchedule.scheduledDate)}</span>.
                  </p>
                </div>
              </div>
            </div>
            
            <p className="mb-4 text-gray-600">This action will:</p>
            <ul className="list-disc pl-5 mb-4 text-gray-600 space-y-1">
              <li>Mark all items as verified today</li>
              <li>Record the check in item history</li>
              <li>Mark this schedule as completed</li>
            </ul>
            
            {selectedSchedule.notes && (
              <div className="mb-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-1">Notes:</p>
                <p className="text-sm text-gray-800">{selectedSchedule.notes}</p>
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-2">
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
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <FiCheckCircle className="mr-2" /> Complete Inventory Check
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
            <FiCalendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No inventory schedules found.</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 inline-flex items-center"
            >
              <FiPlus className="mr-2" /> Create Your First Schedule
            </button>
        </div>
      ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scheduled Date
                </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.map((schedule) => (
                    <tr key={schedule.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatDate(schedule.scheduledDate)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          schedule.completedDate 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {schedule.completedDate ? 'Completed' : 'Scheduled'}
                        </span>
                  </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-md truncate">
                          {schedule.notes || 'No notes provided'}
                    </div>
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {!schedule.completedDate && (
                          <div className="flex justify-end items-center space-x-3">
                      <button
                        onClick={() => startInventoryCheck(schedule)}
                              className="text-indigo-600 hover:text-indigo-900 transition-colors"
                              title="Perform Inventory Check"
                            >
                              <div className="flex items-center">
                                <FiCheckCircle className="w-5 h-5" />
                              </div>
                      </button>
                      <button
                        onClick={() => handleEdit(schedule)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="Edit Schedule"
                            >
                              <div className="flex items-center">
                                <FiEdit2 className="w-5 h-5" />
                              </div>
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Delete Schedule"
                            >
                              <div className="flex items-center">
                                <FiTrash2 className="w-5 h-5" />
                              </div>
                      </button>
                    </div>
                        )}
                  </td>
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