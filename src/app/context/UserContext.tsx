'use client';

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// User type untuk aplikasi
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

// Context interface
interface UserContextType {
  user: User | null;
  loading: boolean;
}

// Create the context
const UserContext = createContext<UserContextType>({
  user: null,
  loading: true
});

// Context provider component
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('Fetching user data from context');
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook to use the context
export function useUser() {
  return useContext(UserContext);
} 