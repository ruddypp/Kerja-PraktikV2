import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { PDFDocument, rgb, StandardFonts, PDFPage, RGB, PDFFont } from 'pdf-lib';
import path from 'path';
import fs from 'fs';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Format date to Indonesian format
function formatDateID(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    // @ts-expect-error - date-fns locale usage is correct but TypeScript definition is outdated
    return format(dateObj, 'dd MMMM yyyy', { locale: id });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

// Month to Roman numeral conversion
function getRomanMonth(date: Date): string {
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return romanMonths[date.getMonth()];
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
      const { pdfDoc, reportNumber } = await generateServiceReportPDF(maintenanceData);
      pdfBytes = await pdfDoc.save();
      filename = `CSR_${reportNumber || maintenanceId}.pdf`;
    } else if (reportType === 'technical') {
      // Generate Technical Report PDF
      const { pdfDoc, reportNumber } = await generateTechnicalReportPDF(maintenanceData);
      pdfBytes = await pdfDoc.save();
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

// Function to generate Service Report PDF
async function generateServiceReportPDF(maintenanceData: {
  id: string;
  itemSerial: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  item: {
    name: string;
    partNumber: string;
    customer?: { name: string };
  };
  user: { name: string };
  serviceReport: {
    reportNumber?: string;
    customer?: string;
    location?: string;
    brand?: string;
    model?: string;
    dateIn?: string;
    reasonForReturn?: string;
    findings?: string;
    action?: string;
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
      itemNumber: number;
      description?: string;
      snPnOld?: string;
      snPnNew?: string;
    }>;
  };
}) {
  const sr = maintenanceData.serviceReport;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
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
  const margin = 20;
  
  // --- Double Border around the entire page ---
  // Outer border
  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - 2 * margin,
    height: height - 2 * margin,
    borderColor: black,
    borderWidth: 1.5,
  });
  
  // Inner border (slightly smaller)
  page.drawRectangle({
    x: margin + 5,
    y: margin + 5,
    width: width - 2 * (margin + 5),
    height: height - 2 * (margin + 5),
    borderColor: black,
    borderWidth: 1,
  });
  
  // --- Header with box ---
  page.drawRectangle({
    x: margin + 5,
    y: height - 150,
    width: width - 2 * (margin + 5),
    height: 130,
    borderColor: black,
    borderWidth: 1.5,
  });
  
  // --- Load and embed company logo ---
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo1.png');
    const logoImageBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoImageBytes);
    const logoDims = logoImage.scale(0.4);
    
    page.drawImage(logoImage, {
      x: 60,
      y: height - 110,
      width: logoDims.width,
      height: logoDims.height
    });
  } catch (err) {
    console.error('Error loading company logo:', err);
    // Continue without logo if there's an error
  }
  
  // --- Company information ---
  page.drawText('PT. PARAMATA BARAYA INTERNATIONAL', {
    x: 180,
    y: height - 70,
    size: 12,
    font: helveticaBold,
    color: black
  });
  
  page.drawText('Kompleks Palem Ganda Asri 1 Blok A3 No. 8', {
    x: 180,
    y: height - 85,
    size: 9,
    font: helvetica,
    color: black
  });
  
  page.drawText('Karang Tengah, Ciledug - Tangerang 15157', {
    x: 180,
    y: height - 100,
    size: 9,
    font: helvetica,
    color: black
  });
  
  page.drawText('Telp. 62-21 730 6424, 733 1150 / Faks. 62-21 733 1150', {
    x: 180,
    y: height - 115,
    size: 9,
    font: helvetica,
    color: black
  });
  
  page.drawText('Email : paramata@indosat.net.id', {
    x: 180,
    y: height - 130,
    size: 9,
    font: helvetica,
    color: black
  });
  
  // --- Title ---
  const titleY = height - 200;
  page.drawText('Customer Service Report', {
    x: width / 2 - 100,
    y: titleY,
    size: 18,
    font: helveticaBold,
    color: white
  });
  
  // Report number
  const reportNumber = sr?.reportNumber || `${currentDate.getDate()}/CSR-PBI/${currentYear}`;
  
  page.drawText(`No. :        /        /CSR-PBI/        /2023`, {
    x: width / 2 - 110,
    y: titleY - 25,
    size: 11,
    font: helvetica,
    color: black
  });
  
  // --- Customer Information Section ---
  const yStart = titleY - 65;
  const leftColumnX = 50;
  const rightColumnX = 420;
  const labelWidth = 100;
  
  // --- Left Column ---
  page.drawText('Customer', {
    x: leftColumnX,
    y: yStart,
    size: 11,
    font: helveticaBold,
    color: black
  });
  
  page.drawText(`: ${sr?.customer || maintenanceData.item.customer?.name || '-'}`, {
    x: leftColumnX + 90,
    y: yStart,
    size: 11,
    font: helvetica,
    color: black
  });
  
  page.drawText('Location', {
    x: leftColumnX,
    y: yStart - 30,
    size: 11,
    font: helveticaBold,
    color: black
  });
  
  page.drawText(':', {
    x: leftColumnX + 90,
    y: yStart - 30,
    size: 11,
    font: helvetica,
    color: black
  });
  
  page.drawText('Brand', {
    x: leftColumnX,
    y: yStart - 60,
    size: 11,
    font: helveticaBold,
    color: black
  });
  
  page.drawText(':', {
    x: leftColumnX + 90,
    y: yStart - 60,
    size: 11,
    font: helvetica,
    color: black
  });
  
  page.drawText('Model', {
    x: leftColumnX,
    y: yStart - 90,
    size: 11,
    font: helveticaBold,
    color: black
  });
  
  page.drawText(':', {
    x: leftColumnX + 90,
    y: yStart - 90,
    size: 11,
    font: helvetica,
    color: black
  });
  
  // --- Right Column ---
  page.drawText('Serial Number', {
    x: rightColumnX,
    y: yStart,
    size: 11,
    font: helveticaBold,
    color: black
  });
  
  page.drawText(':', {
    x: rightColumnX + 100,
    y: yStart,
    size: 11,
    font: helvetica,
    color: black
  });
  
  page.drawText('Date In', {
    x: rightColumnX,
    y: yStart - 30,
    size: 11,
    font: helveticaBold,
    color: black
  });
  
  page.drawText(':', {
    x: rightColumnX + 100,
    y: yStart - 30,
    size: 11,
    font: helvetica,
    color: black
  });
  
  // --- Form Fields Section ---
  const formY = yStart - 140;
  const formWidth = width - 2 * (margin + 20);
  
  // Reason For Return
  page.drawRectangle({
    x: margin + 20,
    y: formY - 60,
    width: formWidth,
    height: 60,
    borderColor: black,
    borderWidth: 1
  });
  
  page.drawText('Reason For Return :', {
    x: margin + 30,
    y: formY,
    size: 11,
    font: helveticaBold,
    color: black
  });
  
  if (sr?.reasonForReturn) {
    // Draw multi-line text for reason for return
    const reasonLines = splitTextToLines(sr.reasonForReturn, formWidth - 20, helvetica, 10);
    let lineY = formY - 15;
    
    reasonLines.forEach((line) => {
      if (lineY > formY - 55) { // Make sure we stay within the box
        page.drawText(line, {
          x: margin + 30,
          y: lineY,
          size: 10,
          font: helvetica,
          color: black
        });
        lineY -= 12;
      }
    });
  }
  
  // Findings
  page.drawRectangle({
    x: margin + 20,
    y: formY - 140,
    width: formWidth,
    height: 80,
    borderColor: black,
    borderWidth: 1
  });
  
  page.drawText('Findings :', {
    x: margin + 30,
    y: formY - 70,
    size: 11,
    font: helveticaBold,
    color: black
  });
  
  if (sr?.findings) {
    // Draw multi-line text for findings
    const findingsLines = splitTextToLines(sr.findings, formWidth - 20, helvetica, 10);
    let lineY = formY - 85;
    
    findingsLines.forEach((line) => {
      if (lineY > formY - 135) { // Make sure we stay within the box
        page.drawText(line, {
          x: margin + 30,
          y: lineY,
          size: 10,
          font: helvetica,
          color: black
        });
        lineY -= 12;
      }
    });
  }
  
  // Action
  page.drawRectangle({
    x: margin + 20,
    y: formY - 220,
    width: formWidth,
    height: 80,
    borderColor: black,
    borderWidth: 1
  });
  
  page.drawText('Action :', {
    x: margin + 30,
    y: formY - 150,
    size: 11,
    font: helveticaBold,
    color: black
  });
  
  if (sr?.action) {
    // Draw multi-line text for action
    const actionLines = splitTextToLines(sr.action, formWidth - 20, helvetica, 10);
    let lineY = formY - 165;
    
    actionLines.forEach((line) => {
      if (lineY > formY - 215) { // Make sure we stay within the box
        page.drawText(line, {
          x: margin + 30,
          y: lineY,
          size: 10,
          font: helvetica,
          color: black
        });
        lineY -= 12;
      }
    });
  }
  
  // Service Checklist
  const checklistY = formY - 220;
  const checkboxSize = 10;
  
  // Table for checklist
  page.drawRectangle({
    x: margin + 20,
    y: checklistY - 80,
    width: formWidth,
    height: 80,
    borderColor: black,
    borderWidth: 1
  });
  
  // Draw dividing lines for the 4 columns
  const col1Width = formWidth * 0.25;
  const col2Width = formWidth * 0.25;
  const col3Width = formWidth * 0.25;
  
  // Vertical dividers
  page.drawLine({
    start: { x: margin + 20 + col1Width, y: checklistY - 80 },
    end: { x: margin + 20 + col1Width, y: checklistY },
    thickness: 1,
    color: black
  });
  
  page.drawLine({
    start: { x: margin + 20 + col1Width + col2Width, y: checklistY - 80 },
    end: { x: margin + 20 + col1Width + col2Width, y: checklistY },
    thickness: 1,
    color: black
  });
  
  page.drawLine({
    start: { x: margin + 20 + col1Width + col2Width + col3Width, y: checklistY - 80 },
    end: { x: margin + 20 + col1Width + col2Width + col3Width, y: checklistY },
    thickness: 1,
    color: black
  });
  
  // Column headers
  page.drawText('Sensor Replacement', {
    x: margin + 25,
    y: checklistY - 15,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  page.drawText('Lamp Service', {
    x: margin + 25 + col1Width + 5,
    y: checklistY - 15,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  page.drawText('Pump Service', {
    x: margin + 25 + col1Width + col2Width + 5,
    y: checklistY - 15,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  page.drawText('Instrument Service', {
    x: margin + 25 + col1Width + col2Width + col3Width + 5,
    y: checklistY - 15,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  // Sensor Replacement checkboxes
  renderCheckbox(margin + 35, checklistY - 30, sr?.sensorCO || false, 'CO', page, black, helvetica, helveticaBold);
  renderCheckbox(margin + 35, checklistY - 45, sr?.sensorH2S || false, 'H2S', page, black, helvetica, helveticaBold);
  renderCheckbox(margin + 35, checklistY - 60, sr?.sensorO2 || false, 'O2', page, black, helvetica, helveticaBold);
  renderCheckbox(margin + 35, checklistY - 75, sr?.sensorLEL || false, 'LEL', page, black, helvetica, helveticaBold);
  
  // Lamp Service checkboxes
  renderCheckbox(margin + 35 + col1Width, checklistY - 30, sr?.lampClean || false, 'Clean', page, black, helvetica, helveticaBold);
  renderCheckbox(margin + 35 + col1Width, checklistY - 45, sr?.lampReplace || false, 'Replace', page, black, helvetica, helveticaBold);
  
  // Pump Service checkboxes
  renderCheckbox(margin + 35 + col1Width + col2Width, checklistY - 30, sr?.pumpTested || false, 'Tested', page, black, helvetica, helveticaBold);
  renderCheckbox(margin + 35 + col1Width + col2Width, checklistY - 45, sr?.pumpRebuilt || false, 'Rebuilt', page, black, helvetica, helveticaBold);
  renderCheckbox(margin + 35 + col1Width + col2Width, checklistY - 60, sr?.pumpReplaced || false, 'Replaced', page, black, helvetica, helveticaBold);
  renderCheckbox(margin + 35 + col1Width + col2Width, checklistY - 75, sr?.pumpClean || false, 'Clean', page, black, helvetica, helveticaBold);
  
  // Instrument Service checkboxes
  renderCheckbox(margin + 35 + col1Width + col2Width + col3Width, checklistY - 30, sr?.instrumentCalibrate || false, 'Calibrate', page, black, helvetica, helveticaBold);
  renderCheckbox(margin + 35 + col1Width + col2Width + col3Width, checklistY - 45, sr?.instrumentUpgrade || false, 'Upgrade', page, black, helvetica, helveticaBold);
  renderCheckbox(margin + 35 + col1Width + col2Width + col3Width, checklistY - 60, sr?.instrumentCharge || false, 'Charge', page, black, helvetica, helveticaBold);
  renderCheckbox(margin + 35 + col1Width + col2Width + col3Width, checklistY - 75, sr?.instrumentClean || false, 'Clean', page, black, helvetica, helveticaBold);
  
  // Sensor Assembly checkbox (needs more space)
  renderCheckbox(margin + 35 + col1Width + col2Width + col3Width, checklistY - 90, sr?.instrumentSensorAssembly || false, 'Sensor Assembly', page, black, helvetica, helveticaBold);
  
  // Parts List
  const partsY = checklistY - 80;
  
  // Draw parts list header
  page.drawText('Parts', {
    x: margin + 20 + formWidth / 2 - 15,
    y: partsY - 15,
    size: 11,
    font: helveticaBold,
    color: black
  });
  
  page.drawText('List', {
    x: margin + 20 + formWidth / 2 + 15,
    y: partsY - 15,
    size: 11,
    font: helveticaBold,
    color: black
  });
  
  // Draw parts list table
  const partsTableY = partsY - 30;
  const partsTableHeight = 130;
  const colWidths = [60, 200, 140, 140];
  
  // Draw the outer box of the table
  page.drawRectangle({
    x: margin + 20,
    y: partsTableY - partsTableHeight,
    width: formWidth,
    height: partsTableHeight,
    borderColor: black,
    borderWidth: 1
  });
  
  // Draw header row
  page.drawRectangle({
    x: margin + 20,
    y: partsTableY - 25,
    width: formWidth,
    height: 25,
    borderColor: black,
    borderWidth: 1
  });
  
  // Draw column dividers in header
  let xOffset = margin + 20;
  colWidths.forEach((colWidth, index) => {
    if (index < colWidths.length - 1) {
      xOffset += colWidth;
      page.drawLine({
        start: { x: xOffset, y: partsTableY - 25 },
        end: { x: xOffset, y: partsTableY },
        thickness: 1,
        color: black
      });
      
      // Also draw the vertical lines for the entire table height
      page.drawLine({
        start: { x: xOffset, y: partsTableY - partsTableHeight },
        end: { x: xOffset, y: partsTableY - 25 },
        thickness: 1,
        color: black
      });
    }
  });
  
  // Draw header text
  page.drawText('Item', {
    x: margin + 45,
    y: partsTableY - 15,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  page.drawText('Description', {
    x: margin + 140,
    y: partsTableY - 15,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  page.drawText('SN/PN/OLD', {
    x: margin + 20 + colWidths[0] + colWidths[1] + 35,
    y: partsTableY - 15,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  page.drawText('SN/PN/NEW', {
    x: margin + 20 + colWidths[0] + colWidths[1] + colWidths[2] + 35,
    y: partsTableY - 15,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  // Draw rows for parts (5 rows)
  const rowHeight = 20;
  for (let i = 0; i < 5; i++) {
    const yPos = partsTableY - 25 - (i + 1) * rowHeight;
    
    // Draw horizontal line for row
    if (i < 5) {
      page.drawLine({
        start: { x: margin + 20, y: yPos },
        end: { x: margin + 20 + formWidth, y: yPos },
        thickness: 1,
        color: black
      });
    }
    
    // Fill in part data if available
    if (sr?.parts && i < sr.parts.length) {
      const part = sr.parts[i];
      
      // Item number
      page.drawText(`${part.itemNumber || i + 1}`, {
        x: margin + 45,
        y: yPos + 5,
        size: 9,
        font: helvetica,
        color: black
      });
      
      // Description (truncate if too long)
      const description = part.description || '';
      const truncatedDesc = description.length > 25 ? description.substring(0, 22) + '...' : description;
      
      page.drawText(truncatedDesc, {
        x: margin + 85,
        y: yPos + 5,
        size: 9,
        font: helvetica,
        color: black
      });
      
      // SN/PN/OLD
      const oldSN = part.snPnOld || '';
      const truncatedOldSN = oldSN.length > 15 ? oldSN.substring(0, 12) + '...' : oldSN;
      
      page.drawText(truncatedOldSN, {
        x: margin + 20 + colWidths[0] + colWidths[1] + 10,
        y: yPos + 5,
        size: 9,
        font: helvetica,
        color: black
      });
      
      // SN/PN/NEW
      const newSN = part.snPnNew || '';
      const truncatedNewSN = newSN.length > 15 ? newSN.substring(0, 12) + '...' : newSN;
      
      page.drawText(truncatedNewSN, {
        x: margin + 20 + colWidths[0] + colWidths[1] + colWidths[2] + 10,
        y: yPos + 5,
        size: 9,
        font: helvetica,
        color: black
      });
    }
  }
  
  // Signature section
  const signatureY = partsTableY - partsTableHeight - 50;
  
  page.drawText('Services/Maintenance by,', {
    x: margin + 70,
    y: signatureY,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  page.drawText('Mengetahui,', {
    x: width - margin - 150,
    y: signatureY,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  // Create PDF
  const pdfBytes = await pdfDoc.save();
  
  return { pdfDoc, reportNumber };
}

// Function to generate Technical Report PDF
async function generateTechnicalReportPDF(maintenanceData: {
  id: string;
  itemSerial: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  item: {
    name: string;
    partNumber: string;
    customer?: { name: string };
  };
  user: { name: string };
  technicalReport: {
    csrNumber?: string;
    deliveryTo?: string;
    quoNumber?: string;
    dateReport?: string;
    techSupport?: string;
    dateIn?: string;
    estimateWork?: string;
    reasonForReturn?: string;
    findings?: string;
    beforePhotoUrl?: string | null;
    afterPhotoUrl?: string | null;
    termsConditions?: string;
    partsList?: Array<{
      itemNumber: number;
      namaUnit?: string;
      description?: string;
      quantity: number;
      unitPrice?: number | null;
    }>;
  };
}) {
  const tr = maintenanceData.technicalReport;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
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
  
  // Black background for title
  page.drawRectangle({
    x: margin,
    y: height - 50,
    width: width - 2 * margin,
    height: 20,
    color: black
  });
  
  // Title with white text
  page.drawText('Customer Service Report', {
    x: width / 2 - 100,
    y: height - 40,
    size: 14,
    font: helveticaBold,
    color: white
  });
  
  // Draw the main table grid
  // Top section with 3 columns
  const tableTop = height - 80;
  const tableWidth = width - 2 * margin;
  const column1Width = tableWidth * 0.4;
  const column2Width = tableWidth * 0.3;
  const column3Width = tableWidth * 0.3;
  const topRowHeight = 160;
  
  // Draw table borders
  page.drawRectangle({
    x: margin,
    y: tableTop - topRowHeight,
    width: tableWidth,
    height: topRowHeight,
    borderColor: black,
    borderWidth: 1
  });
  
  // Draw the horizontal line in the rightmost column
  page.drawLine({
    start: { x: margin + column1Width + column2Width, y: tableTop - 80 },
    end: { x: margin + tableWidth, y: tableTop - 80 },
    thickness: 1,
    color: black
  });
  
  // Draw the horizontal line for the technical support section
  page.drawLine({
    start: { x: margin + column1Width + column2Width, y: tableTop - 120 },
    end: { x: margin + tableWidth, y: tableTop - 120 },
    thickness: 1,
    color: black
  });
  
  // Company Logo and Information in first column
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo1.png');
    const logoImageBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoImageBytes);
    const logoDims = logoImage.scale(0.3);
    
    page.drawImage(logoImage, {
      x: margin + 20,
      y: tableTop - 50,
      width: logoDims.width,
      height: logoDims.height
    });
  } catch (err) {
    console.error('Error loading company logo:', err);
  }
  
  // Company address
  page.drawText('Komplek Palem Ganda', {
    x: margin + 10,
    y: tableTop - 90,
    size: 8,
    font: helvetica,
    color: black
  });
  
  page.drawText('Asri 1 Blok A3 No.8,', {
    x: margin + 10,
    y: tableTop - 100,
    size: 8,
    font: helvetica,
    color: black
  });
  
  page.drawText('Karang Tengah', {
    x: margin + 10,
    y: tableTop - 110,
    size: 8,
    font: helvetica,
    color: black
  });
  
  page.drawText('Ciledug – Tangerang 15157', {
    x: margin + 10,
    y: tableTop - 120,
    size: 8,
    font: helvetica,
    color: black
  });
  
  page.drawText('021-7306424', {
    x: margin + 10,
    y: tableTop - 130,
    size: 8,
    font: helvetica,
    color: black
  });
  
  // Column headers
  page.drawText('DELIVERY TO :', {
    x: margin + column1Width + 10,
    y: tableTop - 20,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  page.drawText('To :', {
    x: margin + column1Width + 10,
    y: tableTop - 35,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  // Customer name (from delivered to)
  page.drawText(tr?.deliveryTo || maintenanceData.item.customer?.name || '-', {
    x: margin + column1Width + 10,
    y: tableTop - 50,
    size: 10,
    font: helvetica,
    color: black
  });
  
  // CSR number
  page.drawText('CSR NO :', {
    x: margin + column1Width + column2Width + 10,
    y: tableTop - 20,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  const csrNumber = tr?.csrNumber || '000/CSR-PBI/XX/24';
  page.drawText(csrNumber, {
    x: margin + column1Width + column2Width + 10,
    y: tableTop - 50,
    size: 10,
    font: helvetica,
    color: black
  });
  
  // Date
  page.drawText('DATE :', {
    x: margin + column1Width + column2Width + 10,
    y: tableTop - 80,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  const formattedDate = formatDateID(tr?.dateReport || new Date());
  page.drawText(formattedDate, {
    x: margin + column1Width + column2Width + 10,
    y: tableTop - 95,
    size: 10,
    font: helvetica,
    color: black
  });
  
  // Technical Support
  page.drawText('Technical Support', {
    x: margin + column1Width + column2Width + 10,
    y: tableTop - 120,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  page.drawText(tr?.techSupport || maintenanceData.user.name || '-', {
    x: margin + column1Width + column2Width + 10,
    y: tableTop - 155,
    size: 10,
    font: helvetica,
    color: black
  });
  
  // QUO information
  page.drawText('QUO No:', {
    x: margin + column1Width + 10,
    y: tableTop - 95,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  // Add the content sections below the header table
  const contentY = tableTop - topRowHeight;
  
  // Reason for Return section
  // Draw rectangle for section
  page.drawRectangle({
    x: margin,
    y: contentY - 35,
    width: tableWidth,
    height: 35,
    borderColor: black,
    borderWidth: 1
  });
  
  // Add Date In and Estimate Work in a row
  page.drawText('Reason For Return :', {
    x: margin + 10,
    y: contentY - 15,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  // Draw date in box
  page.drawRectangle({
    x: margin + tableWidth * 0.7,
    y: contentY - 35,
    width: tableWidth * 0.3,
    height: 35,
    borderColor: black,
    borderWidth: 1
  });
  
  page.drawText('Date In :', {
    x: margin + tableWidth * 0.7 + 10,
    y: contentY - 15,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  const dateIn = formatDateID(tr?.dateIn || maintenanceData.startDate);
  page.drawText(dateIn, {
    x: margin + tableWidth * 0.7 + 10,
    y: contentY - 30,
    size: 10,
    font: helvetica,
    color: black
  });
  
  // Estimate work box
  page.drawRectangle({
    x: margin + tableWidth * 0.7,
    y: contentY - 70,
    width: tableWidth * 0.3,
    height: 35,
    borderColor: black,
    borderWidth: 1
  });
  
  page.drawText('Estimate Work :', {
    x: margin + tableWidth * 0.7 + 10,
    y: contentY - 50,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  // Add reason text
  if (tr?.reasonForReturn) {
    page.drawText(tr.reasonForReturn, {
      x: margin + 170,
      y: contentY - 15,
      size: 10,
      font: helvetica,
      color: black
    });
  } else {
    page.drawText('Maintenance & calibration', {
      x: margin + 170,
      y: contentY - 15,
      size: 10,
      font: helvetica,
      color: black
    });
  }
  
  // Findings section
  const findingsY = contentY - 35;
  page.drawRectangle({
    x: margin,
    y: findingsY - 35,
    width: tableWidth, 
    height: 35,
    borderColor: black,
    borderWidth: 1
  });
  
  page.drawText('Findings :', {
    x: margin + 10,
    y: findingsY - 15,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  // Add findings content
  if (tr?.findings) {
    // Truncate if too long
    const maxLength = 80;
    const findings = tr.findings.length > maxLength ? 
      tr.findings.substring(0, maxLength) + '...' : 
      tr.findings;
    
    page.drawText(findings, {
      x: margin + 80,
      y: findingsY - 15,
      size: 9,
      font: helvetica,
      color: black
    });
  }
  
  // Before / After photos section
  const photosY = findingsY - 35;
  
  // Draw container for photos
  page.drawRectangle({
    x: margin,
    y: photosY - 180,
    width: tableWidth,
    height: 180,
    borderColor: black,
    borderWidth: 1
  });
  
  // Add photos side by side
  // First photo (Before)
  try {
    if (tr?.beforePhotoUrl) {
      const beforePhotoPath = tr.beforePhotoUrl.startsWith('/') 
        ? tr.beforePhotoUrl.substring(1) 
        : tr.beforePhotoUrl;
      
      const fullBeforePhotoPath = path.join(process.cwd(), 'public', beforePhotoPath);
      
      if (fs.existsSync(fullBeforePhotoPath)) {
        const beforePhotoBytes = fs.readFileSync(fullBeforePhotoPath);
        
        let beforeImage;
        if (fullBeforePhotoPath.toLowerCase().endsWith('.png')) {
          beforeImage = await pdfDoc.embedPng(beforePhotoBytes);
        } else if (fullBeforePhotoPath.toLowerCase().endsWith('.jpg') || 
                   fullBeforePhotoPath.toLowerCase().endsWith('.jpeg')) {
          beforeImage = await pdfDoc.embedJpg(beforePhotoBytes);
        }
        
        if (beforeImage) {
          const maxWidth = tableWidth / 2 - 20;
          const maxHeight = 170;
          
          const beforeDims = beforeImage.scale(
            Math.min(maxWidth / beforeImage.width, maxHeight / beforeImage.height)
          );
          
          const xCenter = margin + maxWidth / 2 - beforeDims.width / 2;
          const yCenter = photosY - 90 - (beforeDims.height / 2);
          
          page.drawImage(beforeImage, {
            x: xCenter,
            y: yCenter,
            width: beforeDims.width,
            height: beforeDims.height
          });
        }
      }
    }
  } catch (err) {
    console.error('Error embedding before photo:', err);
  }
  
  // Second photo (After)
  try {
    if (tr?.afterPhotoUrl) {
      const afterPhotoPath = tr.afterPhotoUrl.startsWith('/') 
        ? tr.afterPhotoUrl.substring(1) 
        : tr.afterPhotoUrl;
      
      const fullAfterPhotoPath = path.join(process.cwd(), 'public', afterPhotoPath);
      
      if (fs.existsSync(fullAfterPhotoPath)) {
        const afterPhotoBytes = fs.readFileSync(fullAfterPhotoPath);
        
        let afterImage;
        if (fullAfterPhotoPath.toLowerCase().endsWith('.png')) {
          afterImage = await pdfDoc.embedPng(afterPhotoBytes);
        } else if (fullAfterPhotoPath.toLowerCase().endsWith('.jpg') || 
                   fullAfterPhotoPath.toLowerCase().endsWith('.jpeg')) {
          afterImage = await pdfDoc.embedJpg(afterPhotoBytes);
        }
        
        if (afterImage) {
          const maxWidth = tableWidth / 2 - 20;
          const maxHeight = 170;
          
          const afterDims = afterImage.scale(
            Math.min(maxWidth / afterImage.width, maxHeight / afterImage.height)
          );
          
          const xCenter = margin + tableWidth / 2 + maxWidth / 2 - afterDims.width / 2;
          const yCenter = photosY - 90 - (afterDims.height / 2);
          
          page.drawImage(afterImage, {
            x: xCenter,
            y: yCenter,
            width: afterDims.width,
            height: afterDims.height
          });
        }
      }
    }
  } catch (err) {
    console.error('Error embedding after photo:', err);
  }
  
  // Parts list table
  const partsY = photosY - 180;
  
  // Table headers
  const partsTableHeaders = [
    { text: 'NO', width: tableWidth * 0.08 },
    { text: 'Nama Unit', width: tableWidth * 0.22 },
    { text: 'DESCRIPTION', width: tableWidth * 0.3 },
    { text: 'QTY', width: tableWidth * 0.1 },
    { text: 'UNIT PRICE', width: tableWidth * 0.15 },
    { text: 'TOTAL PRICE', width: tableWidth * 0.15 }
  ];
  
  // Draw header row
  let headerX = margin;
  page.drawRectangle({
    x: margin,
    y: partsY - 25,
    width: tableWidth,
    height: 25,
    borderColor: black,
    borderWidth: 1
  });
  
  partsTableHeaders.forEach(header => {
    // Draw vertical divider
    if (headerX > margin) {
      page.drawLine({
        start: { x: headerX, y: partsY },
        end: { x: headerX, y: partsY - 25 },
        thickness: 1,
        color: black
      });
    }
    
    // Draw header text
    page.drawText(header.text, {
      x: headerX + header.width / 2 - header.text.length * 2.5,
      y: partsY - 15,
      size: 10,
      font: helveticaBold,
      color: black
    });
    
    headerX += header.width;
  });
  
  // Draw 5 rows for parts
  const rowHeight = 25;
  const partsList = tr?.partsList || [];
  
  for (let i = 0; i < 5; i++) {
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
    
    // Draw vertical dividers
    let colX = margin;
    partsTableHeaders.forEach(header => {
      colX += header.width;
      if (colX < margin + tableWidth) {
        page.drawLine({
          start: { x: colX, y: rowY },
          end: { x: colX, y: rowY - rowHeight },
          thickness: 1,
          color: black
        });
      }
    });
    
    // Fill in data if available
    if (i < partsList.length) {
      const part = partsList[i];
      
      // NO column
      page.drawText((i + 1).toString() + '.', {
        x: margin + 10,
        y: rowY - rowHeight + 10,
        size: 9,
        font: helvetica,
        color: black
      });
      
      // Nama Unit column
      const namaUnit = part.namaUnit || '';
      page.drawText(namaUnit.length > 20 ? namaUnit.substring(0, 17) + '...' : namaUnit, {
        x: margin + partsTableHeaders[0].width + 5,
        y: rowY - rowHeight + 10,
        size: 9,
        font: helvetica,
        color: black
      });
      
      // Description column
      const description = part.description || '';
      page.drawText(description.length > 25 ? description.substring(0, 22) + '...' : description, {
        x: margin + partsTableHeaders[0].width + partsTableHeaders[1].width + 5,
        y: rowY - rowHeight + 10,
        size: 9,
        font: helvetica,
        color: black
      });
      
      // QTY column
      page.drawText(part.quantity.toString(), {
        x: margin + partsTableHeaders[0].width + partsTableHeaders[1].width + 
           partsTableHeaders[2].width + 15,
        y: rowY - rowHeight + 10,
        size: 9,
        font: helvetica,
        color: black
      });
      
      // Unit Price column
      const unitPrice = part.unitPrice ? part.unitPrice.toLocaleString('id-ID') : '';
      page.drawText(unitPrice, {
        x: margin + partsTableHeaders[0].width + partsTableHeaders[1].width + 
           partsTableHeaders[2].width + partsTableHeaders[3].width + 5,
        y: rowY - rowHeight + 10,
        size: 9,
        font: helvetica,
        color: black
      });
      
      // We're not calculating total price in this example
    }
  }
  
  // Terms and conditions section
  const termsY = partsY - 25 - (5 * rowHeight);
  
  page.drawText('Terms and Condition :', {
    x: margin,
    y: termsY - 20,
    size: 10,
    font: helveticaBold,
    color: black
  });
  
  // Standard terms
  const terms = [
    '1. Price above exclude PPN 11 %',
    '2. Delivery                       : 2 weeks',
    '3. Payment                      :',
    '4. Franco                        :'
  ];
  
  terms.forEach((term, i) => {
    page.drawText(term, {
      x: margin,
      y: termsY - 40 - (i * 15),
      size: 9,
      font: helvetica,
      color: black
    });
  });
  
  // Footer text
  page.drawText('We hope above are acceptable for your needs. We look further for your order.', {
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
  
  // Signature section
  page.drawText('Gerhan M.Y', {
    x: margin,
    y: termsY - 180,
    size: 9,
    font: helveticaBold,
    color: black
  });
  
  page.drawText('Director', {
    x: margin,
    y: termsY - 195,
    size: 9,
    font: helvetica,
    color: black
  });
  
  // Create PDF
  const pdfBytes = await pdfDoc.save();
  
  return { pdfDoc, reportNumber: csrNumber };
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

function splitTextToLines(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + word + ' ';
    const testWidth = font.widthOfTextAtSize(testLine, size);

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