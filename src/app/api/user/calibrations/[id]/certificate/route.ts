import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import path from 'path';
import fs from 'fs';
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/lib/auth';

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
  { params }: { params: { id: string } }
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

    // Di Next.js 15, params adalah objek yang harus diawait
    const { id: calibrationId } = await params;
    
    console.log('Generating certificate for calibration ID:', calibrationId, 'User:', user.id);
    
    // Ambil data kalibrasi dengan semua informasi yang diperlukan
    const calibrationData = await prisma.calibration.findUnique({
      where: { id: calibrationId },
      include: {
        item: true,
        vendor: true,
        user: true,
        certificate: true
      }
    });
    
    if (!calibrationData) {
      return NextResponse.json(
        { error: 'Kalibrasi tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Definisikan interface untuk data sertifikat
    interface CertificateData {
      id: string;
      calibrationId: string;
      createdAt: Date;
      updatedAt: Date;
      // Informasi vendor
      vendorAddress: string | null;
      vendorPhone: string | null;
      vendorFax: string | null;
      // Data gas
      gasType: string | null;
      gasConcentration: string | null;
      gasBalance: string | null;
      gasBatchNumber: string | null;
      // Data test
      testSensor: string | null;
      testSpan: string | null;
      testResult: string | null;
      // Data alat
      manufacturer: string | null;
      instrumentName: string | null;
      modelNumber: string | null;
      configuration: string | null;
      approvedBy: string | null;
      // Field opsional
      vendorName?: string | null;
    }
    
    // Gunakan type assertion dengan interface yang spesifik
    const calibration = calibrationData;
    
    // Debugging - log data kalibrasi untuk memastikan field terisi
    console.log('Certificate Data Debug:', {
      id: calibration.id,
      certificateNumber: calibration.certificateNumber,
      // Ambil data dari certificate jika ada
      certificate: calibration.certificate ? {
        gasType: calibration.certificate.gasType,
        gasConcentration: calibration.certificate.gasConcentration,
        gasBalance: calibration.certificate.gasBalance,
        gasBatchNumber: calibration.certificate.gasBatchNumber,
        testSensor: calibration.certificate.testSensor,
        testSpan: calibration.certificate.testSpan,
        testResult: calibration.certificate.testResult,
        manufacturer: calibration.certificate.manufacturer,
        instrumentName: calibration.certificate.instrumentName,
        modelNumber: calibration.certificate.modelNumber,
        configuration: calibration.certificate.configuration,
        approvedBy: calibration.certificate.approvedBy
      } : "No certificate data"
    });
    
    // Verifikasi bahwa kalibrasi milik user ini atau user adalah admin
    const isAdminAccess = user.role === 'ADMIN' || request.headers.get('x-admin-access') === 'true';
    if (calibration.userId !== user.id && !isAdminAccess) {
      console.error('Access denied. User ID:', user.id, 'Calibration user ID:', calibration.userId, 'Is admin:', isAdminAccess);
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke sertifikat ini' },
        { status: 403 }
      );
    }
    
    // Verifikasi status kalibrasi harus COMPLETED
    if (calibration.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Sertifikat hanya tersedia untuk kalibrasi yang sudah selesai' },
        { status: 400 }
      );
    }
    
    // Verifikasi data sertifikat tersedia - tambahkan debugging info
    if (!calibration.certificate) {
      console.log('ERROR: Certificate missing for calibration ID:', calibrationId, 'Status:', calibration.status);
      
      // Log tambahan untuk membantu diagnosis
      const userCalibrations = await prisma.calibration.findMany({
        where: { userId: user.id },
        select: { id: true, status: true, certificate: { select: { id: true } } }
      });
      
      console.log('All user calibrations:', userCalibrations);
      
      return NextResponse.json(
        { error: 'Data sertifikat belum tersedia. Coba periksa apakah Anda sudah mengisi form penyelesaian kalibrasi.' },
        { status: 400 }
      );
    }
    
    // Gunakan data dari calibrationData langsung
    const certificateData = calibration.certificate as CertificateData;
    
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
    const margin = 6;
    
    // --- Double Border around the entire page ---
    // Outer border
    page.drawRectangle({
      x: margin,
      y: margin,
      width: width - 2 * margin,
      height: height - 2 * margin,
      borderColor: darkGreen,
      borderWidth: 2,
    });
    
    // Inner border (slightly smaller)
    page.drawRectangle({
      x: margin + 5,
      y: margin + 5,
      width: width - 2 * (margin + 5),
      height: height - 2 * (margin + 5),
      borderColor: darkGreen,
      borderWidth: 1,
    });
    
    // --- Header box ---
    const headerY = height - 110;
    
    // Header box rectangle
    page.drawRectangle({
      x: margin + 5,
      y: headerY,
      width: width - 2 * (margin + 5),
      height: 100,
      borderColor: black,
      borderWidth: 1,
    });
    
// --- Logo Perusahaan (PNG dari public/logo1.png) ---
const logoPath = path.join(process.cwd(), 'public', 'logo1.png');
const logoImageBytes = fs.readFileSync(logoPath);
const logoImage = await pdfDoc.embedPng(logoImageBytes); // gunakan embedJpg jika file .jpg
const logoDims = logoImage.scale(1.2); // Sesuaikan skala sesuai ukuran logo

page.drawImage(logoImage, {
  x: 25,
  y: height - 110, // Sesuaikan posisi Y agar sejajar dengan teks header
  width: logoDims.width,
  height: logoDims.height
});

    
    // --- Informasi Perusahaan ---
    page.drawText('PT. PARAMATA BARAYA INTERNATIONAL', {
      x: width / 2 - 155,
      y: headerY + 80,
      size: 14,
      font: helveticaBold,
      color: black
    });
    
    page.drawText('Kompleks Palem Ganda Asri 1 Blok A3 No. 8', {
      x: width / 2 - 135,
      y: headerY + 60,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawText('Karang Tengah, Ciledug - Tangerang 15157', {
      x: width / 2 - 130,
      y: headerY + 45,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawText('Telp. 62-21 730 6424, 733 1150 / Faks. 62-21 733 1150', {
      x: width / 2 - 155,
      y: headerY + 30,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawText('Email : paramata@indosat.net.id', {
      x: width / 2 - 90,
      y: headerY + 15,
      size: 10,
      font: helvetica,
      color: black
    });
    
  // --- Judul Sertifikat ---
  const titleY = headerY - 35;
  page.drawText('CALIBRATION AND TEST CERTIFICATE', {
    x: width / 2 - 130,
    y: titleY,
    size: 16,
    font: helveticaBold,
    color: black
  });

  // Add the underline
  const textWidth = helveticaBold.widthOfTextAtSize('CALIBRATION AND TEST CERTIFICATE', 16);
  page.drawLine({
    start: { x: width / 2 - 130, y: titleY - 5 }, // Position slightly below the text
    end: { x: width / 2 - 130 + textWidth, y: titleY - 5 },
    thickness: 1.5,
    color: black
  });

    // --- Informasi Sertifikat dan Pelanggan ---
    const infoStartY = titleY - 40;
    const leftColX = margin + 30;
    const rightColX = width / 2 + 30;

    const certNumber = (calibration.certificateNumber || '').toString() !== '' ? 
      calibration.certificateNumber as string : '-';

    page.drawText(`Certificate No : ${certNumber}`, {
      x: leftColX,
      y: infoStartY,
      size: 12,
      font: helveticaBold,
      color: black
    });

    // Informasi vendor dan item dengan fallback
    const vendorName = (calibration.vendor && calibration.vendor.name) ? calibration.vendor.name : '-';
    const vendorAddress = (calibration.vendor && calibration.vendor.address) ? calibration.vendor.address : '-'; 
    const vendorPhone = (calibration.vendor && calibration.vendor.contactPhone) ? calibration.vendor.contactPhone : '-';

    page.drawText(`Company : ${vendorName}`, {
      x: leftColX,
      y: infoStartY - 25,
      size: 12,
      font: helvetica,
      color: black
    });

    // Alamat vendor (selalu tampilkan)
    page.drawText(`Address : ${vendorAddress}`, {
      x: leftColX,
      y: infoStartY - 50,
      size: 12,
      font: helvetica,
      color: black
    });

    // --- Informasi Kontak ---
    page.drawText(`Phone : ${vendorPhone}`, {
      x: leftColX,
      y: infoStartY - 75,
      size: 12,
      font: helvetica,
      color: black
    });

    page.drawText(`Fax : ${vendorPhone}`, {
      x: leftColX,
      y: infoStartY - 100,
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
      x: rightColX,
      y: infoStartY,
      size: 12,
      font: helvetica,
      color: black
    });

    page.drawText(`Instrument : ${instrumentName}`, {
      x: rightColX,
      y: infoStartY - 25,
      size: 12,
      font: helvetica,
      color: black
    });

    page.drawText(`Model : ${modelNumber}`, {
      x: rightColX,
      y: infoStartY - 50,
      size: 12,
      font: helvetica,
      color: black
    });

    page.drawText(`Configuration : ${configuration}`, {
      x: rightColX,
      y: infoStartY - 75,
      size: 12,
      font: helvetica,
      color: black
    });

    page.drawText(`Serial No : ${serialNumber}`, {
      x: rightColX,
      y: infoStartY - 100,
      size: 12,
      font: helvetica,
      color: black
    });
    
    // Format tanggal kalibrasi
    const calibrationDateStr = calibration.calibrationDate ? 
      formatDateID(new Date(calibration.calibrationDate)) : '-';
    
    page.drawText(`Calibration Date : ${calibrationDateStr}`, {
      x: rightColX,
      y: infoStartY - 125,
      size: 12,
      font: helvetica,
      color: black
    });
    
    // --- Informasi Gas Kalibrasi ---
    const gasY = infoStartY - 160;
    page.drawText('Calibration Gases :', {
      x: leftColX,
      y: gasY,
      size: 12,
      font: helveticaBold,
      color: black
    });
    
    // Tabel Gas Kalibrasi
    const tableTop = gasY - 30;
    const tableWidth = width - 2 * (margin + 30);
    
    // Header tabel
    page.drawRectangle({
      x: leftColX,
      y: tableTop,
      width: 60,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('No.', {
      x: leftColX + 20,
      y: tableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 60,
      y: tableTop,
      width: 130,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Gas', {
      x: leftColX + 110,
      y: tableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 190,
      y: tableTop,
      width: 100,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Concentration', {
      x: leftColX + 210,
      y: tableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 290,
      y: tableTop,
      width: 80,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Balance', {
      x: leftColX + 310,
      y: tableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 370,
      y: tableTop,
      width: tableWidth - 370,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Batch / Lot No.', {
      x: leftColX + 390,
      y: tableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    // Data gas
    const dataRow1 = tableTop - 25;
    page.drawRectangle({
      x: leftColX,
      y: dataRow1,
      width: 60,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('1', {
      x: leftColX + 20,
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
      x: leftColX + 60,
      y: dataRow1,
      width: 130,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(gasType, {
      x: leftColX + 110,
      y: dataRow1 + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 190,
      y: dataRow1,
      width: 100,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(gasConcentration, {
      x: leftColX + 210,
      y: dataRow1 + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 290,
      y: dataRow1,
      width: 80,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(gasBalance, {
      x: leftColX + 310,
      y: dataRow1 + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 370,
      y: dataRow1,
      width: tableWidth - 370,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(gasBatchNumber, {
      x: leftColX + 390,
      y: dataRow1 + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    // --- Hasil Test ---
    page.drawText('Test Results :', {
      x: leftColX,
      y: dataRow1 - 30,
      size: 12,
      font: helveticaBold,
      color: black
    });
    
    // Tabel Hasil Test
    const testTableTop = dataRow1 - 70;
    // Header tabel
    page.drawRectangle({
      x: leftColX,
      y: testTableTop,
      width: 60,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('No.', {
      x: leftColX + 20,
      y: testTableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 60,
      y: testTableTop,
      width: 260,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Sensor', {
      x: leftColX + 165,
      y: testTableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 320,
      y: testTableTop,
      width: 120,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Span', {
      x: leftColX + 365,
      y: testTableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    // Combined Pass/Fail columns
    page.drawRectangle({
      x: leftColX + 440,
      y: testTableTop,
      width: 40,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Pass', {
      x: leftColX + 447,
      y: testTableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 480,
      y: testTableTop,
      width: 40,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Fail', {
      x: leftColX + 488,
      y: testTableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    // Data test
    const testDataRow1 = testTableTop - 25;
    page.drawRectangle({
      x: leftColX,
      y: testDataRow1,
      width: 60,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('1', {
      x: leftColX + 20,
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
      x: leftColX + 60,
      y: testDataRow1,
      width: 260,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(testSensor, {
      x: leftColX + 165,
      y: testDataRow1 + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 320,
      y: testDataRow1,
      width: 120,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(testSpan, {
      x: leftColX + 365,
      y: testDataRow1 + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    // Pass column
    page.drawRectangle({
      x: leftColX + 440,
      y: testDataRow1,
      width: 40,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    // Cek hasil test untuk Pass
    if (testResult === 'Pass') {
      page.drawText('V', {
        x: leftColX + 455,
        y: testDataRow1 + 10,
        size: 10,
        font: helveticaBold,
        color: black
      });
    }
    
    // Fail column
    page.drawRectangle({
      x: leftColX + 480,
      y: testDataRow1,
      width: 40,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    // Cek hasil test untuk Fail
    if (testResult === 'Fail') {
      page.drawText('X', {
        x: leftColX + 495,
        y: testDataRow1 + 10,
        size: 10,
        font: helveticaBold,
        color: black
      });
    }
    
    // --- Catatan Prosedur ---
    page.drawText('This instrument has been calibrated using valid calibration gases and instrument', {
      x: leftColX,
      y: testDataRow1 - 50,
      size: 11,
      font: helveticaOblique,
      color: black
    });
    
    page.drawText('manual operation procedure.', {
      x: leftColX,
      y: testDataRow1 - 70,
      size: 11,
      font: helveticaOblique,
      color: black
    });
    
    // --- Approval ---
    page.drawText(`Approved By : ${approvedBy}`, {
      x: leftColX,
      y: testDataRow1 - 210,
      size: 12,
      font: helveticaBold,
      color: black
    });

    // --- Honeywell-RAE Logo ---
const honeywellLogoPath = 'public/Honeywell-RAE.png';
const honeywellLogoImage = await pdfDoc.embedPng(fs.readFileSync(honeywellLogoPath));
const honeywellLogoWidth = 110; // Adjust based on your logo size
const honeywellLogoDims = honeywellLogoImage.scale(honeywellLogoWidth / honeywellLogoImage.width);

page.drawImage(honeywellLogoImage, {
  x: leftColX + 350, // Position it on the right side
  y: testDataRow1 - 210, // Align with Approved By text
  width: honeywellLogoDims.width,
  height: honeywellLogoDims.height
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