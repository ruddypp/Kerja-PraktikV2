import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user || user.role !== "ADMIN") {
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