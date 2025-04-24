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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
    }
    
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
    
    // Generate HTML untuk laporan sesuai dengan jenisnya
    let htmlContent = "";
    let filename = "";
    
    if (reportType === "csr") {
      htmlContent = generateCSRHtml(maintenance);
      filename = `CSR_${maintenance.serviceReport?.reportNumber || maintenanceId}.pdf`;
    } else {
      htmlContent = generateTechnicalReportHtml(maintenance);
      filename = `Technical_Report_${maintenance.technicalReport?.csrNumber || maintenanceId}.pdf`;
    }
    
    // Generate PDF
    const browser = await puppeteer.launch({ headless: true });
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
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat laporan" },
      { status: 500 }
    );
  }
}

// Generate HTML untuk Customer Service Report
function generateCSRHtml(maintenance: any) {
  const sr = maintenance.serviceReport;
  
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
          padding: 10px;
        }
        .header {
          border-bottom: 2px solid #006400;
          padding-bottom: 10px;
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
          margin: 20px 0 10px;
        }
        .subtitle {
          text-align: center;
          font-size: 14px;
          margin-bottom: 20px;
        }
        .form-group {
          display: flex;
          margin-bottom: 5px;
        }
        .form-label {
          width: 150px;
          font-weight: bold;
        }
        .form-value {
          flex: 1;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        th, td {
          border: 1px solid #000;
          padding: 5px;
        }
        .section {
          margin: 20px 0;
          border: 1px solid #000;
          padding: 10px;
        }
        .section-title {
          font-weight: bold;
          margin-bottom: 10px;
        }
        .checkbox {
          margin-right: 10px;
        }
        .checkbox-group {
          display: flex;
          flex-wrap: wrap;
        }
        .checkbox-item {
          width: 25%;
          margin-bottom: 5px;
        }
        .signature-area {
          display: flex;
          justify-content: space-between;
          margin-top: 50px;
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
          <img src="https://example.com/logo.png" alt="Logo" class="logo">
          <div class="company-info">
            <h2>PT. PARAMATA BARAYA INTERNATIONAL</h2>
            <p>Kompleks Palem Ganda Asri 1 Blok A3 No. 8<br>
            Karang Tengah, Ciledug – Tangerang 15157<br>
            Telp. 62-21 730 6424, 733 1150 / Faks. 62-21 733 1150<br>
            Email : paramata@lndosat.net.id</p>
          </div>
        </div>
        
        <div class="title">Customer Service Report</div>
        <div class="subtitle">No. : ${sr?.reportNumber || "-"} /CSR-PBI/ ${new Date().toLocaleDateString('en-US', { month: 'roman' })} /${new Date().getFullYear()}</div>
        
        <div class="form-group">
          <div class="form-label">Customer</div>
          <div class="form-value">: ${sr?.customer || maintenance.item.customer?.name || "-"}</div>
          <div class="form-label" style="margin-left: 50px;">Serial Number</div>
          <div class="form-value">: ${sr?.serialNumber || maintenance.itemSerial}</div>
        </div>
        
        <div class="form-group">
          <div class="form-label">Location</div>
          <div class="form-value">: ${sr?.location || "-"}</div>
          <div class="form-label" style="margin-left: 50px;">Date In</div>
          <div class="form-value">: ${formatDate(sr?.dateIn || maintenance.startDate)}</div>
        </div>
        
        <div class="form-group">
          <div class="form-label">Brand</div>
          <div class="form-value">: ${sr?.brand || "-"}</div>
        </div>
        
        <div class="form-group">
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
        
        <table>
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
        
        <div class="section-title">Parts List</div>
        <table>
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
function generateTechnicalReportHtml(maintenance: any) {
  const tr = maintenance.technicalReport;
  
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
        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #000;
          padding-bottom: 10px;
        }
        .logo-container {
          width: 25%;
          display: flex;
          align-items: center;
        }
        .logo {
          width: 60px;
          height: auto;
        }
        .address {
          font-size: 10px;
          width: 25%;
        }
        .title {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          margin: 15px 0;
          width: 100%;
          background-color: #000;
          color: #fff;
          padding: 5px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        th, td {
          border: 1px solid #000;
          padding: 5px;
        }
        .section {
          margin: 15px 0;
        }
        .section-title {
          font-weight: bold;
          background-color: #f0f0f0;
          padding: 5px;
        }
        .image-container {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
        }
        .image-box {
          width: 48%;
          text-align: center;
        }
        .image {
          width: 100%;
          height: auto;
          border: 1px solid #000;
        }
        .terms {
          margin-top: 20px;
          font-size: 10px;
        }
        .signature {
          margin-top: 30px;
          text-align: left;
        }
        .signature-line {
          border-top: 1px solid #000;
          margin-top: 30px;
          width: 200px;
          padding-top: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-container">
            <img src="https://example.com/logo.png" alt="Logo" class="logo">
          </div>
          <div class="address">
            <p>Komplek Palem Ganda<br>
            Asri 1 Blok A3 No.8,<br>
            Karang Tengah<br>
            Ciledug – Tangerang 15157<br>
            021-7306424</p>
          </div>
          <div>
            <table>
              <tr>
                <td>CSR NO :</td>
                <td>${tr?.csrNumber || "-"}</td>
              </tr>
              <tr>
                <td>DATE :</td>
                <td>${formatDate(tr?.dateReport || new Date())}</td>
              </tr>
            </table>
          </div>
        </div>
        
        <div class="title">Customer Service Report</div>
        
        <table>
          <tr>
            <td width="30%">DELIVERY TO :<br>To :</td>
            <td>${tr?.deliveryTo || "-"}</td>
            <td width="15%">QUO No:</td>
            <td>${tr?.quoNumber || "-"}</td>
          </tr>
          <tr>
            <td colspan="2"></td>
            <td colspan="2">Technical Support<br><br>${tr?.techSupport || "-"}</td>
          </tr>
        </table>
        
        <table>
          <tr>
            <td width="30%">Reason For Return :</td>
            <td>Date In :</td>
            <td>Estimate Work :</td>
          </tr>
          <tr>
            <td>${tr?.reasonForReturn || "-"}</td>
            <td>${formatDate(tr?.dateIn || maintenance.startDate)}</td>
            <td>${tr?.estimateWork || "-"}</td>
          </tr>
        </table>
        
        <div class="section">
          <div class="section-title">Findings :</div>
          <p>${tr?.findings || "-"}</p>
        </div>
        
        <div class="image-container">
          <div class="image-box">
            ${tr?.beforePhotoUrl ? 
              `<img src="${tr.beforePhotoUrl}" alt="Before" class="image">` : 
              `<div class="image" style="height:200px;display:flex;align-items:center;justify-content:center;">No Before Image</div>`
            }
          </div>
          <div class="image-box">
            ${tr?.afterPhotoUrl ? 
              `<img src="${tr.afterPhotoUrl}" alt="After" class="image">` : 
              `<div class="image" style="height:200px;display:flex;align-items:center;justify-content:center;">No After Image</div>`
            }
          </div>
        </div>
        
        <table>
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
            ${tr?.partsList?.map((part: any) => `
              <tr>
                <td>${part.itemNumber}</td>
                <td>${part.namaUnit || "-"}</td>
                <td>${part.description || "-"}</td>
                <td>${part.quantity}</td>
                <td>${part.unitPrice?.toLocaleString('id-ID') || "-"}</td>
                <td>${part.totalPrice?.toLocaleString('id-ID') || "-"}</td>
              </tr>
            `).join("") || 
            `<tr><td colspan="6" style="text-align: center;">No parts</td></tr>`}
          </tbody>
        </table>
        
        <div class="terms">
          ${tr?.termsConditions || `
          <p><strong>Terms and Condition :</strong></p>
          <ol>
            <li>Price above exclude PPN 11 %</li>
            <li>Delivery : 2 weeks</li>
            <li>Payment :</li>
            <li>Franco :</li>
          </ol>
          <p>We hope above are acceptable for your needs. We look further for your order.</p>
          <p>Best regards<br>PT. PARAMATA BARAYA INTERNASIONAL</p>
          `}
        </div>
        
        <div class="signature">
          <p>Gerhan M.Y<br>Director</p>
          <div class="signature-line"></div>
        </div>
      </div>
    </body>
    </html>
  `;
} 