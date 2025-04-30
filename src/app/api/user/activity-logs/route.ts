import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decodeToken } from '@/lib/auth';

// GET activity logs for current user
export async function GET(request: Request) {
  try {
    // Get user ID from auth token in cookies
    let userId = 0; // Default to invalid user ID
    
    try {
      // Get token from cookies manually
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').filter(c => c).map(c => {
          const [name, ...value] = c.split('=');
          return [name, value.join('=')];
        })
      );
      
      const token = cookies['auth_token'];
      
      if (token) {
        const userData = decodeToken(token);
        if (userData?.id) {
          userId = userData.id;
        }
      }
    } catch (authError) {
      console.error('Error getting user from token:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const activityType = searchParams.get('activityType');
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Build where conditions
    const where: Record<string, unknown> = {
      userId: userId // Only show current user's activities
    };
    
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
    
    // Get total count for pagination
    const totalItems = await prisma.activityLog.count({
      where: where as Record<string, unknown>
    });
    
    // Get user activity logs with pagination and only select necessary fields
    const activityLogs = await prisma.activityLog.findMany({
      where: where as Record<string, unknown>,
      select: {
        id: true,
        userId: true,
        itemSerial: true,
        action: true,
        details: true,
        createdAt: true,
        activity: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });
    
    // Return paginated response
    return NextResponse.json({
      items: activityLogs,
      total: totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit)
    });
  } catch (error) {
    console.error('Error fetching user activity logs:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch activity logs',
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      },
      { status: 500 }
    );
  }
} 