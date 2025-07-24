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
  MdSecurity,
  MdHistory,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdEmail
} from 'react-icons/md';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

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
    toast.info('Memulai proses backup data...', { duration: 3000 });
    
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
    toast.info('Memulai proses reset data...', { duration: 5000 });

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
    <div className="container mx-auto p-8">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">Pengaturan Sistem</h1>
      </div>
      
      <Tabs defaultValue="data-management" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="data-management" className="data-tab flex items-center justify-center gap-2">
            <MdBackup className="h-5 w-5" />
            <span className="hidden md:inline">Data</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="appearance-tab flex items-center justify-center gap-2">
            <MdColorLens className="h-5 w-5" />
            <span className="hidden md:inline">Tampilan</span>
          </TabsTrigger>
          <TabsTrigger value="notification-debug" className="notification-tab flex items-center justify-center gap-2">
            <MdNotifications className="h-5 w-5" />
            <span className="hidden md:inline">Notifikasi</span>
          </TabsTrigger>
          <TabsTrigger value="user-management" className="user-tab flex items-center justify-center gap-2">
            <MdSecurity className="h-5 w-5" />
            <span className="hidden md:inline">Pengguna</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="data-management">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Database Backup */}
            <div className="p-6 border rounded-lg mt-4 bg-white shadow-sm">
              <div className="flex items-start mb-4">
                <div className="bg-blue-100 p-3 rounded-lg mr-4">
                  <MdBackup className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-700">Backup Database</h2>
                  <p className="text-gray-600 mb-4">
                    Buat cadangan seluruh data dalam sistem. Backup akan disimpan di server.
                  </p>
                </div>
              </div>
              
              {/* Format Selector */}
              <div className="mb-4 bg-blue-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-blue-800 mb-2">Format Backup</label>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-blue-600"
                      name="backupFormat"
                      value="sql"
                      checked={backupFormat === 'sql'}
                      onChange={() => setBackupFormat('sql')}
                    />
                    <span className="ml-2 text-sm text-gray-700">SQL (Plain)</span>
                    <span className="ml-1 text-xs text-gray-500">- Format teks standar</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-blue-600"
                      name="backupFormat"
                      value="dump"
                      checked={backupFormat === 'dump'}
                      onChange={() => setBackupFormat('dump')}
                    />
                    <span className="ml-2 text-sm text-gray-700">DUMP (Compressed)</span>
                    <span className="ml-1 text-xs text-gray-500">- Format terkompresi</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-blue-600"
                      name="backupFormat"
                      value="both"
                      checked={backupFormat === 'both'}
                      onChange={() => setBackupFormat('both')}
                    />
                    <span className="ml-2 text-sm text-gray-700">Kedua Format</span>
                    <span className="ml-1 text-xs text-gray-500">- SQL & DUMP</span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-blue-700">
                  {backupFormat === 'sql' 
                    ? 'Format SQL mudah dibaca dan dapat langsung diimpor ke database PostgreSQL lain.' 
                    : backupFormat === 'dump'
                      ? 'Format DUMP lebih efisien (ukuran lebih kecil) dan mendukung restore selektif.'
                      : 'Backup dalam kedua format sekaligus untuk keamanan dan fleksibilitas maksimal.'}
                </p>
              </div>
              
              <button
                onClick={handleBackup}
                disabled={isBackupLoading}
                className="w-full flex items-center justify-center bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
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
                    <MdBackup className="mr-2 h-5 w-5" /> Backup Data
                  </>
                )}
              </button>
              
              {/* Tampilkan informasi file backup terakhir dan tombol download */}
              {lastBackupInfo ? (
                <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Backup Terakhir</h3>
                  <div className="text-xs text-blue-700 mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span>Dibuat:</span> 
                      <span className="font-medium">{lastBackupInfo.timestamp}</span>
                    </div>
                    
                    {lastBackupInfo.bothFormats ? (
                      <>
                        <div className="mt-2 mb-1">
                          <span className="font-medium bg-blue-200 px-2 py-0.5 rounded-md">
                            Backup dalam kedua format
                          </span>
                        </div>
                        
                        {/* SQL File Info */}
                        <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">File SQL:</span>
                            <span className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">
                              {lastBackupInfo.sql?.fileSize}
                            </span>
                          </div>
                          <div className="font-mono text-[10px] bg-gray-100 p-1 rounded-sm mb-1 truncate">
                            {lastBackupInfo.sql?.filePath.split('/').pop() || 
                             lastBackupInfo.sql?.filePath.split('\\').pop()}
                          </div>
                          <button
                            onClick={() => handleDownloadBackup('sql')}
                            className="w-full mt-1 flex items-center justify-center bg-blue-400 text-white font-medium py-1 px-2 rounded-md hover:bg-blue-500 text-xs"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download SQL
                          </button>
                        </div>
                        
                        {/* DUMP File Info */}
                        <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">File DUMP:</span>
                            <span className="bg-green-100 px-1.5 py-0.5 rounded text-xs">
                              {lastBackupInfo.dump?.fileSize}
                            </span>
                          </div>
                          <div className="font-mono text-[10px] bg-gray-100 p-1 rounded-sm mb-1 truncate">
                            {lastBackupInfo.dump?.filePath.split('/').pop() || 
                             lastBackupInfo.dump?.filePath.split('\\').pop()}
                          </div>
                          <button
                            onClick={() => handleDownloadBackup('dump')}
                            className="w-full mt-1 flex items-center justify-center bg-green-500 text-white font-medium py-1 px-2 rounded-md hover:bg-green-600 text-xs"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download DUMP
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-1">
                          <span>Ukuran:</span> 
                          <span className="font-medium">{lastBackupInfo.fileSize}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span>Format:</span> 
                          <span className="font-medium bg-blue-200 px-2 py-0.5 rounded-md">
                            {lastBackupInfo.fileExtension === 'sql' ? 'SQL' : 'DUMP'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>File:</span> 
                          <span className="font-mono text-[10px] bg-gray-100 px-1 rounded-sm">
                            {lastBackupInfo.filePath.split('/').pop() || lastBackupInfo.filePath.split('\\').pop()}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => handleDownloadBackup()}
                          className="w-full mt-2 flex items-center justify-center bg-blue-500 text-white font-medium py-2 px-3 rounded-md hover:bg-blue-600 text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download File Backup
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
              <div className="mt-4 bg-blue-50 p-3 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-1">Riwayat Backup</h3>
                <p className="text-xs text-blue-700">
                    Belum ada backup terbaru. Klik "Backup Data" untuk membuat backup database.
                </p>
              </div>
              )}
            </div>
            
            {/* Reset Database */}
            <div className="p-6 border rounded-lg mt-4 bg-white shadow-sm">
              <div className="flex items-start mb-4">
                <div className="bg-red-100 p-3 rounded-lg mr-4">
                  <MdRestore className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-700">Reset Database</h2>
                  <p className="text-gray-600 mb-4">
                    Kembalikan database ke kondisi awal. Seluruh data akan dihapus.
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleReset}
                disabled={isResetLoading}
                className="w-full flex items-center justify-center bg-red-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-red-700 disabled:bg-red-300 transition-colors"
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
                    <MdRestore className="mr-2 h-5 w-5" /> Reset Data
                  </>
                )}
              </button>
              
              <div className="mt-4 bg-red-50 p-3 rounded-lg border border-red-100">
                <p className="text-xs text-red-700 font-medium">
                  <strong>Peringatan:</strong> Tindakan ini akan menghapus semua data dalam sistem dan tidak dapat dibatalkan. Pastikan untuk membuat backup terlebih dahulu.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="appearance">
          <div className="p-6 border rounded-lg mt-4 bg-white shadow-sm">
            <h2 className="text-xl font-semibold text-gray-700 mb-6">Pengaturan Tampilan</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">Tema Aplikasi</h3>
                <p className="text-gray-600 mb-4">
                  Pilih tema yang akan digunakan pada seluruh aplikasi.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div 
                    className={`border p-4 rounded-lg cursor-pointer transition-all ${activeTheme === 'light' ? 'ring-2 ring-green-500 border-green-200' : 'hover:bg-gray-50'}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    <div className="h-24 rounded-md bg-white border mb-2 flex items-center justify-center">
                      <div className="w-full">
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
                    className={`border p-4 rounded-lg cursor-pointer transition-all ${activeTheme === 'dark' ? 'ring-2 ring-green-500 border-green-200' : 'hover:bg-gray-50'}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <div className="h-24 rounded-md bg-gray-800 border mb-2 flex items-center justify-center">
                      <div className="w-full">
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
                    className={`border p-4 rounded-lg cursor-pointer transition-all ${activeTheme === 'green' ? 'ring-2 ring-green-500 border-green-200' : 'hover:bg-gray-50'}`}
                    onClick={() => handleThemeChange('green')}
                  >
                    <div className="h-24 rounded-md bg-green-50 border mb-2 flex items-center justify-center">
                      <div className="w-full">
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
              
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">Ukuran Teks</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">Ukuran Teks</span>
                    <select 
                      value={textSize} 
                      onChange={handleTextSizeChange}
                      className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="small">Kecil</option>
                      <option value="medium">Sedang</option>
                      <option value="large">Besar</option>
                    </select>
                  </label>
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