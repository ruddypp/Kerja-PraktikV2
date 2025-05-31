import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decodeToken } from '@/lib/auth';

// GET user activity logs data formatted for PDF export
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
    
    // Get user activity logs
    const activityLogs = await prisma.activityLog.findMany({
      where: where as Record<string, unknown>,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Format data for PDF
    const formattedData = {
      generatedAt: new Date().toISOString(),
      filters: {
        startDate,
        endDate,
        activityType
      },
      data: activityLogs
    };
    
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error exporting user activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to export activity logs' },
      { status: 500 }
    );
  }
} 