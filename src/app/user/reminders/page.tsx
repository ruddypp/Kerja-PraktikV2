'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/context/UserContext';

export default function UserRemindersPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Redirect to notifications page after a short delay
    // This feature has been removed in favor of the notifications system
    if (!userLoading) {
      const timer = setTimeout(() => {
        router.push('/user/notifications');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [router, userLoading]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Pengalihan...</h1>
        <p className="text-gray-600 mb-6">
          Fitur Reminders telah diintegrasi dengan sistem Notifikasi.
          <br />Anda akan dialihkan ke halaman Notifikasi.
        </p>
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mx-auto"></div>
      </div>
    </div>
  );
} 