'use client';

import { ReactNode } from 'react';
import NotificationBell from './NotificationBell';
import { useUser } from '@/app/context/UserContext';

export default function NotificationWrapper({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const role = user?.role as 'ADMIN' | 'USER' | undefined;

  if (!role) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <div className="flex items-center justify-end px-4 py-2 bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {user?.name || 'User'} ({role.toLowerCase()})
            </div>
            <NotificationBell role={role} />
          </div>
        </div>
        <div className="flex-grow">
          {children}
        </div>
      </div>
    </>
  );
} 