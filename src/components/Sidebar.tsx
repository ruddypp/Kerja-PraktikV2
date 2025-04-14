'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

type User = {
  id: number;
  name: string;
  email: string;
  role: {
    id: number;
    name: string;
  };
};

interface SidebarProps {
  onCloseMobileMenu?: () => void;
}

export default function Sidebar({ onCloseMobileMenu }: SidebarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          console.error('Failed to fetch user data');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Check if current path is under inventory to auto-expand dropdown
  useEffect(() => {
    if (pathname?.includes('/admin/inventory') || pathname?.includes('/admin/categories')) {
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
      <div className="h-screen w-64 md:w-64 bg-white border-r border-gray-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600 mr-2"></div>
        <div className="text-green-600 font-medium">Loading...</div>
      </div>
    );
  }

  const isAdmin = user?.role.name === 'Admin';
  const sidebarWidth = isMobile ? 'w-full max-w-xs' : (isOpen ? 'w-64' : 'w-20');

  return (
    <div className={`h-screen ${sidebarWidth} bg-white border-r border-gray-200 transition-all duration-300 fixed top-0 left-0 z-40 shadow-sm overflow-y-auto`}>
      <div className="p-4 flex justify-between items-center border-b border-gray-200 bg-green-50">
        <h2 className={`font-bold text-green-700 text-xl ${isOpen || isMobile ? 'block' : 'hidden'}`}>Paramata</h2>
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
      
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          {(isOpen || isMobile) && (
            <div>
              <p className="font-medium text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-600">{user?.role.name}</p>
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
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin-dashboard') ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    isActive('/admin/inventory') || isActive('/admin/categories') 
                      ? 'bg-green-50 text-green-700 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {(isOpen || isMobile) && 'Inventory'}
                  </div>
                  {(isOpen || isMobile) && (
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${inventoryOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                
                {/* Dropdown Items */}
                {(isOpen || isMobile) && inventoryOpen && (
                  <ul className="ml-10 mt-1 space-y-1 bg-gray-50 rounded-md py-1">
                    <li>
                      <Link 
                        href="/admin/inventory" 
                        className={`block px-4 py-2 text-sm rounded-md transition-colors ${isActive('/admin/inventory') && !isActive('/admin/inventory/categories') ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-700 hover:bg-green-50 hover:text-green-700'}`}
                        onClick={handleNavigation}
                      >
                        Items
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href="/admin/inventory/categories" 
                        className={`block px-4 py-2 text-sm rounded-md transition-colors ${isActive('/admin/inventory/categories') ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-700 hover:bg-green-50 hover:text-green-700'}`}
                        onClick={handleNavigation}
                      >
                        Categories
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
              
              <li>
                <Link 
                  href="/admin/requests" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/requests') ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {(isOpen || isMobile) && 'Requests'}
                </Link>
              </li>
              
              <li>
                <Link 
                  href="/admin/calibrations" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/calibrations') ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {(isOpen || isMobile) && 'Calibrations'}
                </Link>
              </li>
              
              <li>
                <Link 
                  href="/admin/vendors" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/vendors') ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {(isOpen || isMobile) && 'Vendors'}
                </Link>
              </li>
              
              <li>
                <Link 
                  href="/admin/activity-logs" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/admin/activity-logs') ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {(isOpen || isMobile) && 'Activity Logs'}
                </Link>
              </li>
            </>
          ) : (
            // User Menu
            <>
              <li>
                <Link 
                  href="/user/barang" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/user/barang') ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {(isOpen || isMobile) && 'Barang'}
                </Link>
              </li>
              <li>
                <Link 
                  href="/user/requests"
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/user/requests') ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {(isOpen || isMobile) && 'Requests'}
                </Link>
              </li>
              <li>
                <Link 
                  href="/user/calibrations" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/user/calibrations') ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {(isOpen || isMobile) && 'Calibration'}
                </Link>
              </li>

              <li>
                <Link 
                  href="/user/history" 
                  className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/user/history') ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                  onClick={handleNavigation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {(isOpen || isMobile) && 'History'}
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