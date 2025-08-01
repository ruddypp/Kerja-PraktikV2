'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { MdAccessTime, MdHandyman, MdNotificationsActive, MdAlarm, MdCalendarToday } from 'react-icons/md';

// Updated User type to match the schema in UserContext
type User = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

interface SidebarProps {
  onCloseMobileMenu?: () => void;
  user?: User | null;
  loading?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export default function Sidebar({ onCloseMobileMenu, user, loading = false, onToggle }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(true);
      } else {
        setIsOpen(true);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onToggle) {
      onToggle(newState);
    }
  };

  const toggleInventory = () => {
    setInventoryOpen(!inventoryOpen);
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };

  // Check if current path is under inventory to auto-expand dropdown
  useEffect(() => {
    if (pathname?.includes('/admin/inventory')) {
      setInventoryOpen(true);
    }
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (res.ok) {
        router.push('/login');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Handle navigation on mobile
  const handleNavigation = () => {
    if (isMobile && onCloseMobileMenu) {
      onCloseMobileMenu();
    }
  };

  // Render loading state if data is still being fetched
  if (loading) {
    return (
      <div className="h-screen w-64 md:w-64 bg-white border-r border-gray-100 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mb-3"></div>
        <div className="text-green-600 font-medium text-center">
          <div>Paramata</div>
          <div className="text-sm">Inventory System</div>
        </div>
      </div>
    );
  }

  // Check if user is admin using the new schema (role is now a string enum)
  const isAdmin = user?.role === 'ADMIN';
  const sidebarWidth = isMobile ? 'w-full max-w-xs' : (isOpen ? 'w-64' : 'w-20');

  return (
    <div className={`h-screen ${sidebarWidth} bg-white border-r border-gray-100 transition-all duration-300 fixed top-0 left-0 z-40 shadow-sm overflow-y-auto`}>
      <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-green-50">
        <div className={`${isOpen || isMobile ? 'block' : 'hidden'}`}>
          <h2 className="font-bold text-green-600 text-lg">Paramata</h2>
          <p className="text-xs text-green-600">Inventory System</p>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-green-100 text-green-600 md:block hidden"
        >
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          )}
        </button>
        {isMobile && (
          <button
            onClick={onCloseMobileMenu}
            className="p-2 rounded-md hover:bg-green-100 text-green-600"
            aria-label="Close sidebar menu"
            title="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="p-4 border-b border-gray-100 bg-white">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          {(isOpen || isMobile) && (
            <div>
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-600">{user?.role}</p>
            </div>
          )}
        </div>
      </div>

      <nav className="mt-4 overflow-y-auto max-h-[calc(100vh-200px)]">
        <ul className="space-y-1 px-2">
          {isAdmin ? (
            // Admin Menu - Reordered for better functionality flow
            <>
              {/* Dashboard */}
              <li>
                <Link 
                  href="/admin-dashboard" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin-dashboard') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/admin-dashboard') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  {(isOpen || isMobile) && 'Dashboard'}
                </Link>
              </li>
              
              {/* Inventory Dropdown */}
              <li>
                <button 
                  onClick={toggleInventory}
                  className={`flex items-center justify-between w-full p-3 rounded-lg transition-colors ${
                    isActive('/admin/inventory') || isActive('/admin/inventory/schedules')
                      ? 'bg-green-600 text-white font-medium' 
                      : 'text-gray-900 hover:bg-green-50 hover:text-green-600'
                  }`}
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/admin/inventory') || isActive('/admin/inventory/schedules') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    {(isOpen || isMobile) && 'Inventory'}
                  </div>
                  {(isOpen || isMobile) && (
                    <svg 
                      className={`transition-transform transform ${inventoryOpen ? 'rotate-180' : ''} ${isActive('/admin/inventory') || isActive('/admin/inventory/schedules') ? 'text-white' : 'text-gray-500'}`}
                      xmlns="http://www.w3.org/2000/svg" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  )}
                </button>
                
                {inventoryOpen && (isOpen || isMobile) && (
                  <ul className="mt-1 pl-8 space-y-1">
                    <li>
                      <Link 
                        href="/admin/inventory" 
                        className={`flex items-center p-2 rounded-md transition-colors ${isActive('/admin/inventory') && !isActive('/admin/inventory/schedules') ? 'text-green-600 font-medium' : 'text-gray-700 hover:text-green-600'}`}
                        onClick={handleNavigation}
                      >
                        <span className={`w-2 h-2 ${isActive('/admin/inventory') && !isActive('/admin/inventory/schedules') ? 'bg-green-600' : 'bg-gray-400'} rounded-full mr-2`}></span>
                        Barang
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href="/admin/inventory/schedules" 
                        className={`flex items-center p-2 rounded-md transition-colors ${isActive('/admin/inventory/schedules') ? 'text-green-600 font-medium' : 'text-gray-700 hover:text-green-600'}`}
                        onClick={handleNavigation}
                      >
                        <span className={`w-2 h-2 ${isActive('/admin/inventory/schedules') ? 'bg-green-600' : 'bg-gray-400'} rounded-full mr-2`}></span>
                        Penjadwalan Barang
                      </Link>
                    </li>
                  </ul>
                )}
              </li>

              {/* Maintenance */}
              <li>
                <Link 
                  href="/admin/maintenance" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/maintenance') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <MdHandyman className={`h-5 w-5 ${isActive('/admin/maintenance') ? 'text-white' : 'text-gray-500'} mr-3`} />
                  {(isOpen || isMobile) && 'Maintenance'}
                </Link>
              </li>

              {/* Calibrations */}
              <li>
                <Link 
                  href="/admin/calibrations" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/calibrations') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/admin/calibrations') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  {(isOpen || isMobile) && 'Kalibrasi'}
                </Link>
              </li>

              {/* Rentals */}
              <li>
                <Link 
                  href="/admin/rentals" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/rentals') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/admin/rentals') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                  {(isOpen || isMobile) && 'Rental'}
                </Link>
              </li>
              
              {/* Customers */}
              <li>
                <Link 
                  href="/admin/customers" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/customers') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/admin/customers') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {(isOpen || isMobile) && 'Customers'}
                </Link>
              </li>

              {/* History */}
              <li>
                <Link 
                  href="/admin/history" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/history') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/admin/history') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {(isOpen || isMobile) && 'History'}
                </Link>
              </li>

              {/* Users Performance */}
              <li>
                <Link 
                  href="/admin/users-performance" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/users-performance') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/admin/users-performance') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {(isOpen || isMobile) && 'Performa Pengguna'}
                </Link>
              </li>

              {/* Reminders - ganti icon */}
              <li>
                <Link 
                  href="/admin/reminders" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/reminders') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <MdCalendarToday className={`h-5 w-5 ${isActive('/admin/reminders') ? 'text-white' : 'text-gray-500'} mr-3`} />
                  {(isOpen || isMobile) && 'Reminders'}
                </Link>
              </li>

              {/* Notifications - Moved higher for better visibility */}
              <li>
                <Link 
                  href="/admin/notifications" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/notifications') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <MdNotificationsActive className={`h-5 w-5 ${isActive('/admin/notifications') ? 'text-white' : 'text-gray-500'} mr-3`} />
                  {(isOpen || isMobile) && 'Notifikasi'}
                </Link>
              </li>

              {/* Settings - Moved to bottom above logout */}
              <li>
                <Link
                  href="/admin/settings"
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/settings') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/admin/settings') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {(isOpen || isMobile) && 'Pengaturan'}
                </Link>
              </li>
            </>
          ) : (
            // User Menu - Reordered for better functionality flow
            <>
              {/* Barang */}
              <li>
                <Link 
                  href="/user/barang" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/user/barang') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/user/barang') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {(isOpen || isMobile) && 'Barang'}
                </Link>
              </li>

              {/* Maintenance */}
              <li>
                <Link 
                  href="/user/maintenance" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/user/maintenance') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <MdHandyman className={`h-5 w-5 ${isActive('/user/maintenance') ? 'text-white' : 'text-gray-500'} mr-3`} />
                  {(isOpen || isMobile) && 'Maintenance'}
                </Link>
              </li>

              {/* Kalibrasi */}
              <li>
                <Link 
                  href="/user/calibrations" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/user/calibrations') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/user/calibrations') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  {(isOpen || isMobile) && 'Kalibrasi'}
                </Link>
              </li>

              {/* Rental */}
              <li>
                <Link 
                  href="/user/rentals" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/user/rentals') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/user/rentals') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                  {(isOpen || isMobile) && 'Rental'}
                </Link>
              </li>

              {/* Notifications */}
              <li>
                <Link 
                  href="/user/notifications" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/user/notifications') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <MdNotificationsActive className={`h-5 w-5 ${isActive('/user/notifications') ? 'text-white' : 'text-gray-500'} mr-3`} />
                  {(isOpen || isMobile) && 'Notifikasi'}
                </Link>
              </li>
              
              {/* Remove incorrect settings link for users */}
            </>
          )}
          
          {/* Logout - Always at the bottom */}
          <li>
            <button 
              onClick={handleLogout}
              className="flex w-full items-center p-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {(isOpen || isMobile) && 'Logout'}
            </button>
          </li>
        </ul>
        {/* Versi Sistem di paling bawah sidebar, bold, tanpa gap besar */}
        <div className="w-full text-center text-xs font-bold text-gray-600 py-2 border-t border-gray-100 select-none">
          Versi 1.3.0
        </div>
      </nav>
    </div>
  );
}