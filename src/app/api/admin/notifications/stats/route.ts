import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/app/api/auth/authUtils';
import { sub, format } from 'date-fns';

// Utility function to safely convert BigInt values to numbers for JSON serialization
function serializeBigInt(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'bigint') {
    return Number(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => serializeBigInt(item));
  }
  
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = serializeBigInt(data[key]);
      }
    }
    return result;
  }
  
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized, admin access required' }, 
        { status: 403 }
      );
    }

    // Get time range from query params
    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '7d';

    // Calculate date range
    let fromDate: Date;
    switch (range) {
      case '30d':
        fromDate = sub(new Date(), { days: 30 });
        break;
      case '90d':
        fromDate = sub(new Date(), { days: 90 });
        break;
      case '7d':
      default:
        fromDate = sub(new Date(), { days: 7 });
        break;
    }

    // Get total notifications
    const totalCount = await prisma.notification.count({
      where: {
        createdAt: {
          gte: fromDate
        }
      }
    });

    // Get read/unread counts
    const readCount = await prisma.notification.count({
      where: {
        isRead: true,
        createdAt: {
          gte: fromDate
        }
      }
    });

    const unreadCount = totalCount - readCount;

    // Get notification type distribution
    const typeDistribution = await prisma.notification.groupBy({
      by: ['type'],
      _count: {
        type: true
      },
      where: {
        createdAt: {
          gte: fromDate
        }
      }
    });

    // Format type distribution for response
    const typeDistributionMap: Record<string, number> = {};
    typeDistribution.forEach(item => {
      typeDistributionMap[item.type] = item._count.type;
    });

    // Get user engagement stats
    const userEngagement = await prisma.$queryRaw`
      SELECT 
        u.id as "userId",
        u.name as "userName",
        COUNT(n.id) as "totalReceived",
        ROUND(SUM(CASE WHEN n."isRead" = true THEN 1 ELSE 0 END) * 100.0 / COUNT(n.id)) as "readPercentage"
      FROM "User" u
      LEFT JOIN "Notification" n ON u.id = n."userId"
      WHERE n."createdAt" >= ${fromDate}
      GROUP BY u.id, u.name
      HAVING COUNT(n.id) > 0
      ORDER BY "totalReceived" DESC
      LIMIT 10
    `;

    // Get daily notification counts
    const dailyCounts = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(n."createdAt"::date, 'YYYY-MM-DD') as date,
        COUNT(n.id) as count
      FROM "Notification" n
      WHERE n."createdAt" >= ${fromDate}
      GROUP BY TO_CHAR(n."createdAt"::date, 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    // Serialize BigInt values to regular numbers
    const serializedUserEngagement = serializeBigInt(userEngagement);
    const serializedDailyCounts = serializeBigInt(dailyCounts);

    // Return stats
    return NextResponse.json({
      success: true,
      stats: {
        totalCount,
        readCount,
        unreadCount,
        typeDistribution: typeDistributionMap,
        userEngagement: serializedUserEngagement,
        dailyCounts: serializedDailyCounts
      }
    });
  } catch (error) {
    console.error('Error fetching notification statistics:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch notification statistics' },
      { status: 500 }
    );
  }
} 