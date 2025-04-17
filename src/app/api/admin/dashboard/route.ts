import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ItemStatus, RequestStatus, CalibrationStatus, RentalStatus } from '@prisma/client';
import { addDays } from 'date-fns';

// Interface for the dashboard response
interface DashboardResponse {
  totalItems: number;
  availableItems: number;
  inUseItems: number;
  inCalibrationItems: number;
  inRentalItems: number;
  inMaintenanceItems: number;
  pendingRequests: number;
  pendingCalibrations: number;
  pendingRentals: number;
  upcomingCalibrations: number;
  overdueRentals: number;
  recentActivities: any[];
  notifications: any[];
}

// GET dashboard statistics
export async function GET(req: NextRequest) {
  try {
    // Use Promise.allSettled to fetch all data in parallel
    // This ensures that a failure in one query doesn't affect others
    const [
      totalItemsResult,
      availableItemsResult,
      inUseItemsResult,
      inCalibrationItemsResult,
      inRentalItemsResult,
      inMaintenanceItemsResult,
      pendingRequestsResult,
      pendingCalibrationsResult,
      pendingRentalsResult,
      upcomingCalibrationsResult,
      overdueRentalsResult,
      recentActivitiesResult,
      notificationsResult
    ] = await Promise.allSettled([
      // Query the database for items count
      prisma.item.count(),
      
      // Get counts for different item statuses
      prisma.item.count({
        where: { status: ItemStatus.AVAILABLE }
      }),
      
      prisma.item.count({
        where: { status: ItemStatus.IN_USE }
      }),
      
      prisma.item.count({
        where: { status: ItemStatus.IN_CALIBRATION }
      }),
      
      prisma.item.count({
        where: { status: ItemStatus.IN_RENTAL }
      }),
      
      prisma.item.count({
        where: { status: ItemStatus.IN_MAINTENANCE }
      }),
      
      // Get pending requests count
      prisma.request.count({
        where: { status: RequestStatus.PENDING }
      }),
      
      // Get pending calibrations count
      prisma.calibrationRequest.count({
        where: { status: CalibrationStatus.PENDING }
      }),
      
      // Get pending rentals count
      prisma.rentalRequest.count({
        where: { status: RentalStatus.PENDING }
      }),
      
      // Get upcoming calibrations (within next 7 days)
      prisma.calibrationRequest.count({
        where: {
          validUntil: {
            lte: addDays(new Date(), 7),
            gte: new Date()
          },
          status: CalibrationStatus.COMPLETED
        }
      }),
      
      // Get overdue rentals
      prisma.rentalRequest.count({
        where: {
          endDate: {
            lt: new Date()
          },
          status: RentalStatus.ACTIVE,
          actualReturnDate: null
        }
      }),
      
      // Get recent activities
      prisma.activityLog.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      }),
      
      // Get unread notifications
      prisma.notification.findMany({
        where: {
          isRead: false
        },
        take: 5,
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

    // Helper function to get the value from the promise result
    const getValue = (result: PromiseSettledResult<any>, defaultValue: any) => {
      return result.status === 'fulfilled' ? result.value : defaultValue;
    };

    // Format recent activities for easy consumption
    const activities = getValue(recentActivitiesResult, []).map((activity: any) => ({
      id: activity.id.toString(),
      activity: activity.activity,
      userId: activity.userId.toString(),
      userName: activity.user?.name || 'Unknown User',
      createdAt: activity.createdAt
    }));

    // Format notifications
    const notifications = getValue(notificationsResult, []).map((notification: any) => ({
      id: notification.id.toString(),
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      createdAt: notification.createdAt
    }));
    
    // Combine all stats
    const dashboardStats: DashboardResponse = {
      totalItems: getValue(totalItemsResult, 0),
      availableItems: getValue(availableItemsResult, 0),
      inUseItems: getValue(inUseItemsResult, 0),
      inCalibrationItems: getValue(inCalibrationItemsResult, 0),
      inRentalItems: getValue(inRentalItemsResult, 0),
      inMaintenanceItems: getValue(inMaintenanceItemsResult, 0),
      pendingRequests: getValue(pendingRequestsResult, 0),
      pendingCalibrations: getValue(pendingCalibrationsResult, 0),
      pendingRentals: getValue(pendingRentalsResult, 0),
      upcomingCalibrations: getValue(upcomingCalibrationsResult, 0),
      overdueRentals: getValue(overdueRentalsResult, 0),
      recentActivities: activities,
      notifications: notifications
    };
    
    return NextResponse.json(dashboardStats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    
    // Return a minimal response with zeros instead of an error
    // This prevents the dashboard from crashing completely
    const emptyStats: DashboardResponse = {
      totalItems: 0,
      availableItems: 0,
      inUseItems: 0,
      inCalibrationItems: 0,
      inRentalItems: 0,
      inMaintenanceItems: 0,
      pendingRequests: 0,
      pendingCalibrations: 0,
      pendingRentals: 0,
      upcomingCalibrations: 0,
      overdueRentals: 0,
      recentActivities: [],
      notifications: []
    };
    
    return NextResponse.json(emptyStats, { status: 500 });
  }
} 