import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ItemStatus, RequestStatus } from '@prisma/client';
import { addDays } from 'date-fns';
import { DashboardStats } from '@/lib/utils/dashboard';

// Interface for the dashboard response
interface DashboardResponse extends DashboardStats {}

// GET dashboard statistics
export async function GET(request: Request) {
  try {
    // Check for timestamp parameter to determine if this is a forced refresh
    const url = new URL(request.url);
    const hasTimestamp = url.searchParams.has('t');
    
    // Set headers for HTTP caching
    const headers = new Headers();
    if (hasTimestamp) {
      // If timestamp is present, it's a forced refresh - don't cache
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      console.log('Admin dashboard: Forced refresh detected, using no-cache headers');
    } else {
      // Normal request - use short-lived cache
      headers.set('Cache-Control', 'private, max-age=30'); // Cache for 30 seconds
      headers.set('Vary', 'Cookie'); // Vary cache by cookie (for user-specific data)
    }
    
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
      totalVendorsResult,
      totalUsersResult
    ] = await Promise.allSettled([
      // Query the database for items count
      prisma.item.count(),
      
      // Get counts for different item statuses - using optimized count queries
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
      
      // Get pending rentals count - this is redundant with pendingRequestsResult, but kept for backward compatibility
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

      // Get total vendors count
      prisma.vendor.count({
        where: { isDeleted: false }
      }).then(count => {
        console.log('Total vendors count:', count);
        return count;
      }),

      // Get total users count
      prisma.user.count().then(count => {
        console.log('Total users count:', count);
        return count;
      })
    ]);

    // Helper function to get the value from the promise result
    const getValue = <T>(result: PromiseSettledResult<T>, defaultValue: T): T => {
      return result.status === 'fulfilled' ? result.value : defaultValue;
    };
    
    // Ensure all values are proper numbers
    const ensureNumber = (value: string | number): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };
    
    // Combine all stats
    const dashboardStats: DashboardResponse = {
      totalItems: ensureNumber(getValue(totalItemsResult, 0)),
      availableItems: ensureNumber(getValue(availableItemsResult, 0)),
      inUseItems: 0, // No longer in schema
      inCalibrationItems: ensureNumber(getValue(inCalibrationItemsResult, 0)),
      inRentalItems: ensureNumber(getValue(rentedItemsResult, 0)),
      inMaintenanceItems: ensureNumber(getValue(inMaintenanceItemsResult, 0)),
      pendingRequests: ensureNumber(getValue(pendingRequestsResult, 0)),
      pendingCalibrations: ensureNumber(getValue(pendingCalibrationsResult, 0)),
      pendingRentals: ensureNumber(getValue(pendingRentalsResult, 0)),
      upcomingCalibrations: ensureNumber(getValue(upcomingCalibrationsResult, 0)),
      overdueRentals: ensureNumber(getValue(overdueRentalsResult, 0)),
      totalVendors: ensureNumber(getValue(totalVendorsResult, 0)),
      totalUsers: ensureNumber(getValue(totalUsersResult, 0))
    };
    
    return NextResponse.json(dashboardStats, { headers });
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
      totalVendors: 0,
      totalUsers: 0
    };
    
    return NextResponse.json(emptyStats, { status: 500 });
  }
}
