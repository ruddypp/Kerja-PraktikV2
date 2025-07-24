'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useReminders } from '@/lib/hooks/useReminders';

export default function RentalDetailPage({ params }: { params: { id: string } }) {
  const [rental, setRental] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Tambahkan hook untuk reminder
  const { createReminder } = useReminders();
  const [reminderCreating, setReminderCreating] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState(false);

  useEffect(() => {
    const fetchRental = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/rentals/${params.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setRental(data.rental);
      } catch (err) {
        setError('Gagal mengambil detail rental');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRental();
  }, [params.id]);

  // Tambahkan fungsi untuk membuat reminder
  const handleCreateReminder = async () => {
    if (!rental) return;
    
    try {
      setReminderCreating(true);
      const result = await createReminder('RENTAL', rental.id);
      
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

  if (!rental) {
    return <div>Rental tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Detail Rental</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Informasi Rental</h2>
          <p><strong>ID:</strong> {rental.id}</p>
          <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-xs ${
            rental.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
            rental.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
            rental.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
            rental.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>{rental.status}</span></p>
          <p><strong>Tanggal Mulai:</strong> {format(new Date(rental.startDate), 'dd MMMM yyyy', { locale: id })}</p>
          {rental.endDate && (
            <p><strong>Tanggal Akhir:</strong> {format(new Date(rental.endDate), 'dd MMMM yyyy', { locale: id })}</p>
          )}
          {rental.returnDate && (
            <p><strong>Tanggal Pengembalian:</strong> {format(new Date(rental.returnDate), 'dd MMMM yyyy', { locale: id })}</p>
          )}
          {rental.poNumber && <p><strong>Nomor PO:</strong> {rental.poNumber}</p>}
          {rental.doNumber && <p><strong>Nomor DO:</strong> {rental.doNumber}</p>}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Informasi Barang</h2>
          <p><strong>Serial Number:</strong> {rental.item?.serialNumber}</p>
          <p><strong>Nama:</strong> {rental.item?.name}</p>
          <p><strong>Part Number:</strong> {rental.item?.partNumber}</p>
          {rental.item?.sensor && <p><strong>Sensor:</strong> {rental.item.sensor}</p>}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Informasi Penyewa</h2>
        <p><strong>Nama Penyewa:</strong> {rental.renterName || '-'}</p>
        <p><strong>Telepon Penyewa:</strong> {rental.renterPhone || '-'}</p>
        <p><strong>Alamat Penyewa:</strong> {rental.renterAddress || '-'}</p>
        
        {rental.customer && (
          <>
            <h3 className="text-lg font-medium mt-4 mb-2">Informasi Customer</h3>
            <p><strong>Nama Customer:</strong> {rental.customer.name}</p>
            <p><strong>Alamat:</strong> {rental.customer.address || '-'}</p>
            <p><strong>Kontak:</strong> {rental.customer.contactName || '-'}</p>
            <p><strong>Telepon:</strong> {rental.customer.contactPhone || '-'}</p>
            <p><strong>Email:</strong> {rental.customer.contactEmail || '-'}</p>
          </>
        )}
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Kondisi Barang</h2>
        <p><strong>Kondisi Awal:</strong> {rental.initialCondition || '-'}</p>
        <p><strong>Kondisi Pengembalian:</strong> {rental.returnCondition || '-'}</p>
      </div>
      
      {/* Tambahkan tombol untuk reminder */}
      {rental && rental.endDate && (
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
                <span>Buat Reminder Pengembalian (H-7)</span>
              </>
            )}
          </button>
        </div>
      )}
      
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
        
        {rental.status === 'APPROVED' && !rental.returnDate && (
          <button
            onClick={() => router.push(`/admin/rentals/${rental.id}/return`)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
          >
            Proses Pengembalian
          </button>
        )}
      </div>
    </div>
  );
} 