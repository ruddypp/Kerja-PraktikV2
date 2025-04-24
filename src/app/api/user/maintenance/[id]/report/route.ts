import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
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

// Helper untuk membangun URL gambar lengkap
const getFullImageUrl = (relativePath: string | null | undefined, host: string): string | null => {
  if (!relativePath) return null;
  
  // Jika path sudah memiliki http atau https, kembalikan apa adanya
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // Jika tidak, build URL lengkap berdasarkan origin server
  return `${host}${relativePath}`;
};

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
    }
    
    // Extract maintenanceId from URL path as a fallback
    let maintenanceId: string;
    try {
      // First attempt using context.params
      maintenanceId = context.params.id;
    } catch (err) {
      // Fallback: Extract from URL path if context.params fails
      const urlParts = req.url.split('/');
      maintenanceId = urlParts[urlParts.length - 2]; // Get ID from path
    }
    
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
    
    // Cek apakah user memiliki akses ke maintenance ini
    if (maintenance.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Tidak memiliki akses ke data maintenance ini" },
        { status: 403 }
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
      htmlContent = generateCSRHtml(maintenance);
      filename = `CSR_${maintenance.serviceReport?.reportNumber || maintenanceId}.pdf`;
    } else {
      htmlContent = generateTechnicalReportHtml(maintenance, host);
      filename = `Technical_Report_${maintenance.technicalReport?.csrNumber || maintenanceId}.pdf`;
    }
    
    // Generate PDF
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    // Set ukuran halaman ke A4
    await page.setViewport({ width: 1240, height: 1754 });
    await page.emulateMediaType("screen");
    
    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "1cm",
        right: "1cm",
        bottom: "1cm",
        left: "1cm",
      },
    });
    
    await browser.close();
    
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
function generateCSRHtml(maintenance: any) {
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
          margin-right: 20px;
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
          margin: 0 10px;
        }
        .form-group {
          display: flex;
          margin-bottom: 10px;
          width: 50%;
        }
        .form-label {
          width: 120px;
          font-weight: bold;
        }
        .form-value {
          flex: 1;
        }
        .section {
          margin: 10px;
          border: 1px solid #000;
          padding: 10px;
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
        .checkbox-table {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="data:image/png;base64,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" alt="Logo" class="logo">
          <div>
            <h2 style="margin: 0; font-size: 14px;">PT. PARAMATA BARAYA INTERNATIONAL</h2>
            <p style="margin: 0; font-size: 11px;">
            Kompleks Palem Ganda Asri 1 Blok A3 No. 8<br>
            Karang Tengah, Ciledug – Tangerang 15157<br>
            Telp. 62-21 730 6424, 733 1150 / Faks. 62-21 733 1150<br>
            Email : paramata@lndosat.net.id</p>
          </div>
        </div>
        
        <div class="title">Customer Service Report</div>
        <div class="subtitle">No. : ${sr?.reportNumber || "-"} /CSR-PBI/${romanMonth}/${currentYear}</div>
        
        <div class="form-row">
          <div class="form-group">
            <div class="form-label">Customer</div>
            <div class="form-value">: ${sr?.customer || maintenance.item.customer?.name || "-"}</div>
          </div>
          <div class="form-group">
            <div class="form-label">Serial Number</div>
            <div class="form-value">: ${sr?.serialNumber || maintenance.itemSerial}</div>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <div class="form-label">Location</div>
            <div class="form-value">: ${sr?.location || "-"}</div>
          </div>
          <div class="form-group">
            <div class="form-label">Date In</div>
            <div class="form-value">: ${formatDate(sr?.dateIn || maintenance.startDate)}</div>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <div class="form-label">Brand</div>
            <div class="form-value">: ${sr?.brand || "-"}</div>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <div class="form-label">Model</div>
            <div class="form-value">: ${sr?.model || "-"}</div>
          </div>
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
        
        <table class="checkbox-table">
          <tr>
            <td>
              <div class="section-title">Sensor Replacement</div>
              <div class="checkbox-group">
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.sensorCO ? "checked" : ""} disabled> CO
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.sensorH2S ? "checked" : ""} disabled> H2S
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.sensorO2 ? "checked" : ""} disabled> O2
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.sensorLEL ? "checked" : ""} disabled> LEL
                </div>
              </div>
            </td>
            <td>
              <div class="section-title">Lamp Service</div>
              <div class="checkbox-group">
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.lampClean ? "checked" : ""} disabled> Clean
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.lampReplace ? "checked" : ""} disabled> Replace
                </div>
              </div>
            </td>
            <td>
              <div class="section-title">Pump Service</div>
              <div class="checkbox-group">
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.pumpTested ? "checked" : ""} disabled> Tested
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.pumpRebuilt ? "checked" : ""} disabled> Rebuilt
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.pumpReplaced ? "checked" : ""} disabled> Replaced
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.pumpClean ? "checked" : ""} disabled> Clean
                </div>
              </div>
            </td>
            <td>
              <div class="section-title">Instrument Service</div>
              <div class="checkbox-group">
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.instrumentCalibrate ? "checked" : ""} disabled> Calibrate
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.instrumentUpgrade ? "checked" : ""} disabled> Upgrade
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.instrumentCharge ? "checked" : ""} disabled> Charge
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.instrumentClean ? "checked" : ""} disabled> Clean
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" ${sr?.instrumentSensorAssembly ? "checked" : ""} disabled> Sensor Assembly
                </div>
              </div>
            </td>
          </tr>
        </table>
        
        <div style="margin-left: 10px; margin-right: 10px;">
          <div class="section-title">Parts List</div>
          <table style="width: 100%; margin: 5px 0;">
            <thead>
              <tr>
                <th>Item</th>
                <th>Description</th>
                <th>SN/PN/OLD</th>
                <th>SN/PN/NEW</th>
              </tr>
            </thead>
            <tbody>
              ${sr?.parts?.map((part: any) => `
                <tr>
                  <td>${part.itemNumber}</td>
                  <td>${part.description}</td>
                  <td>${part.snPnOld || "-"}</td>
                  <td>${part.snPnNew || "-"}</td>
                </tr>
              `).join("") || 
              `<tr><td colspan="4" style="text-align: center;">No parts</td></tr>`}
            </tbody>
          </table>
        </div>
        
        <div class="signature-area">
          <div class="signature-box">
            <div>Services/Maintenance by,</div>
            <div class="signature-line">${maintenance.user.name}</div>
          </div>
          <div class="signature-box">
            <div>Mengetahui,</div>
            <div class="signature-line"></div>
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
  
  console.log('Before image URL:', tr?.beforePhotoUrl, '->', beforeImageUrl);
  console.log('After image URL:', tr?.afterPhotoUrl, '->', afterImageUrl);
  
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
          border: 2px solid #006400;
          padding: 0;
        }
        .header {
          display: flex;
          align-items: flex-start;
          border-bottom: 2px solid #006400;
          padding: 10px;
        }
        .logo-container {
          width: 25%;
          padding: 5px;
          text-align: center;
        }
        .logo {
          width: 80px;
          height: auto;
        }
        .address {
          width: 35%;
          font-size: 10px;
          line-height: 1.3;
          padding: 5px;
        }
        .csr-info {
          width: 40%;
          padding: 5px;
        }
        .csr-table {
          width: 100%;
          border-collapse: collapse;
        }
        .csr-table td {
          border: 1px solid #000;
          padding: 4px;
          font-size: 11px;
        }
        .title-bar {
          background-color: #006400;
          color: #fff;
          padding: 8px;
          text-align: center;
          font-weight: bold;
          margin: 15px 0;
          font-size: 14px;
        }
        .delivery-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        .delivery-table td {
          border: 1px solid #000;
          padding: 5px;
          vertical-align: top;
        }
        .reason-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .reason-table td {
          border: 1px solid #000;
          padding: 5px;
          vertical-align: top;
        }
        .findings {
          border: 1px solid #000;
          padding: 5px;
          margin-bottom: 15px;
        }
        .findings p {
          margin: 5px 0;
        }
        .images-container {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        .image-container {
          width: 48%;
          border: 1px solid #000;
          text-align: center;
          padding: 5px;
          height: 220px;
          position: relative;
        }
        .image-caption {
          background-color: #006400;
          color: white;
          padding: 3px 0;
          font-weight: bold;
          text-align: center;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
        }
        .image-content {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          width: 100%;
          padding-top: 25px; /* Space for caption */
          box-sizing: border-box;
        }
        img.device-image {
          max-width: 95%;
          max-height: 180px;
          object-fit: contain;
        }
        .no-image {
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          font-style: italic;
        }
        .parts-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .parts-table th, .parts-table td {
          border: 1px solid #000;
          padding: 5px;
          text-align: center;
        }
        .parts-table th {
          background-color: #e9f5e9;
        }
        .terms {
          font-size: 10px;
          line-height: 1.3;
          margin-bottom: 20px;
        }
        .signature {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
        }
        .signature-box {
          width: 45%;
          text-align: center;
        }
        .signature p {
          margin: 3px 0;
        }
        .signature-line {
          border-top: 1px solid #000;
          width: 150px;
          margin: 50px auto 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-container">
            <img src="data:image/png;base64,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" alt="Logo" class="logo">
          </div>
          <div class="address">
            Komplek Palem Ganda<br>
            Asri 1 Blok A3 No.8,<br>
            Karang Tengah<br>
            Ciledug – Tangerang 15157<br>
            021-7306424
          </div>
          <div class="csr-info">
            <table class="csr-table">
              <tr>
                <td>CSR NO :</td>
                <td>${tr?.csrNumber || "000/CSR-PBI/XX/24"}</td>
              </tr>
              <tr>
                <td>DATE :</td>
                <td>${formatDate(tr?.dateReport || new Date())}</td>
              </tr>
            </table>
          </div>
        </div>
        
        <div class="title-bar">TECHNICAL REPORT</div>
        
        <table class="delivery-table">
          <tr>
            <td width="35%">DELIVERY TO :<br>To :</td>
            <td>${tr?.deliveryTo || "-"}</td>
            <td width="15%">QUO No:</td>
            <td>${tr?.quoNumber || "-"}</td>
          </tr>
          <tr>
            <td colspan="2"></td>
            <td colspan="2">Technical Support<br><br>${tr?.techSupport || "-"}</td>
          </tr>
        </table>
        
        <table class="reason-table">
          <tr>
            <td width="33%">Reason For Return :</td>
            <td width="33%">Date In :</td>
            <td width="33%">Estimate Work :</td>
          </tr>
          <tr>
            <td>${tr?.reasonForReturn || "Maintenance & calibration"}</td>
            <td>${formatDate(tr?.dateIn || maintenance.startDate)}</td>
            <td>${tr?.estimateWork || "-"}</td>
          </tr>
        </table>
        
        <div class="findings">
          <strong>Findings :</strong>
          <p>${tr?.findings || "QRAE 3 SN: M02A053250, Unit perlu kalibrasi ulang, Sensor CO Fail saat dikalibrasi ulang."}</p>
        </div>
        
        <div class="images-container">
          <div class="image-container">
            <div class="image-caption">BEFORE</div>
            <div class="image-content">
              ${beforeImageUrl ? 
                `<img src="${beforeImageUrl}" alt="Before" class="device-image">` : 
                `<div class="no-image">Foto sebelum tidak tersedia</div>`
              }
            </div>
          </div>
          <div class="image-container">
            <div class="image-caption">AFTER</div>
            <div class="image-content">
              ${afterImageUrl ? 
                `<img src="${afterImageUrl}" alt="After" class="device-image">` : 
                `<div class="no-image">Foto sesudah tidak tersedia</div>`
              }
            </div>
          </div>
        </div>
        
        <table class="parts-table">
          <thead>
            <tr>
              <th>NO</th>
              <th>Nama Unit</th>
              <th>DESCRIPTION</th>
              <th>QTY</th>
              <th>UNIT PRICE</th>
              <th>TOTAL PRICE</th>
            </tr>
          </thead>
          <tbody>
            ${tr?.partsList?.map((part: any, index: number) => `
              <tr>
                <td>${part.itemNumber || index + 1}</td>
                <td>${part.namaUnit || "QRAE 3"}</td>
                <td>${part.description || "Kalibrasi"}</td>
                <td>${part.quantity}</td>
                <td>${part.unitPrice ? part.unitPrice.toLocaleString('id-ID') : "-"}</td>
                <td>${part.totalPrice ? part.totalPrice.toLocaleString('id-ID') : "-"}</td>
              </tr>
            `).join("") || 
            `<tr>
              <td>1</td>
              <td>QRAE 3</td>
              <td>Kalibrasi</td>
              <td>1</td>
              <td>-</td>
              <td>-</td>
            </tr>
            <tr>
              <td>2</td>
              <td>QRAE 3</td>
              <td>Sensor CO</td>
              <td>1</td>
              <td>-</td>
              <td>-</td>
            </tr>`}
          </tbody>
        </table>
        
        <div class="terms">
          <strong>Terms and Condition :</strong>
          <ol style="margin-top: 5px; padding-left: 25px;">
            <li>Price above exclude PPN 11 %</li>
            <li>Delivery : 2 weeks</li>
            <li>Payment : 30 days</li>
            <li>Franco : Jabodetabek</li>
          </ol>
          <p style="margin: 5px 0;">We hope above are acceptable for your needs. We look further for your order.</p>
          <p style="margin: 5px 0;">Best regards<br>PT. PARAMATA BARAYA INTERNASIONAL</p>
        </div>
        
        <div class="signature">
          <div class="signature-box">
            <p>Issued By</p>
            <div class="signature-line"></div>
            <p>${tr?.techSupport || "Technical Support"}</p>
          </div>
          <div class="signature-box">
            <p>Approved By</p>
            <div class="signature-line"></div>
            <p>Gerhan M.Y</p>
            <p>Director</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
} 