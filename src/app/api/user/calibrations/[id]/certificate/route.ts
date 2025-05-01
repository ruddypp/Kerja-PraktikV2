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

  // --- Add border around entire page ---
  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: darkGreen,
    borderWidth: 1.5,
    });  
    
// --- Logo Perusahaan (PNG dari public/logo1.png) ---
const logoPath = path.join(process.cwd(), 'public', 'logo1.png');
const logoImageBytes = fs.readFileSync(logoPath);
const logoImage = await pdfDoc.embedPng(logoImageBytes); // gunakan embedJpg jika file .jpg
const logoDims = logoImage.scale(1.2); // Sesuaikan skala sesuai ukuran logo

page.drawImage(logoImage, {
  x: 25,
  y: height - 125, // Sesuaikan posisi Y agar sejajar dengan teks header
  width: logoDims.width,
  height: logoDims.height
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

// Add the underline
const textWidth = helveticaBold.widthOfTextAtSize('CALIBRATION AND TEST CERTIFICATE', 16);
page.drawLine({
  start: { x: centerX - 150, y: height - 185 }, // Position slightly below the text
  end: { x: centerX - 150 + textWidth, y: height - 185 },
  thickness: 1.5,
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
  x: 450, // Position it where the current "Honeywell" text is
  y: testDataRow1 - 210, // Adjust this position as needed
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