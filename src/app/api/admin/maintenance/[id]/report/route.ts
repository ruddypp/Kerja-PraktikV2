import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import puppeteer from "puppeteer";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// Helper untuk memformat tanggal
const formatDate = (date: Date | null | undefined) => {
  if (!date) return "";
  return format(new Date(date), "dd MMMM yyyy", { locale: id });
};

// Helper for formatting month in roman numerals
const getRomanMonth = (date: Date) => {
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return romanMonths[date.getMonth()];
};

// Helper to build complete image URL
const getFullImageUrl = (relativePath: string | null | undefined, host: string): string | null => {
  if (!relativePath) return null;
  
  // If path already has http or https, return it as is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // Otherwise, build complete URL based on server origin
  return `${host}${relativePath}`;
};

// Generate PDF using puppeteer
async function generatePDF(html: string, options: any = {}) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html);
  const buffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "0.5cm",
      right: "0.5cm",
      bottom: "0.5cm",
      left: "0.5cm",
    },
    ...options,
  });
  await browser.close();
  return buffer;
}

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
    }
    
    // In Next.js 15, params is a Promise and needs to be awaited
    const params = await context.params;
    const maintenanceId = params.id;
    
    const reportType = req.nextUrl.searchParams.get("type") || "csr"; // Default ke CSR
    
    // Ambil data maintenance
    const maintenance = await prisma.maintenance.findUnique({
      where: { id: maintenanceId },
      include: {
        item: true,
        user: {
          select: {
            name: true,
          },
        },
        serviceReport: {
          include: {
            parts: true,
          },
        },
        technicalReport: {
          include: {
            partsList: true,
          },
        },
      },
    });
    
    if (!maintenance) {
      return NextResponse.json(
        { error: "Maintenance tidak ditemukan" },
        { status: 404 }
      );
    }
    
    // Pastikan service report atau technical report ada
    if (reportType === "csr" && !maintenance.serviceReport) {
      return NextResponse.json(
        { error: "Service Report belum dibuat" },
        { status: 400 }
      );
    }
    
    if (reportType === "technical" && !maintenance.technicalReport) {
      return NextResponse.json(
        { error: "Technical Report belum dibuat" },
        { status: 400 }
      );
    }
    
    // Extract host from request URL for building absolute image URLs
    const requestUrl = new URL(req.url);
    const host = `${requestUrl.protocol}//${requestUrl.host}`;
    
    // Generate HTML untuk laporan sesuai dengan jenisnya
    let htmlContent = "";
    let filename = "";
    
    if (reportType === "csr") {
      htmlContent = generateCSRHtml(maintenance, host);
      filename = `CSR_${maintenance.serviceReport?.reportNumber || maintenanceId}.pdf`;
    } else {
      htmlContent = generateTechnicalReportHtml(maintenance, host);
      filename = `Technical_Report_${maintenance.technicalReport?.csrNumber || maintenanceId}.pdf`;
    }
    
    // Generate PDF
    const pdf = await generatePDF(htmlContent);
    
    // Kembalikan PDF sebagai respons
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error saat membuat laporan:", error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : "Unknown error";
      
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat laporan", details: errorMessage },
      { status: 500 }
    );
  }
}

