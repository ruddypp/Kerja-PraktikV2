'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

interface InventorySchedule {
  id: number;
  name: string;
  description: string | null;
  frequency: string;
  nextDate: string;
}

export default function InventorySchedulesPage() {
  const [schedules, setSchedules] = useState<InventorySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    name: '',
    description: '',
    frequency: 'monthly',
    nextDate: new Date().toISOString().split('T')[0]
  });
  const [isEditing, setIsEditing] = useState(false);
  const [performingInventory, setPerformingInventory] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<InventorySchedule | null>(null);

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
        id: 0, 
        name: '', 
        description: '', 
        frequency: 'monthly',
        nextDate: new Date().toISOString().split('T')[0]
      });
      setIsEditing(false);
      setShowForm(false);
      fetchSchedules();
    } catch (err: any) {
      setError(err.message || 'Failed to save schedule. Please try again.');
    }
  };

  const handleEdit = (schedule: InventorySchedule) => {
    const nextDate = new Date(schedule.nextDate).toISOString().split('T')[0];
    
    setFormData({
      id: schedule.id,
      name: schedule.name,
      description: schedule.description || '',
      frequency: schedule.frequency,
      nextDate
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/inventory-schedules/${id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete schedule');
      }
      
      fetchSchedules();
    } catch (err: any) {
      setError(err.message || 'Failed to delete schedule. Please try again.');
    }
  };

  const cancelForm = () => {
    setFormData({ 
      id: 0, 
      name: '', 
      description: '', 
      frequency: 'monthly',
      nextDate: new Date().toISOString().split('T')[0]
    });
    setIsEditing(false);
    setShowForm(false);
  };

  const startInventoryCheck = (schedule: InventorySchedule) => {
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
      // Call API to record inventory check
      const res = await fetch(`/api/admin/inventory-schedules/${selectedSchedule.id}/perform-check`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to perform inventory check');
      }
      
      alert('Inventory check completed successfully!');
      setPerformingInventory(false);
      setSelectedSchedule(null);
      fetchSchedules();
    } catch (err: any) {
      setError(err.message || 'Failed to perform inventory check. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory Schedules</h1>
        <div className="flex space-x-4">
          <Link
            href="/admin/inventory"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Inventory
          </Link>
          {!showForm && !performingInventory && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Add Schedule
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-medium mb-4">
            {isEditing ? 'Edit Schedule' : 'Add New Inventory Schedule'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
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
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency*
                </label>
                <select
                  id="frequency"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleFormChange}
                  required
                  className="form-input"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label htmlFor="nextDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Next Date*
                </label>
                <input
                  type="date"
                  id="nextDate"
                  name="nextDate"
                  value={formData.nextDate}
                  onChange={handleFormChange}
                  required
                  className="form-input"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={3}
                  className="form-input"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {isEditing ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {performingInventory && selectedSchedule && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-medium mb-4">
            Perform Inventory Check: {selectedSchedule.name}
          </h2>
          <p className="mb-4 text-gray-700">
            This will initiate an inventory check which will:
          </p>
          <ul className="list-disc pl-5 mb-4 text-gray-700">
            <li>Update the last verified date for all items in the inventory</li>
            <li>Record the inventory check in the item history</li>
            <li>Reschedule the next inventory check based on frequency ({selectedSchedule.frequency})</li>
          </ul>
          <div className="flex space-x-4">
            <button
              onClick={completeInventoryCheck}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Complete Check
            </button>
            <button
              onClick={cancelInventoryCheck}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4">Loading schedules...</div>
      ) : schedules.length === 0 ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">No inventory schedules found. Add new schedules to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                  Next Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{schedule.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-800 max-w-xs">
                      {schedule.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm capitalize text-gray-800">
                      {schedule.frequency}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-800">
                      {formatDate(schedule.nextDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => startInventoryCheck(schedule)}
                      className="text-green-600 hover:text-green-900 mr-4"
                    >
                      Perform Check
                    </button>
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
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