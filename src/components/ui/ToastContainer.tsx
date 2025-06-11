'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastContainer() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        // Default options for all toasts
        duration: 5000,
        style: {
          background: '#fff',
          color: '#363636',
          boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05)',
          padding: '16px',
          borderRadius: '8px',
        },
        // Custom style options for different toast types
        success: {
          style: {
            borderLeft: '4px solid #10b981',
          },
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          style: {
            borderLeft: '4px solid #ef4444',
          },
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
        loading: {
          style: {
            borderLeft: '4px solid #3b82f6',
          },
          iconTheme: {
            primary: '#3b82f6',
            secondary: '#fff',
          },
        },
        custom: {
          style: {
            borderLeft: '4px solid #8b5cf6',
          },
        },
      }}
    />
  );
} 