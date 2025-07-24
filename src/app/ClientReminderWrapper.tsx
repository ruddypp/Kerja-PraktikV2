'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Import ReminderInitializer secara dinamis dengan opsi ssr: false
const ReminderInitializer = dynamic(
  () => import('./ReminderInitializer'),
  { ssr: false }
);

export default function ClientReminderWrapper() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <ReminderInitializer />;
}