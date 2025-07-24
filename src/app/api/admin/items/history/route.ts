import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { Item, ItemHistory, ActivityLog, Calibration, Maintenance, ActivityType } from '@prisma/client';

type ActivityLogWithUser = ActivityLog & {
  user: {
    id: string;
    name: string;
  };
};

type CalibrationWithRelations = Calibration & {
  customer: {
    id: string;
    name: string;
  } | null;
  user: {
    id: string;
    name: string;
  };
};

type MaintenanceWithUser = Maintenance & {
  user: {
    id: string;
    name: string;
  };
};

interface Rental {
  id: string;
  itemSerial: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  returnDate: Date | null;
  createdAt: Date;
  renterName: string | null;
  user: {
    id: string;
    name: string;
  };
}

interface PaginatedResponse {
  item: Item;
  itemHistory: ItemHistory[];
  activityLogs: ActivityLogWithUser[];
  calibrations: CalibrationWithRelations[];
  maintenances: MaintenanceWithUser[];
  rentals: Rental[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
    type: string;
  };
}

// GET item history by serialNumber
export async function GET(request: Request) {
  try {
    // Verify admin
    const user = await getUserFromRequest(request);
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get('serialNumber');
    
    // New pagination and filtering parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'all'; // all, history, activity, calibration, maintenance, rental
    
    if (!serialNumber) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }
    
    // Check if item exists with selective fields for better performance
    const existingItem = await prisma.item.findUnique({
      where: { serialNumber },
      select: {
        serialNumber: true,
        name: true,
        partNumber: true,
        sensor: true,
        description: true,
        customerId: true,
        status: true,
        lastVerifiedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    // Calculate pagination offset
    const skip = (page - 1) * limit;
    
    // Create base response with item info
    const response: PaginatedResponse = {
      item: existingItem as Item,
      itemHistory: [],
      activityLogs: [],
      calibrations: [],
      maintenances: [],
      rentals: [],
      pagination: {
        page,
        limit,
        totalPages: 1,
        totalItems: 0,
        type
      }
    };
    
    // Only fetch data based on the requested type to improve performance
    if (type === 'all' || type === 'history') {
      const itemHistory = await prisma.itemHistory.findMany({
        where: { itemSerial: serialNumber },
        select: {
          id: true,
          itemSerial: true,
          action: true,
          details: true,
          relatedId: true,
          startDate: true,
          endDate: true,
          createdAt: true
        },
        orderBy: { startDate: 'desc' },
        take: type === 'history' ? limit : 5, // Limit results if showing all types
        skip: type === 'history' ? skip : 0
      });
      
      if (type === 'history') {
        const count = await prisma.itemHistory.count({
          where: { itemSerial: serialNumber }
        });
        
        response.pagination.totalItems = count;
        response.pagination.totalPages = Math.ceil(count / limit);
      }
      
      response.itemHistory = itemHistory as ItemHistory[];
    }
    
    if (type === 'all' || type === 'activity') {
      const activityLogs = await prisma.activityLog.findMany({
        where: { itemSerial: serialNumber },
        select: {
          id: true,
          type: true,
          userId: true,
          action: true,
          details: true,
          itemSerial: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'activity' ? limit : 5, // Limit results if showing all types
        skip: type === 'activity' ? skip : 0
      });
      
      if (type === 'activity') {
        const count = await prisma.activityLog.count({
          where: { itemSerial: serialNumber }
        });
        
        response.pagination.totalItems = count;
        response.pagination.totalPages = Math.ceil(count / limit);
      }
      
      response.activityLogs = activityLogs as ActivityLogWithUser[];
    }
    
    if (type === 'all' || type === 'calibration') {
      const calibrations = await prisma.calibration.findMany({
        where: { itemSerial: serialNumber },
        select: {
          id: true,
          itemSerial: true,
          status: true,
          calibrationDate: true,
          validUntil: true,
          certificateNumber: true,
          certificateUrl: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              name: true
            }
          },
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'calibration' ? limit : 5, // Limit results if showing all types
        skip: type === 'calibration' ? skip : 0
      });
      
      if (type === 'calibration') {
        const count = await prisma.calibration.count({
          where: { itemSerial: serialNumber }
        });
        
        response.pagination.totalItems = count;
        response.pagination.totalPages = Math.ceil(count / limit);
      }
      
      response.calibrations = calibrations as CalibrationWithRelations[];
    }
    
    if (type === 'all' || type === 'maintenance') {
      try {
        const maintenances = await prisma.maintenance.findMany({
          where: { itemSerial: serialNumber },
          select: {
            id: true,
            itemSerial: true,
            userId: true,
            status: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: type === 'maintenance' ? limit : 5, // Limit results if showing all types
          skip: type === 'maintenance' ? skip : 0
        });
        
        if (type === 'maintenance') {
          const count = await prisma.maintenance.count({
            where: { itemSerial: serialNumber }
          });
          
          response.pagination.totalItems = count;
          response.pagination.totalPages = Math.ceil(count / limit);
        }
        
        response.maintenances = maintenances as MaintenanceWithUser[];
      } catch (error) {
        console.error('Error fetching maintenance data:', error);
        // Continue with other data even if maintenance data fails
      }
    }
    
    if (type === 'all' || type === 'rental') {
      try {
        const rentals = await prisma.rental.findMany({
          where: { itemSerial: serialNumber },
          select: {
            id: true,
            itemSerial: true,
            status: true,
            startDate: true,
            endDate: true,
            returnDate: true,
            createdAt: true,
            renterName: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: type === 'rental' ? limit : 5, // Limit results if showing all types
          skip: type === 'rental' ? skip : 0
        });
        
        if (type === 'rental') {
          const count = await prisma.rental.count({
            where: { itemSerial: serialNumber }
          });
          
          response.pagination.totalItems = count;
          response.pagination.totalPages = Math.ceil(count / limit);
        }
        
        response.rentals = rentals as Rental[];
      } catch (error) {
        console.error('Error fetching rental data:', error);
        // Continue with other data even if rental data fails
      }
    }
    
    // Create response with cache headers
    const apiResponse = NextResponse.json(response);
    
    // Use a shorter cache time (30 seconds) to balance performance and freshness
    // Also add Vary header to ensure proper cache differentiation
    apiResponse.headers.set('Cache-Control', 'public, max-age=30');
    apiResponse.headers.set('Expires', new Date(Date.now() + 30000).toUTCString());
    apiResponse.headers.set('Vary', 'Accept, Authorization');
    
    return apiResponse;
  } catch (error) {
    console.error('Error fetching item history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item history' },
      { status: 500 }
    );
  }
}