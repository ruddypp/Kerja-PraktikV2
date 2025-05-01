'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

// Updated User type to match the new schema
type User = {
  id: string;
  name: string;
  email: string;
  role: string; // Now a direct enum value: "ADMIN" or "USER"
  createdAt: string;
  updatedAt: string;
};

interface SidebarProps {
  onCloseMobileMenu?: () => void;
  user?: User | null;
  loading?: boolean;
}

export default function Sidebar({ onCloseMobileMenu, user, loading = false }: SidebarProps) {
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
    setIsOpen(!isOpen);
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
            {user?.name.charAt(0).toUpperCase()}
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
            // Admin Menu
            <>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {(isOpen || isMobile) && 'Inventaris'}
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
                        Items
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href="/admin/inventory/schedules" 
                        className={`flex items-center p-2 rounded-md transition-colors ${isActive('/admin/inventory/schedules') ? 'text-green-600 font-medium' : 'text-gray-700 hover:text-green-600'}`}
                        onClick={handleNavigation}
                      >
                        <span className={`w-2 h-2 ${isActive('/admin/inventory/schedules') ? 'bg-green-600' : 'bg-gray-400'} rounded-full mr-2`}></span>
                        Schedules
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
              {/* Calibrations */}
              <li>
                <Link 
                  href="/admin/calibrations" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/calibrations') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/admin/calibrations') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {(isOpen || isMobile) && 'Rental'}
                </Link>
              </li>
              
              {/* Vendors */}
              <li>
                <Link 
                  href="/admin/vendors" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/vendors') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/admin/vendors') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {(isOpen || isMobile) && 'Vendor'}
                </Link>
              </li>

              {/* Maintenance */}
              <li>
                <Link 
                  href="/admin/maintenance" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/maintenance') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/admin/maintenance') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {(isOpen || isMobile) && 'Maintenance'}
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
              {/* Notifications */}
              <li>
                <Link 
                  href="/admin/notifications" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/notifications') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/admin/notifications') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {(isOpen || isMobile) && 'Notifikasi'}
                </Link>
              </li>
            </>
          ) : (

            
            // User Menu
            <>
              {/* Barang */}
              <li>
                <Link 
                  href="/user/barang" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/user/barang') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/user/barang') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {(isOpen || isMobile) && 'Barang'}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {(isOpen || isMobile) && 'Kalibrasi'}
                </Link>
              </li>

              {/* Rental */}
              <li>
                <Link 
                  href="/user/rental" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/user/rental') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/user/rental') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {(isOpen || isMobile) && 'Rental'}
                </Link>
              </li>

              {/* Maintenance */}
              <li>
                <Link 
                  href="/user/maintenance" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/user/maintenance') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/user/maintenance') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {(isOpen || isMobile) && 'Maintenance'}
                </Link>
              </li>

              {/* History */}
              <li>
                <Link 
                  href="/user/history" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/user/history') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/user/history') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {(isOpen || isMobile) && 'History'}
                </Link>
              </li>

              {/* Notifications */}
              <li>
                <Link 
                  href="/user/notifications" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/user/notifications') ? 'bg-green-600 text-white font-medium' : 'text-gray-900 hover:bg-green-50 hover:text-green-600'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isActive('/user/notifications') ? 'text-white' : 'text-gray-500'} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {(isOpen || isMobile) && 'Notifikasi'}
                </Link>
              </li>
            </>
          )}
          
          {/* Common Menu Items */}
          <li className="mt-auto">
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
      </nav>
    </div>
  );
} 