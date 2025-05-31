import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET activity logs data formatted for PDF export
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
    
    // Format data for PDF
    const formattedData = {
      generatedAt: new Date().toISOString(),
      filters: {
        userId,
        startDate,
        endDate,
        activityType
      },
      data: activityLogs
    };
    
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error exporting activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to export activity logs' },
      { status: 500 }
    );
  }
} 