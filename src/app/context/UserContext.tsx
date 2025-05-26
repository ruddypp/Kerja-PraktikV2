'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// User type untuk aplikasi
interface User {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

// Context interface
interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
}

// Create the context
const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  error: null,
  refreshUser: async () => {},
});

// Custom hook to use the context
export const useUser = () => useContext(UserContext);

interface UserProviderProps {
  children: ReactNode;
}

// Context provider component
export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          // User is not authenticated, but this is not an error
          setUser(null);
          return;
        }
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export default UserContext; 