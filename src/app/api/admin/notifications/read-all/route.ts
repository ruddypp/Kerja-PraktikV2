import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT: Mark all notifications as read
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    const whereClause: any = {};
    
    // If userId is provided, only mark this user's notifications as read
    if (userId) {
      whereClause.userId = parseInt(userId);
    }
    
    // Add condition to only update unread notifications
    whereClause.isRead = false;
    
    // Update all matching notifications
    const result = await prisma.notification.updateMany({
      where: whereClause,
      data: { 
        isRead: true 
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      count: result.count 
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
} 