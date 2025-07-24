import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { ItemStatus, RequestStatus, ActivityType } from "@prisma/client";
import { logMaintenanceActivity } from "@/lib/activity-logger";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
    }
    
    // Ambil semua maintenance tanpa filter userId
    // Optimasi dengan select hanya kolom yang diperlukan
    const maintenances = await prisma.maintenance.findMany({
      where: {
        userId: user.id, // Filter berdasarkan user yang sedang login
      },
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
          },
        },
        // Hanya ambil id dari reports
        serviceReport: {
          select: {
            id: true,
          },
        },
        technicalReport: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      // Batasi hasil untuk meningkatkan performa
      take: 50,
    });
    
    // Buat response dengan header no-cache untuk memastikan data selalu fresh
    const response = NextResponse.json(maintenances);
    
    // Set header Cache-Control untuk mencegah caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error("Error saat mengambil data maintenance:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data" },
      { status: 500 }
    );
  }
}

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
        name: true,
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
    
    // Buat maintenance baru
    const maintenance = await prisma.$transaction(async (prisma) => {
      // Update status item menjadi IN_MAINTENANCE
      await prisma.item.update({
        where: { serialNumber: itemSerial },
        data: { status: ItemStatus.IN_MAINTENANCE },
      });
      
      // Buat record maintenance baru
      const newMaintenance = await prisma.maintenance.create({
        data: {
          itemSerial,
          userId: user.id,
          status: RequestStatus.PENDING,
          startDate: new Date(),
        },
      });
      
      // Catat log status
      await prisma.maintenanceStatusLog.create({
        data: {
          maintenanceId: newMaintenance.id,
          status: RequestStatus.PENDING,
          userId: user.id,
          notes: "Maintenance dimulai",
        },
      });
      
      // Catat di history item
      await prisma.itemHistory.create({
        data: {
          itemSerial,
          action: "MAINTAINED",
          details: "Barang mulai dalam proses maintenance",
          relatedId: newMaintenance.id,
          startDate: new Date(),
        },
      });
      
      return newMaintenance;
    });
    
    // Catat di activity log setelah transaksi selesai
    await logMaintenanceActivity(
      user.id,
      ActivityType.MAINTENANCE_CREATED,
      maintenance.id,
      itemSerial,
      `Memulai maintenance untuk barang ${itemSerial}`
    );
    
    // Hapus cache untuk memastikan data di halaman maintenance sudah diperbarui
    const response = NextResponse.json(maintenance);
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    
    return response;
  } catch (error) {
    console.error("Error saat membuat maintenance:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat maintenance" },
      { status: 500 }
    );
  }
} 