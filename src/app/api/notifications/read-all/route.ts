import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/app/api/auth/authUtils';

// PUT /api/notifications/read-all - Mark all notifications as read for the current user
export async function PUT(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    try {
      await prisma.notification.updateMany({
        where: {
          userId: session.userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    } catch (dbError) {
      console.error('Database error marking notifications as read:', dbError);
      return NextResponse.json(
        { success: false, message: 'Database error marking notifications as read' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
} 