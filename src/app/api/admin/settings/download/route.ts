import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  try {
    // UNTUK DEMO: Hapus verifikasi autentikasi sementara
    // Di lingkungan produksi, Anda harus menambahkan kembali pengecekan autentikasi
    
    // Dapatkan path file dari query
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path tidak ditemukan' }, { status: 400 });
    }
    
    // Untuk keamanan, validasi bahwa file berada di direktori backup
    const normalizedPath = path.normalize(filePath);
    const backupsDir = path.join(process.cwd(), 'backups');
    
    if (!normalizedPath.startsWith(backupsDir)) {
      return NextResponse.json({ error: 'File path tidak valid' }, { status: 400 });
    }
    
    // Periksa apakah file ada
    if (!fs.existsSync(normalizedPath)) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });
    }
    
    // Baca file
    const fileContent = fs.readFileSync(normalizedPath);
    
    // Dapatkan nama file
    const fileName = path.basename(normalizedPath);
    
    // Set response headers untuk download file
    const fileExtension = path.extname(normalizedPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (fileExtension === '.sql') {
      contentType = 'application/sql';
    } else if (fileExtension === '.json') {
      contentType = 'application/json';
    }
    
    // Buat response dengan headers yang sesuai untuk download file
    const headers = new Headers();
    headers.append('Content-Type', contentType);
    headers.append('Content-Disposition', `attachment; filename="${fileName}"`);
    headers.append('Content-Length', fileContent.length.toString());
    
    return new Response(fileContent, {
      headers,
      status: 200,
    });
    
  } catch (error: any) {
    console.error('Download file error:', error);
    return NextResponse.json({ 
      error: `Gagal mendownload file: ${error.message || 'Kesalahan tidak diketahui'}` 
    }, { 
      status: 500 
    });
  }
} ``