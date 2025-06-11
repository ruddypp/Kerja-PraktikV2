import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, isManager } from '@/lib/auth';
import { ItemStatus, RequestStatus } from '@prisma/client';

// GET dashboard data for manager
export async function GET(request: NextRequest) {
  try {
    // Check if user is authorized (should be manager)
    const user = await getUserFromRequest(request);
    if (!user || !isManager(user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get inventory statistics
    const totalItems = await prisma.item.count();
    const availableItems = await prisma.item.count({
      where: { status: ItemStatus.AVAILABLE }
    });
    
    // We'll count rented items as "in use" since there's no IN_USE in the schema
    const inUseItems = await prisma.item.count({
      where: { status: ItemStatus.RENTED }
    });
    
    const inCalibrationItems = await prisma.item.count({
      where: { status: ItemStatus.IN_CALIBRATION }
    });
    const inRentalItems = await prisma.item.count({
      where: { status: ItemStatus.RENTED }
    });
    const inMaintenanceItems = await prisma.item.count({
      where: { status: ItemStatus.IN_MAINTENANCE }
    });

    // Get pending requests
    const pendingRequests = await prisma.rental.count({
      where: { status: RequestStatus.PENDING }
    });

    // Get pending calibrations
    const pendingCalibrations = await prisma.calibration.count({
      where: { status: RequestStatus.PENDING }
    });

    // Get pending rentals
    const pendingRentals = await prisma.rental.count({
      where: { status: RequestStatus.PENDING }
    });

    // Get upcoming calibrations (due in the next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const upcomingCalibrations = await prisma.calibration.count({
      where: {
        validUntil: {
          lte: thirtyDaysFromNow,
          gte: new Date()
        }
      }
    });

    // Get overdue rentals
    const overdueRentals = await prisma.rental.count({
      where: {
        endDate: {
          lt: new Date()
        },
        status: RequestStatus.APPROVED
      }
    });

    // Get total vendors
    const totalVendors = await prisma.vendor.count({
      where: { isDeleted: false }
    });

    // Get total users
    const totalUsers = await prisma.user.count();

    // Return all dashboard data
    const dashboardData = {
      totalItems,
      availableItems,
      inUseItems,
      inCalibrationItems,
      inRentalItems,
      inMaintenanceItems,
      pendingRequests,
      pendingCalibrations,
      pendingRentals,
      upcomingCalibrations,
      overdueRentals,
      totalVendors,
      totalUsers
    };

    // Set cache headers
    const response = NextResponse.json(dashboardData);
    response.headers.set('Cache-Control', 'private, max-age=30');
    
    return response;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
} 
