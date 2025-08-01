'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotificationDebug from './NotificationDebug';
import UserManagement from './UserManagement';
import { 
  MdBackup, 
  MdOutlineSettings, 
  MdRestore, 
  MdColorLens, 
  MdNotifications, 
  MdHistory,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdEmail,
  MdDashboard
} from 'react-icons/md';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { TbUsersPlus } from "react-icons/tb";
const MySwal = withReactContent(Swal);

const SettingsPage = () => {
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string>('light');
  const [textSize, setTextSize] = useState<string>('medium');
  const [sessionTimeout, setSessionTimeout] = useState<number>(30);
  const [passwordPolicy, setPasswordPolicy] = useState({
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecial: true
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey] = useState("sk_paramata_7f8a9b3c5d2e1f0g");
  const [backupFormat, setBackupFormat] = useState<'sql' | 'dump' | 'both'>('sql');
  
  // Tambahkan state untuk menyimpan informasi file backup terakhir
  const [lastBackupFile, setLastBackupFile] = useState<string | null>(null);
  // modifikasi tipe state untuk lastBackupInfo agar mendukung multiple files
  const [lastBackupInfo, setLastBackupInfo] = useState<{
    timestamp: string;
    fileSize: string;
    filePath: string;
    fileExtension: string;
    bothFormats?: boolean;
    sql?: {
      filePath: string;
      fileSize: string;
      fileExtension: string;
    };
    dump?: {
      filePath: string; 
      fileSize: string;
      fileExtension: string;
    };
  } | null>(null);
  
  // Tambahkan fungsi untuk mendownload file backup terakhir
  const handleDownloadBackup = (format?: string) => {
    if (!lastBackupInfo) {
      toast.error('Tidak ada file backup untuk didownload. Silakan lakukan backup terlebih dahulu.');
      return;
    }
    
    let filePath = '';
    
    // Jika format dispecify dan ini adalah backup kedua format
    if (format && lastBackupInfo.bothFormats) {
      if (format === 'sql' && lastBackupInfo.sql) {
        filePath = lastBackupInfo.sql.filePath;
      } else if (format === 'dump' && lastBackupInfo.dump) {
        filePath = lastBackupInfo.dump.filePath;
      }
    } else {
      // Gunakan file path default
      filePath = lastBackupInfo.filePath;
    }
    
    if (!filePath) {
      toast.error('File path tidak valid');
      return;
    }
    
    // Request download file dari server
    window.open(`/api/admin/settings/download?path=${encodeURIComponent(filePath)}`, '_blank');
    toast.success('Mendownload file backup...');
  };

  const handleBackup = async () => {
    setIsBackupLoading(true);
    toast.info('Memulai proses backup data...', { autoClose: 3000 });
    
    try {
      // Gunakan fetch sederhana dengan timeout untuk memastikan responsnya diterima
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik timeout
      
      const response = await fetch('/api/admin/settings/backup', { 
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          format: backupFormat // kirim format yang dipilih
        })
      });
      
      clearTimeout(timeoutId);
      
      // Proses response sebagai text terlebih dahulu
      const textResponse = await response.text();
      console.log('Raw backup response:', textResponse);
      
      // Coba parse sebagai JSON
      let jsonData;
      try {
        jsonData = JSON.parse(textResponse);
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        if (response.ok) {
          toast.success('Backup berhasil!');
        } else {
          toast.error(`Gagal melakukan backup: ${response.status}`);
        }
        return;
      }
      
      // Proses response JSON
      if (response.ok && jsonData.success) {
        toast.success(jsonData.message || 'Backup data berhasil!');
        
        // Tambahkan informasi file path ke state
        if (jsonData.details) {
          if (backupFormat === 'both' && jsonData.details.bothFormats) {
            // Kasus kedua format
            setLastBackupFile(jsonData.details.sql?.filePath || ''); // Simpan path SQL sebagai default
            setLastBackupInfo({
              timestamp: new Date().toLocaleString('id-ID'),
              fileSize: jsonData.details.sql?.fileSize || 'Unknown',
              filePath: jsonData.details.sql?.filePath || '',
              fileExtension: 'sql',
              bothFormats: true,
              sql: {
                filePath: jsonData.details.sql?.filePath || '',
                fileSize: jsonData.details.sql?.fileSize || 'Unknown',
                fileExtension: 'sql'
              },
              dump: {
                filePath: jsonData.details.dump?.filePath || '',
                fileSize: jsonData.details.dump?.fileSize || 'Unknown', 
                fileExtension: 'dump'
              }
            });
          } else if (jsonData.details.filePath) {
            // Kasus format tunggal
            setLastBackupFile(jsonData.details.filePath);
            setLastBackupInfo({
              timestamp: new Date().toLocaleString('id-ID'),
              fileSize: jsonData.details.fileSize || 'Unknown size',
              filePath: jsonData.details.filePath,
              fileExtension: jsonData.details.fileExtension || 'sql'
            });
          }
        }
        
        // Tampilkan detail tambahan jika ada
        if (jsonData.details) {
          console.log('Backup details:', jsonData.details);
          if (backupFormat === 'both') {
            toast.info(`File SQL: ${jsonData.details.sql?.fileSize || 'Unknown'}, File DUMP: ${jsonData.details.dump?.fileSize || 'Unknown'}`);
          } else {
            toast.info(`File size: ${jsonData.details.fileSize || 'Unknown'}`);
          }
        }
      } else {
        throw new Error(jsonData.error || 'Gagal melakukan backup data');
      }
    } catch (error: any) {
      console.error('Backup error:', error);
      if (error.name === 'AbortError') {
        toast.error('Permintaan backup timeout. Silakan coba lagi.');
      } else {
        toast.error(error.message || 'Gagal melakukan backup data');
      }
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleReset = async () => {
    // Ganti window.confirm dan window.prompt dengan SweetAlert2
    const result = await MySwal.fire({
      title: '⚠️ PERINGATAN PENTING ⚠️',
      html: `<div style="text-align:left;font-size:15px;">
        <b>Anda akan <span style='color:#d32f2f;'>MENGHAPUS SEMUA DATA</span> dalam sistem.</b><br/>Tindakan ini <b>tidak dapat dibatalkan!</b><br/><br/>
        <span style='color:#1976d2;'>Pastikan Anda sudah membuat backup data terlebih dahulu.</span><br/><br/>
        <b>Ketik <span style='color:#d32f2f;'>RESET</span> di bawah ini untuk konfirmasi.</b>
      </div>`,
      input: 'text',
      inputPlaceholder: 'Ketik RESET di sini',
      inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
      showCancelButton: true,
      confirmButtonText: 'Konfirmasi',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#1976d2',
      allowOutsideClick: false,
      preConfirm: (value) => {
        if (value !== 'RESET') {
          MySwal.showValidationMessage('Ketik <b>RESET</b> (huruf besar semua) untuk melanjutkan!');
          return false;
        }
        return true;
      }
    });

    if (!result.isConfirmed) {
      toast.info('Reset data dibatalkan.');
      return;
    }

      setIsResetLoading(true);
    toast.info('Memulai proses reset data...', { autoClose: 5000 });

    try {
      // Gunakan fetch sederhana dengan timeout yang lebih lama untuk reset
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik timeout
      
      const response = await fetch('/api/admin/settings/reset', { 
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Proses response sebagai text terlebih dahulu
      const textResponse = await response.text();
      console.log('Raw reset response:', textResponse);
      
      // Coba parse sebagai JSON
      let jsonData;
      try {
        jsonData = JSON.parse(textResponse);
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        if (response.ok) {
          toast.success('Reset berhasil!');
        } else {
          toast.error(`Gagal melakukan reset: ${response.status}`);
        }
        return;
      }
      
      // Proses response JSON
      if (response.ok && jsonData.success) {
        toast.success(jsonData.message || 'Reset data berhasil!');
        
        // Tampilkan detail tambahan jika ada
        if (jsonData.details) {
          console.log('Reset details:', jsonData.details);
          toast.info(`Total tabel direset: ${jsonData.details.tablesReset || 0}`);
        }
        
        // Jika reset berhasil, refresh halaman setelah beberapa detik
        setTimeout(() => {
          toast.info('Merefresh halaman...');
          window.location.reload();
        }, 5000);
      } else {
        throw new Error(jsonData.error || 'Gagal melakukan reset data');
      }
      } catch (error: any) {
        console.error('Reset error:', error);
      if (error.name === 'AbortError') {
        toast.error('Permintaan reset timeout. Silakan coba lagi.');
      } else {
        toast.error(error.message || 'Gagal melakukan reset data');
      }
      } finally {
        setIsResetLoading(false);
    }
  };

  const handleThemeChange = (theme: string) => {
    setActiveTheme(theme);
    // Disini nanti bisa implementasi tema dengan menambahkan class ke body atau root element
    document.documentElement.classList.remove('light-theme', 'dark-theme', 'green-theme');
    document.documentElement.classList.add(`${theme}-theme`);
    toast.success(`Tema berhasil diubah ke ${theme}`);
  };
  
  const handleTextSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = e.target.value;
    setTextSize(size);
    toast.success(`Ukuran teks berhasil diubah ke ${size}`);
    
    // Implementasi perubahan ukuran teks
    document.documentElement.classList.remove('text-small', 'text-medium', 'text-large');
    document.documentElement.classList.add(`text-${size}`);
  };

  const handleSessionTimeoutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setSessionTimeout(value);
      toast.success(`Batas waktu sesi diubah menjadi ${value} menit`);
    }
  };
  
  const togglePasswordPolicy = (setting: keyof typeof passwordPolicy) => {
    setPasswordPolicy(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
    toast.success(`Kebijakan kata sandi diperbarui`);
  };
  
  const handleMinLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 6) {
      setPasswordPolicy(prev => ({
        ...prev,
        minLength: value
      }));
    }
  };
  
  const regenerateApiKey = () => {
    toast.success("API Key berhasil diperbaharui");
    // Implementasi regenerasi API Key akan ditambahkan di sini
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <div className="bg-gradient-to-r from-green-50 to-white p-6 rounded-xl shadow-sm border border-green-100">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-full">
                <MdOutlineSettings className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Pengaturan Sistem</h1>
                <p className="text-gray-600 mt-1">Kelola konfigurasi, data, dan preferensi sistem</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a 
                href="/admin-dashboard" 
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <MdDashboard className="h-5 w-5" />
                <span>Kembali ke Dashboard</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="data-management" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
          <TabsTrigger 
            value="data-management" 
            className="data-tab flex items-center justify-center gap-2 py-2 text-sm font-medium data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
          >
            <MdBackup className="h-5 w-5" />
            <span>Data</span>
          </TabsTrigger>
          <TabsTrigger 
            value="appearance" 
            className="appearance-tab flex items-center justify-center gap-2 py-2 text-sm font-medium data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
          >
            <MdColorLens className="h-5 w-5" />
            <span>Tampilan</span>
          </TabsTrigger>
          <TabsTrigger 
            value="notification-debug" 
            className="notification-tab flex items-center justify-center gap-2 py-2 text-sm font-medium data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
          >
            <MdNotifications className="h-5 w-5" />
            <span>Notifikasi</span>
          </TabsTrigger>
          <TabsTrigger 
            value="user-management" 
            className="user-tab flex items-center justify-center gap-2 py-2 text-sm font-medium data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
          >
            <TbUsersPlus className="h-5 w-5" />
            <span>Pengguna</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="data-management">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Database Backup */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-start mb-5">
                <div className="bg-green-50 p-3 rounded-lg mr-4">
                  <MdBackup className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Backup Database</h2>
                  <p className="text-gray-600 mt-1">
                    Buat cadangan seluruh data dalam sistem. Backup akan disimpan di server.
                  </p>
                </div>
              </div>
              
              <div className="mb-5">
                <p className="text-sm font-medium text-gray-700 mb-3">Format Backup</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-green-300 transition-colors">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-green-600"
                      name="backupFormat"
                      value="sql"
                      checked={backupFormat === 'sql'}
                      onChange={() => setBackupFormat('sql')}
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-medium text-gray-700">SQL (Plain)</span>
                      <span className="block text-xs text-gray-500 mt-0.5">Format teks standar</span>
                    </div>
                  </label>
                  <label className="flex items-center p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-green-300 transition-colors">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-green-600"
                      name="backupFormat"
                      value="dump"
                      checked={backupFormat === 'dump'}
                      onChange={() => setBackupFormat('dump')}
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-medium text-gray-700">DUMP</span>
                      <span className="block text-xs text-gray-500 mt-0.5">Format terkompresi</span>
                    </div>
                  </label>
                  <label className="flex items-center p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-green-300 transition-colors">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-green-600"
                      name="backupFormat"
                      value="both"
                      checked={backupFormat === 'both'}
                      onChange={() => setBackupFormat('both')}
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-medium text-gray-700">Kedua Format</span>
                      <span className="block text-xs text-gray-500 mt-0.5">SQL & DUMP</span>
                    </div>
                  </label>
                </div>
                {backupFormat && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm text-green-800">
                  {backupFormat === 'sql' 
                    ? 'Format SQL mudah dibaca dan dapat langsung diimpor ke database PostgreSQL lain.' 
                    : backupFormat === 'dump'
                      ? 'Format DUMP lebih efisien (ukuran lebih kecil) dan mendukung restore selektif.'
                      : 'Backup dalam kedua format sekaligus untuk keamanan dan fleksibilitas maksimal.'}
                  </div>
                )}
              </div>
              
              <button
                onClick={handleBackup}
                disabled={isBackupLoading}
                className="w-full flex items-center justify-center bg-green-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-300 transition-colors"
              >
                {isBackupLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12L5 4C5 3.44772 5.44772 3 6 3L18 3C18.5523 3 19 3.44772 19 4L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M12 17L12 11M12 17L9 14M12 17L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 15L3 19C3 20.1046 3.89543 21 5 21L19 21C20.1046 21 21 20.1046 21 19L21 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Backup Data
                  </>
                )}
              </button>
              
              {lastBackupInfo ? (
                <div className="mt-5 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Backup Terakhir</h3>
                    
                    {lastBackupInfo.bothFormats ? (
                      <>
                      <div className="mb-3 text-xs text-gray-600">
                        <span>Dibuat: </span>
                        <span className="font-medium">{lastBackupInfo.timestamp}</span>
                      </div>
                      <div className="flex justify-start mb-3">
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-md font-medium">
                            Backup dalam kedua format
                          </span>
                        </div>
                        
                        {/* SQL File Info */}
                      <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm">File SQL:</span>
                          <span className="bg-blue-100 px-2 py-0.5 rounded text-xs text-blue-800 font-medium">
                              {lastBackupInfo.sql?.fileSize}
                            </span>
                          </div>
                        <div className="font-mono text-xs bg-gray-50 p-2 rounded-md mb-2 overflow-hidden text-ellipsis">
                            {lastBackupInfo.sql?.filePath.split('/').pop() || 
                             lastBackupInfo.sql?.filePath.split('\\').pop()}
                          </div>
                          <button
                            onClick={() => handleDownloadBackup('sql')}
                          className="w-full flex items-center justify-center bg-blue-500 text-white font-medium py-2 px-3 rounded-md hover:bg-blue-600 transition-colors text-sm"
                          >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download SQL
                          </button>
                        </div>
                        
                        {/* DUMP File Info */}
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm">File DUMP:</span>
                          <span className="bg-green-100 px-2 py-0.5 rounded text-xs text-green-800 font-medium">
                              {lastBackupInfo.dump?.fileSize}
                            </span>
                          </div>
                        <div className="font-mono text-xs bg-gray-50 p-2 rounded-md mb-2 overflow-hidden text-ellipsis">
                            {lastBackupInfo.dump?.filePath.split('/').pop() || 
                             lastBackupInfo.dump?.filePath.split('\\').pop()}
                          </div>
                          <button
                            onClick={() => handleDownloadBackup('dump')}
                          className="w-full flex items-center justify-center bg-green-500 text-white font-medium py-2 px-3 rounded-md hover:bg-green-600 transition-colors text-sm"
                          >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download DUMP
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Waktu:</span> 
                          <span className="font-medium">{lastBackupInfo.timestamp}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Ukuran:</span> 
                          <span className="font-medium">{lastBackupInfo.fileSize}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Format:</span> 
                          <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-md font-medium">
                            {lastBackupInfo.fileExtension === 'sql' ? 'SQL' : 'DUMP'}
                          </span>
                        </div>
                        <div className="font-mono text-xs bg-gray-50 p-2 rounded-md overflow-hidden text-ellipsis">
                            {lastBackupInfo.filePath.split('/').pop() || lastBackupInfo.filePath.split('\\').pop()}
                        </div>
                        </div>
                        
                        <button
                          onClick={() => handleDownloadBackup()}
                        className="w-full flex items-center justify-center bg-green-500 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-green-600 transition-colors"
                        >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download File Backup
                        </button>
                      </>
                    )}
                </div>
              ) : (
                <div className="mt-5 bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                  <div className="flex flex-col items-center justify-center py-3">
                    <MdHistory className="h-10 w-10 text-gray-400 mb-2" />
                    <h3 className="text-sm font-medium text-gray-800 mb-1">Belum Ada Backup</h3>
                    <p className="text-xs text-gray-600">
                    Belum ada backup terbaru. Klik "Backup Data" untuk membuat backup database.
                </p>
                  </div>
              </div>
              )}
            </div>
            
            {/* Reset Database */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-start mb-5">
                <div className="bg-red-50 p-3 rounded-lg mr-4">
                  <MdRestore className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Reset Database</h2>
                  <p className="text-gray-600 mt-1">
                    Kembalikan database ke kondisi awal. Seluruh data akan dihapus.
                  </p>
                </div>
              </div>
              
              <div className="mb-5">
                <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start mb-4">
                  <div className="mr-3 mt-0.5 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-red-800 font-medium">Peringatan:</p>
                    <p className="text-sm text-red-800 mt-1">
                      Tindakan ini akan menghapus semua data dalam sistem dan tidak dapat dibatalkan. Pastikan untuk membuat backup terlebih dahulu.
                    </p>
                  </div>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center mb-3">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2"></div>
                    <h3 className="font-medium text-gray-800 text-sm">Yang akan dihapus:</h3>
                  </div>
                  <ul className="space-y-2 pl-4 text-sm text-gray-600">
                    <li className="flex items-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 mr-2"></span>
                      <span>Data inventaris dan kalibrasi</span>
                    </li>
                    <li className="flex items-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 mr-2"></span>
                      <span>Histori pemeliharaan dan penyewaan</span>
                    </li>
                    <li className="flex items-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 mr-2"></span>
                      <span>Notifikasi dan pengaturan sistem</span>
                    </li>
                    <li className="flex items-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 mr-2"></span>
                      <span>Catatan aktivitas dan log sistem</span>
                    </li>
                  </ul>
                   
                  <div className="flex items-center mt-4 mb-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                    <h3 className="font-medium text-gray-800 text-sm">Yang akan dipertahankan:</h3>
                  </div>
                  <ul className="space-y-2 pl-4 text-sm text-gray-600">
                    <li className="flex items-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 mr-2"></span>
                      <span>Data pengguna dan admin (Model User)</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <button
                onClick={handleReset}
                disabled={isResetLoading}
                className="w-full flex items-center justify-center bg-red-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-red-700 disabled:bg-red-300 transition-colors"
              >
                {isResetLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 16H11V18H13V16Z" fill="currentColor" />
                      <path d="M12 6C11.4477 6 11 6.44772 11 7V13C11 13.5523 11.4477 14 12 14C12.5523 14 13 13.5523 13 13V7C13 6.44772 12.5523 6 12 6Z" fill="currentColor" />
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12Z" fill="currentColor" />
                    </svg>
                    Reset Data
                  </>
                )}
              </button>
              
              {/* Empty state to match the layout of backup card */}
              {!lastBackupInfo && (
                <div className="mt-5 bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                  <div className="py-3">
                    <p className="text-sm text-gray-600">
                      Disarankan membuat backup data terlebih dahulu sebelum melakukan reset.
                </p>
              </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="appearance">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <MdColorLens className="h-6 w-6 text-green-600" />
              Pengaturan Tampilan
            </h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Tema Aplikasi</h3>
                <p className="text-gray-600 mb-4">
                  Pilih tema yang akan digunakan pada seluruh aplikasi.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div 
                    className={`border p-4 rounded-lg cursor-pointer transition-all ${activeTheme === 'light' ? 'ring-2 ring-green-500 border-green-200 bg-green-50' : 'hover:bg-gray-50'}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    <div className="h-24 rounded-md bg-white border border-gray-200 mb-3 flex items-center justify-center">
                      <div className="w-full px-3">
                        <div className="h-3 w-24 bg-gray-200 rounded-full mx-auto mb-2"></div>
                        <div className="h-2 w-20 bg-gray-100 rounded-full mx-auto"></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">Terang</span>
                      {activeTheme === 'light' && <div className="w-4 h-4 rounded-full bg-green-500"></div>}
                    </div>
                  </div>
                  
                  <div 
                    className={`border p-4 rounded-lg cursor-pointer transition-all ${activeTheme === 'dark' ? 'ring-2 ring-green-500 border-green-200 bg-green-50' : 'hover:bg-gray-50'}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <div className="h-24 rounded-md bg-gray-800 border border-gray-700 mb-3 flex items-center justify-center">
                      <div className="w-full px-3">
                        <div className="h-3 w-24 bg-gray-600 rounded-full mx-auto mb-2"></div>
                        <div className="h-2 w-20 bg-gray-700 rounded-full mx-auto"></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">Gelap</span>
                      {activeTheme === 'dark' && <div className="w-4 h-4 rounded-full bg-green-500"></div>}
                    </div>
                  </div>
                  
                  <div 
                    className={`border p-4 rounded-lg cursor-pointer transition-all ${activeTheme === 'green' ? 'ring-2 ring-green-500 border-green-200 bg-green-50' : 'hover:bg-gray-50'}`}
                    onClick={() => handleThemeChange('green')}
                  >
                    <div className="h-24 rounded-md bg-green-50 border border-green-200 mb-3 flex items-center justify-center">
                      <div className="w-full px-3">
                        <div className="h-3 w-24 bg-green-200 rounded-full mx-auto mb-2"></div>
                        <div className="h-2 w-20 bg-green-100 rounded-full mx-auto"></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">Hijau</span>
                      {activeTheme === 'green' && <div className="w-4 h-4 rounded-full bg-green-500"></div>}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Ukuran Teks</h3>
                <p className="text-gray-600 mb-4">
                  Sesuaikan ukuran teks pada antarmuka aplikasi.
                </p>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div 
                      className={`border p-4 rounded-lg cursor-pointer transition-all ${textSize === 'small' ? 'ring-2 ring-green-500 border-green-200 bg-green-50' : 'hover:bg-gray-50'}`}
                      onClick={() => setTextSize('small')}
                    >
                      <div className="text-center">
                        <p className="text-xs mb-1">A</p>
                        <p className="text-gray-600 text-xs">Kecil</p>
                      </div>
                    </div>
                    
                    <div 
                      className={`border p-4 rounded-lg cursor-pointer transition-all ${textSize === 'medium' ? 'ring-2 ring-green-500 border-green-200 bg-green-50' : 'hover:bg-gray-50'}`}
                      onClick={() => setTextSize('medium')}
                    >
                      <div className="text-center">
                        <p className="text-sm mb-1">A</p>
                        <p className="text-gray-600 text-xs">Sedang</p>
                      </div>
                    </div>
                    
                    <div 
                      className={`border p-4 rounded-lg cursor-pointer transition-all ${textSize === 'large' ? 'ring-2 ring-green-500 border-green-200 bg-green-50' : 'hover:bg-gray-50'}`}
                      onClick={() => setTextSize('large')}
                    >
                      <div className="text-center">
                        <p className="text-base mb-1">A</p>
                        <p className="text-gray-600 text-xs">Besar</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Batas Waktu Sesi</h3>
                <p className="text-gray-600 mb-4">
                  Atur batas waktu sesi pengguna tidak aktif sebelum otomatis logout.
                </p>
                
                <div className="flex flex-col space-y-2 max-w-md">
                  <div className="flex justify-between">
                    <label className="text-sm text-gray-600">Batas Waktu (menit)</label>
                    <span className="text-sm font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded">{sessionTimeout} menit</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={sessionTimeout}
                    onChange={handleSessionTimeoutChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                    aria-label="Batas waktu sesi dalam menit"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>5 menit</span>
                    <span>60 menit</span>
                    <span>120 menit</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Sesi akan otomatis berakhir setelah tidak ada aktivitas selama {sessionTimeout} menit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="notification-debug">
          <NotificationDebug />
        </TabsContent>
        
        <TabsContent value="user-management">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage; 