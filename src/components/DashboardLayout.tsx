'use client';

import { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { usePathname, useRouter } from 'next/navigation';
import NotificationDropdown from './notifications/NotificationDropdown';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user); // Store the entire user object 
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  // Handle errors in layout
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error('Dashboard layout caught error:', e);
      setError(new Error(e.message));
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Handle responsive states
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Reset mobile menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // If there's an error in the layout, show a simple error UI
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-red-600 text-xl font-semibold mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-700 mb-4">Sorry, something went wrong when loading the dashboard.</p>
          <div className="bg-red-50 p-3 rounded-md border border-red-200 mb-4 overflow-hidden">
            <p className="text-sm text-red-800 break-words">{error.message}</p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Refresh Page
            </button>
            <button 
              onClick={() => router.push('/login')}
              className="btn btn-secondary"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile menu toggle button */}
      {isMobile && (
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed top-4 left-4 z-50 bg-white p-2 rounded-md shadow-md"
          aria-label="Toggle menu"
          title="Toggle menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
      
      {/* Sidebar - different position based on mobile/desktop */}
      <div className={`
        ${isMobile 
          ? 'fixed top-0 left-0 h-full w-64 transform transition-transform duration-300 ease-in-out z-40 '
            + (isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full')
          : 'fixed top-0 left-0 h-full w-64'
        }
      `}>
        <Sidebar onCloseMobileMenu={() => setIsMobileMenuOpen(false)} />
      </div>
      
      {/* Content area with header */}
      <div className={`transition-all duration-300 ${isMobile ? 'ml-0' : 'ml-64'}`}>
        {/* Header with notifications and user profile */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-end px-4 sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            {user && <NotificationDropdown userId={user.id} />}
            
            <div className="flex items-center space-x-2">
              <span className="hidden md:inline text-sm font-medium">
                {user?.name || 'Loading...'}
              </span>
              <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6">
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 min-h-[calc(100vh-7rem)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 