// Generate HTML untuk Customer Service Report
function generateCSRHtml(maintenance: any, host: string) {
  const sr = maintenance.serviceReport;
  const currentDate = new Date();
  const romanMonth = getRomanMonth(currentDate);
  const currentYear = currentDate.getFullYear();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Customer Service Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          font-size: 12px;
        }
        .container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          border: 2px solid #006400;
          padding: 0;
          box-sizing: border-box;
        }
        .inner-container {
          border: 1px solid #006400;
          margin: 5px;
          padding: 0;
        }
        .header {
          border-bottom: 2px solid #006400;
          padding: 10px;
          display: flex;
          align-items: center;
        }
        .logo {
          width: 80px;
          height: auto;
        }
        .company-info {
          margin-left: 20px;
        }
        .title {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          margin: 20px 0 5px;
        }
        .subtitle {
          text-align: center;
          font-size: 14px;
          margin-bottom: 20px;
        }
        .form-row {
          display: flex;
          margin: 5px 10px;
        }
        .form-label {
          width: 100px;
          font-weight: normal;
        }
        .form-value {
          flex: 1;
        }
        .form-right {
          margin-left: auto;
          display: flex;
        }
        .form-right .form-label {
          text-align: left;
        }
        .section {
          margin: 5px 10px;
          border: 1px solid #000;
          padding: 5px;
        }
        .section-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
        table {
          width: calc(100% - 20px);
          border-collapse: collapse;
          margin: 10px;
        }
        th, td {
          border: 1px solid #000;
          padding: 5px;
          text-align: left;
        }
        .checkbox-table td {
          vertical-align: top;
          padding: 5px;
        }
        .checkbox-group {
          display: flex;
          flex-direction: column;
        }
        .checkbox-item {
          margin-bottom: 5px;
        }
        .signature-area {
          display: flex;
          justify-content: space-between;
          margin: 50px 10px 20px;
        }
        .signature-box {
          text-align: center;
          width: 45%;
        }
        .signature-line {
          border-top: 1px solid #000;
          margin-top: 50px;
          padding-top: 5px;
        }
        .parts-list {
          width: 100%;
          border-collapse: collapse;
        }
        .parts-list th, .parts-list td {
          border: 1px solid #000;
          padding: 5px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${host}/public/logo1.png" alt="Logo" class="logo">
          <div class="company-info">
            <h2 style="margin: 0; font-size: 14px;">PT. PARAMATA BARAYA INTERNATIONAL</h2>
            <p style="margin: 0; font-size: 11px;">
              Kompleks Palem Ganda Asri 1 Blok A3 No. 8<br>
              Karang Tengah, Ciledug – Tangerang 15157<br>
              Telp. 62-21 730 6424, 733 1150 / Faks. 62-21 733 1150<br>
              Email : paramata@lndosat.net.id
            </p>
          </div>
        </div>
        
        <div class="title">Customer Service Report</div>
        <div class="subtitle">No. : ${sr?.reportNumber || "-"} /CSR-PBI/${romanMonth}/${currentYear}</div>
        
        <div class="form-row">
          <div class="form-label">Customer</div>
          <div class="form-value">: ${sr?.customer || maintenance.item.customer?.name || "-"}</div>
          <div class="form-right">
            <div class="form-label">Serial Number</div>
            <div class="form-value">: ${sr?.serialNumber || maintenance.itemSerial}</div>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-label">Location</div>
          <div class="form-value">: ${sr?.location || "-"}</div>
          <div class="form-right">
            <div class="form-label">Date In</div>
            <div class="form-value">: ${formatDate(sr?.dateIn || maintenance.startDate)}</div>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-label">Brand</div>
          <div class="form-value">: ${sr?.brand || "-"}</div>
        </div>
        
        <div class="form-row">
          <div class="form-label">Model</div>
          <div class="form-value">: ${sr?.model || "-"}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Reason For Return :</div>
          <p>${sr?.reasonForReturn || "-"}</p>
        </div>
        
        <div class="section">
          <div class="section-title">Findings :</div>
          <p>${sr?.findings || "-"}</p>
        </div>
        
        <div class="section">
          <div class="section-title">Action :</div>
          <p>${sr?.action || "-"}</p>
        </div>
        
        <table class="checkbox-table" style="margin-bottom: 0;">
          <tr>
            <td style="width: 25%;">
              <div class="section-title">Sensor Replacement</div>
              <div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.sensorCO ? "checked" : ""} disabled> CO
                </div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.sensorH2S ? "checked" : ""} disabled> H2S
                </div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.sensorO2 ? "checked" : ""} disabled> O2
                </div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.sensorLEL ? "checked" : ""} disabled> LEL
                </div>
              </div>
            </td>
            <td style="width: 25%;">
              <div class="section-title">Lamp Service</div>
              <div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.lampClean ? "checked" : ""} disabled> Clean
                </div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.lampReplace ? "checked" : ""} disabled> Replace
                </div>
              </div>
            </td>
            <td style="width: 25%;">
              <div class="section-title">Pump Service</div>
              <div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.pumpTested ? "checked" : ""} disabled> Tested
                </div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.pumpRebuilt ? "checked" : ""} disabled> Rebuilt
                </div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.pumpReplaced ? "checked" : ""} disabled> Replaced
                </div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.pumpClean ? "checked" : ""} disabled> Clean
                </div>
              </div>
            </td>
            <td style="width: 25%;">
              <div class="section-title">Instrument Service</div>
              <div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.instrumentCalibrate ? "checked" : ""} disabled> Calibrate
                </div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.instrumentUpgrade ? "checked" : ""} disabled> Upgrade
                </div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.instrumentCharge ? "checked" : ""} disabled> Charge
                </div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.instrumentClean ? "checked" : ""} disabled> Clean
                </div>
                <div style="margin-bottom: 3px;">
                  <input type="checkbox" ${sr?.instrumentSensorAssembly ? "checked" : ""} disabled> Sensor Assembly
                </div>
              </div>
            </td>
          </tr>
        </table>
        
        <div style="text-align: center; margin: 0 10px; border-top: 1px solid #000;">
          <div style="font-weight: bold;">Parts List</div>
        </div>
        
        <table class="parts-list">
          <thead>
            <tr>
              <th style="width: 10%;">Item</th>
              <th style="width: 45%;">Description</th>
              <th style="width: 22.5%;">SN/PN/OLD</th>
              <th style="width: 22.5%;">SN/PN/NEW</th>
            </tr>
          </thead>
          <tbody>
            ${sr?.parts?.map((part: any, index: number) => `
              <tr>
                <td>${part.itemNumber || index + 1}</td>
                <td>${part.description || "-"}</td>
                <td>${part.snPnOld || "-"}</td>
                <td>${part.snPnNew || "-"}</td>
              </tr>
            `).join("") || `
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            `}
          </tbody>
        </table>
        
        <div class="signature-area">
          <div class="signature-box">
            <div class="signature-line">Services/Maintenance by,</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Mengetahui,</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate HTML untuk Technical Report
