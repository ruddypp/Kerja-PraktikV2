'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useReminders } from '@/lib/hooks/useReminders';
import React from 'react';
import { ReminderType } from '@/lib/types';

export default function CalibrationDetailPage({ params }: { params: { id: string } }) {
  // Gunakan params.id langsung, tidak perlu React.use()
  const calibrationId = params.id;
  
  const [calibration, setCalibration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCertificateForm, setShowCertificateForm] = useState(false);
  const [certificate, setCertificate] = useState<any>(null);
  const [gasEntries, setGasEntries] = useState<any[]>([]);
  const [testEntries, setTestEntries] = useState<any[]>([]);
  const router = useRouter();
  
  // Tambahkan hook untuk reminder
  const { createReminder, getEmailTemplate, markEmailSent } = useReminders();
  const [reminderCreating, setReminderCreating] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  useEffect(() => {
    const fetchCalibration = async () => {
      try {
        setLoading(true);
        console.log('Fetching calibration with ID:', calibrationId);
        // Gunakan URL relatif tanpa process.env.NEXT_PUBLIC_BACKEND_URL
        const response = await fetch(`/api/calibrations/${calibrationId}`, {
          credentials: 'include' // Tambahkan credentials untuk autentikasi
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Calibration data received:', data);
        setCalibration(data);
        setGasEntries(data.certificate?.gasEntries || []);
        setTestEntries(data.certificate?.testEntries || []);
      } catch (err) {
        console.error('Error fetching calibration details:', err);
        setError(`Failed to fetch calibration details: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    if (calibrationId) {
      fetchCalibration();
    } else {
      console.error('No calibration ID provided');
      setError('No calibration ID provided');
      setLoading(false);
    }
  }, [calibrationId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!calibration) {
    return <div>Calibration not found.</div>;
  }

  // Tambahkan fungsi untuk membuat reminder
  const handleCreateReminder = async () => {
    if (!calibration) return;
    
    try {
      setReminderCreating(true);
      const result = await createReminder(ReminderType.CALIBRATION, calibration.id);
      
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

  // Tambahkan fungsi untuk mengirim email
  const handleSendEmail = async () => {
    if (!calibration || !calibration.customer || !calibration.customer.contactEmail) {
      alert('Customer tidak memiliki email kontak');
      return;
    }
    
    try {
      setEmailSending(true);
      
      // Buat template email langsung di client-side
      const customer = calibration.customer;
      const item = calibration.item;
      
      if (!item) {
        alert('Data item tidak ditemukan');
        return;
      }
      
      // Siapkan data untuk email
      const dueDate = calibration.validUntil || calibration.calibrationDate;
      if (!dueDate) {
        alert('Tanggal kalibrasi tidak valid');
        return;
      }
      
      const itemName = item.name || 'Peralatan';
      const serialNumber = item.serialNumber || 'Tidak diketahui';
      const partNumber = item.partNumber || 'Tidak diketahui';
      const sensorInfo = item.sensor ? `- Sensor: ${item.sensor}` : '';
      
      const subject = encodeURIComponent(`Pengingat Kalibrasi: ${itemName} (${serialNumber})`);
      const body = encodeURIComponent(`
Yth. ${customer.contactName || customer.name},

Kami ingin mengingatkan bahwa kalibrasi untuk peralatan ${itemName} (Nomor Seri: ${serialNumber}) akan jatuh tempo pada ${format(new Date(dueDate), 'dd MMM yyyy')}.

Mohon hubungi kami untuk menjadwalkan layanan kalibrasi.

Detail Peralatan:
- Nama: ${itemName}
- Nomor Seri: ${serialNumber}
- Nomor Part: ${partNumber}
${sensorInfo}

Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.

Salam hormat,
Tim Paramata
      `);
      
      // Buat mailto link
      const mailtoLink = `mailto:${customer.contactEmail}?subject=${subject}&body=${body}`;
      
      // Buka link di tab baru
      window.open(mailtoLink, '_blank');
      
      // Tandai email sebagai terkirim jika ada reminder
      if (calibration.id) {
        try {
          // Cari reminder untuk kalibrasi ini
          const reminderResponse = await fetch(`/api/admin/reminders?type=CALIBRATION`, {
            credentials: 'include' // Tambahkan credentials untuk autentikasi
          });
          if (reminderResponse.ok) {
            const reminderData = await reminderResponse.json();
            const calibrationReminder = reminderData.reminders?.find(
              (r: any) => r.calibrationId === calibration.id
            );
            
            if (calibrationReminder) {
              // Tandai email sebagai terkirim
              await fetch(`/api/admin/reminders/${calibrationReminder.id}/email-template`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include' // Tambahkan credentials untuk autentikasi
              });
            }
          }
        } catch (err) {
          console.error('Error marking email as sent:', err);
        }
      }
      
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 3000);
    } catch (err) {
      console.error('Error sending email:', err);
      alert('Gagal mengirim email');
    } finally {
      setEmailSending(false);
    }
  };

  // Format tanggal dengan pengecekan nilai yang valid
  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'Tidak tersedia';
    
    try {
      const date = new Date(dateValue);
      // Periksa apakah tanggal valid
      if (isNaN(date.getTime())) return 'Tidak tersedia';
      return format(date, 'dd MMMM yyyy');
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Tidak tersedia';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Detail Kalibrasi</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-xl font-semibold">Informasi Umum</h2>
          <p><strong>ID:</strong> {calibration.id}</p>
          <p><strong>Tanggal:</strong> {formatDate(calibration.calibrationDate)}</p>
          <p><strong>Valid Sampai:</strong> {formatDate(calibration.validUntil)}</p>
          <p><strong>Status:</strong> {calibration.status}</p>
          <p><strong>Keterangan:</strong> {calibration.notes || 'Tidak ada'}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Detail Customer</h2>
          <p><strong>Nama:</strong> {calibration.customer?.name || 'Tidak tersedia'}</p>
          <p><strong>Email:</strong> {calibration.customer?.contactEmail || 'Tidak tersedia'}</p>
          <p><strong>Telepon:</strong> {calibration.customer?.contactPhone || 'Tidak tersedia'}</p>
          <p><strong>Alamat:</strong> {calibration.customer?.address || 'Tidak tersedia'}</p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold">Detail Item</h2>
        <p><strong>Nama Item:</strong> {calibration.item?.name || 'Tidak tersedia'}</p>
        <p><strong>Serial Number:</strong> {calibration.item?.serialNumber || 'Tidak tersedia'}</p>
        <p><strong>Part Number:</strong> {calibration.item?.partNumber || 'Tidak tersedia'}</p>
        {calibration.item?.sensor && <p><strong>Sensor:</strong> {calibration.item.sensor}</p>}
      </div>

      {calibration.certificate && (
        <>
          <h2 className="text-xl font-semibold">Hasil Kalibrasi</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left">Gas</th>
                  <th className="py-2 px-4 border-b text-left">Nilai Kalibrasi</th>
                  <th className="py-2 px-4 border-b text-left">Toleransi</th>
                  <th className="py-2 px-4 border-b text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {gasEntries.map((entry, index) => (
                  <tr key={index}>
                    <td className="py-2 px-4 border-b">{entry.gasType || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{entry.gasConcentration || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{entry.gasBalance || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{entry.gasBatchNumber || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-semibold mt-6">Hasil Uji</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left">Parameter</th>
                  <th className="py-2 px-4 border-b text-left">Nilai</th>
                  <th className="py-2 px-4 border-b text-left">Hasil</th>
                </tr>
              </thead>
              <tbody>
                {testEntries.map((entry, index) => (
                  <tr key={index}>
                    <td className="py-2 px-4 border-b">{entry.testSensor || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{entry.testSpan || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{entry.testResult || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tambahkan tombol untuk reminder dan email */}
      {calibration && (
        <div className="mt-6 flex flex-wrap gap-4">
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
                <span>Buat Reminder Kalibrasi</span>
              </>
            )}
          </button>
          
          {calibration.customer && calibration.customer.contactEmail && (
            <button
              onClick={handleSendEmail}
              disabled={emailSending}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              {emailSending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Mengirim Email...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Kirim Email ke Customer</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
      
      {/* Notification untuk sukses */}
      {reminderSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md">
          Reminder berhasil dibuat!
        </div>
      )}
      
      {emailSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md">
          Email berhasil dikirim!
        </div>
      )}
      
      <button
        onClick={() => router.back()}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
      >
        Kembali
      </button>
    </div>
  );
} 
