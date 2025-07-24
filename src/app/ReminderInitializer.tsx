'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// Fungsi untuk memeriksa apakah notifikasi sudah ditampilkan dalam sesi ini
const hasBeenShownInSession = (notifId: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  const key = `session_shown_${notifId}`;
  return sessionStorage.getItem(key) === 'true';
};

// Fungsi untuk menandai notifikasi sudah ditampilkan dalam sesi ini
const markShownInSession = (notifId: string): void => {
  if (typeof window === 'undefined') return;
  
  const key = `session_shown_${notifId}`;
  sessionStorage.setItem(key, 'true');
};

// Fungsi untuk memeriksa apakah notifikasi sudah ditampilkan hari ini
const hasBeenNotifiedToday = (notifId: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  const today = new Date().toLocaleDateString();
  const key = `notified_${notifId}_${today}`;
  
  return localStorage.getItem(key) === 'true';
};

// Fungsi untuk menandai notifikasi sudah ditampilkan hari ini
const markNotifiedToday = (notifId: string): void => {
  if (typeof window === 'undefined') return;
  
  const today = new Date().toLocaleDateString();
  const key = `notified_${notifId}_${today}`;
  
  localStorage.setItem(key, 'true');
};

// Fungsi untuk memeriksa berapa kali notifikasi sudah ditampilkan hari ini
const getNotificationDisplayCount = (notifId: string): number => {
  if (typeof window === 'undefined') return 0;
  
  const today = new Date().toLocaleDateString();
  const key = `notif_count_${notifId}_${today}`;
  
  const count = localStorage.getItem(key);
  return count ? parseInt(count, 10) : 0;
};

// Fungsi untuk menambah jumlah tampilan notifikasi hari ini
const incrementNotificationDisplayCount = (notifId: string): number => {
  if (typeof window === 'undefined') return 0;
  
  const today = new Date().toLocaleDateString();
  const key = `notif_count_${notifId}_${today}`;
  
  const currentCount = getNotificationDisplayCount(notifId);
  const newCount = currentCount + 1;
  
  localStorage.setItem(key, newCount.toString());
  return newCount;
};

