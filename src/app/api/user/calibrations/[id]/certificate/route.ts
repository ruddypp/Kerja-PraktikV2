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
    
    // Gunakan type assertion dengan interface yang spesifik
    const calibration = calibrationData;
    
    // Get gas entries and test entries separately with raw SQL if certificate exists
    let gasEntries: {
      id: string;
      certificateId: string;
      gasType: string;
      gasConcentration: string;
      gasBalance: string;
      gasBatchNumber: string;
    }[] = [];
    
    let testEntries: {
      id: string;
      certificateId: string;
      testSensor: string;
      testSpan: string;
      testResult: string;
    }[] = [];
    
    if (calibration.certificate) {
      // Get gas entries with raw SQL
      const gasEntriesResult = await prisma.$queryRaw<typeof gasEntries>`
        SELECT id, "certificateId", "gasType", "gasConcentration", "gasBalance", "gasBatchNumber"
        FROM "GasCalibrationEntry"
        WHERE "certificateId" = ${calibration.certificate.id}
      `;
      
      // Get test entries with raw SQL
      const testEntriesResult = await prisma.$queryRaw<typeof testEntries>`
        SELECT id, "certificateId", "testSensor", "testSpan", "testResult"
        FROM "TestResultEntry"
        WHERE "certificateId" = ${calibration.certificate.id}
      `;
      
      gasEntries = gasEntriesResult;
      testEntries = testEntriesResult;
      
      console.log(`Found ${gasEntries.length} gas entries in the database`);
      console.log(`Found ${testEntries.length} test entries in the database`);
    }
    
    // Debugging - log data kalibrasi untuk memastikan field terisi
    console.log('Certificate Data Debug:', {
      id: calibration.id,
      certificateNumber: calibration.certificateNumber,
      certificate: calibration.certificate 
        ? {
            id: calibration.certificate.id,
            gasEntries: gasEntries.length || 0,
            testEntries: testEntries.length || 0
          } 
        : "No certificate data"
    });
    
    // Simplify the access control to make it more permissive
    const isAdminAccess = user.role === 'ADMIN' || request.headers.get('x-admin-access') === 'true';

    // For now, we're allowing any authenticated user to view certificates
    // This is a temporary measure until we have a better understanding of the relationships
    console.log('Allowing access to certificate. User ID:', user.id, 'Calibration user ID:', calibration.userId, 'Is admin:', isAdminAccess);
    
    // Verifikasi status kalibrasi harus COMPLETED
    if (calibration.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Sertifikat hanya tersedia untuk kalibrasi yang sudah selesai' },
        { status: 400 }
      );
    }
    
    // Verifikasi data sertifikat tersedia
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
    const certificateData = calibration.certificate;
    
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
    const manufacturer = (calibration.item && calibration.item.name) ? 
      calibration.item.name : '-';
    const instrumentName = (certificateData.instrumentName || '').toString() !== '' ? 
      certificateData.instrumentName as string : '-';
    const modelNumber = (calibration.item && calibration.item.partNumber) ? 
      calibration.item.partNumber : '-';
    const configuration = (calibration.item && calibration.item.sensor) ? 
      calibration.item.sensor : '-';
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

    page.drawText(`Sensor : ${configuration}`, {
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
    
    // --- Gas Kalibrasi ---
    page.drawText('Calibration Gases :', {
      x: leftColX,
      y: infoStartY - 160,
      size: 12,
      font: helveticaBold,
      color: black
    });
    
    // Tabel gas kalibrasi
    const tableTop = infoStartY - 200;
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
    
    // Render each gas entry (or show empty if none)
    if (gasEntries.length === 0) {
      // Add placeholder entries with required properties
      gasEntries = [{
        id: 'placeholder-id',
        certificateId: calibration.certificate?.id || 'placeholder',
        gasType: '-',
        gasConcentration: '-',
        gasBalance: '-',
        gasBatchNumber: '-'
      }];
    }
    
    // Draw gas entries in the table
    let currentY = tableTop;
    for (let i = 0; i < gasEntries.length; i++) {
      const entry = gasEntries[i];
      currentY = tableTop - (25 * (i + 1));
      
      // Safely get values with fallbacks
      const gasType = (entry.gasType || '').toString() !== '' ? entry.gasType : '-';
      const gasConcentration = (entry.gasConcentration || '').toString() !== '' ? entry.gasConcentration : '-';
      const gasBalance = (entry.gasBalance || '').toString() !== '' ? entry.gasBalance : '-';
      const gasBatchNumber = (entry.gasBatchNumber || '').toString() !== '' ? entry.gasBatchNumber : '-';
      
      // Draw row
    page.drawRectangle({
      x: leftColX,
        y: currentY,
      width: 60,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
      page.drawText((i + 1).toString(), {
      x: leftColX + 20,
        y: currentY + 10,
      size: 10,
      font: helvetica,
      color: black
    });

    page.drawRectangle({
      x: leftColX + 60,
        y: currentY,
      width: 130,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(gasType, {
        x: leftColX + 70,
        y: currentY + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 190,
        y: currentY,
      width: 100,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(gasConcentration, {
        x: leftColX + 200,
        y: currentY + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 290,
        y: currentY,
      width: 80,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(gasBalance, {
        x: leftColX + 300,
        y: currentY + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 370,
        y: currentY,
      width: tableWidth - 370,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(gasBatchNumber, {
        x: leftColX + 380,
        y: currentY + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    }
    
    // --- Hasil Test ---
    page.drawText('Test Results :', {
      x: leftColX,
      y: currentY - 30,
      size: 12,
      font: helveticaBold,
      color: black
    });
    
    // Tabel Hasil Test
    const testTableTop = currentY - 70;
    
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
      x: leftColX + 360,
      y: testTableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 440,
      y: testTableTop,
      width: tableWidth - 440,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText('Result', {
      x: leftColX + 460,
      y: testTableTop + 10,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    // Render each test entry (or show empty if none)
    if (testEntries.length === 0) {
      // Add placeholder entries with required properties
      testEntries = [{
        id: 'placeholder-id',
        certificateId: calibration.certificate?.id || 'placeholder',
        testSensor: '-',
        testSpan: '-',
        testResult: '-'
      }];
    }
    
    // Draw test entries in the table
    let testRowY = testTableTop;
    for (let i = 0; i < testEntries.length; i++) {
      const entry = testEntries[i];
      testRowY = testTableTop - (25 * (i + 1));
    
      // Safely get values with fallbacks
      const testSensor = (entry.testSensor || '').toString() !== '' ? entry.testSensor : '-';
      const testSpan = (entry.testSpan || '').toString() !== '' ? entry.testSpan : '-';
      const testResult = (entry.testResult || '').toString() !== '' ? entry.testResult : '-';
      
      // Draw row
    page.drawRectangle({
      x: leftColX,
        y: testRowY,
      width: 60,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
      page.drawText((i + 1).toString(), {
      x: leftColX + 20,
        y: testRowY + 10,
      size: 10,
      font: helvetica,
      color: black
    });

    page.drawRectangle({
      x: leftColX + 60,
        y: testRowY,
      width: 260,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(testSensor, {
        x: leftColX + 70,
        y: testRowY + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 320,
        y: testRowY,
      width: 120,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
    page.drawText(testSpan, {
        x: leftColX + 330,
        y: testRowY + 10,
      size: 10,
      font: helvetica,
      color: black
    });
    
    page.drawRectangle({
      x: leftColX + 440,
        y: testRowY,
        width: tableWidth - 440,
      height: 25,
      borderColor: black,
      borderWidth: 1
    });
      
      const resultText = testResult;
      let resultColor = black;
      if (resultText.toUpperCase() === 'PASS') {
        resultColor = rgb(0, 0.6, 0); // Green for Pass
      } else if (resultText.toUpperCase() === 'FAIL') {
        resultColor = rgb(0.8, 0, 0); // Red for Fail
      }
      
      page.drawText(resultText, {
        x: leftColX + 460,
        y: testRowY + 10,
        size: 10,
        font: helvetica,
        color: resultColor
      });
    }
    
    // Adjust footer position based on the number of entries
    const footerY = Math.min(testRowY - 120, 200); // Make sure it doesn't go off the page
    
    // --- Catatan Prosedur ---
    page.drawText('This instrument has been calibrated using valid calibration gases and instrument', {
      x: leftColX,
      y: testRowY - 50,
      size: 11,
      font: helveticaOblique,
      color: black
    });
    
    page.drawText('Generated by System', {
      x: leftColX,
      y: testRowY - 70,
      size: 11,
      font: helveticaOblique,
      color: black
    });
    
    // --- Approval ---
    // Move Approved By up from the footer for better visibility
    const approvalY = testRowY - 110;
    

    // Draw the Approved By text above the signature line
    page.drawText(`Approved By:`, {
      x: leftColX,
      y: approvalY,
      size: 12,
      font: helveticaBold,
      color: black
    });
    
    // Draw the approver's name below the signature line
    page.drawText(`${certificateData.approvedBy || 'Not Specified'}`, {
      x: leftColX + 20,
      y: approvalY - 25,
      size: 13,
      font: helvetica,
      color: black
    });

    // --- Honeywell-RAE Logo ---
const honeywellLogoPath = 'public/Honeywell-RAE.png';
const honeywellLogoImage = await pdfDoc.embedPng(fs.readFileSync(honeywellLogoPath));
const honeywellLogoWidth = 110; // Adjust based on your logo size
const honeywellLogoDims = honeywellLogoImage.scale(honeywellLogoWidth / honeywellLogoImage.width);

    // Position the logo at the same vertical position as the Approved By section but on the right
page.drawImage(honeywellLogoImage, {
      x: leftColX + 420,
      y: approvalY - 33, // Align vertically with the approval section
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