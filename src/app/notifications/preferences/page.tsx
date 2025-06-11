'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useNotifications, NotificationPreferences } from '@/app/context/NotificationContext';
import { useUser } from '@/app/context/UserContext';
import { useRouter } from 'next/navigation';

export default function NotificationPreferencesPage() {
  const { preferences, updatePreferences, requestPushPermission } = useNotifications();
  const { user, loading } = useUser();
  const router = useRouter();
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pushSupported, setPushSupported] = useState(false);

  // Check if push is supported
  useEffect(() => {
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Set local preferences when global preferences change
  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  if (loading || !localPreferences) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const handleToggleChange = (key: keyof NotificationPreferences) => {
    setLocalPreferences(prev => 
      prev ? { ...prev, [key]: !prev[key] } : null
    );
  };

  const handleSavePreferences = async () => {
    if (!localPreferences) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // If user is enabling push notifications and they weren't enabled before
      if (localPreferences.pushNotifications && !preferences?.pushNotifications) {
        // Request permission first
        const permissionGranted = await requestPushPermission();
        if (!permissionGranted) {
          // If permission denied, revert the toggle
          setLocalPreferences(prev => 
            prev ? { ...prev, pushNotifications: false } : null
          );
          setError('Izin notifikasi push ditolak. Silakan ubah pengaturan browser Anda.');
          setIsSaving(false);
          return;
        }
      }

      // Update preferences
      await updatePreferences(localPreferences);
      setSuccessMessage('Preferensi notifikasi berhasil disimpan');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError('Gagal menyimpan preferensi notifikasi');
      console.error('Error saving preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan Notifikasi</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {successMessage}
          </div>
        )}

        <div className="bg-white p-6 rounded-md border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Jenis Notifikasi</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Notifikasi Rental</h3>
                <p className="text-sm text-gray-500">Terima notifikasi tentang permintaan dan status rental</p>
              </div>
              <div className="relative inline-block w-12 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="rentalNotifications"
                  checked={localPreferences.rentalNotifications}
                  onChange={() => handleToggleChange('rentalNotifications')}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label
                  htmlFor="rentalNotifications"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    localPreferences.rentalNotifications ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                ></label>
              </div>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Notifikasi Kalibrasi</h3>
                <p className="text-sm text-gray-500">Terima notifikasi tentang jadwal dan status kalibrasi</p>
              </div>
              <div className="relative inline-block w-12 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="calibrationNotifications"
                  checked={localPreferences.calibrationNotifications}
                  onChange={() => handleToggleChange('calibrationNotifications')}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label
                  htmlFor="calibrationNotifications"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    localPreferences.calibrationNotifications ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                ></label>
              </div>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Notifikasi Maintenance</h3>
                <p className="text-sm text-gray-500">Terima notifikasi tentang jadwal dan status maintenance</p>
              </div>
              <div className="relative inline-block w-12 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="maintenanceNotifications"
                  checked={localPreferences.maintenanceNotifications}
                  onChange={() => handleToggleChange('maintenanceNotifications')}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label
                  htmlFor="maintenanceNotifications"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    localPreferences.maintenanceNotifications ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                ></label>
              </div>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Notifikasi Inventaris</h3>
                <p className="text-sm text-gray-500">Terima notifikasi tentang jadwal inventarisasi</p>
              </div>
              <div className="relative inline-block w-12 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="inventoryNotifications"
                  checked={localPreferences.inventoryNotifications}
                  onChange={() => handleToggleChange('inventoryNotifications')}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label
                  htmlFor="inventoryNotifications"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    localPreferences.inventoryNotifications ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                ></label>
              </div>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Notifikasi Sistem</h3>
                <p className="text-sm text-gray-500">Terima notifikasi tentang update sistem dan informasi penting lainnya</p>
              </div>
              <div className="relative inline-block w-12 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="systemNotifications"
                  checked={localPreferences.systemNotifications}
                  onChange={() => handleToggleChange('systemNotifications')}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label
                  htmlFor="systemNotifications"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    localPreferences.systemNotifications ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                ></label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-md border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Saluran Notifikasi</h2>
          
          <div className="space-y-4">
            {pushSupported && (
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Notifikasi Push</h3>
                  <p className="text-sm text-gray-500">Terima notifikasi push melalui browser bahkan saat aplikasi tidak terbuka</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    id="pushNotifications"
                    checked={localPreferences.pushNotifications}
                    onChange={() => handleToggleChange('pushNotifications')}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  />
                  <label
                    htmlFor="pushNotifications"
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                      localPreferences.pushNotifications ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  ></label>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Notifikasi Email</h3>
                <p className="text-sm text-gray-500">Terima notifikasi penting melalui email</p>
              </div>
              <div className="relative inline-block w-12 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  checked={localPreferences.emailNotifications}
                  onChange={() => handleToggleChange('emailNotifications')}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label
                  htmlFor="emailNotifications"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    localPreferences.emailNotifications ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                ></label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSavePreferences}
            disabled={isSaving}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isSaving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
            }`}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
              </>
            ) : (
              'Simpan Pengaturan'
            )}
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .toggle-checkbox:checked {
          right: 0;
          border-color: white;
        }
        .toggle-checkbox:checked + .toggle-label {
          background-color: #10b981;
        }
        .toggle-checkbox {
          right: 0;
          z-index: 1;
          border-color: #e5e7eb;
          transition: all 0.3s;
        }
        .toggle-label {
          display: block;
          overflow: hidden;
          cursor: pointer;
          border-radius: 9999px;
          transition: all 0.3s;
        }
      `}</style>
    </DashboardLayout>
  );
} 