import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

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
    // @ts-ignore - TypeScript might complain if Prisma client hasn't been regenerated after schema changes
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
    
    if (activityType) {
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
    
    // Execute queries
    // @ts-ignore - TypeScript might complain if Prisma client hasn't been regenerated after schema changes
    const [activityLogs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: filters,
        include: {
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
    
    return NextResponse.json({
      items: activityLogs,
      total,
      page,
      limit,
      totalPages
    });
    
  } catch (error) {
    console.error('Error fetching admin activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
} 