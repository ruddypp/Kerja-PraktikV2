import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { PDFDocument, rgb, StandardFonts, PDFPage, RGB, PDFFont } from 'pdf-lib';
import path from 'path';
import fs from 'fs';

// Format date to Indonesian format
function formatDateID(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  return `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}/${year}`;
}

// GET endpoint to generate a maintenance report in PDF format
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      console.error('Authentication failed - no user found in request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract maintenance ID and report type from request
    const { id: maintenanceId } = await params;
    const reportType = request.nextUrl.searchParams.get("type") || "csr"; // Default to CSR
    
    console.log(`Generating ${reportType} report for maintenance ID:`, maintenanceId, 'User:', user.id);
    
    // Fetch maintenance data with all required information
    const maintenanceData = await prisma.maintenance.findUnique({
      where: { id: maintenanceId },
      include: {
        item: {
          include: {
            customer: true
          }
        },
        user: true,
        serviceReport: {
          include: {
            parts: true
          }
        },
        technicalReport: {
          include: {
            partsList: true
          }
        }
      }
    });
    
    if (!maintenanceData) {
      return NextResponse.json(
        { error: 'Maintenance not found' },
        { status: 404 }
      );
    }
    
    // Verify user has access to this maintenance
    const isAdminAccess = user.role === 'ADMIN' || request.headers.get('x-admin-access') === 'true';
    if (maintenanceData.userId !== user.id && !isAdminAccess) {
      console.error('Access denied. User ID:', user.id, 'Maintenance user ID:', maintenanceData.userId, 'Is admin:', isAdminAccess);
      return NextResponse.json(
        { error: 'You do not have access to this maintenance report' },
        { status: 403 }
      );
    }
    
    // Check if maintenance is completed
    if (maintenanceData.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Report is only available for completed maintenance' },
        { status: 400 }
      );
    }
    
    // Verify service report data is available for CSR
    if (reportType === 'csr' && !maintenanceData.serviceReport) {
      return NextResponse.json(
        { error: 'Service Report data not available. Please check if the maintenance completion form was submitted.' },
        { status: 400 }
      );
    }
    
    let pdfBytes: Uint8Array;
    let filename: string;
    
    if (reportType === 'csr') {
      // Generate CSR PDF
      const { reportNumber, pdfResult } = await generateServiceReportPDF(maintenanceData as ServiceReportMaintenanceData);
      pdfBytes = pdfResult;
      filename = `CSR_${reportNumber || maintenanceId}.pdf`;
    } else if (reportType === 'technical') {
      // Generate Technical Report PDF
      const { reportNumber, pdfResult } = await generateTechnicalReportPDF(maintenanceData as TechnicalReportMaintenanceData);
      pdfBytes = pdfResult;
      filename = `TR_${reportNumber || maintenanceId}.pdf`;
    } else {
      // Invalid report type
      return NextResponse.json(
        { error: 'Invalid report type. Use "csr" or "technical".' },
        { status: 400 }
      );
    }
    
    // Return PDF as response
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating maintenance report:', error);
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : "Unknown error";
      
    return NextResponse.json(
      { error: 'Failed to generate report', details: errorMessage },
      { status: 500 }
    );
  }
}

// Update the maintenance data type for both functions
interface MaintenanceDataBase {
  id: string;
  itemSerial: string;
  status: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  item: {
    name: string;
    partNumber: string;
    customer?: { name: string } | null;
  };
  user: { name: string };
  serviceReport?: {
    reportNumber?: string | null;
  } | null;
}

interface ServiceReportMaintenanceData extends MaintenanceDataBase {
  serviceReport: {
    id: string;
    reportNumber?: string | null;
    customer?: string | null;
    location?: string | null;
    brand?: string | null;
    model?: string | null;
    serialNumber?: string | null;
    dateIn?: string | Date | null;
    reasonForReturn?: string | null;
    findings?: string | null;
    action?: string | null;
    sensorCO?: boolean;
    sensorH2S?: boolean;
    sensorO2?: boolean;
    sensorLEL?: boolean;
    lampClean?: boolean;
    lampReplace?: boolean;
    pumpTested?: boolean;
    pumpRebuilt?: boolean;
    pumpReplaced?: boolean;
    pumpClean?: boolean;
    instrumentCalibrate?: boolean;
    instrumentUpgrade?: boolean;
    instrumentCharge?: boolean;
    instrumentClean?: boolean;
    instrumentSensorAssembly?: boolean;
    parts?: Array<{
      id: string;
      itemNumber: number;
      description?: string;
      snPnOld?: string | null;
      snPnNew?: string | null;
      createdAt?: Date;
      serviceReportId?: string;
    }>;
  } | null;
  csrNumber?: string;
}

