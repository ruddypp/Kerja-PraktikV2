import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET dashboard statistics
export async function GET() {
  try {
    // Query the database for items count
    const totalItems = await prisma.item.count();
    
    // Get counts for different item statuses
    const statusCounts = await prisma.item.groupBy({
      by: ['statusId'],
      _count: {
        id: true
      }
    });
    
    // Get all statuses to map the IDs to status names
    const allStatuses = await prisma.status.findMany();
    const statusMap: Record<string, number> = {};
    
    // Transform the data into a more usable format
    statusCounts.forEach(status => {
      const statusName = allStatuses.find(s => s.id === status.statusId)?.name?.toLowerCase() || 'unknown';
      statusMap[statusName] = status._count.id;
    });
    
    // Get counts for different request statuses
    const requestStatusCounts = await prisma.request.groupBy({
      by: ['statusId'],
      _count: {
        id: true
      }
    });
    
    const reqStatusMap: Record<string, number> = {};
    requestStatusCounts.forEach(status => {
      const statusName = allStatuses.find(s => s.id === status.statusId)?.name?.toLowerCase() || 'unknown';
      reqStatusMap[statusName] = status._count.id;
    });
    
    // Combine all stats
    const dashboardStats = {
      totalItems,
      statusCounts: statusMap,
      statusMap: reqStatusMap,
    };
    
    return NextResponse.json(dashboardStats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
} 