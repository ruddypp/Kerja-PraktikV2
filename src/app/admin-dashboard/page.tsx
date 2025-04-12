import DashboardLayout from '@/components/DashboardLayout';
import { getDashboardStats } from './utils';

export default async function AdminDashboard() {
  const stats = await getDashboardStats();
  
  // Set default values in case API fails
  const totalItems = stats?.totalItems || 0;
  const statusMap = stats?.statusMap || {};
  
  // Get counts for different statuses (lowercase status names for consistency)
  const availableCount = statusMap['available'] || 0;
  const inUseCount = statusMap['in use'] || 0;
  const maintenanceCount = statusMap['maintenance'] || 0;
  const rentedCount = statusMap['rented'] || 0;
  const inCalibrationCount = statusMap['in calibration'] || 0;
  const approvedCount = statusMap['approved'] || 0;
  const pendingCount = statusMap['pending'] || 0;
  const rejectedCount = statusMap['rejected'] || 0;
  const completedCount = statusMap['completed'] || 0;
  const damagedCount = statusMap['damaged'] || 0;

  return (
    <DashboardLayout>
      <div className="px-2 sm:px-0">
        <h1 className="text-title text-xl md:text-2xl mb-6">Dashboard</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="card border-l-4 border-green-600 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-subtitle">Total Items</p>
                <p className="text-2xl font-bold text-green-700">{totalItems}</p>
              </div>
            </div>
          </div>
          
          <div className="card border-l-4 border-blue-600 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-subtitle">Available</p>
                <p className="text-2xl font-bold text-blue-700">{availableCount}</p>
              </div>
            </div>
          </div>
          
          <div className="card border-l-4 border-yellow-600 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-subtitle">In Use</p>
                <p className="text-2xl font-bold text-yellow-700">{inUseCount}</p>
              </div>
            </div>
          </div>
          
          <div className="card border-l-4 border-red-600 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-subtitle">Maintenance</p>
                <p className="text-2xl font-bold text-red-700">{maintenanceCount}</p>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-title text-lg md:text-xl mb-4">Status Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-8">
          <div className="card border-l-4 border-purple-600 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <p className="text-subtitle">Rented</p>
                <p className="text-2xl font-bold text-purple-700">{rentedCount}</p>
              </div>
            </div>
          </div>

          <div className="card border-l-4 border-indigo-600 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-indigo-100 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-subtitle">In Calibration</p>
                <p className="text-2xl font-bold text-indigo-700">{inCalibrationCount}</p>
              </div>
            </div>
          </div>

          <div className="card border-l-4 border-green-600 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-subtitle">Approved</p>
                <p className="text-2xl font-bold text-green-700">{approvedCount}</p>
              </div>
            </div>
          </div>

          <div className="card border-l-4 border-yellow-600 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-subtitle">Pending</p>
                <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="card border-l-4 border-red-600 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-subtitle">Rejected</p>
                <p className="text-2xl font-bold text-red-700">{rejectedCount}</p>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-title text-lg md:text-xl mb-4">Lifecycle Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
          <div className="card border-l-4 border-green-600 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-subtitle">Completed</p>
                <p className="text-2xl font-bold text-green-700">{completedCount}</p>
              </div>
            </div>
          </div>

          <div className="card border-l-4 border-red-600 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-subtitle">Damaged</p>
                <p className="text-2xl font-bold text-red-700">{damagedCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 