export default function ReminderInitializer() {
  // Gunakan ref untuk melacak status polling
  const isPollingActive = useRef<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialCheckDone = useRef<boolean>(false);
  const lastCronCheckTime = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();
  
  // Inisialisasi audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/notification-sound.mp3');
      audioRef.current.load();
      console.log('Audio element initialized in ReminderInitializer');
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  // Fungsi untuk memainkan suara notifikasi
  const playNotificationSound = () => {
    if (!audioRef.current) return;
    
    // Reset audio to start
    audioRef.current.currentTime = 0;
    
    // Play sound
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('Notification sound played successfully in ReminderInitializer');
      }).catch(error => {
        console.error('Error playing notification sound:', error);
      });
    }
  };
  
  // Fungsi untuk menampilkan toast notifikasi
  const showToastNotification = (notification: any) => {
    // Jika sudah ditampilkan dalam sesi ini, jangan tampilkan lagi
    if (hasBeenShownInSession(notification.id)) {
      console.log(`Notification ${notification.id} already shown in this session, skipping`);
      return;
    }
    
    // Jika sudah mencapai batas tampilan hari ini, jangan tampilkan lagi
    const displayCount = getNotificationDisplayCount(notification.id);
    if (displayCount >= 2) {
      console.log(`Notification ${notification.id} already shown ${displayCount} times today, skipping`);
      return;
    }
    
    // Tandai notifikasi sudah ditampilkan dalam sesi ini
    markShownInSession(notification.id);
    
    // Tandai notifikasi sudah ditampilkan hari ini
    markNotifiedToday(notification.id);
    
    // Tambah jumlah tampilan notifikasi hari ini
    incrementNotificationDisplayCount(notification.id);
    
    // Mainkan suara
    playNotificationSound();
    
    // Generate title dan message
    const title = notification.title || 'Notifikasi Baru';
    const message = notification.message || 'Ada notifikasi baru untuk Anda';
    
    // Tampilkan toast
    toast(
      (t) => (
        <div className="flex items-start">
          <div className="flex-1">
            <p className="font-medium text-orange-600">{title}</p>
            <p className="text-sm">{message}</p>
          </div>
          <div className="ml-4">
            <button 
              onClick={() => {
                toast.dismiss(t.id);
                const role = notification.userId.includes('admin') ? 'admin' : 'user';
                router.push(`/${role}/notifications`);
              }}
              className="bg-blue-500 text-white px-3 py-1 rounded-md text-xs"
            >
              Lihat Detail
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
        icon: '🔔',
      }
    );
  };
  
  // Fungsi untuk menjalankan cron reminders dan menampilkan notifikasi langsung
  const triggerCronReminders = async (force: boolean = false) => {
    try {
      const now = Date.now();
      
      // Rate limit API calls (minimal 5 menit antara panggilan)
      if (!force && now - lastCronCheckTime.current < 5 * 60 * 1000) {
        console.log('Skipping cron check due to rate limiting');
        return;
      }
      
      lastCronCheckTime.current = now;
      console.log('Triggering background cron reminders check');
      
      const response = await fetch('/api/cron/reminders?force=true', {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Background cron reminders check completed:', data);
        
        // Simpan timestamp terakhir check di localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('last_cron_check', now.toString());
        }
        
        // Jika ada notifikasi baru yang dibuat, ambil dan tampilkan langsung
        if (data.created > 0) {
          console.log(`Created ${data.created} new notifications, fetching them now`);
          await fetchAndShowNotifications();
        }
      }
    } catch (error) {
      console.error('Error triggering background cron reminders check:', error);
    }
  };
  
  // Fungsi untuk mengambil dan menampilkan notifikasi yang belum dibaca
  const fetchAndShowNotifications = async () => {
    try {
      // Tentukan role berdasarkan URL
      const isAdmin = window.location.pathname.includes('/admin');
      const role = isAdmin ? 'admin' : 'user';
      
      // Ambil notifikasi yang belum dibaca
      const response = await fetch(`/api/${role}/notifications?overdueOnly=true`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const notifications = data.notifications || [];
        
        console.log(`Fetched ${notifications.length} overdue notifications`);
        
        // Tampilkan maksimal 3 notifikasi terbaru
        const notificationsToShow = notifications.slice(0, 3);
        
        // Tampilkan notifikasi satu per satu dengan jeda
        for (const notification of notificationsToShow) {
          // Jika notifikasi belum ditampilkan hari ini, tampilkan
          if (!hasBeenShownInSession(notification.id)) {
            showToastNotification(notification);
            // Tambahkan jeda 1 detik antar notifikasi
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching and showing notifications:', error);
    }
  };
  
  // Fungsi untuk memulai polling
  const startPolling = () => {
    if (isPollingActive.current) {
      console.log('Polling already active, skipping');
      return;
    }
    
    console.log('Starting background polling for reminders');
    isPollingActive.current = true;
    
    // Jalankan cron reminders setiap 5 menit
    intervalRef.current = setInterval(() => {
      triggerCronReminders();
    }, 5 * 60 * 1000); // 5 menit
  };
  
  // Fungsi untuk menghentikan polling
  const stopPolling = () => {
    if (intervalRef.current) {
      console.log('Stopping background polling for reminders');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      isPollingActive.current = false;
    }
  };
  
  // Gunakan visibilitychange event untuk mengontrol polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, starting polling');
        startPolling();
        
        // Jalankan check langsung saat tab menjadi visible
        // tetapi hanya jika sudah lebih dari 1 menit sejak check terakhir
        const now = Date.now();
        const lastCheck = lastCronCheckTime.current;
        if (now - lastCheck > 60 * 1000) {
          triggerCronReminders(true);
        }
      } else {
        console.log('Page became hidden, continuing polling in background');
        // Tetap jalankan polling meskipun tab tidak aktif
      }
    };
    
    // Tambahkan event listener untuk visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cek localStorage untuk waktu check terakhir
    if (typeof window !== 'undefined') {
      const lastCheck = localStorage.getItem('last_cron_check');
      if (lastCheck) {
        lastCronCheckTime.current = parseInt(lastCheck, 10);
      }
    }
    
    // Jalankan cron reminders saat komponen dimuat dengan sedikit delay
    if (!initialCheckDone.current) {
      const timer = setTimeout(() => {
        initialCheckDone.current = true;
        triggerCronReminders(true);
      }, 3000); // Delay 3 detik untuk memastikan aplikasi sudah dimuat sepenuhnya
      
      // Mulai polling
      startPolling();
      
      return () => {
        clearTimeout(timer);
        stopPolling();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Tambahkan event listener untuk beforeunload untuk menyimpan status
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Simpan timestamp terakhir check di localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_cron_check', lastCronCheckTime.current.toString());
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Tambahkan event listener untuk route change di Next.js
  useEffect(() => {
    // Fungsi untuk menangani perubahan route
    const handleRouteChange = () => {
      // Jangan memicu cron check pada setiap navigasi
      console.log('Route changed, but not triggering cron check to avoid duplicate notifications');
    };
    
    // Tambahkan event listener untuk route change
    router.events?.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events?.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  return null; // Komponen ini tidak merender apa-apa
} 