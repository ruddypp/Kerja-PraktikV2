import { NextResponse } from 'next/server';
<<<<<<< HEAD
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { ActivityType } from '@prisma/client';

// NOTE: If you're seeing TypeScript errors related to the ActivityLog model,
// you may need to regenerate the Prisma client after schema changes:
// npx prisma generate

// GET all activity logs (admin only) with filtering and pagination
export async function GET(request: Request) {
  try {
    // Verify admin
    const user = await getUserFromRequest(request);
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const activityType = searchParams.get('activityType') || '';
    const userId = searchParams.get('userId') || '';
    const itemSerial = searchParams.get('itemSerial') || '';
    
    // Calculate skip for pagination
    const skip = (page - 1) * limit;
    
    // Build query filters
    const filters: any = {};
    
    if (startDate || endDate) {
      filters.createdAt = {};
      
      if (startDate) {
        filters.createdAt.gte = new Date(startDate);
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filters.createdAt.lte = endDateTime;
      }
    }
    
    if (activityType && Object.values(ActivityType).includes(activityType as ActivityType)) {
      filters.type = activityType;
    }
    
    if (userId) {
      filters.OR = [
        { userId },
        { affectedUserId: userId }
      ];
    }
    
    if (itemSerial) {
      filters.itemSerial = itemSerial;
    }
    
    // Execute queries with optimized selection
    const [activityLogs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: filters,
        select: {
          id: true,
          type: true,
          action: true,
          details: true,
          createdAt: true,
          userId: true,
          itemSerial: true,
          rentalId: true,
          calibrationId: true,
          maintenanceId: true,
          affectedUserId: true,
          vendorId: true,
          user: {
            select: {
              id: true,
              name: true
            }
          },
          affectedUser: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.activityLog.count({
        where: filters
      })
    ]);
    
    // Calculate total pages
    const totalPages = Math.ceil(total / limit);
    
    // Create response with data
    const responseData = {
      items: activityLogs,
      total,
      page,
      limit,
      totalPages
    };
    
    // Create response with cache headers
    const response = NextResponse.json(responseData);
    
    // Set cache control headers - cache for 1 minute
    response.headers.set('Cache-Control', 'public, max-age=60');
    response.headers.set('Expires', new Date(Date.now() + 60000).toUTCString());
    
    return response;
    
  } catch (error) {
    console.error('Error fetching admin activity logs:', error);
=======
import prisma from '@/lib/prisma';

// GET all activity logs with filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const activityType = searchParams.get('activityType');
    
    // Build where conditions
    const where: Record<string, unknown> = {};
    
    if (userId) {
      where.userId = parseInt(userId);
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      
      if (startDate) {
        where.createdAt = {
          ...where.createdAt as object,
          gte: new Date(startDate)
        };
      }
      
      if (endDate) {
        where.createdAt = {
          ...where.createdAt as object,
          lte: new Date(endDate)
        };
      }
    }
    
    if (activityType) {
      where.activity = {
        contains: activityType,
        mode: 'insensitive'
      };
    }
    
    // Get activity logs with user information
    const activityLogs = await prisma.activityLog.findMany({
      where: where as Record<string, unknown>,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(activityLogs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
>>>>>>> 0989372 (add fitur inventory dan history)
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
} 