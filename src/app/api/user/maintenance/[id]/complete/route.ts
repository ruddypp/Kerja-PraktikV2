import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { ItemStatus, RequestStatus } from "@prisma/client";

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
      // In Next.js 15, params is a Promise and needs to be awaited
      const params = await context.params;
      maintenanceId = params.id;
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
    
    // Cek apakah maintenance ada dan dimiliki oleh user yang login
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
    
    if (maintenance.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Tidak memiliki akses ke data maintenance ini" },
        { status: 403 }
      );
    }
    
    if (maintenance.status === RequestStatus.COMPLETED) {
      return NextResponse.json(
        { error: "Maintenance sudah selesai" },
        { status: 400 }
      );
    }
    
    // Selesaikan maintenance dan tambahkan laporan
    const updatedMaintenance = await prisma.$transaction(async (prisma) => {
      // 1. Update maintenance status dan tanggal selesai
      const updatedMaintenance = await prisma.maintenance.update({
        where: { id: maintenanceId },
        data: {
          status: RequestStatus.COMPLETED,
          endDate: new Date(),
        },
      });
      
      // 2. Buat ServiceReport
      if (serviceReportData) {
        const serviceReport = await prisma.serviceReport.create({
          data: {
            maintenanceId,
            reportNumber: serviceReportData.reportNumber,
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
      
      // 3. Buat TechnicalReport
      if (technicalReportData) {
        const technicalReport = await prisma.technicalReport.create({
          data: {
            maintenanceId,
            csrNumber: technicalReportData.csrNumber,
            deliveryTo: technicalReportData.deliveryTo,
            quoNumber: technicalReportData.quoNumber,
            dateReport: technicalReportData.dateReport ? new Date(technicalReportData.dateReport) : null,
            techSupport: technicalReportData.techSupport,
            dateIn: technicalReportData.dateIn ? new Date(technicalReportData.dateIn) : null,
            estimateWork: technicalReportData.estimateWork,
            reasonForReturn: technicalReportData.reasonForReturn,
            findings: technicalReportData.findings,
            beforePhotoUrl: technicalReportData.beforePhotoUrl,
            afterPhotoUrl: technicalReportData.afterPhotoUrl,
            termsConditions: technicalReportData.termsConditions,
          },
        });
        
        // Buat parts jika ada
        if (technicalReportParts.length > 0) {
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
          notes: "Maintenance selesai",
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
            details: `Maintenance selesai: ${serviceReportData?.findings || "Maintenance selesai"}`,
          },
        });
      }
      
      // 7. Catat di activity log
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          itemSerial: maintenance.itemSerial,
          action: "MAINTENANCE_COMPLETED",
          details: `Maintenance selesai untuk ${maintenance.item.name} (${maintenance.itemSerial})`,
        },
      });
      
      return updatedMaintenance;
    });
    
    return NextResponse.json(updatedMaintenance);
  } catch (error) {
    console.error("Error saat menyelesaikan maintenance:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyelesaikan maintenance" },
      { status: 500 }
    );
  }
} 