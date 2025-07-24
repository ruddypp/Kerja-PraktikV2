'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { FiArrowLeft, FiDownload, FiSave } from 'react-icons/fi';
import { format } from 'date-fns';

interface Calibration {
  id: number;
  certificateNumber: string | null;
  dueDate: string | null;
  completedDate: string | null;
  result: string | null;
  certificateUrl: string | null;
  customerId: number;
  statusId: number;
  createdAt: string;
  updatedAt: string;
  request: {
    id: number;
    notes: string | null;
    userId: number;
    itemId: number;
    statusId: number;
    createdAt: string;
    updatedAt: string;
    user: {
      id: number;
      name: string;
      email: string;
    };
    item: {
      id: number;
      name: string;
      serialNumber: string;
      category: {
        id: number;
        name: string;
      };
    };
    status: {
      id: number;
      name: string;
      type: string;
    };
  };
  status: {
    id: number;
    name: string;
    type: string;
  };
  customer: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  };
}

export default function CalibrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const calibrationId = params?.id as string;

  useEffect(() => {
    const fetchCalibration = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/user/calibrations/${calibrationId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch calibration');
        }
        
        const data = await response.json();
        setCalibration(data);
        setResult(data.result || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (calibrationId) {
      fetchCalibration();
    }
  }, [calibrationId]);

  const handleResultChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setResult(e.target.value);
  };

  const handleSaveResult = async () => {
    try {
      setSaving(true);
      
      const response = await fetch(`/api/user/calibrations/${calibrationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ result }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update calibration');
      }

      const updatedCalibration = await response.json();
      setCalibration(updatedCalibration);
      
      setAlert({
        show: true,
        message: 'Calibration notes updated successfully',
        type: 'success'
      });
      
      // Hide alert after 5 seconds
      setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 5000);
    } catch (err) {
      setAlert({
        show: true,
        message: err instanceof Error ? err.message : 'Failed to update calibration',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGoBack = () => {
    router.push('/user/calibrations');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd MMM yyyy');
  };

  const isCompleted = calibration?.status.name.toLowerCase() === 'completed';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-4">
          <button 
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
            onClick={handleGoBack}
          >
            <FiArrowLeft className="mr-2" /> Back to Calibrations
          </button>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!calibration) {
    return (
      <DashboardLayout>
        <div className="p-4">
          <button 
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
            onClick={handleGoBack}
          >
            <FiArrowLeft className="mr-2" /> Back to Calibrations
          </button>
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">Calibration not found</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4">
        <button 
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          onClick={handleGoBack}
        >
          <FiArrowLeft className="mr-2" /> Back to Calibrations
        </button>
        
        {alert.show && (
          <div className={`${alert.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'} px-4 py-3 rounded relative mb-4`} role="alert">
            <span className="block sm:inline">{alert.message}</span>
          </div>
        )}
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
          <div className={`${isCompleted ? 'bg-green-500' : 'bg-blue-500'} px-4 py-5 sm:px-6`}>
            <h3 className="text-lg leading-6 font-medium text-white">
              Calibration #{calibration.id}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-white opacity-90">
              Status: {calibration.status.name}
            </p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-3">Item Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <span className="text-sm font-medium text-gray-500">Item Name:</span>
                <p className="mt-1 text-sm text-gray-900">{calibration.request.item.name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Serial Number:</span>
                <p className="mt-1 text-sm text-gray-900">{calibration.request.item.serialNumber}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Category:</span>
                <p className="mt-1 text-sm text-gray-900">{calibration.request.item.category.name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Request Date:</span>
                <p className="mt-1 text-sm text-gray-900">{formatDate(calibration.request.createdAt)}</p>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4 mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Calibration Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-sm font-medium text-gray-500">customer:</span>
                  <p className="mt-1 text-sm text-gray-900">{calibration.customer.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Certificate Number:</span>
                  <p className="mt-1 text-sm text-gray-900">{calibration.certificateNumber || 'Not issued'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Completed Date:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(calibration.completedDate)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Due Date:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(calibration.dueDate)}</p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4 mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Request Notes</h4>
              <p className="text-sm text-gray-900">{calibration.request.notes || 'No notes provided'}</p>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Calibration Result Notes</h4>
              <textarea
                className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500"
                rows={4}
                value={result}
                onChange={handleResultChange}
                placeholder="Add your notes about the calibration result here"
              />
              
              <div className="mt-4 flex flex-wrap gap-3">
                <button 
                  onClick={handleSaveResult}
                  disabled={saving}
                  className="btn btn-primary flex items-center mt-2"
                >
                  {saving ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiSave className="mr-2" />
                      Save Notes
                    </>
                  )}
                </button>
                
                {isCompleted && calibration.certificateNumber && (
                  <button 
                    className="btn btn-primary flex items-center"
                    onClick={() => window.open(`/api/user/calibrations/${calibration.id}/certificate?format=pdf`, '_blank')}
                  >
                    <FiDownload className="mr-2" /> Download Certificate
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
