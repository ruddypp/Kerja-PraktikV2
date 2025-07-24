'use client';

import { SessionProvider } from 'next-auth/react';
import { UserProvider, useUser } from './context/UserContext';
import { NotificationProvider } from './context/NotificationContext';

function NotificationWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const role = user?.role as 'ADMIN' | 'USER' | undefined;

  if (role) {
    return (
      <NotificationProvider role={role}>
        {children}
      </NotificationProvider>
    );
  }

  return <>{children}</>;
}

export function Providers({ children, session }: { children: React.ReactNode, session: any }) {
  return (
    <SessionProvider session={session}>
      <UserProvider>
        <NotificationWrapper>
          {children}
        </NotificationWrapper>
      </UserProvider>
    </SessionProvider>
  );
} 