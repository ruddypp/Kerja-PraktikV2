'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Admin page error:', error);
  }, [error]);

  const handleReset = () => {
    try {
      // Attempt to reset using the provided function
      reset();
    } catch (resetError) {
      console.error('Error during reset:', resetError);
      // Fallback to manual page refresh if reset fails
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md w-full">
        <div className="bg-white p-6 rounded-lg shadow-md border border-blue-100">
          <h2 className="text-2xl font-semibold text-blue-600 mb-4">An Error Occurred</h2>
          <p className="text-gray-700 mb-6">Sorry, we encountered a problem while loading the admin page.</p>
          
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-6">
            <p className="text-sm text-blue-800">{error.message || "An unexpected error occurred"}</p>
          </div>
          
          <div className="flex flex-col space-y-3">
            <button
              onClick={handleReset}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-150"
            >
              Try Again
            </button>
            
            <a
              href="/login"
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md transition duration-150"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 