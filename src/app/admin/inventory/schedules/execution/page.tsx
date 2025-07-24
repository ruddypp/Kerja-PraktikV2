'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Item {
  id: number;
  name: string;
  serialNumber: string | null;
  categoryName: string;
  status: string;
  lastVerifiedDate: string | null;
  verified: boolean;
}

interface InventoryExecution {
  id: number;
  name: string;
  scheduleId: number;
  scheduleName: string;
  date: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  items: Item[];
}

function InventoryExecutionComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scheduleId = searchParams.get('scheduleId');
  const executionId = searchParams.get('executionId');
  
  const [execution, setExecution] = useState<InventoryExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [showUnverifiedOnly, setShowUnverifiedOnly] = useState(false);
  
  // Fetch execution details or create a new one
  useEffect(() => {
    const fetchOrCreateExecution = async () => {
      // If there's no scheduleId at all, we can't proceed.
      if (!scheduleId && !executionId) {
        setError('No schedule selected. Please go back and choose a schedule to execute.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        if (executionId) {
          // Fetch existing execution
          const res = await fetch(`/api/admin/inventory-schedules/execution/${executionId}`);
          
          if (!res.ok) {
            throw new Error('Failed to fetch inventory execution');
          }
          
          const data = await res.json();
          setExecution(data);
          setItems(data.items);
        } else if (scheduleId) {
          // Create new execution
          const res = await fetch('/api/admin/inventory-schedules/execution', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              scheduleId: parseInt(scheduleId)
            })
          });
          
          if (!res.ok) {
            throw new Error('Failed to create inventory execution');
          }
          
          const data = await res.json();
          setExecution(data);
          setItems(data.items);
          
          // Update URL with the new execution ID
          router.replace(`/admin/inventory/schedules/execution?scheduleId=${scheduleId}&executionId=${data.id}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        toast.error(errorMessage);
        // console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrCreateExecution();
  }, [scheduleId, executionId, router]);
  
  const handleVerifyItem = (itemId: number) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, verified: !item.verified } : item
      )
    );
  };
  
  const handleVerifyAll = () => {
    setItems(prevItems =>
      prevItems.map(item => ({ ...item, verified: true }))
    );
  };
  
  const handleUnverifyAll = () => {
    setItems(prevItems =>
      prevItems.map(item => ({ ...item, verified: false }))
    );
  };
  
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const res = await fetch(`/api/admin/inventory-schedules/execution/${execution?.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            verified: item.verified
          }))
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to complete inventory check');
      }
      
      toast.success('Inventory check completed successfully');
      
      // Redirect back to schedules page after a short delay
      setTimeout(() => {
        router.push('/admin/inventory/schedules');
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
      // console.error('Error completing inventory check:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Filter items based on search query and verified status
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (showVerifiedOnly && !item.verified) return false;
    if (showUnverifiedOnly && item.verified) return false;
    
    return matchesSearch;
  });
  
  // Calculate progress
  const verifiedCount = items.filter(item => item.verified).length;
  const progress = items.length > 0 ? Math.round((verifiedCount / items.length) * 100) : 0;
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory Execution</h1>
        <Link
          href="/admin/inventory/schedules"
          className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          Back to Schedules
        </Link>
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
      
      {loading ? (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 text-center">
          <p className="text-gray-700">Loading inventory execution...</p>
        </div>
      ) : execution ? (
        <>
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900">{execution.name}</h2>
                <p className="text-sm text-gray-600">Schedule: {execution.scheduleName}</p>
                <p className="text-sm text-gray-600">Date: {formatDate(execution.date)}</p>
              </div>
              <div className="flex flex-col items-end justify-center">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Progress: {verifiedCount} of {items.length} items verified ({progress}%)
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search Items
                </label>
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, serial number, category..."
                  className="form-input w-full"
                />
              </div>
              <div className="col-span-1 md:col-span-2 flex items-end space-x-2">
                <button
                  onClick={handleVerifyAll}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Verify All
                </button>
                <button
                  onClick={handleUnverifyAll}
                  className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                >
                  Unverify All
                </button>
                <div className="flex items-center ml-4">
                  <input
                    type="checkbox"
                    id="showVerified"
                    checked={showVerifiedOnly}
                    onChange={() => {
                      setShowVerifiedOnly(!showVerifiedOnly);
                      if (!showVerifiedOnly) setShowUnverifiedOnly(false);
                    }}
                    className="mr-2"
                  />
                  <label htmlFor="showVerified" className="text-sm text-gray-700">
                    Verified Only
                  </label>
                </div>
                <div className="flex items-center ml-4">
                  <input
                    type="checkbox"
                    id="showUnverified"
                    checked={showUnverifiedOnly}
                    onChange={() => {
                      setShowUnverifiedOnly(!showUnverifiedOnly);
                      if (!showUnverifiedOnly) setShowVerifiedOnly(false);
                    }}
                    className="mr-2"
                  />
                  <label htmlFor="showUnverified" className="text-sm text-gray-700">
                    Unverified Only
                  </label>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Serial Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Verified
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verified
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No items found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className={item.verified ? 'bg-green-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.categoryName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.serialNumber || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span 
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium
                              ${item.status === 'AVAILABLE' && 'bg-green-100 text-green-800'}
                              ${item.status === 'IN_USE' && 'bg-yellow-100 text-yellow-800'}
                              ${item.status === 'IN_CALIBRATION' && 'bg-blue-100 text-blue-800'}
                              ${item.status === 'IN_RENTAL' && 'bg-purple-100 text-purple-800'}
                              ${item.status === 'IN_MAINTENANCE' && 'bg-red-100 text-red-800'}
                            `}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.lastVerifiedDate ? formatDate(item.lastVerifiedDate) : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            id={`verify-${item.id}`}
                            checked={item.verified}
                            onChange={() => handleVerifyItem(item.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            title={`Mark ${item.name} as verified`}
                          />
                          <label htmlFor={`verify-${item.id}`} className="sr-only">
                            Verify {item.name}
                          </label>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || verifiedCount === 0}
                className={`px-4 py-2 rounded-md text-white ${
                  isSubmitting || verifiedCount === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? 'Completing...' : 'Complete Inventory Check'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">No inventory execution found. Please go back and select a schedule.</p>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function InventoryExecutionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InventoryExecutionComponent />
    </Suspense>
  );
} 