function generateTechnicalReportHtml(maintenance: any, host: string) {
  const tr = maintenance.technicalReport;
  
  const beforeImageUrl = getFullImageUrl(tr?.beforePhotoUrl, host);
  const afterImageUrl = getFullImageUrl(tr?.afterPhotoUrl, host);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Technical Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          font-size: 12px;
        }
        .container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }
        .title {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          margin: 0;
          background-color: #000;
          color: #fff;
          padding: 5px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
        }
        th, td {
          border: 1px solid #000;
          padding: 5px;
          vertical-align: top;
        }
        .header-table td {
          padding: 5px;
          vertical-align: top;
        }
        .company-logo {
          max-width: 80px;
          height: auto;
          margin-bottom: 5px;
        }
        .company-info {
          font-size: 10px;
          line-height: 1.2;
        }
        .section-title {
          font-weight: bold;
        }
        .findings-section {
          border: 1px solid #000;
          padding: 5px;
          margin: 0;
        }
        .image-container {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
        }
        .image-box {
          width: 48%;
          border: 1px solid #000;
          text-align: center;
          padding: 0;
        }
        .image {
          max-width: 100%;
          height: auto;
          max-height: 300px;
          object-fit: contain;
        }
        .no-image {
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          font-style: italic;
          text-align: center;
        }
        .parts-table th {
          background-color: #f5f5f5;
          text-align: center;
          font-weight: bold;
        }
        .parts-table td {
          text-align: center;
        }
        .terms {
          margin-top: 20px;
          font-size: 11px;
          line-height: 1.3;
        }
        .terms ol {
          margin: 5px 0;
          padding-left: 20px;
        }
        .signature {
          margin-top: 30px;
          font-size: 11px;
        }
        .signature-line {
          margin-top: 30px;
          width: 150px;
          border-top: 1px solid #000;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="title">Customer Service Report</div>
        
        <table class="header-table">
          <tr>
            <td style="width: 35%; border: 1px solid #000;">
              <div style="display: flex; flex-direction: column; align-items: center;">
                <img src="${host}/logo1.png" alt="Logo" class="company-logo">
                <div class="company-info">
                  <p style="margin: 0;">Komplek Palem Ganda<br>Asri 1 Blok A3 No.8,<br>Karang Tengah<br>Ciledug – Tangerang 15157<br>021-7306424</p>
                </div>
              </div>
            </td>
            <td style="width: 35%; border: 1px solid #000; vertical-align: top;">
              <div>
                <strong>DELIVERY TO :</strong><br>
                <strong>To :</strong> ${tr?.deliveryTo || "PT. Archroma Indonesia"}
              </div>
              <div style="margin-top: 10px;">
                <strong>QUO No:</strong> ${tr?.quoNumber || ""}
              </div>
            </td>
            <td style="width: 30%; border: 1px solid #000; vertical-align: top;">
              <div>
                <strong>CSR NO :</strong> ${tr?.csrNumber || "000/CSR-PBI/XX/24"}
              </div>
              <div>
                <strong>DATE :</strong> ${formatDate(tr?.dateReport || new Date())}
              </div>
              <div style="margin-top: 20px; text-align: center;">
                <strong>Technical Support</strong>
                <p style="margin-top: 20px;">${tr?.techSupport || "Henry Sutiawan"}</p>
              </div>
            </td>
          </tr>
        </table>

        <table style="margin-top: 0;">
          <tr>
            <td style="width: 50%; border: 1px solid #000;">
              <strong>Reason For Return :</strong><br>
              ${tr?.reasonForReturn || "Maintenance & calibration"}
            </td>
            <td style="width: 25%; border: 1px solid #000;">
              <strong>Date In :</strong><br>
              ${formatDate(tr?.dateIn || maintenance.startDate) || "10 Sept 2024"}
            </td>
            <td style="width: 25%; border: 1px solid #000;">
              <strong>Estimate Work :</strong><br>
              ${tr?.estimateWork || ""}
            </td>
          </tr>
        </table>

        <div class="findings-section">
          <div class="section-title">Findings :</div>
          <p style="margin: 5px 0;">${tr?.findings || "1. QRAE 3 SN: M02A053250, Unit perlu kalibrasi ulang, Sensor CO Fail saat dikalibrasi ulang."}</p>
        </div>

        <div class="image-container">
          ${beforeImageUrl ? 
            `<img src="${beforeImageUrl}" alt="Before" style="width: 48%; border: 1px solid #000; object-fit: contain; max-height: 300px;">` : 
            `<div style="width: 48%; border: 1px solid #000; height: 300px; display: flex; align-items: center; justify-content: center;"><img src="${host}/next.svg" alt="No Before Image" style="max-width: 50%; max-height: 50%;"></div>`
          }
          ${afterImageUrl ? 
            `<img src="${afterImageUrl}" alt="After" style="width: 48%; border: 1px solid #000; object-fit: contain; max-height: 300px;">` : 
            `<div style="width: 48%; border: 1px solid #000; height: 300px; display: flex; align-items: center; justify-content: center;"><img src="${host}/next.svg" alt="No After Image" style="max-width: 50%; max-height: 50%;"></div>`
          }
        </div>

        <table class="parts-table">
          <thead>
            <tr>
              <th style="width: 8%;">NO</th>
              <th style="width: 22%;">Nama Unit</th>
              <th style="width: 30%;">DESCRIPTION</th>
              <th style="width: 10%;">QTY</th>
              <th style="width: 15%;">UNIT PRICE</th>
              <th style="width: 15%;">TOTAL PRICE</th>
            </tr>
          </thead>
          <tbody>
            ${tr?.partsList?.map((part: any, index: number) => `
              <tr>
                <td>${part.itemNumber || index + 1}</td>
                <td>${part.namaUnit || "QRAE 3"}</td>
                <td>${part.description || "Kalibrasi"}</td>
                <td>${part.quantity || "1"}</td>
                <td>${part.unitPrice ? part.unitPrice.toLocaleString('id-ID') : ""}</td>
                <td>${part.totalPrice ? part.totalPrice.toLocaleString('id-ID') : ""}</td>
              </tr>
            `).join("") || `
              <tr>
                <td>1.</td>
                <td>QRAE 3</td>
                <td>Kalibrasi</td>
                <td>1</td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>2.</td>
                <td></td>
                <td>Sensor CO</td>
                <td>1</td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            `}
          </tbody>
        </table>

        <div class="terms">
          <p><strong>Terms and Condition :</strong></p>
          <ol>
            <li>Price above exclude PPN 11 %</li>
            <li>Delivery : 2 weeks</li>
            <li>Payment :</li>
            <li>Franco :</li>
          </ol>
          <p>We hope above are acceptable for your needs. We look further for your order.</p>
          <p><strong>Best regards</strong><br/>PT. PARAMATA BARAYA INTERNASIONAL</p>
        </div>

        <div class="signature">
          <p style="margin-top: 20px;"><strong>Gerhan M.Y</strong><br/>Director</p>
          <div class="signature-line"></div>
        </div>
      </div>
    </body>
    </html>
  `;
}