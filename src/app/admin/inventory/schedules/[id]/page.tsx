'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useReminders } from '@/lib/hooks/useReminders';

export default function ScheduleDetailPage({ params }: { params: { id: string } }) {
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Tambahkan hook untuk reminder
  const { createReminder } = useReminders();
  const [reminderCreating, setReminderCreating] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState(false);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/inventory-schedules/${params.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSchedule(data.schedule);
      } catch (err) {
        setError('Gagal mengambil detail jadwal');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [params.id]);

  // Tambahkan fungsi untuk membuat reminder
  const handleCreateReminder = async () => {
    if (!schedule) return;
    
    try {
      setReminderCreating(true);
      const result = await createReminder('SCHEDULE', schedule.id);
      
      if (result) {
        setReminderSuccess(true);
        setTimeout(() => setReminderSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error creating reminder:', err);
    } finally {
      setReminderCreating(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!schedule) {
    return <div>Jadwal tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Detail Jadwal Inventaris</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Informasi Jadwal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>ID:</strong> {schedule.id}</p>
            <p><strong>Nama:</strong> {schedule.name || 'Jadwal Inventaris'}</p>
            <p><strong>Tanggal Jadwal:</strong> {format(new Date(schedule.scheduledDate), 'dd MMMM yyyy', { locale: id })}</p>
            {schedule.completedDate && (
              <p><strong>Tanggal Selesai:</strong> {format(new Date(schedule.completedDate), 'dd MMMM yyyy', { locale: id })}</p>
            )}
          </div>
          <div>
            <p><strong>Berulang:</strong> {schedule.isRecurring ? 'Ya' : 'Tidak'}</p>
            {schedule.isRecurring && (
              <p><strong>Tipe Pengulangan:</strong> {schedule.recurrenceType === 'MONTHLY' ? 'Bulanan' : 'Tahunan'}</p>
            )}
            {schedule.nextDate && (
              <p><strong>Tanggal Berikutnya:</strong> {format(new Date(schedule.nextDate), 'dd MMMM yyyy', { locale: id })}</p>
            )}
            <p><strong>Catatan:</strong> {schedule.notes || '-'}</p>
          </div>
        </div>
      </div>
      
      {schedule.items && schedule.items.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Item yang Dijadwalkan</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4 border-b text-left">Serial Number</th>
                  <th className="py-2 px-4 border-b text-left">Nama</th>
                  <th className="py-2 px-4 border-b text-left">Status Verifikasi</th>
                  <th className="py-2 px-4 border-b text-left">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {schedule.items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-2 px-4 border-b">{item.itemSerial}</td>
                    <td className="py-2 px-4 border-b">{item.item?.name || '-'}</td>
                    <td className="py-2 px-4 border-b">{item.verifiedStatus || '-'}</td>
                    <td className="py-2 px-4 border-b">{item.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Tambahkan tombol untuk reminder */}
      <div className="mt-6">
        <button
          onClick={handleCreateReminder}
          disabled={reminderCreating}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          {reminderCreating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Membuat Reminder...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Buat Reminder Jadwal (H-0)</span>
            </>
          )}
        </button>
      </div>
      
      {/* Notification untuk sukses */}
      {reminderSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md">
          Reminder berhasil dibuat!
        </div>
      )}
      
      <div className="flex space-x-4">
        <button
          onClick={() => router.back()}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
        >
          Kembali
        </button>
        
        {!schedule.completedDate && (
          <button
            onClick={() => router.push(`/admin/inventory/schedules/execution?id=${schedule.id}`)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
          >
            Laksanakan Jadwal
          </button>
        )}
      </div>
    </div>
  );
} 