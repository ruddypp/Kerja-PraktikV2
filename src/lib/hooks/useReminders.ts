import { useState, useEffect } from 'react';
import { ReminderType, ReminderStatus } from '@/lib/types';

export interface Reminder {
  id: string;
  type: ReminderType;
  status: ReminderStatus;
  title: string;
  message: string;
  dueDate: string;
  reminderDate: string;
  itemSerial?: string;
  calibrationId?: string;
  rentalId?: string;
  scheduleId?: string;
  emailSent: boolean;
  emailSentAt?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ambil semua reminder
  const fetchReminders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/reminders');
      
      if (!response.ok) {
        throw new Error('Gagal mengambil reminder');
      }
      
      const data = await response.json();
      setReminders(data.reminders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  // Ambil detail reminder
  const fetchReminderById = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/reminders/${id}`);
      
      if (!response.ok) {
        throw new Error('Gagal mengambil detail reminder');
      }
      
      const data = await response.json();
      return data.reminder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      return null;
    }
  };

  // Buat reminder baru
  const createReminder = async (type: ReminderType, id: string) => {
    try {
      const response = await fetch('/api/admin/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      });
      
      if (!response.ok) {
        throw new Error('Gagal membuat reminder');
      }
      
      const data = await response.json();
      
      if (data.reminder) {
        setReminders([...reminders, data.reminder]);
      }
      
      return data.reminder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      return null;
    }
  };

  // Update status reminder
  const updateReminderStatus = async (id: string, status: ReminderStatus) => {
    try {
      const response = await fetch(`/api/admin/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error('Gagal mengupdate status reminder');
      }
      
      const data = await response.json();
      
      setReminders(reminders.map(r => 
        r.id === id ? { ...r, status: status } : r
      ));
      
      return data.reminder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      return null;
    }
  };

  // Hapus reminder
  const deleteReminder = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/reminders/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Gagal menghapus reminder');
      }
      
      setReminders(reminders.filter(r => r.id !== id));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      return false;
    }
  };

  // Dapatkan template email untuk reminder kalibrasi
  const getEmailTemplate = async (id: string) => {
    try {
      console.log(`[getEmailTemplate] Mencoba mengambil template email untuk ID: ${id}`);
      
      // Coba cari reminder terlebih dahulu
      const reminderResponse = await fetch(`/api/admin/reminders/${id}`);
      
      if (!reminderResponse.ok) {
        console.error(`[getEmailTemplate] Gagal mengambil reminder: ${reminderResponse.status}`);
        throw new Error(`Gagal mengambil reminder: ${reminderResponse.status}`);
      }
      
      const reminderData = await reminderResponse.json();
      console.log(`[getEmailTemplate] Reminder ditemukan: ${JSON.stringify({
        id: reminderData.reminder?.id,
        type: reminderData.reminder?.type,
        calibrationId: reminderData.reminder?.calibrationId
      })}`);
      
      // Jika ini reminder kalibrasi, ambil template email
      if (reminderData.reminder?.type === 'CALIBRATION' && reminderData.reminder?.calibrationId) {
        const calibrationId = reminderData.reminder.calibrationId;
        
        // Ambil template email menggunakan calibrationId
        console.log(`[getEmailTemplate] Mengambil template email untuk calibrationId: ${calibrationId}`);
        const response = await fetch(`/api/admin/reminders/${id}/email-template`);
        
        if (!response.ok) {
          console.error(`[getEmailTemplate] Gagal mengambil template email: ${response.status}`);
          throw new Error(`Gagal mengambil template email: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[getEmailTemplate] Template email berhasil diambil`);
        return data.emailTemplate;
      } else {
        console.error('[getEmailTemplate] Bukan reminder kalibrasi atau tidak memiliki calibrationId');
        throw new Error('Bukan reminder kalibrasi atau tidak memiliki calibrationId');
      }
    } catch (err) {
      console.error('[getEmailTemplate] Error:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      return null;
    }
  };

  // Tandai email sebagai terkirim
  const markEmailSent = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/reminders/${id}/email-template`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Gagal menandai email sebagai terkirim');
      }
      
      const data = await response.json();
      
      setReminders(reminders.map(r => 
        r.id === id ? { ...r, emailSent: true, emailSentAt: new Date().toISOString() } : r
      ));
      
      return data.reminder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      return null;
    }
  };

  // Ambil reminder saat komponen dimuat
  useEffect(() => {
    fetchReminders();
  }, []);

  return {
    reminders,
    loading,
    error,
    fetchReminders,
    fetchReminderById,
    createReminder,
    updateReminderStatus,
    deleteReminder,
    getEmailTemplate,
    markEmailSent,
  };
} 