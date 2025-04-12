'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function UserError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('User page error:', error);
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
        <div className="bg-white p-6 rounded-lg shadow-md border border-red-100">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">Terjadi Kesalahan</h2>
          <p className="text-gray-700 mb-6">Maaf, kami mengalami masalah saat memuat halaman ini.</p>
          
          <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-6">
            <p className="text-sm text-red-800">{error.message || "Terjadi kesalahan tak terduga"}</p>
          </div>
          
          <div className="flex flex-col space-y-3">
            <button
              onClick={handleReset}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition duration-150"
            >
              Coba Lagi
            </button>
            
            <a
              href="/login"
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md transition duration-150"
            >
              Kembali ke Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 