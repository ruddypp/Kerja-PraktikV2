import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ItemStatus, RequestStatus } from '@prisma/client';
import { addDays } from 'date-fns';
import { DashboardStats } from '@/lib/utils/dashboard';

// Interface for the dashboard response
interface DashboardResponse extends DashboardStats {
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
      inCalibrationItemsResult,
      rentedItemsResult,
      inMaintenanceItemsResult,
      pendingRequestsResult,
      pendingCalibrationsResult,
      pendingRentalsResult,
      upcomingCalibrationsResult,
      overdueRentalsResult,
      recentActivitiesResult
    ] = await Promise.allSettled([
      // Query the database for items count
      prisma.item.count(),
      
      // Get counts for different item statuses
      prisma.item.count({
        where: { status: ItemStatus.AVAILABLE }
      }),
      
      prisma.item.count({
        where: { status: ItemStatus.IN_CALIBRATION }
      }),
      
      prisma.item.count({
        where: { status: ItemStatus.RENTED }
      }),
      
      prisma.item.count({
        where: { status: ItemStatus.IN_MAINTENANCE }
      }),
      
      // Get pending requests (rentals with PENDING status)
      prisma.rental.count({
        where: { status: RequestStatus.PENDING }
      }),
      
      // Get pending calibrations count
      prisma.calibration.count({
        where: { status: RequestStatus.PENDING }
      }),
      
      // Get pending rentals count
      prisma.rental.count({
        where: { status: RequestStatus.PENDING }
      }),
      
      // Get upcoming calibrations (within next 7 days)
      prisma.calibration.count({
        where: {
          validUntil: {
            lte: addDays(new Date(), 7),
            gte: new Date()
          },
          status: RequestStatus.COMPLETED
        }
      }),
      
      // Get overdue rentals (end date passed but still not returned)
      prisma.rental.count({
        where: {
          endDate: {
            lt: new Date()
          },
          status: RequestStatus.APPROVED,
          returnDate: null
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
      })
    ]);

    // Helper function to get the value from the promise result
    const getValue = (result: PromiseSettledResult<any>, defaultValue: any) => {
      return result.status === 'fulfilled' ? result.value : defaultValue;
    };

    // Format recent activities for easy consumption
    const activities = getValue(recentActivitiesResult, []).map((activity: any) => ({
      id: activity.id,
      activity: activity.action || 'Unknown action',
      details: activity.details || '',
      userName: activity.user?.name || 'Unknown User',
      createdAt: activity.createdAt
    }));

    // Create mock notifications since schema has changed
    const mockNotifications = [
      {
        id: '1',
        message: 'You have pending calibration requests to review',
        type: 'CALIBRATION_REMINDER',
        isRead: false,
        createdAt: new Date()
      },
      {
        id: '2',
        message: 'Several items need to be returned soon',
        type: 'RENTAL_DUE_REMINDER',
        isRead: false,
        createdAt: new Date()
      }
    ];
    
    // Combine all stats
    const dashboardStats: DashboardResponse = {
      totalItems: getValue(totalItemsResult, 0),
      availableItems: getValue(availableItemsResult, 0),
      inUseItems: 0, // No longer in schema
      inCalibrationItems: getValue(inCalibrationItemsResult, 0),
      inRentalItems: getValue(rentedItemsResult, 0),
      inMaintenanceItems: getValue(inMaintenanceItemsResult, 0),
      pendingRequests: getValue(pendingRequestsResult, 0),
      pendingCalibrations: getValue(pendingCalibrationsResult, 0),
      pendingRentals: getValue(pendingRentalsResult, 0),
      upcomingCalibrations: getValue(upcomingCalibrationsResult, 0),
      overdueRentals: getValue(overdueRentalsResult, 0),
      recentActivities: activities,
      notifications: mockNotifications
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