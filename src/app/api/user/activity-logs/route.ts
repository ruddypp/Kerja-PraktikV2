import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { ActivityType } from '@prisma/client';

// GET user's activity logs with filtering and pagination
export async function GET(request: Request) {
  try {
    // Verify user is authenticated
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const activityType = searchParams.get('activityType') || '';
    
    // Calculate skip for pagination
    const skip = (page - 1) * limit;
    
    // Build where clause for filtering
    const where: any = {
      // Show activities performed by the user OR affecting this user
      OR: [
        { userId: user.id },
        { affectedUserId: user.id }
      ]
    };
    
    // Add date filters if provided
    if (startDate || endDate) {
      where.createdAt = {};
      
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // Set to end of day
        where.createdAt.lte = endDateTime;
      }
    }
    
    // Add activity type filter if provided
    if (activityType && Object.values(ActivityType).includes(activityType as ActivityType)) {
      where.type = activityType;
    }
    
    // Get activity logs with pagination and optimized selection
    const [activityLogs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        select: {
          id: true,
          type: true,
          action: true,
          details: true,
          itemSerial: true,
          rentalId: true,
          calibrationId: true,
          maintenanceId: true,
          vendorId: true,
          createdAt: true,
          user: {
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
      prisma.activityLog.count({ where })
    ]);
    
    // Calculate total pages
    const totalPages = Math.ceil(total / limit);
    
    // Create response data
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
    console.error('Error fetching user activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
} 