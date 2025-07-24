import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { RequestStatus } from '@prisma/client';

// GET untuk mendapatkan statistik kalibrasi untuk dashboard
export async function GET(request: Request) {
  try {
    // Verifikasi user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Tentukan filter berdasarkan role
    const isUserAdmin = isAdmin(user);
    const where: Record<string, any> = {};
    
    // Jika bukan admin, hanya lihat kalibrasi milik user tersebut
    if (!isUserAdmin) {
      where.userId = user.id;
    }
    
    // Hitung total kalibrasi
    const totalCalibrations = await prisma.calibration.count({ where });
    
    // Hitung kalibrasi berdasarkan status
    const pendingCalibrations = await prisma.calibration.count({
      where: {
        ...where,
        status: RequestStatus.PENDING
      }
    });
    
    const completedCalibrations = await prisma.calibration.count({
      where: {
        ...where,
        status: RequestStatus.COMPLETED
      }
    });
    
    const cancelledCalibrations = await prisma.calibration.count({
      where: {
        ...where,
        status: RequestStatus.CANCELLED
      }
    });
    
    // Ambil data kalibrasi terbaru (5 terakhir)
    const recentCalibrations = await prisma.calibration.findMany({
      where,
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    // Fetch customer data separately for each calibration
    for (const calibration of recentCalibrations) {
      if (calibration.customerId) {
        calibration.customer = await prisma.customer.findUnique({
          where: { id: calibration.customerId }
        });
      }
    }
    
    // Hitung kalibrasi per bulan untuk tahun ini
    const currentYear = new Date().getFullYear();
    const monthlyData = [];
    
    for (let month = 0; month < 12; month++) {
      const startDate = new Date(currentYear, month, 1);
      const endDate = new Date(currentYear, month + 1, 0);
      
      const count = await prisma.calibration.count({
        where: {
          ...where,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      
      monthlyData.push({
        month: month + 1,
        count
      });
    }
    
    return NextResponse.json({
      total: totalCalibrations,
      pending: pendingCalibrations,
      completed: completedCalibrations,
      cancelled: cancelledCalibrations,
      recentCalibrations,
      monthlyData,
      isAdmin: isUserAdmin
    });
    
  } catch (error) {
    console.error('Error fetching calibration dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
} 