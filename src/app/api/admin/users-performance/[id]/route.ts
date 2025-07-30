import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { ActivityType } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify user is admin
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract ID from URL
    const { id: userId } = await params;

    // Get time period from query params
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // Get user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare date filters
    const startDate = new Date(year, 0, 1); // January 1st of the selected year
    const endDate = new Date(year, 11, 31, 23, 59, 59); // December 31st of the selected year

    // Get maintenance data
    const maintenancesCompleted = await prisma.maintenance.count({
      where: {
        userId: userId,
        status: 'COMPLETED',
        updatedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Get rentals data
    const rentalsProcessed = await prisma.rental.count({
      where: {
        userId: userId,
        updatedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Get calibrations data
    const calibrationsHandled = await prisma.calibration.count({
      where: {
        userId: userId,
        updatedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Get monthly activity
    const monthlyActivityQuery = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month, 
        COUNT(*) as count 
      FROM 
        "ActivityLog" 
      WHERE 
        "userId" = ${userId}
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      GROUP BY 
        DATE_TRUNC('month', "createdAt") 
      ORDER BY 
        month ASC
    `;

    // Format monthly data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize array with zero counts
    const monthlyActivity = months.map(month => ({
      month,
      count: 0
    }));

    // Fill in actual counts from query
    (monthlyActivityQuery as any[]).forEach((item: { month: Date, count: number }) => {
      const monthIndex = item.month.getMonth();
      if (monthIndex >= 0 && monthIndex < 12) {
        monthlyActivity[monthIndex].count = Number(item.count);
      }
    });

    // Get yearly activity starting from 2025 to current selected year
    const startYearForYearly = 2025;
    const currentYear = new Date().getFullYear();
    const endYearForYearly = Math.max(currentYear, year);
    
    const yearlyActivityQuery = await prisma.$queryRaw`
      SELECT 
        DATE_PART('year', "createdAt") as year, 
        COUNT(*) as count 
      FROM 
        "ActivityLog" 
      WHERE 
        "userId" = ${userId}
        AND DATE_PART('year', "createdAt") >= ${startYearForYearly}
        AND DATE_PART('year', "createdAt") <= ${endYearForYearly}
      GROUP BY 
        DATE_PART('year', "createdAt") 
      ORDER BY 
        year ASC
    `;

    // Format yearly data
    const yearlyActivity: { year: string, count: number }[] = [];
    
    for (let y = startYearForYearly; y <= endYearForYearly; y++) {
      yearlyActivity.push({
        year: y.toString(),
        count: 0
      });
    }

    // Fill in actual counts from query
    (yearlyActivityQuery as any[]).forEach((item: { year: number, count: number }) => {
      const yearIndex = item.year - startYearForYearly;
      if (yearIndex >= 0 && yearIndex < yearlyActivity.length) {
        yearlyActivity[yearIndex].count = Number(item.count);
      }
    });

    // Get total activities for the selected year
    const totalActivities = await prisma.activityLog.count({
      where: {
        userId: userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Return the performance metrics (without inventory data)
    const performanceData = {
      user: targetUser,
      metrics: {
        totalActivities,
        maintenancesCompleted,
        rentalsProcessed,
        calibrationsHandled,
        monthlyActivity,
        yearlyActivity
      }
    };

    return NextResponse.json(performanceData);
  } catch (error) {
    console.error('Error fetching user performance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user performance data' },
      { status: 500 }
    );
  }
}