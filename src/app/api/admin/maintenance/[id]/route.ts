import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
    }
    
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Hanya admin yang diizinkan mengakses" }, { status: 403 });
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
      maintenanceId = urlParts[urlParts.length - 1];
    }
    
    // Ambil informasi maintenance
    const maintenance = await prisma.maintenance.findUnique({
      where: { id: maintenanceId },
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
      return NextResponse.json(
        { error: "Maintenance tidak ditemukan" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(maintenance);
  } catch (error) {
    console.error("Error saat mengambil data maintenance:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data maintenance" },
      { status: 500 }
    );
  }
} 