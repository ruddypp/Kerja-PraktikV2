import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/app/api/auth/authUtils';

// PUT /api/notifications/:id/read - Mark a notification as read
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Properly await the params
    const params = await context.params;
    
    const session = await verifyAuth(req);
    if (!session.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const notification = await prisma.notification.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, message: 'Notification not found' },
        { status: 404 }
      );
    }

    // Users can only mark their own notifications as read, admins can mark any
    if (notification.userId !== session.userId && session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const updatedNotification = await prisma.notification.update({
      where: {
        id: params.id,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ success: true, notification: updatedNotification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
} 