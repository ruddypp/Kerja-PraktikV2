'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function NotificationDebug() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const addLog = (message: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
  };
  
  const clearLogs = () => {
    setLogs([]);
  };
  
  const testNotificationSound = () => {
    addLog('Mencoba memainkan suara notifikasi...');
    
    const audio = new Audio('/notification-sound.mp3');
    audio.play()
      .then(() => {
        addLog('✅ Suara notifikasi berhasil diputar');
        toast.success('Suara berhasil diputar!');
      })
      .catch(error => {
        addLog(`❌ Gagal memainkan suara: ${error.message}`);
        toast.error(`Gagal memutar suara: ${error.message}`);
        console.error('Error playing sound:', error);
      });
  };
  
  const checkDueReminders = async () => {
    setIsLoading(true);
    addLog('Memeriksa reminder yang jatuh tempo...');
    
    try {
      const response = await fetch('/api/debug/notifications?action=check_reminders');
      
      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Berhasil memeriksa reminder: ${data.results.length} reminder diproses`);
        
        if (data.results.length === 0) {
          addLog('⚠️ Tidak ada reminder yang jatuh tempo ditemukan');
        } else {
          addLog(`📋 Detail reminder yang diproses: ${JSON.stringify(data.results, null, 2)}`);
        }
        
        toast.success(`Pemeriksaan selesai: ${data.results.length} reminder diproses.`);
      } else {
        const errorText = await response.text();
        addLog(`❌ Gagal memeriksa reminder: ${response.status} - ${errorText}`);
        toast.error('Gagal memeriksa reminder.');
      }
    } catch (error) {
      addLog(`❌ Error saat memeriksa reminder: ${error}`);
      toast.error('Terjadi error saat memeriksa reminder.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const createTestNotification = async () => {
    setIsLoading(true);
    addLog('Membuat notifikasi uji...');
    
    try {
      const response = await fetch('/api/debug/notifications?action=create_test_notification');
      
      if (response.ok) {
        addLog('✅ Notifikasi uji berhasil dibuat');
        toast.success('Notifikasi uji berhasil dibuat!');
      } else {
        const errorText = await response.text();
        addLog(`❌ Gagal membuat notifikasi uji: ${response.status} - ${errorText}`);
        toast.error('Gagal membuat notifikasi uji.');
      }
    } catch (error) {
      addLog(`❌ Error saat membuat notifikasi uji: ${error}`);
      toast.error('Terjadi error saat membuat notifikasi uji.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const listDueReminders = async () => {
    setIsLoading(true);
    addLog('Mendapatkan daftar reminder yang jatuh tempo...');
    
    try {
      const response = await fetch('/api/debug/notifications?action=list_due_reminders');
      
      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Ditemukan ${data.dueReminders.length} reminder yang jatuh tempo`);
        
        if (data.dueReminders.length === 0) {
          addLog('⚠️ Tidak ada reminder yang jatuh tempo ditemukan');
        } else {
          addLog(`📋 Detail reminder: ${JSON.stringify(data.dueReminders, null, 2)}`);
        }
        
        toast.success(`Ditemukan ${data.dueReminders.length} reminder.`);
      } else {
        const errorText = await response.text();
        addLog(`❌ Gagal mendapatkan daftar reminder: ${response.status} - ${errorText}`);
        toast.error('Gagal mendapatkan daftar reminder.');
      }
    } catch (error) {
      addLog(`❌ Error saat mendapatkan daftar reminder: ${error}`);
      toast.error('Terjadi error saat mendapatkan daftar reminder.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const listRecentNotifications = async () => {
    setIsLoading(true);
    addLog('Mendapatkan notifikasi terbaru...');
    
    try {
      const response = await fetch('/api/debug/notifications?action=list_recent_notifications');
      
      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Ditemukan ${data.recentNotifications.length} notifikasi terbaru`);
        
        if (data.recentNotifications.length === 0) {
          addLog('⚠️ Tidak ada notifikasi terbaru ditemukan');
        } else {
          addLog(`📋 Detail notifikasi: ${JSON.stringify(data.recentNotifications, null, 2)}`);
        }
        
        toast.success(`Ditemukan ${data.recentNotifications.length} notifikasi.`);
      } else {
        const errorText = await response.text();
        addLog(`❌ Gagal mendapatkan notifikasi terbaru: ${response.status} - ${errorText}`);
        toast.error('Gagal mendapatkan notifikasi terbaru.');
      }
    } catch (error) {
      addLog(`❌ Error saat mendapatkan notifikasi terbaru: ${error}`);
      toast.error('Terjadi error saat mendapatkan notifikasi terbaru.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-6 border rounded-lg mt-4 bg-white shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg">
          <h2 className="text-lg font-medium mb-4">Alat Debug Notifikasi</h2>
          
          <div className="space-y-4">
            <ActionButton title="1. Uji Suara Notifikasi" description="Klik untuk menguji apakah suara notifikasi dapat diputar." onClick={testNotificationSound} buttonText="Uji Suara" isLoading={isLoading} />
            <ActionButton title="2. Periksa Reminder Jatuh Tempo" description="Memicu pemeriksaan reminder yang jatuh tempo dan membuat notifikasi." onClick={checkDueReminders} buttonText="Periksa Reminder" isLoading={isLoading} />
            <ActionButton title="3. Buat Notifikasi Uji" description="Membuat notifikasi uji untuk memverifikasi sistem." onClick={createTestNotification} buttonText="Buat Notifikasi Uji" isLoading={isLoading} />
            <ActionButton title="4. Lihat Reminder Jatuh Tempo" description="Menampilkan daftar reminder yang jatuh tempo hari ini atau sudah lewat." onClick={listDueReminders} buttonText="Lihat Reminder" isLoading={isLoading} />
            <ActionButton title="5. Lihat Notifikasi Terbaru" description="Menampilkan daftar notifikasi terbaru yang ada di sistem." onClick={listRecentNotifications} buttonText="Lihat Notifikasi" isLoading={isLoading} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Log Aktivitas</h2>
            <button onClick={clearLogs} className="text-xs text-red-600 hover:text-red-800" disabled={isLoading}>
              Bersihkan Log
            </button>
          </div>
          
          <div className="bg-gray-100 rounded p-4 h-[400px] overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center italic">Belum ada aktivitas log</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ActionButton = ({ title, description, onClick, buttonText, isLoading }: { title: string; description: string; onClick: () => void; buttonText: string; isLoading: boolean; }) => (
  <div>
    <h3 className="font-medium mb-1">{title}</h3>
    <p className="text-sm text-gray-600 mb-2">{description}</p>
    <button onClick={onClick} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300 transition-colors" disabled={isLoading}>
      {buttonText}
    </button>
  </div>
); 