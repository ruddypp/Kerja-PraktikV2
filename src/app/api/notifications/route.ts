import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/app/api/auth/authUtils';

// GET /api/notifications - Get notifications for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId: session.userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json({ success: true, notifications });
    } catch (dbError) {
      console.error('Database error fetching notifications:', dbError);
      // Return empty notifications array if there's a database error
      return NextResponse.json({ success: true, notifications: [] });
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a new notification
export async function POST(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session.userId || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { userId, title, message, type, relatedId, actionUrl, actionLabel, secondaryActionUrl, secondaryActionLabel } = await req.json();

    // Validate required fields
    if (!userId || !title || !message || !type) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    try {
      // Create notification
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          relatedId,
          // Only add these fields if they exist
          ...(actionUrl ? { actionUrl } : {}),
          ...(actionLabel ? { actionLabel } : {}),
          ...(secondaryActionUrl ? { secondaryActionUrl } : {}),
          ...(secondaryActionLabel ? { secondaryActionLabel } : {})
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Notification created successfully',
        notification
      });
    } catch (dbError) {
      console.error('Database error creating notification:', dbError);
      return NextResponse.json(
        { success: false, message: 'Database error creating notification' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Clear all notifications for the current user
export async function DELETE(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    try {
      await prisma.notification.deleteMany({
        where: {
          userId: session.userId,
        },
      });

      return NextResponse.json({ success: true, message: 'All notifications cleared' });
    } catch (dbError) {
      console.error('Database error clearing notifications:', dbError);
      return NextResponse.json(
        { success: false, message: 'Database error clearing notifications' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to clear notifications' },
      { status: 500 }
    );
  }
} 