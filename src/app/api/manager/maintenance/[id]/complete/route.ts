import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, isManager } from "@/lib/auth";
import { ItemStatus, RequestStatus, ActivityType } from "@prisma/client";
import { logMaintenanceActivity } from "@/lib/activity-logger";
import { generateCSRNumber, generateTCRNumber } from "@/lib/report-number-generator";

interface ServiceReportPartData {
  itemNumber: number;
  description: string;
  snPnOld?: string;
  snPnNew?: string;
}

interface TechnicalReportPartData {
  itemNumber: number;
  namaUnit?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the authenticated user
    const user = await getUserFromRequest(req);
    if (!user || !isManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get form data and validate
    let maintenanceId;
    try {
      // Properly await params in Next.js 15
      const { id } = await params;
      maintenanceId = id;
    } catch (err) {
      // Fallback method if context.params fails
      // Extract from URL path
      const urlParts = req.url.split('/');
      maintenanceId = urlParts[urlParts.length - 2]; // Get ID from path
    }
    
    const {
      serviceReportData,
      technicalReportData,
      serviceReportParts = [],
      technicalReportParts = [],
    } = await req.json();
    
    console.log("Received data for maintenance completion by manager:");
    console.log("Technical Report Data:", JSON.stringify(technicalReportData, null, 2));
    console.log("Technical Report Parts:", technicalReportParts.length);
    
    // Cek apakah maintenance ada
    const maintenance = await prisma.maintenance.findUnique({
      where: { id: maintenanceId },
      include: {
        item: true,
      },
    });
    
    if (!maintenance) {
      return NextResponse.json(
        { error: "Maintenance tidak ditemukan" },
        { status: 404 }
      );
    }
    
    if (maintenance.status === RequestStatus.COMPLETED) {
      return NextResponse.json(
        { error: "Maintenance sudah selesai" },
        { status: 400 }
      );
    }
    
    // Get the current month and year for report numbering
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    // Generate report numbers
    let csrNumber = '';
    let tcrNumber = '';
    
    // Selesaikan maintenance dan tambahkan laporan
    const updatedMaintenance = await prisma.$transaction(async (prisma) => {
      // Generate CSR Number - Get count for current month/year
      const csrCount = await prisma.serviceReport.count({
        where: {
          createdAt: {
            gte: new Date(currentYear, currentMonth - 1, 1),
            lt: new Date(currentYear, currentMonth, 1)
          }
        }
      });
      
      // Generate TCR Number - Get count for current month/year
      const tcrCount = await prisma.technicalReport.count({
        where: {
          createdAt: {
            gte: new Date(currentYear, currentMonth - 1, 1),
            lt: new Date(currentYear, currentMonth, 1)
          }
        }
      });
      
      // Generate sequential numbers - add 1 to current count
      csrNumber = generateCSRNumber(csrCount + 1, today);
      tcrNumber = generateTCRNumber(tcrCount + 1, today);
      
      // 1. Update maintenance status dan tanggal selesai
      const updatedMaintenance = await prisma.maintenance.update({
        where: { id: maintenanceId },
        data: {
          status: RequestStatus.COMPLETED,
          endDate: new Date(),
        },
      });
      
      // 2. Buat ServiceReport with auto-generated report number
      if (serviceReportData) {
        const serviceReport = await prisma.serviceReport.create({
          data: {
            maintenanceId,
            reportNumber: csrNumber, // Use auto-generated CSR number
            customer: serviceReportData.customer,
            location: serviceReportData.location,
            brand: serviceReportData.brand,
            model: serviceReportData.model,
            serialNumber: serviceReportData.serialNumber,
            dateIn: serviceReportData.dateIn ? new Date(serviceReportData.dateIn) : null,
            reasonForReturn: serviceReportData.reasonForReturn,
            findings: serviceReportData.findings,
            action: serviceReportData.action,
            
            // Service checklist
            sensorCO: serviceReportData.sensorCO || false,
            sensorH2S: serviceReportData.sensorH2S || false,
            sensorO2: serviceReportData.sensorO2 || false,
            sensorLEL: serviceReportData.sensorLEL || false,
            lampClean: serviceReportData.lampClean || false,
            lampReplace: serviceReportData.lampReplace || false,
            pumpTested: serviceReportData.pumpTested || false,
            pumpRebuilt: serviceReportData.pumpRebuilt || false,
            pumpReplaced: serviceReportData.pumpReplaced || false,
            pumpClean: serviceReportData.pumpClean || false,
            instrumentCalibrate: serviceReportData.instrumentCalibrate || false,
            instrumentUpgrade: serviceReportData.instrumentUpgrade || false,
            instrumentCharge: serviceReportData.instrumentCharge || false,
            instrumentClean: serviceReportData.instrumentClean || false,
            instrumentSensorAssembly: serviceReportData.instrumentSensorAssembly || false,
          },
        });
        
        // Buat parts jika ada
        if (serviceReportParts.length > 0) {
          for (const part of serviceReportParts) {
            await prisma.serviceReportPart.create({
              data: {
                serviceReportId: serviceReport.id,
                itemNumber: part.itemNumber,
                description: part.description,
                snPnOld: part.snPnOld,
                snPnNew: part.snPnNew,
              },
            });
          }
        }
      }
      
      // 3. Buat TechnicalReport with auto-generated report number
      if (technicalReportData) {
        console.log("Creating technical report with photo URLs:", {
          beforePhotoUrl: technicalReportData.beforePhotoUrl,
          afterPhotoUrl: technicalReportData.afterPhotoUrl
        });
        
        const technicalReport = await prisma.technicalReport.create({
          data: {
            maintenanceId,
            csrNumber: tcrNumber, // Use auto-generated TCR number
            deliveryTo: technicalReportData.deliveryTo,
            dateReport: technicalReportData.dateReport ? new Date(technicalReportData.dateReport) : null,
            techSupport: technicalReportData.techSupport,
            dateIn: technicalReportData.dateIn ? new Date(technicalReportData.dateIn) : null,
            estimateWork: technicalReportData.estimateWork,
            reasonForReturn: technicalReportData.reasonForReturn,
            findings: technicalReportData.findings,
            beforePhotoUrl: technicalReportData.beforePhotoUrl || null,
            afterPhotoUrl: technicalReportData.afterPhotoUrl || null,
          },
        });
        
        console.log("Created technical report:", technicalReport.id);
        
        // Buat parts jika ada
        if (technicalReportParts.length > 0) {
          console.log(`Creating ${technicalReportParts.length} technical report parts`);
          for (const part of technicalReportParts) {
            await prisma.technicalReportPart.create({
              data: {
                technicalReportId: technicalReport.id,
                itemNumber: part.itemNumber,
                namaUnit: part.namaUnit,
                description: part.description,
                quantity: part.quantity,
                unitPrice: part.unitPrice,
                totalPrice: part.totalPrice,
              },
            });
          }
        }
      }
      
      // 4. Update status item menjadi available lagi
      await prisma.item.update({
        where: { serialNumber: maintenance.itemSerial },
        data: { status: ItemStatus.AVAILABLE },
      });
      
      // 5. Catat log status maintenance
      await prisma.maintenanceStatusLog.create({
        data: {
          maintenanceId,
          status: RequestStatus.COMPLETED,
          userId: user.id,
          notes: `Maintenance selesai (oleh manager). CSR No: ${csrNumber}, TCR No: ${tcrNumber}`,
        },
      });
      
      // 6. Update history item - Fix the update query
      // Get the history items first
      const historyItems = await prisma.itemHistory.findMany({
        where: {
          itemSerial: maintenance.itemSerial,
          relatedId: maintenanceId,
          endDate: null, // Belum ada end date (ongoing)
        },
        select: { id: true },
      });
      
      // Update each history item individually
      for (const historyItem of historyItems) {
        await prisma.itemHistory.update({
          where: {
            id: historyItem.id // Now correctly using a string id
          },
          data: {
            endDate: new Date(),
            details: `Maintenance selesai: ${serviceReportData?.findings || "Maintenance selesai"} (oleh manager). CSR No: ${csrNumber}, TCR No: ${tcrNumber}`,
          },
        });
      }
      
      // 7. Catat di activity log
      await logMaintenanceActivity(
        user.id,
        ActivityType.MAINTENANCE_UPDATED, 
        maintenanceId,
        maintenance.itemSerial,
        `Maintenance selesai untuk ${maintenance.item.name} (${maintenance.itemSerial}) oleh manager. CSR No: ${csrNumber}, TCR No: ${tcrNumber}`
      );
      
      return updatedMaintenance;
    });
    
    return NextResponse.json({
      ...updatedMaintenance,
      csrNumber,
      tcrNumber
    });
  } catch (error) {
    console.error("Error saat menyelesaikan maintenance:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyelesaikan maintenance" },
      { status: 500 }
    );
  }
} 