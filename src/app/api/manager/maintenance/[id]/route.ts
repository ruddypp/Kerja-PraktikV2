import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { ActivityType } from '@prisma/client';

// GET detailed maintenance information by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
    }
    
    // Await params untuk Next.js 15
    const paramsObject = await params;
    const id = paramsObject.id;
    
    if (!id) {
      return NextResponse.json({ error: "ID maintenance diperlukan" }, { status: 400 });
    }
    
    // Get complete maintenance data with all details
    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: {
        item: true,
        user: true,
        serviceReport: true,
        technicalReport: true,
        statusLogs: {
          include: {
            changedBy: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
    
    if (!maintenance) {
      return NextResponse.json({ error: "Maintenance tidak ditemukan" }, { status: 404 });
    }
    
    return NextResponse.json(maintenance);
  } catch (error) {
    console.error("Error fetching maintenance detail:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data maintenance" },
      { status: 500 }
    );
  }
}

// DELETE maintenance by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
    }
    
    // Await params untuk Next.js 15
    const paramsObject = await params;
    const id = paramsObject.id;
    
    if (!id) {
      return NextResponse.json({ error: "ID maintenance diperlukan" }, { status: 400 });
    }
    
    // Cek apakah maintenance ada
    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: {
        item: true,
        statusLogs: true,
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
      return NextResponse.json({ error: "Maintenance tidak ditemukan" }, { status: 404 });
    }
    
    const itemSerial = maintenance.itemSerial;
    
    // Hapus semua data terkait maintenance dalam transaksi
    await prisma.$transaction(async (prisma) => {
      // 1. Hapus status logs
      if (maintenance.statusLogs.length > 0) {
        await prisma.maintenanceStatusLog.deleteMany({
          where: { maintenanceId: id }
        });
      }
      
      // 2. Hapus service report parts jika ada
      if (maintenance.serviceReport?.parts.length > 0) {
        await prisma.serviceReportPart.deleteMany({
          where: { serviceReportId: maintenance.serviceReport.id }
        });
      }
      
      // 3. Hapus service report jika ada
      if (maintenance.serviceReport) {
        await prisma.serviceReport.delete({
          where: { maintenanceId: id }
        });
      }
      
      // 4. Hapus technical report parts jika ada
      if (maintenance.technicalReport?.partsList.length > 0) {
        await prisma.technicalReportPart.deleteMany({
          where: { technicalReportId: maintenance.technicalReport.id }
        });
      }
      
      // 5. Hapus technical report jika ada
      if (maintenance.technicalReport) {
        await prisma.technicalReport.delete({
          where: { maintenanceId: id }
        });
      }
      
      // 6. Hapus maintenance
      await prisma.maintenance.delete({
        where: { id }
      });
      
      // 7. Update status item menjadi AVAILABLE jika saat ini IN_MAINTENANCE
      if (maintenance.item?.status === "IN_MAINTENANCE") {
        await prisma.item.update({
          where: { serialNumber: itemSerial },
          data: { status: "AVAILABLE" }
        });
      }
      
      // 8. Catat di history item
      await prisma.itemHistory.create({
        data: {
          itemSerial: itemSerial,
          action: "MAINTENANCE_DELETED",
          details: `Maintenance dihapus oleh manager (${user.name})`,
          startDate: new Date(),
        },
      });
      
      // 9. Catat di activity log
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          itemSerial: itemSerial,
          action: "DELETED_MAINTENANCE",
          details: `Maintenance untuk ${maintenance.item.name} (${itemSerial}) dihapus oleh manager`,
          type: ActivityType.MAINTENANCE_DELETED
        },
      });
    });
    
    // Buat response dengan header no-cache
    const response = NextResponse.json({ 
      success: true,
      message: "Maintenance berhasil dihapus"
    });
    
    // Set header Cache-Control untuk memastikan data tidak di-cache
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    
    return response;
  } catch (error) {
    console.error("Error deleting maintenance:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus data maintenance" },
      { status: 500 }
    );
  }
} 