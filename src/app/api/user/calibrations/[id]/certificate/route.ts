import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import path from 'path';
import fs from 'fs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Format tanggal Indonesia dengan error handling
function formatDateID(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return dateObj.toLocaleDateString('id-ID', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

// GET untuk menghasilkan sertifikat kalibrasi dalam format PDF
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Gunakan getUserFromRequest untuk autentikasi yang lebih konsisten
    const user = await getUserFromRequest(request);
    
    if (!user) {
      console.error('Authentication failed - no user found in request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Ambil ID kalibrasi dari params dan pastikan params telah diproses dengan benar
    const calibrationId = await context.params.id;
    
    console.log('Generating certificate for calibration ID:', calibrationId, 'User:', user.id);
    
    // Ambil data kalibrasi dengan semua informasi yang diperlukan
    const calibrationData = await prisma.calibration.findUnique({
      where: { id: calibrationId },
      include: {
        item: true,
        vendor: true,
        user: true,
        certificate: true as any  // Type casting untuk mengatasi error TypeScript
      }
    });
    
    if (!calibrationData) {
      return NextResponse.json(
        { error: 'Kalibrasi tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Gunakan type casting untuk akses properti certificate
    const calibrationWithCert = calibrationData as any;
    
    // Debugging - log data kalibrasi untuk memastikan field terisi
    console.log('Certificate Data Debug:', {
      id: calibrationWithCert.id,
      certificateNumber: calibrationWithCert.certificateNumber,
      // Ambil data dari certificate jika ada
      certificate: calibrationWithCert.certificate ? {
        gasType: calibrationWithCert.certificate.gasType,
        gasConcentration: calibrationWithCert.certificate.gasConcentration,
        gasBalance: calibrationWithCert.certificate.gasBalance,
        gasBatchNumber: calibrationWithCert.certificate.gasBatchNumber,
        testSensor: calibrationWithCert.certificate.testSensor,
        testSpan: calibrationWithCert.certificate.testSpan,
        testResult: calibrationWithCert.certificate.testResult,
        manufacturer: calibrationWithCert.certificate.manufacturer,
        instrumentName: calibrationWithCert.certificate.instrumentName,
        modelNumber: calibrationWithCert.certificate.modelNumber,
        configuration: calibrationWithCert.certificate.configuration,
        approvedBy: calibrationWithCert.certificate.approvedBy
      } : "No certificate data"
    });
    
    // Verifikasi bahwa kalibrasi milik user ini atau user adalah admin
    const isAdminAccess = user.role === 'ADMIN' || request.headers.get('x-admin-access') === 'true';
    if (calibrationWithCert.userId !== user.id && !isAdminAccess) {
      console.error('Access denied. User ID:', user.id, 'Calibration user ID:', calibrationWithCert.userId, 'Is admin:', isAdminAccess);
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke sertifikat ini' },
        { status: 403 }
      );
    }
    
    // Verifikasi status kalibrasi harus COMPLETED
    if (calibrationWithCert.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Sertifikat hanya tersedia untuk kalibrasi yang sudah selesai' },
        { status: 400 }
      );
    }
    
    // Verifikasi data sertifikat tersedia
    if (!calibrationWithCert.certificate) {
      return NextResponse.json(
        { error: 'Data sertifikat belum tersedia' },
        { status: 400 }
      );
    }
    
    // Gunakan data dari calibrationData langsung, dengan type casting
    const calibration = calibrationWithCert;
    const certificateData = calibrationWithCert.certificate;
    
    // Buat PDF baru
    const pdfDoc = await PDFDocument.create();
    
    // Tambahkan halaman
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    
    // Ambil font standar
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    
    // Warna
    const black = rgb(0, 0, 0);
    const darkGreen = rgb(0, 0.5, 0);
    
    // Koordinat
    const { width, height } = page.getSize();
    const centerX = width / 2;
    
    // --- Header dengan border hijau ---
    page.drawRectangle({
      x: 20,
      y: height - 140,
      width: width - 40,
      height: 120,
      borderColor: darkGreen,
      borderWidth: 2,
    });
    
    // --- Logo Perusahaan ---
    // Catatan: Dalam implementasi nyata, Anda perlu menyertakan gambar logo
    // Di sini kita hanya simulasikan dengan lingkaran hijau 
    const centerLogoX = 70;
    const centerLogoY = height - 85;
    const logoSize = 30;
    page.drawEllipse({
      x: centerLogoX,
      y: centerLogoY,
      xScale: logoSize,
      yScale: logoSize,
      color: darkGreen
    });
    
    // --- Informasi Perusahaan ---
    page.drawText('PT. PARAMATA BARAYA INTERNATIONAL', {
      x: 150,
      y: height - 60,
      size: 14,
      font: helveticaBold,
      color: black
    });
    
    page.drawText('Kompleks Palem Ganda Asri 1 Blok A3 No. 8', {
      x: 150,
      y: height - 75,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawText('Karang Tengah, Ciledug - Tangerang 15157', {
      x: 150,
      y: height - 90,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawText('Telp. 62-21 730 6424, 733 1150 / Faks. 62-21 733 1150', {
      x: 150,
      y: height - 105,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawText('Email : paramata@indosat.net.id', {
      x: 150,
      y: height - 120,
      size: 10,
      font: helvetica,
      color: black
    });
    
    // --- Judul Sertifikat ---
    page.drawText('CALIBRATION AND TEST CERTIFICATE', {
      x: centerX - 150,
      y: height - 180,
      size: 16,
      font: helveticaBold,
      color: black
    });
    
    // --- Informasi Sertifikat dan Pelanggan ---
    const certNumber = (calibration.certificateNumber || '').toString() !== '' ? 
      calibration.certificateNumber as string : '-';

    page.drawText(`Certificate No : ${certNumber}`, {
      x: 40,
      y: height - 220,
      size: 12,
      font: helveticaBold,
      color: black
    });

    // Informasi vendor dan item dengan fallback
    const vendorName = (calibration.vendor && calibration.vendor.name) ? calibration.vendor.name : '-';
    const vendorAddress = (calibration.vendor && calibration.vendor.address) ? calibration.vendor.address : '-'; 
    const vendorPhone = (calibration.vendor && calibration.vendor.contactPhone) ? calibration.vendor.contactPhone : '-';

    page.drawText(`Company : ${vendorName}`, {
      x: 40,
      y: height - 240,
      size: 12,
      font: helvetica,
      color: black
    });

    // Alamat vendor (selalu tampilkan)
    page.drawText(`Address : ${vendorAddress}`, {
      x: 40,
      y: height - 270,
      size: 12,
      font: helvetica,
      color: black
    });

    // --- Informasi Kontak ---
    page.drawText(`Phone : ${vendorPhone}`, {
      x: 40,
      y: height - 300,
      size: 12,
      font: helvetica,
      color: black
    });

    page.drawText(`Fax : ${vendorPhone}`, {
      x: 40,
      y: height - 320,
      size: 12,
      font: helvetica,
      color: black
    });
    
    // --- Informasi Alat ---
    const manufacturer = (certificateData.manufacturer || '').toString() !== '' ? 
      certificateData.manufacturer as string : '-';
    const instrumentName = (certificateData.instrumentName || '').toString() !== '' ? 
      certificateData.instrumentName as string : 
      (calibration.item && calibration.item.name) ? calibration.item.name : '-';
    const modelNumber = (certificateData.modelNumber || '').toString() !== '' ? 
      certificateData.modelNumber as string : 
      (calibration.item && calibration.item.partNumber) ? calibration.item.partNumber : '-';
    const configuration = (certificateData.configuration || '').toString() !== '' ? 
      certificateData.configuration as string : 
      (calibration.item && calibration.item.sensor) ? calibration.item.sensor : '-';
    const serialNumber = (calibration.item && calibration.item.serialNumber) ? 
      calibration.item.serialNumber : '-';

    page.drawText(`Manufacturer : ${manufacturer}`, {
      x: width - 230,
      y: height - 220,
      size: 12,
      font: helvetica,
      color: black
    });

    page.drawText(`Instrument : ${instrumentName}`, {
      x: width - 230,
      y: height - 240,
      size: 12,
      font: helvetica,
      color: black
    });

    page.drawText(`Model : ${modelNumber}`, {
      x: width - 230,
      y: height - 260,
      size: 12,
      font: helvetica,
      color: black
    });

    page.drawText(`Configuration : ${configuration}`, {
      x: width - 230,
      y: height - 280,
      size: 12,
      font: helvetica,
      color: black
    });

    page.drawText(`Serial No : ${serialNumber}`, {
      x: width - 230,
      y: height - 300,
      size: 12,
      font: helvetica,
      color: black
    });
    
    // Format tanggal kalibrasi
    const calibrationDateStr = calibration.calibrationDate ? 
      formatDateID(new Date(calibration.calibrationDate)) : '-';
    
    page.drawText(`Calibration Date : ${calibrationDateStr}`, {
      x: width - 230,
      y: height - 320,
      size: 12,
      font: helvetica,
      color: black
    });
    
    // --- Informasi Gas Kalibrasi ---
    page.drawText('Calibration Gases :', {
      x: 40,
      y: height - 360,
      size: 12,
      font: helveticaBold,
      color: black
    });
    
    // Tabel Gas Kalibrasi
    const tableTop = height - 400;
    // Header tabel
    page.drawRectangle({
      x: 40,
      y: tableTop,
      width: 70,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('No.', {
      x: 65,
      y: tableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: 110,
      y: tableTop,
      width: 150,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Gas', {
      x: 165,
      y: tableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: 260,
      y: tableTop,
      width: 120,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Concentration', {
      x: 290,
      y: tableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: 380,
      y: tableTop,
      width: 80,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Balance', {
      x: 405,
      y: tableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: 460,
      y: tableTop,
      width: 100,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Batch / Lot No.', {
      x: 475,
      y: tableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    // Data gas
    const dataRow1 = tableTop - 25;
    page.drawRectangle({
      x: 40,
      y: dataRow1,
      width: 70,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('1', {
      x: 65,
      y: dataRow1 + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    // Ambil data gas dari certificateData dengan fallback yang lebih aman
    const gasType = (certificateData.gasType || '').toString() !== '' ? certificateData.gasType as string : '-';
    const gasConcentration = (certificateData.gasConcentration || '').toString() !== '' ? certificateData.gasConcentration as string : '-';
    const gasBalance = (certificateData.gasBalance || '').toString() !== '' ? certificateData.gasBalance as string : '-';
    const gasBatchNumber = (certificateData.gasBatchNumber || '').toString() !== '' ? certificateData.gasBatchNumber as string : '-';

    page.drawRectangle({
      x: 110,
      y: dataRow1,
      width: 150,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(gasType, {
      x: 120,
      y: dataRow1 + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawRectangle({
      x: 260,
      y: dataRow1,
      width: 120,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(gasConcentration, {
      x: 280,
      y: dataRow1 + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawRectangle({
      x: 380,
      y: dataRow1,
      width: 80,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(gasBalance, {
      x: 395,
      y: dataRow1 + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawRectangle({
      x: 460,
      y: dataRow1,
      width: 100,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(gasBatchNumber, {
      x: 470,
      y: dataRow1 + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    // --- Hasil Test ---
    page.drawText('Test Results :', {
      x: 40,
      y: dataRow1 - 30,
      size: 12,
      font: helveticaBold,
      color: black
    });
    
    // Tabel Hasil Test
    const testTableTop = dataRow1 - 70;
    // Header tabel
    page.drawRectangle({
      x: 40,
      y: testTableTop,
      width: 70,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('No.', {
      x: 65,
      y: testTableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: 110,
      y: testTableTop,
      width: 210,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Sensor', {
      x: 165,
      y: testTableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: 320,
      y: testTableTop,
      width: 140,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Span', {
      x: 365,
      y: testTableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: 460,
      y: testTableTop,
      width: 50,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Pass', {
      x: 475,
      y: testTableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: 510,
      y: testTableTop,
      width: 50,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Fail', {
      x: 525,
      y: testTableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    // Data test
    const testDataRow1 = testTableTop - 25;
    page.drawRectangle({
      x: 40,
      y: testDataRow1,
      width: 70,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('1', {
      x: 65,
      y: testDataRow1 + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    // Ambil data test dengan fallback yang lebih aman
    const testSensor = (certificateData.testSensor || '').toString() !== '' ? certificateData.testSensor as string : '-';
    const testSpan = (certificateData.testSpan || '').toString() !== '' ? certificateData.testSpan as string : '-';
    const testResult = (certificateData.testResult || '').toString();
    const approvedBy = (certificateData.approvedBy || '').toString() !== '' ? certificateData.approvedBy as string : '-';

    page.drawRectangle({
      x: 110,
      y: testDataRow1,
      width: 210,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(testSensor, {
      x: 120,
      y: testDataRow1 + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawRectangle({
      x: 320,
      y: testDataRow1,
      width: 140,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(testSpan, {
      x: 340,
      y: testDataRow1 + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawRectangle({
      x: 460,
      y: testDataRow1,
      width: 50,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    // Cek hasil test untuk Pass
    if (testResult === 'Pass') {
      page.drawText('V', {
        x: 480,
        y: testDataRow1 + 10,
        size: 10,
        font: helveticaBold,
        color: black
      });
    }
    
    page.drawRectangle({
      x: 510,
      y: testDataRow1,
      width: 50,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    // Cek hasil test untuk Fail
    if (testResult === 'Fail') {
      page.drawText('X', {
        x: 530,
        y: testDataRow1 + 10,
        size: 10,
        font: helveticaBold,
        color: black
      });
    }
    
    // --- Catatan Prosedur ---
    page.drawText('This instrument has been calibrated using valid calibration gases and instrument', {
      x: 40,
      y: testDataRow1 - 50,
      size: 11,
      font: helveticaOblique,
      color: black
    });
    
    page.drawText('manual operation procedure.', {
      x: 40,
      y: testDataRow1 - 70,
      size: 11,
      font: helveticaOblique,
      color: black
    });
    
    // --- Approval ---
    page.drawText(`Approved By : ${approvedBy}`, {
      x: 40,
      y: testDataRow1 - 120,
      size: 12,
      font: helveticaBold,
      color: black
    });
    
    // --- Logo Vendor (Simulasi) ---
    page.drawText('Honeywell', {
      x: 430,
      y: testDataRow1 - 120,
      size: 18,
      font: helveticaBold,
      color: rgb(0.8, 0, 0) // Merah untuk Honeywell
    });
    
    // --- Logo RAE (Simulasi) ---
    const raeLogoX = 500;
    const raeLogoY = testDataRow1 - 120;
    const raeLogoSize = 15;
    page.drawEllipse({
      x: raeLogoX,
      y: raeLogoY,
      xScale: raeLogoSize,
      yScale: raeLogoSize,
      color: rgb(0, 0, 0.7)
    });
    page.drawText('RAE', {
      x: 485,
      y: testDataRow1 - 115,
      size: 10,
      font: helveticaBold,
      color: rgb(1, 1, 1)
    });
    
    // Simpan PDF ke buffer
    const pdfBytes = await pdfDoc.save();
    
    // Kirim response dengan file PDF
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="calibration_certificate_${calibrationId}.pdf"`
      }
    });
    
  } catch (error) {
    console.error('Error generating calibration certificate:', error);
    return NextResponse.json(
      { error: 'Gagal membuat sertifikat kalibrasi' },
      { status: 500 }
    );
  }
} 