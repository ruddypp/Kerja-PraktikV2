import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';

interface NotificationResponse {
  id: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

// GET: Fetch all notifications
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Use proper where condition for UUID
    const notifications = await prisma.notification.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          },
        },
      },
    });

    // Transform data to include user email
    const formattedNotifications = notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      createdAt: notification.createdAt.toISOString(),
      read: notification.isRead,
      userId: notification.userId,
      userName: notification.user?.name || null,
      userEmail: notification.user?.email || null,
    }));

    // Add cache control headers
    const response = NextResponse.json(formattedNotifications);
    response.headers.set('Cache-Control', 'private, max-age=10');
    return response;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' }, 
      { status: 500 }
    );
  }
}

// POST: Create a new notification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, message, type, userId } = body;
    
    if (!title || !message || !type) {
      return NextResponse.json(
        { error: 'Title, message, and type are required' },
        { status: 400 }
      );
    }
    
    // Create notification
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type: type as NotificationType,
        isRead: false,
        ...(userId && { user: { connect: { id: userId } } }),
      }
    });
    
    return NextResponse.json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// PATCH endpoint to mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const markAllRead = searchParams.get('markAllRead');
    const userId = searchParams.get('userId');
    
    if (markAllRead === 'true' && userId) {
      // Mark all notifications as read for user
      await prisma.notification.updateMany({
        where: {
          userId: userId, // Use string directly for UUID
          isRead: false
        },
        data: {
          isRead: true
        }
      });
      
      return NextResponse.json({ success: true });
    }
    
    if (!id) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
    // Mark single notification as read
    await prisma.notification.update({
      where: {
        id: id // Use string directly for UUID
      },
      data: {
        isRead: true
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
    // Delete notification
    await prisma.notification.delete({
      where: {
        id: id // Use string directly for UUID
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
} 