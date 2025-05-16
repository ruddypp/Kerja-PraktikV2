import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ItemStatus, RequestStatus, ActivityType } from "@prisma/client";
import { logMaintenanceActivity } from "@/lib/activity-logger";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const itemId = searchParams.get("itemId");
    
    // Build the where clause
    let where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (itemId) {
      where.itemSerial = itemId;
    }
    
    // Fetch all maintenance requests with details - select hanya field yang dibutuhkan
    const maintenances = await prisma.maintenance.findMany({
      where,
      select: {
        id: true,
        itemSerial: true,
        status: true,
        startDate: true,
        endDate: true,
        item: {
          select: {
            serialNumber: true,
            name: true,
            partNumber: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            // Tidak perlu email di halaman listing
            // email: true,
          },
        },
        // Hanya butuh ID dari report untuk mengetahui apakah ada report
        serviceReport: {
          select: {
            id: true,
          }
        },
        technicalReport: {
          select: {
            id: true,
          }
        },
        // Tidak perlu status logs di halaman listing
        // statusLogs: {
        //   include: {
        //     changedBy: {
        //       select: {
        //         name: true,
        //       },
        //     },
        //   },
        //   orderBy: {
        //     createdAt: "desc",
        //   },
        // },
      },
      orderBy: {
        createdAt: "desc",
      },
      // Batasi jumlah data yang diambil untuk meningkatkan performa
      take: 50,
    });
    
    // Buat response dengan header cache
    const response = NextResponse.json(maintenances);
    
    // Set header Cache-Control untuk memungkinkan browser caching
    // max-age=60 berarti cache akan valid selama 60 detik
    response.headers.set('Cache-Control', 'public, max-age=60');
    
    return response;
  } catch (error) {
    console.error("Error fetching maintenance data:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data" },
      { status: 500 }
    );
  }
}

// Add POST method to allow admins to create maintenance
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
    }
    
    const { itemSerial } = await req.json();
    
    if (!itemSerial) {
      return NextResponse.json(
        { error: "Serial number barang diperlukan" },
        { status: 400 }
      );
    }
    
    // Check if the item exists and is available
    const item = await prisma.item.findUnique({
      where: { serialNumber: itemSerial },
      select: {
        serialNumber: true,
        status: true
      }
    });
    
    if (!item) {
      return NextResponse.json(
        { error: "Barang tidak ditemukan" },
        { status: 404 }
      );
    }
    
    if (item.status !== ItemStatus.AVAILABLE) {
      return NextResponse.json(
        { error: "Barang tidak tersedia untuk maintenance" },
        { status: 400 }
      );
    }
    
    // Create new maintenance in a transaction
    const maintenance = await prisma.$transaction(async (prisma) => {
      // Update item status to IN_MAINTENANCE
      await prisma.item.update({
        where: { serialNumber: itemSerial },
        data: { status: ItemStatus.IN_MAINTENANCE },
      });
      
      // Create new maintenance record
      const newMaintenance = await prisma.maintenance.create({
        data: {
          itemSerial,
          userId: user.id,
          status: RequestStatus.PENDING,
          startDate: new Date(),
        },
      });
      
      // Log status change
      await prisma.maintenanceStatusLog.create({
        data: {
          maintenanceId: newMaintenance.id,
          status: RequestStatus.PENDING,
          userId: user.id,
          notes: "Maintenance dimulai oleh admin",
        },
      });
      
      // Record in item history
      await prisma.itemHistory.create({
        data: {
          itemSerial,
          action: "MAINTAINED",
          details: "Barang mulai dalam proses maintenance (dibuat oleh admin)",
          relatedId: newMaintenance.id,
          startDate: new Date(),
        },
      });
      
      return newMaintenance;
    });
    
    // Log activity after transaction completes
    await logMaintenanceActivity(
      user.id,
      ActivityType.MAINTENANCE_CREATED,
      maintenance.id,
      itemSerial,
      `Admin memulai maintenance untuk barang ${itemSerial}`
    );
    
    // Ensure cache is invalidated
    const response = NextResponse.json(maintenance);
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    
    return response;
  } catch (error) {
    console.error("Error creating maintenance:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat maintenance" },
      { status: 500 }
    );
  }
} 