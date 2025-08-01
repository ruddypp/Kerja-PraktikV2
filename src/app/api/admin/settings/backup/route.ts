import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Fungsi helper untuk mencatat aktivitas ke history
async function logActivity(userId: string, action: string, details: string) {
  try {
    await prisma.activityLog.create({
      data: {
        type: 'USER_UPDATED', // Menggunakan type yang ada
        action: action,
        details: details,
        userId: userId,
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// Gunakan command langsung tanpa PrismaClient untuk menghindari konflik
export async function POST(req: Request) {
  let user = null;
  try {
    // Verifikasi autentikasi admin
    user = await getUserFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access'
      }, { status: 401 });
    }

    // Parse request body untuk mendapatkan format yang diinginkan
    let format = 'sql'; // default format
    try {
      const body = await req.json();
      if (body && body.format && ['sql', 'dump', 'both'].includes(body.format.toLowerCase())) {
        format = body.format.toLowerCase();
      }
    } catch (e) {
      console.log('Gagal parse request body, menggunakan format default sql:', e);
    }
    
    // Ambil koneksi database dari environment
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      return NextResponse.json({ 
        success: false,
        error: 'DATABASE_URL tidak ditemukan di environment variables'
      }, { status: 500 });
  }

    // Buat direktori backup jika belum ada
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Format timestamp untuk nama file
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    
    // Parse DATABASE_URL untuk mendapatkan informasi koneksi PostgreSQL
    let dbInfo = {};
    try {
      // Format: postgresql://username:password@hostname:port/database
      const url = new URL(dbUrl);
      dbInfo = {
        host: url.hostname,
        port: url.port || '5432',
        database: url.pathname.substring(1), // remove leading slash
        username: url.username,
        password: url.password
      };
      console.log(`Parsed DB info: host=${dbInfo.host}, database=${dbInfo.database}, user=${dbInfo.username}`);
    } catch (e) {
      console.error('Failed to parse DATABASE_URL:', e);
    }
    
    // Buat backup berdasarkan format yang diminta
    if (format === 'both') {
      // Jalankan kedua format backup
      const sqlResult = await createBackup(dbInfo, timestamp, backupDir, 'sql');
      const dumpResult = await createBackup(dbInfo, timestamp, backupDir, 'dump');
      
      if (sqlResult.success && dumpResult.success) {
        // Log aktivitas backup berhasil
        await logActivity(
          user.id,
          'Database Backup',
          `Admin ${user.name} berhasil membuat backup database dalam format SQL dan DUMP. File SQL: ${sqlResult.details?.fileSize}, File DUMP: ${dumpResult.details?.fileSize}`
        );

        return NextResponse.json({
          success: true,
          message: `Backup database PostgreSQL berhasil dibuat dalam kedua format pada ${new Date().toLocaleString('id-ID')}`,
          details: {
            sql: sqlResult.details,
            dump: dumpResult.details,
            bothFormats: true,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        // Log aktivitas backup dengan peringatan
        await logActivity(
          user.id,
          'Database Backup',
          `Admin ${user.name} melakukan backup database dengan peringatan. SQL: ${sqlResult.success ? 'berhasil' : 'gagal'}, DUMP: ${dumpResult.success ? 'berhasil' : 'gagal'}`
        );

        // Jika salah satu gagal, berikan detail error
        return NextResponse.json({
          success: sqlResult.success || dumpResult.success,
          message: `Backup selesai dengan beberapa peringatan pada ${new Date().toLocaleString('id-ID')}`,
          details: {
            sql: sqlResult,
            dump: dumpResult,
            bothFormats: true,
            errors: !sqlResult.success || !dumpResult.success,
            timestamp: new Date().toISOString()
          }
        });
      }
    } else {
      // Format tunggal (sql atau dump)
      const backupResult = await createBackup(dbInfo, timestamp, backupDir, format);
      
      if (backupResult.success) {
        // Log aktivitas backup berhasil
        await logActivity(
          user.id,
          'Database Backup',
          `Admin ${user.name} berhasil membuat backup database dalam format ${format.toUpperCase()}. Ukuran file: ${backupResult.details?.fileSize}, Tabel: ${backupResult.details?.tables || 'N/A'}`
        );
      } else {
        // Log aktivitas backup gagal
        await logActivity(
          user.id,
          'Database Backup',
          `Admin ${user.name} gagal membuat backup database dalam format ${format.toUpperCase()}. Error: ${backupResult.error}`
        );
      }

      return NextResponse.json(backupResult);
    }
  } catch (error: any) {
    console.error('Backup error:', error);
    return NextResponse.json({ 
      success: false,
      error: `Gagal melakukan backup: ${error.message || 'Kesalahan tidak diketahui'}`
    }, { status: 500 });
  }
}

// Fungsi untuk membuat backup dalam format tertentu
async function createBackup(dbInfo: any, timestamp: string, backupDir: string, format: string) {
  // Tentukan format file dan parameter pg_dump sesuai format yang diminta
  let pgDumpFormat, fileExtension, formatDescription;
  if (format === 'dump') {
    pgDumpFormat = 'custom';
    fileExtension = 'dump';
    formatDescription = 'PostgreSQL Custom Format (Compressed)';
  } else {
    pgDumpFormat = 'plain';
    fileExtension = 'sql';
    formatDescription = 'SQL PostgreSQL (Lengkap)';
  }
  
  const backupFilePath = path.join(backupDir, `backup-${timestamp}.${fileExtension}`);
  
  // Daftar tabel yang akan dikecualikan dari backup (tidak backup tabel User)
  const excludedTables = ['User'];
  const excludeTableParams = excludedTables.map(table => `--exclude-table=${table}`).join(' ');
  
  // Buat command pg_dump dengan parameter terpisah untuk menghindari masalah shell escaping
  // Kita buat script batch sederhana di folder temp
  const isWindows = process.platform === 'win32';
  const tempScriptPath = path.join(backupDir, `pg_dump_script_${format}_${timestamp}.${isWindows ? 'bat' : 'sh'}`);
  
  let scriptContent = '';
  if (isWindows) {
    // Windows batch script
    scriptContent = `@echo off\r\n`;
    scriptContent += `set PGPASSWORD=${dbInfo.password}\r\n`;
    scriptContent += `pg_dump -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.username} -d ${dbInfo.database} -f "${backupFilePath}" --no-owner --format=${pgDumpFormat} ${excludeTableParams}\r\n`;
  } else {
    // Bash script
    scriptContent = `#!/bin/bash\n`;
    scriptContent += `export PGPASSWORD="${dbInfo.password}"\n`;
    scriptContent += `pg_dump -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.username} -d ${dbInfo.database} -f "${backupFilePath}" --no-owner --format=${pgDumpFormat} ${excludeTableParams}\n`;
  }
  
  // Tulis script
  fs.writeFileSync(tempScriptPath, scriptContent);
  
  // Berikan izin eksekusi pada sistem Unix
  if (!isWindows) {
    await execAsync(`chmod +x "${tempScriptPath}"`);
  }
  
  try {
    console.log(`Menjalankan backup database dengan pg_dump (format: ${format})...`);
    
    // Jalankan script
    await execAsync(`"${tempScriptPath}"`);
    
    // Hapus script setelah selesai
    fs.unlinkSync(tempScriptPath);
    
    // Verifikasi file dibuat
    if (!fs.existsSync(backupFilePath)) {
      throw new Error('Backup file tidak dibuat');
    }
    
    // Dapatkan ukuran file
    const stats = fs.statSync(backupFilePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
    
    // Hitung jumlah tabel (hanya untuk SQL format)
    let tableCount = 0;
    if (format === 'sql') {
      try {
        const fileContent = fs.readFileSync(backupFilePath, 'utf8');
        const tableMatches = fileContent.match(/CREATE TABLE /g);
        tableCount = tableMatches ? tableMatches.length : 0;
      } catch (e) {
        console.error('Error counting tables in SQL file:', e);
      }
    }
    
    return { 
      success: true,
      message: `Backup database PostgreSQL (${format}) berhasil dibuat pada ${new Date().toLocaleString('id-ID')}`,
      details: {
        filePath: backupFilePath,
        fileSize: `${fileSizeInMB} MB`,
        format: formatDescription,
        fileExtension: fileExtension,
        tables: tableCount > 0 ? tableCount : undefined,
        timestamp: new Date().toISOString()
      }
    };
  } catch (execError: any) {
    console.error(`Error executing pg_dump for ${format}:`, execError);
    
    // Error detail untuk debugging
    const errorDetail = {
      message: execError.message,
      stdout: execError.stdout,
      stderr: execError.stderr,
      command: execError.cmd
    };
    console.error('Error detail:', JSON.stringify(errorDetail, null, 2));
    
    // Jika ada error output, tampilkan
    if (execError.stderr) {
      console.error(`pg_dump stderr for ${format}:`, execError.stderr);
    }

    // Coba cara alternatif langsung dengan shell command
    try {
      console.log(`Mencoba metode alternatif untuk format ${format}...`);
      
      // Command langsung, bukan menggunakan script
      let command;
      if (isWindows) {
        // Gunakan cmd.exe /c untuk Windows
        command = `set "PGPASSWORD=${dbInfo.password}" && pg_dump -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.username} -d ${dbInfo.database} -f "${backupFilePath}" --no-owner --format=${pgDumpFormat}`;
      } else {
        // Gunakan shell command untuk Linux/Mac
        command = `PGPASSWORD="${dbInfo.password}" pg_dump -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.username} -d ${dbInfo.database} -f "${backupFilePath}" --no-owner --format=${pgDumpFormat}`;
      }

    await execAsync(command);

      // Verifikasi file dibuat
      if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup file untuk format ${format} tidak dibuat dengan metode alternatif`);
      }
      
      // Dapatkan ukuran file
      const stats = fs.statSync(backupFilePath);
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      return { 
        success: true,
        message: `Backup database PostgreSQL (${format}) berhasil dibuat pada ${new Date().toLocaleString('id-ID')} (metode alternatif)`,
        details: {
          filePath: backupFilePath,
          fileSize: `${fileSizeInMB} MB`,
          format: formatDescription,
          fileExtension: fileExtension,
          timestamp: new Date().toISOString()
        }
      };
    } catch (alternativeError: any) {
      console.error(`Error with alternative pg_dump method for ${format}:`, alternativeError);
      
      return {
        success: false,
        error: `Gagal membuat backup PostgreSQL (${format})`,
        details: {
          message: `Gagal backup format ${format}. Pastikan pg_dump terinstal.`,
          primaryError: execError.message || 'Error menjalankan pg_dump',
          secondaryError: alternativeError.message || 'Error pada metode alternatif',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
} 