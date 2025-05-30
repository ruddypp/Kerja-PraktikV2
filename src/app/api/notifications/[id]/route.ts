import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/app/api/auth/authUtils';

// GET /api/notifications/:id - Get a specific notification
export async function GET(
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

    // Check if the notification belongs to the user
    if (notification.userId !== session.userId && session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch notification' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/:id - Delete a specific notification
export async function DELETE(
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

    // Users can only delete their own notifications, admins can delete any
    if (notification.userId !== session.userId && session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    await prisma.notification.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete notification' },
      { status: 500 }
    );
  }
} 