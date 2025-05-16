import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
    }
    
    // Need to await params in Next.js route handlers
    const { id: maintenanceId } = await params;
    
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
    
    return NextResponse.json(maintenance);
  } catch (error) {
    console.error("Error saat mengambil data maintenance:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data maintenance" },
      { status: 500 }
    );
  }
} 