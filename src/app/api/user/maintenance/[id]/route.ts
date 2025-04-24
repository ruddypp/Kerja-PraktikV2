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
    
    // Extract maintenanceId from URL path as a fallback
    let maintenanceId: string;
    try {
      // First attempt using context.params
      maintenanceId = context.params.id;
    } catch (err) {
      // Fallback: Extract from URL path if context.params fails
      const urlParts = req.url.split('/');
      maintenanceId = urlParts[urlParts.length - 1]; // Get ID from path
    }
    
    // Ambil informasi maintenance
    const maintenance = await prisma.maintenance.findUnique({
      where: { id: maintenanceId },
      include: {
        item: true,
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
    
    // Cek apakah user memiliki akses ke maintenance ini
    if (maintenance.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Tidak memiliki akses ke data maintenance ini" },
        { status: 403 }
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