interface TechnicalReportMaintenanceData extends MaintenanceDataBase {
  technicalReport: {
    id: string;
    csrNumber?: string | null;
    deliveryTo?: string | null;
    dateReport?: string | Date | null;
    techSupport?: string | null;
    dateIn?: string | Date | null;
    estimateWork?: string | null;
    reasonForReturn?: string | null;
    findings?: string | null;
    action?: string | null;
    beforePhotoUrl?: string | null;
    afterPhotoUrl?: string | null;
    partsList?: Array<{
      id: string;
      itemNumber: number;
      namaUnit?: string | null;
      description?: string | null;
      quantity: number;
      createdAt?: Date;
      technicalReportId?: string;
    }>;
  } | null;
  csrNumber?: string;
}

// Function to generate CSR1 PDF
async function generateServiceReportPDF(maintenanceData: ServiceReportMaintenanceData) {
  const sr = maintenanceData.serviceReport;
  
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Add an A4 page
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  
  // Load standard fonts
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Colors
  const black = rgb(0, 0, 0);
  const darkGreen = rgb(0, 0.5, 0);
  
  // Page coordinates
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
  
  // --- Company information ---
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
  
  page.drawText('Email : paramata@lndosat.net.id', {
    x: width / 2 - 90,
    y: headerY + 15,
    size: 10,
    font: helvetica,
    color: black
  });
  
  // --- Main Content Area ---
  const contentWidth = width - 2 * (margin + 20);
  const contentX = margin + 20;
  
  // --- Title ---
  const titleY = headerY - 35;
  page.drawText('Customer Service Report', {
    x: width / 2 - 130,
    y: titleY,
    size: 22,
    font: helveticaBold,
    color: black
  });
  
  // CSR Number
  const csrNum = sr?.reportNumber || maintenanceData.csrNumber || `575/CSR-PBI/90/2025`;
  page.drawText(`No. : ${csrNum}`, {
    x: width / 2 - 70,
    y: titleY - 18,
    size: 12,
    font: helveticaBold,
    color: black
  });
  
  // --- Customer Information Section ---
  const infoStartY = titleY - 60;
  const leftColX = contentX + 10;
  const rightColX = contentX + contentWidth / 2 + 30;
  
  // Labels and Values - Left Column
  page.drawText('Customer', {
    x: leftColX,
    y: infoStartY,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText(`: ${sr?.customer || maintenanceData.item.customer?.name || 'N/A'}`, {
    x: leftColX + 70,
    y: infoStartY,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText('Location', {
    x: leftColX,
    y: infoStartY - 25,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText(`: ${sr?.location || 'N/A'}`, {
    x: leftColX + 70,
    y: infoStartY - 25,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText('Brand', {
    x: leftColX,
    y: infoStartY - 50,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText(`: ${sr?.brand || 'N/A'}`, {
    x: leftColX + 70,
    y: infoStartY - 50,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText('Model', {
    x: leftColX,
    y: infoStartY - 75,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText(`: ${sr?.model || 'N/A'}`, {
    x: leftColX + 70,
    y: infoStartY - 75,
    size: 10,
    font: helvetica,
    color: black
  });
  
  // Labels and Values - Right Column
  page.drawText('Serial Number', {
    x: rightColX,
    y: infoStartY,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText(`: ${sr?.serialNumber || maintenanceData.itemSerial || 'N/A'}`, {
    x: rightColX + 90,
    y: infoStartY,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText('Date In', {
    x: rightColX,
    y: infoStartY - 25,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText(`: ${sr?.dateIn ? formatDateID(sr.dateIn) : formatDateID(maintenanceData.startDate)}`, {
    x: rightColX + 90,
    y: infoStartY - 25,
    size: 10,
    font: helvetica,
    color: black
  });
  
  // --- Form Fields Section ---
  const formStartY = infoStartY - 100;
  
  // Reason For Return
  page.drawRectangle({
    x: contentX,
    y: formStartY - 40,
    width: contentWidth,
    height: 40,
    borderColor: black,
    borderWidth: 1
  });
  
  page.drawText('Reason For Return :', {
    x: contentX + 10,
    y: formStartY - 20,
    size: 10,
    font: helvetica,
    color: black
  });
  
  if (sr?.reasonForReturn) {
    page.drawText(sr.reasonForReturn, {
      x: contentX + 130,
      y: formStartY - 20,
      size: 10,
      font: helvetica,
      color: black
    });
  }
  
  // Findings
  page.drawRectangle({
    x: contentX,
    y: formStartY - 110,
    width: contentWidth,
    height: 70,
    borderColor: black,
    borderWidth: 1
  });
  
  page.drawText('Findings :', {
    x: contentX + 10,
    y: formStartY - 60,
    size: 10,
    font: helvetica,
    color: black
  });
  
  if (sr?.findings) {
    const findingsLines = splitTextToLines(sr.findings, contentWidth - 140, helvetica, 10);
    let lineY = formStartY - 60;
    
    findingsLines.forEach((line) => {
      if (lineY > formStartY - 100) { // Make sure we stay within the box
        page.drawText(line, {
          x: contentX + 70,
          y: lineY,
          size: 10,
          font: helvetica,
          color: black
        });
        lineY -= 15;
      }
    });
  }
  
  // Action
  page.drawRectangle({
    x: contentX,
    y: formStartY - 180,
    width: contentWidth,
    height: 70,
    borderColor: black,
    borderWidth: 1
  });
  
  page.drawText('Action :', {
    x: contentX + 10,
    y: formStartY - 130,
    size: 10,
    font: helvetica,
    color: black
  });
  
  if (sr?.action) {
    const actionLines = splitTextToLines(sr.action, contentWidth - 140, helvetica, 10);
    let lineY = formStartY - 130;
    
    actionLines.forEach((line) => {
      if (lineY > formStartY - 170) { // Make sure we stay within the box
        page.drawText(line, {
          x: contentX + 70,
          y: lineY,
          size: 10,
          font: helvetica,
          color: black
        });
        lineY -= 15;
      }
    });
  }
  
  // Service Checklist Section
  const checklistY = formStartY - 180;
  
  // Draw checklist table - match exactly with the image
  page.drawRectangle({
    x: contentX,
    y: checklistY - 70,
    width: contentWidth,
    height: 70,
    borderColor: black,
    borderWidth: 1
  });
  
  // Calculate column widths for checklist
  const columnCount = 4;
  const columnWidth = contentWidth / columnCount;
  
  // Draw vertical dividers for checklist
  for (let i = 1; i < columnCount; i++) {
    page.drawLine({
      start: { x: contentX + i * columnWidth, y: checklistY - 70 },
      end: { x: contentX + i * columnWidth, y: checklistY },
      thickness: 1,
      color: black
    });
  }
  
  // Column Headers
  page.drawText('Sensor Replacement', {
    x: contentX + 10,
    y: checklistY - 15,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText('Lamp Service', {
    x: contentX + columnWidth + 10,
    y: checklistY - 15,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText('Pump Service', {
    x: contentX + 2 * columnWidth + 10,
    y: checklistY - 15,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText('Instrument Service', {
    x: contentX + 3 * columnWidth + 10,
    y: checklistY - 15,
    size: 10,
    font: helvetica,
    color: black
  });
  
  // Sensor Replacement checkboxes
  renderCheckbox(contentX + 10, checklistY - 30, sr?.sensorCO || false, 'CO', page, black, helvetica, helveticaBold);
  renderCheckbox(contentX + 10, checklistY - 42, sr?.sensorH2S || false, 'H2S', page, black, helvetica, helveticaBold);
  renderCheckbox(contentX + 10, checklistY - 54, sr?.sensorO2 || false, 'O2', page, black, helvetica, helveticaBold);
  renderCheckbox(contentX + 10, checklistY - 66, sr?.sensorLEL || false, 'LEL', page, black, helvetica, helveticaBold);
  
  // Lamp Service checkboxes
  renderCheckbox(contentX + columnWidth + 10, checklistY - 30, sr?.lampClean || false, 'Clean', page, black, helvetica, helveticaBold);
  renderCheckbox(contentX + columnWidth + 10, checklistY - 42, sr?.lampReplace || false, 'Replace', page, black, helvetica, helveticaBold);
  
  // Pump Service checkboxes
  renderCheckbox(contentX + 2 * columnWidth + 10, checklistY - 30, sr?.pumpTested || false, 'Tested', page, black, helvetica, helveticaBold);
  renderCheckbox(contentX + 2 * columnWidth + 10, checklistY - 42, sr?.pumpRebuilt || false, 'Rebuilt', page, black, helvetica, helveticaBold);
  renderCheckbox(contentX + 2 * columnWidth + 10, checklistY - 54, sr?.pumpReplaced || false, 'Replaced', page, black, helvetica, helveticaBold);
  renderCheckbox(contentX + 2 * columnWidth + 10, checklistY - 66, sr?.pumpClean || false, 'Clean', page, black, helvetica, helveticaBold);
  
  // Instrument Service checkboxes
  renderCheckbox(contentX + 3 * columnWidth + 10, checklistY - 30, sr?.instrumentCalibrate || false, 'Calibrate', page, black, helvetica, helveticaBold);
  renderCheckbox(contentX + 3 * columnWidth + 80, checklistY - 30, sr?.instrumentUpgrade || false, 'Upgrade', page, black, helvetica, helveticaBold);
  renderCheckbox(contentX + 3 * columnWidth + 10, checklistY - 42, sr?.instrumentCharge || false, 'Charge', page, black, helvetica, helveticaBold);
  renderCheckbox(contentX + 3 * columnWidth + 10, checklistY - 54, sr?.instrumentClean || false, 'Clean', page, black, helvetica, helveticaBold);
  renderCheckbox(contentX + 3 * columnWidth + 10, checklistY - 66, sr?.instrumentSensorAssembly || false, 'Sensor Assembly', page, black, helvetica, helveticaBold);
  
  // Parts List
  const partsY = checklistY - 70;
  
  // Parts List header center-aligned
  const partsTextWidth = 70;
  const partsTextX = contentX + (contentWidth / 2) - (partsTextWidth / 2);
  
  page.drawText('Parts List', {
    x: partsTextX,
    y: partsY - 15,
    size: 10,
    font: helvetica,
    color: black
  });
  
  // Parts Table
  const partsTableY = partsY - 25;
  const partsTableHeight = 130;
  
  // Draw table container
  page.drawRectangle({
    x: contentX,
    y: partsTableY - partsTableHeight,
    width: contentWidth,
    height: partsTableHeight,
    borderColor: black,
    borderWidth: 1
  });
  
  // Calculate parts column widths
  const partColWidths = [
    contentWidth * 0.1, // Item
    contentWidth * 0.4, // Description
    contentWidth * 0.25, // SN/PN/OLD
    contentWidth * 0.25  // SN/PN/NEW
  ];
  
  // Draw table header
  page.drawRectangle({
    x: contentX,
    y: partsTableY - 20,
    width: contentWidth,
    height: 20,
    borderColor: black,
    borderWidth: 1
  });
  
  // Draw column dividers
  let partColX = contentX;
  for (let i = 0; i < partColWidths.length - 1; i++) {
    partColX += partColWidths[i];
    
    // Draw divider in header
    page.drawLine({
      start: { x: partColX, y: partsTableY - 20 },
      end: { x: partColX, y: partsTableY },
      thickness: 1,
      color: black
    });
    
    // Draw divider in table body
    page.drawLine({
      start: { x: partColX, y: partsTableY - partsTableHeight },
      end: { x: partColX, y: partsTableY - 20 },
      thickness: 1,
      color: black
    });
  }
  
  // Draw header text
  page.drawText('Item', {
    x: contentX + partColWidths[0] / 2 - 10,
    y: partsTableY - 15,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText('Description', {
    x: contentX + partColWidths[0] + partColWidths[1] / 2 - 30,
    y: partsTableY - 15,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText('SN/PN/OLD', {
    x: contentX + partColWidths[0] + partColWidths[1] + partColWidths[2] / 2 - 30,
    y: partsTableY - 15,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText('SN/PN/NEW', {
    x: contentX + partColWidths[0] + partColWidths[1] + partColWidths[2] + partColWidths[3] / 2 - 30,
    y: partsTableY - 15,
    size: 10,
    font: helvetica,
    color: black
  });
  
  // Draw rows
  const rowHeight = 22;
  const rowCount = 5;
  const parts = sr?.parts || [];
  
  for (let i = 0; i < rowCount; i++) {
    const rowY = partsTableY - 20 - (i * rowHeight);
    
    // Draw horizontal line except for the last row
    if (i < rowCount - 1) {
      page.drawLine({
        start: { x: contentX, y: rowY - rowHeight },
        end: { x: contentX + contentWidth, y: rowY - rowHeight },
        thickness: 1,
        color: black
      });
    }
    
    // Add parts data if available
    if (i < parts.length) {
      const part = parts[i];
      
      // Item number
      page.drawText(part.itemNumber.toString(), {
        x: contentX + 15,
        y: rowY - (rowHeight / 2),
        size: 9,
        font: helvetica,
        color: black
      });
      
      // Description
      const description = part.description || '';
      const truncDesc = description.length > 40 ? description.substring(0, 37) + '...' : description;
      
      page.drawText(truncDesc, {
        x: contentX + partColWidths[0] + 10,
        y: rowY - (rowHeight / 2),
        size: 9,
        font: helvetica,
        color: black
      });
      
      // SN/PN/OLD
      const oldSN = part.snPnOld || '';
      const truncOldSN = oldSN.length > 20 ? oldSN.substring(0, 17) + '...' : oldSN;
      
      page.drawText(truncOldSN, {
        x: contentX + partColWidths[0] + partColWidths[1] + 10,
        y: rowY - (rowHeight / 2),
        size: 9,
        font: helvetica,
        color: black
      });
      
      // SN/PN/NEW
      const newSN = part.snPnNew || '';
      const truncNewSN = newSN.length > 20 ? newSN.substring(0, 17) + '...' : newSN;
      
      page.drawText(truncNewSN, {
        x: contentX + partColWidths[0] + partColWidths[1] + partColWidths[2] + 10,
        y: rowY - (rowHeight / 2),
        size: 9,
        font: helvetica,
        color: black
      });
    }
  }
  
  // Signature section
  const signatureY = partsTableY - partsTableHeight - 30;
  
  page.drawText('Services/Maintenance by,', {
    x: contentX + 50,
    y: signatureY,
    size: 10,
    font: helvetica,
    color: black
  });
  
  page.drawText('Mengetahui,', {
    x: contentX + contentWidth - 70,
    y: signatureY,
    size: 10,
    font: helvetica,
    color: black
  });
  
  // Create PDF
  const pdfResult = await pdfDoc.save();
  
  return { reportNumber: csrNum, pdfResult };
}

// Function to generate Technical Report2 PDF
async function generateTechnicalReportPDF(maintenanceData: TechnicalReportMaintenanceData) {
  const tr = maintenanceData.technicalReport;
  
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Add an A4 page
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  
  // Load standard fonts
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Colors
  const black = rgb(0, 0, 0);
  const white = rgb(1, 1, 1);
  
  // Page coordinates
  const { width, height } = page.getSize();
  const margin = 40;
  
  // --- BLACK HEADER FOR TITLE ---
  // Black background for title
  page.drawRectangle({
    x: margin,
    y: height - 40,
    width: width - 2 * margin,
    height: 20,
    color: black
  });
  
  // Title with white text
  page.drawText('Customer Service Report', {
    x: width / 2 - 80,
    y: height - 30,
    size: 14,
    font: helveticaBold,
    color: white
  });
  
  // --- MAIN GRID LAYOUT ---
  const tableWidth = width - 2 * margin;
  
  // Top row with three columns
  
  // Column 1 - Company info (left)
  page.drawRectangle({
    x: margin,
    y: height - 160,
    width: tableWidth * 0.33,
    height: 120,
    borderColor: black,
    borderWidth: 1
  });
  
  // Column 2 - Delivery info (middle)
  page.drawRectangle({
    x: margin + tableWidth * 0.33,
    y: height - 160,
    width: tableWidth * 0.36,
    height: 120,
    borderColor: black,
    borderWidth: 1
  });
  
  // Column 3 - CSR info (right)
  page.drawRectangle({
    x: margin + tableWidth * 0.33 + tableWidth * 0.36,
    y: height - 160,
    width: tableWidth * 0.31,
    height: 120,
    borderColor: black,
    borderWidth: 1
  });
  
  // Divide the right box horizontally - create Technical Support section
  page.drawLine({
    start: { x: margin + tableWidth * 0.33 + tableWidth * 0.36, y: height - 100 },
    end: { x: margin + tableWidth, y: height - 100 },
    thickness: 1,
    color: black
  });
  
  // Company Logo and Information in first column
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo1.png');
    const logoImageBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoImageBytes);
    const logoDims = logoImage.scale(0.15);
    
    page.drawImage(logoImage, {
      x: margin + 10,
      y: height - 70,
      width: logoDims.width,
      height: logoDims.height
    });
  } catch (err) {
    console.error('Error loading company logo:', err);
  }
  
  // Company address
  page.drawText('Komplek Palem Ganda', {
    x: margin + 10,
    y: height - 90,
    size: 8,
    font: helvetica,
    color: black
  });
  
  page.drawText('Asri 1 Blok A3 No.8,', {
    x: margin + 10,
    y: height - 100,
    size: 8,
    font: helvetica,
    color: black
  });
  
  page.drawText('Karang Tengah', {
    x: margin + 10,
    y: height - 110,
    size: 8,
    font: helvetica,
    color: black
  });
  
  page.drawText('Ciledug – Tangerang 15157', {
    x: margin + 10,
    y: height - 120,
    size: 8,
    font: helvetica,
    color: black
  });
  
  page.drawText('021-7306424', {
    x: margin + 10,
    y: height - 130,
    size: 8,
    font: helvetica,
    color: black
  });
  
  // Delivery Information (middle column)
  page.drawText('DELIVERY TO :', {
    x: margin + tableWidth * 0.33 + 10,
    y: height - 60,
    size: 9,
    font: helveticaBold,
    color: black
  });
  
  page.drawText('To :', {
    x: margin + tableWidth * 0.33 + 10,
    y: height - 75,
    size: 9,
    font: helveticaBold,
    color: black
  });
  
  // Customer name
  page.drawText(tr?.deliveryTo || maintenanceData.item.customer?.name || 'N/A', {
    x: margin + tableWidth * 0.33 + 35,
    y: height - 75,
    size: 9,
    font: helvetica,
    color: black
  });
  
  // Right column information
  const csrNum = tr?.csrNumber || maintenanceData.csrNumber || '090/CSR-PBI/IX/24';
  page.drawText('CSR NO :', {
    x: margin + tableWidth * 0.33 + tableWidth * 0.36 + 10,
    y: height - 60,
    size: 9,
    font: helveticaBold,
    color: black
  });
  
  page.drawText(csrNum, {
    x: margin + tableWidth * 0.33 + tableWidth * 0.36 + 70,
    y: height - 60,
    size: 9,
    font: helvetica,
    color: black
  });
  
  // Date
  page.drawText('DATE :', {
    x: margin + tableWidth * 0.33 + tableWidth * 0.36 + 10,
    y: height - 80,
    size: 9,
    font: helveticaBold,
    color: black
  });
  
  // Report date
  const reportDate = tr?.dateReport ? formatDateID(tr.dateReport) : "17 Sept 2024";
  page.drawText(reportDate, {
    x: margin + tableWidth * 0.33 + tableWidth * 0.36 + 70,
    y: height - 80,
    size: 9,
    font: helvetica,
    color: black
  });
  
  // Technical Support
  page.drawText('Technical Support', {
    x: margin + tableWidth * 0.33 + tableWidth * 0.36 + 50,
    y: height - 110,
    size: 9,
    font: helveticaBold,
    color: black
  });
  
  page.drawText(tr?.techSupport || 'N/A', {
    x: margin + tableWidth * 0.33 + tableWidth * 0.36 + 50,
    y: height - 150,
    size: 9,
    font: helvetica,
    color: black
  });
  
  // --- SECOND SECTION - REASON & DATE ---
  const reasonY = height - 160;
  
  // Reason for Return section - Left box
  page.drawRectangle({
    x: margin,
    y: reasonY - 35,
    width: tableWidth * 0.69,
    height: 35,
    borderColor: black,
    borderWidth: 1
  });
  
  page.drawText('Reason For Return :', {
    x: margin + 10,
    y: reasonY - 15,
    size: 9,
    font: helveticaBold,
    color: black
  });
  
  // Add reason text
  page.drawText(tr?.reasonForReturn || 'Maintenance & calibration', {
    x: margin + 120,
    y: reasonY - 15,
    size: 9,
    font: helvetica,
    color: black
  });
  
  // Date In box - Right box
  page.drawRectangle({
    x: margin + tableWidth * 0.69,
    y: reasonY - 35,
    width: tableWidth * 0.31,
    height: 35,
    borderColor: black,
    borderWidth: 1
  });
  
  page.drawText('Date In :', {
    x: margin + tableWidth * 0.69 + 10,
    y: reasonY - 15,
    size: 9,
    font: helveticaBold,
    color: black
  });
  
  const dateIn = tr?.dateIn ? formatDateID(tr.dateIn) : formatDateID(maintenanceData.startDate);
  page.drawText(dateIn, {
    x: margin + tableWidth * 0.69 + 55,
    y: reasonY - 15,
    size: 9,
    font: helvetica,
    color: black
  });
  
  // Estimate Work box - Right
  page.drawRectangle({
    x: margin + tableWidth * 0.69,
    y: reasonY - 70,
    width: tableWidth * 0.31,
    height: 35,
    borderColor: black,
    borderWidth: 1
  });
  
  page.drawText('Estimate Work :', {
    x: margin + tableWidth * 0.69 + 10,
    y: reasonY - 55,
    size: 9,
    font: helveticaBold,
    color: black
  });
  
  if (tr?.estimateWork) {
    page.drawText(tr.estimateWork, {
      x: margin + tableWidth * 0.69 + 90,
      y: reasonY - 55,
      size: 9,
      font: helvetica,
      color: black
    });
  }
  
  // Third section - Findings details
  page.drawRectangle({
    x: margin,
    y: reasonY - 115,
    width: tableWidth,
    height: 45,
    borderColor: black,
    borderWidth: 1
  });
  
  page.drawText('Findings :', {
    x: margin + 10,
    y: reasonY - 90,
    size: 9,
    font: helveticaBold,
    color: black
  });
  
  // Add detailed findings content if available
  if (tr?.findings) {
    const findingsLines = splitTextToLines(tr.findings, tableWidth - 100, helvetica, 9);
    let lineY = reasonY - 90;
    
    findingsLines.forEach((line, idx) => {
      if (lineY > reasonY - 110 && idx < 2) { // Show max 2 lines
        page.drawText(line, {
          x: margin + 80,
          y: lineY,
          size: 9,
          font: helvetica,
          color: black
        });
        lineY -= 15;
      }
    });
  }
  
  // --- FOURTH SECTION - DEVICE IMAGES ---
  const photosY = reasonY - 115;
  
  // Draw container for photos
  page.drawRectangle({
    x: margin,
    y: photosY - 150,
    width: tableWidth,
    height: 150,
    borderColor: black,
    borderWidth: 1
  });
  
  // If sample images are available, include them
  try {
    if (tr?.beforePhotoUrl && tr?.afterPhotoUrl) {
      // Attempt to load images from various possible paths
      const tryLoadImage = async (url: string) => {
        const possiblePaths = [
          path.join(process.cwd(), 'public', url),
          path.join(process.cwd(), 'public', 'uploads', url),
          url
        ];
        
        for (const path of possiblePaths) {
          try {
            if (fs.existsSync(path)) {
              const bytes = fs.readFileSync(path);
              if (path.toLowerCase().endsWith('.png')) {
                return await pdfDoc.embedPng(bytes);
              } else if (path.toLowerCase().endsWith('.jpg') || path.toLowerCase().endsWith('.jpeg')) {
                return await pdfDoc.embedJpg(bytes);
              }
            }
          } catch (e) {
            console.error(`Error loading image from ${path}:`, e);
          }
        }
        return null;
      };
      
      const beforeImage = await tryLoadImage(tr.beforePhotoUrl);
      const afterImage = await tryLoadImage(tr.afterPhotoUrl);
        
      if (beforeImage) {
        const maxDim = Math.min(tableWidth / 2 - 30, 140);
        const beforeDims = beforeImage.scale(
          Math.min(maxDim / beforeImage.width, maxDim / beforeImage.height)
        );
        
        page.drawImage(beforeImage, {
          x: margin + (tableWidth / 4) - (beforeDims.width / 2),
          y: photosY - 75 - (beforeDims.height / 2),
          width: beforeDims.width,
          height: beforeDims.height
        });
      }
      
      if (afterImage) {
        const maxDim = Math.min(tableWidth / 2 - 30, 140);
        const afterDims = afterImage.scale(
          Math.min(maxDim / afterImage.width, maxDim / afterImage.height)
        );
        
        page.drawImage(afterImage, {
          x: margin + (tableWidth * 3/4) - (afterDims.width / 2),
          y: photosY - 75 - (afterDims.height / 2),
          width: afterDims.width,
          height: afterDims.height
        });
      }
      
      // Add labels for before/after images
      page.drawText('Before Maintenance', {
        x: margin + (tableWidth / 4) - 40,
        y: photosY - 140,
        size: 9,
        font: helveticaBold,
        color: black
      });
      
      page.drawText('After Maintenance', {
        x: margin + (tableWidth * 3/4) - 40,
        y: photosY - 140,
        size: 9,
        font: helveticaBold,
        color: black
      });
    }
  } catch (e) {
    console.error('Error processing device images:', e);
  }
  
  // --- FIFTH SECTION - ACTION ---
  const actionY = photosY - 150;
  
  page.drawRectangle({
    x: margin,
    y: actionY - 70,
    width: tableWidth,
    height: 70,
    borderColor: black,
    borderWidth: 1
  });
  
  page.drawText('Action :', {
    x: margin + 10, 
    y: actionY - 20,
    size: 9,
    font: helveticaBold,
    color: black
  });
  
  // Add action content if available
  if (tr?.action) {
    const actionLines = splitTextToLines(tr.action, tableWidth - 100, helvetica, 9);
    let lineY = actionY - 20;
    
    actionLines.forEach((line, idx) => {
      if (lineY > actionY - 60 && idx < 3) { // Show max 3 lines
        page.drawText(line, {
          x: margin + 80,
          y: lineY,
          size: 9,
          font: helvetica,
          color: black
        });
        lineY -= 15;
      }
    });
  }
  
  // --- SIXTH SECTION - PARTS LIST TABLE ---
  const partsY = actionY - 70;
  
  // Table headers
  const columnHeaders = ['NO', 'Nama Unit', 'DESCRIPTION', 'QTY'];
  const columnWidths = [
    tableWidth * 0.08,  // NO
    tableWidth * 0.17,  // Nama Unit
    tableWidth * 0.30,  // DESCRIPTION
    tableWidth * 0.10,  // QTY 
  ];
  
  // Draw header row
  page.drawRectangle({
    x: margin,
    y: partsY - 25,
    width: tableWidth,
    height: 25,
    borderColor: black,
    borderWidth: 1
  });
  
  // Draw column dividers and headers
  let xOffset = margin;
  columnHeaders.forEach((header, i) => {
    // Draw header text
    const textX = xOffset + columnWidths[i] / 2 - header.length * 2.5;
    page.drawText(header, {
      x: textX,
      y: partsY - 15,
      size: 9,
      font: helveticaBold,
      color: black
    });
    
    xOffset += columnWidths[i];
    
    // Draw vertical divider except after last column
    if (i < columnHeaders.length - 1) {
      page.drawLine({
        start: { x: xOffset, y: partsY },
        end: { x: xOffset, y: partsY - 25 },
        thickness: 1,
        color: black
      });
    }
  });
  
  // Draw data rows (5 rows)
  const rowCount = 5;
  const rowHeight = 25;
  
  // Parts data - use either from the report or empty rows
  const parts = tr?.partsList || [];
  
  for (let i = 0; i < rowCount; i++) {
    const rowY = partsY - 25 - (i * rowHeight);
    
    // Draw row rectangle
    page.drawRectangle({
      x: margin,
      y: rowY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      borderColor: black,
      borderWidth: 1
    });
    
    // Draw column dividers
    xOffset = margin;
    for (let j = 0; j < columnWidths.length - 1; j++) {
      xOffset += columnWidths[j];
      page.drawLine({
        start: { x: xOffset, y: rowY },
        end: { x: xOffset, y: rowY - rowHeight },
        thickness: 1,
        color: black
      });
    }
    
    // Fill in data if available
    if (i < parts.length) {
      const part = parts[i];
      
      // NO column
      page.drawText((i + 1) + '.', {
        x: margin + 10,
        y: rowY - rowHeight/2 - 4,
        size: 9,
        font: helvetica,
        color: black
      });
      
      // Nama Unit
      const namaUnit = part.namaUnit || '';
      page.drawText(namaUnit, {
        x: margin + columnWidths[0] + 5,
        y: rowY - rowHeight/2 - 4,
        size: 9,
        font: helvetica,
        color: black
      });
      
      // Description
      const description = part.description || '';
      page.drawText(description, {
        x: margin + columnWidths[0] + columnWidths[1] + 5,
        y: rowY - rowHeight/2 - 4,
        size: 9,
        font: helvetica,
        color: black
      });
      
      // QTY
      page.drawText(part.quantity.toString(), {
        x: margin + columnWidths[0] + columnWidths[1] + columnWidths[2] + 15,
        y: rowY - rowHeight/2 - 4,
        size: 9,
        font: helvetica,
        color: black
      });
    }
  }
  
  // --- SIXTH SECTION - TERMS & CONDITIONS ---
  const termsY = partsY - 25 - (rowCount * rowHeight);
  // --- FOOTER TEXT ---
  page.drawText('This Report is generated by the system automatically, please verify the accuracy of the report before signing.', {
    x: margin,
    y: termsY - 100,
    size: 9,
    font: helvetica,
    color: black
  });
  
  page.drawText('Best regards', {
    x: margin,
    y: termsY - 115,
    size: 9,
    font: helvetica,
    color: black
  });
  
  page.drawText('PT. PARAMATA BARAYA INTERNASIONAL', {
    x: margin,
    y: termsY - 130,
    size: 9,
    font: helveticaBold,
    color: black
  });
  
  // Signature
  page.drawText('Gerhan M.Y', {
    x: margin,
    y: termsY - 160,
    size: 9,
    font: helveticaBold,
    color: black
  });
  
  page.drawText('Director', {
    x: margin,
    y: termsY - 175,
    size: 9,
    font: helvetica,
    color: black
  });
  
  // Create PDF
  const pdfResult = await pdfDoc.save();
  
  return { reportNumber: csrNum, pdfResult };
}

function renderCheckbox(x: number, y: number, isChecked: boolean, label: string, page: PDFPage, black: RGB, helvetica: PDFFont, helveticaBold: PDFFont) {
  // Draw checkbox
  page.drawRectangle({
    x,
    y,
    width: 10,
    height: 10,
    borderColor: black,
    borderWidth: 0.5
  });
  
  // Draw check mark if checked
  if (isChecked) {
    page.drawText('X', {
      x: x + 2,
      y: y + 2,
      size: 8,
      font: helveticaBold,
      color: black
    });
  }
  
  // Draw label
  page.drawText(label, {
    x: x + 15,
    y: y + 2,
    size: 9,
    font: helvetica,
    color: black
  });
}

// Utility functions that help with PDF generation
function splitTextToLines(text: string | undefined | null, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  if (!text) return [];
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + word + ' ';
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines;
} 