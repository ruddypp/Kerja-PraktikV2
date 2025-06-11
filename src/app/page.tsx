'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Redirect to login page
    window.location.href = '/login';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-800">Loading...</h1>
        <p className="mt-2 text-gray-600">Redirecting to login page</p>
      </div>
    </div>
  );
}
