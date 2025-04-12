'use client';

import { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { usePathname, useRouter } from 'next/navigation';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const pathname = usePathname();
  const router = useRouter();

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
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
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
      
      {/* Sidebar - hidden on mobile by default unless toggled */}
      <div className={`${isMobile ? (isMobileMenuOpen ? 'block' : 'hidden') : 'block'} z-40`}>
        <Sidebar onCloseMobileMenu={() => setIsMobileMenuOpen(false)} />
      </div>
      
      {/* Content area - full width on mobile, with margin on desktop */}
      <div className={`flex-1 overflow-auto ${isMobile ? 'w-full' : 'ml-64'} p-4 md:p-6`}>
        {/* Semi-transparent overlay for mobile menu when open */}
        {isMobile && isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}
        
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 min-h-[calc(100vh-2rem)]">
          {children}
        </div>
      </div>
    </div>
  );
} 