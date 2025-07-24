'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { MdNotifications, MdVolumeUp, MdDelete, MdHistory, MdCheck, MdList } from 'react-icons/md';

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
        // Check for specific autoplay policy error message
        if (error.name === 'NotAllowedError' || error.message.includes('user didn\'t interact')) {
          addLog('❌ Gagal memainkan suara: Kebijakan browser membatasi autoplay');
          toast.error('Interaksi pengguna dibutuhkan sebelum memutar suara. Klik di mana saja pada halaman terlebih dahulu, lalu coba lagi.', {
            duration: 8000,
          });
          console.warn('Browser autoplay policy error:', error);
        } else {
          addLog(`❌ Gagal memainkan suara: ${error.message}`);
          toast.error(`Gagal memutar suara: ${error.message}`);
          console.error('Error playing sound:', error);
        }
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
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
        <MdNotifications className="h-6 w-6 text-green-600" />
        Alat Debug Notifikasi
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="space-y-5">
            <ActionCard 
              icon={<MdVolumeUp className="h-5 w-5" />} 
              title="Uji Suara Notifikasi" 
              description="Klik untuk menguji apakah suara notifikasi dapat diputar." 
              onClick={testNotificationSound} 
              buttonText="Putar Suara" 
              isLoading={isLoading}
              colorClass="bg-blue-500 hover:bg-blue-600"
            />
            
            <ActionCard 
              icon={<MdCheck className="h-5 w-5" />} 
              title="Periksa Reminder Jatuh Tempo" 
              description="Memicu pemeriksaan reminder yang jatuh tempo dan membuat notifikasi." 
              onClick={checkDueReminders} 
              buttonText="Periksa Reminder" 
              isLoading={isLoading}
              colorClass="bg-green-600 hover:bg-green-700"
            />
            
            <ActionCard 
              icon={<MdNotifications className="h-5 w-5" />} 
              title="Buat Notifikasi Uji" 
              description="Membuat notifikasi uji untuk memverifikasi sistem." 
              onClick={createTestNotification} 
              buttonText="Buat Notifikasi" 
              isLoading={isLoading}
              colorClass="bg-purple-600 hover:bg-purple-700"
            />
            
            <ActionCard 
              icon={<MdHistory className="h-5 w-5" />} 
              title="Lihat Reminder Jatuh Tempo" 
              description="Menampilkan daftar reminder yang jatuh tempo hari ini atau sudah lewat." 
              onClick={listDueReminders} 
              buttonText="Lihat Reminder" 
              isLoading={isLoading}
              colorClass="bg-orange-500 hover:bg-orange-600"
            />
            
            <ActionCard 
              icon={<MdList className="h-5 w-5" />} 
              title="Lihat Notifikasi Terbaru" 
              description="Menampilkan daftar notifikasi terbaru yang ada di sistem." 
              onClick={listRecentNotifications} 
              buttonText="Lihat Notifikasi" 
              isLoading={isLoading}
              colorClass="bg-teal-600 hover:bg-teal-700"
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Log Aktivitas</h3>
            <button 
              onClick={clearLogs} 
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-red-600 hover:text-white hover:bg-red-600 rounded-md border border-red-200 hover:border-red-600 transition-colors"
              disabled={isLoading}
            >
              <MdDelete className="h-4 w-4" />
              Bersihkan Log
            </button>
          </div>
          
          <div className="h-[460px] overflow-y-auto bg-gray-50 rounded-lg border border-gray-200 p-4">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-center italic">Belum ada aktivitas log</p>
                <p className="text-xs text-center mt-1">Klik salah satu tombol untuk memulai debug</p>
              </div>
            ) : (
              <div className="space-y-2 font-mono text-sm">
                {logs.map((log, index) => {
                  // Highlight different types of logs with colors
                  let logClass = "px-2 py-1 rounded";
                  if (log.includes("✅")) {
                    logClass += " bg-green-50 text-green-900";
                  } else if (log.includes("❌")) {
                    logClass += " bg-red-50 text-red-900";
                  } else if (log.includes("⚠️")) {
                    logClass += " bg-yellow-50 text-yellow-900";
                  } else if (log.includes("📋")) {
                    logClass += " bg-blue-50 text-blue-900";
                  }
                  
                  return <div key={index} className={logClass}>{log}</div>
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  buttonText: string;
  isLoading: boolean;
  colorClass: string;
}

const ActionCard = ({ icon, title, description, onClick, buttonText, isLoading, colorClass }: ActionCardProps) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start gap-3 mb-3">
      <div className="bg-green-50 p-2 rounded-lg text-green-600">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600 mt-0.5">{description}</p>
      </div>
    </div>
    <button 
      onClick={onClick} 
      className={`w-full flex items-center justify-center px-4 py-2 ${colorClass} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium`} 
      disabled={isLoading}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {buttonText}
    </button>
  </div>
); 