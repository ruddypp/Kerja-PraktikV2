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
    
    // Fetch all maintenance requests with details
    const maintenances = await prisma.maintenance.findMany({
      where,
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
      orderBy: {
        createdAt: "desc",
      },
    });
    
    return NextResponse.json(maintenances);
  } catch (error) {
    console.error("Error fetching maintenance data:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data" },
      { status: 500 }
    );
  }
} 