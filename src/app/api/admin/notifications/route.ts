import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  createNotification as createNotificationService
} from '@/lib/notificationService';

interface NotificationResponse {
  id: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

// GET: Fetch all notifications with support for incremental loading
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const lastFetchTime = searchParams.get('lastFetchTime');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Use our notification service for getting notifications
    const { notifications, unreadCount } = await getUserNotifications(
      userId, 
      limit, 
      lastFetchTime ? new Date(lastFetchTime) : undefined
    );

    // Transform data
    const formattedNotifications = notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      createdAt: notification.createdAt.toISOString(),
      isRead: notification.isRead,
      userId: notification.userId,
    }));

    // Add cache control headers for incremental loading
    const response = NextResponse.json({
      notifications: formattedNotifications,
      unreadCount,
      lastFetchTime: new Date().toISOString()
    });
    
    // Short cache time for real-time notifications
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
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
    const { title, message, type, userId, relatedId } = body;
    
    if (!title || !message || !type || !userId) {
      return NextResponse.json(
        { error: 'Title, message, type, and userId are required' },
        { status: 400 }
      );
    }
    
    // Use the notification service to create and deliver notification
    const notification = await createNotificationService({
      userId,
      title,
      message,
      type: type as NotificationType,
      relatedId
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
      // Mark all notifications as read for user using our service
      await markAllNotificationsAsRead(userId);
      
      // Emit socket event to update all clients
      const io = (global as any).io;
      if (io) {
        io.to(`user:${userId}`).emit('notifications_marked_read');
      }
      
      return NextResponse.json({ success: true });
    }
    
    if (!id) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
    // Mark single notification as read using our service
    const notification = await markNotificationAsRead(id);
    
    // Emit socket event
    const io = (global as any).io;
    if (io && notification) {
      io.to(`user:${notification.userId}`).emit('notification_marked_read', { id });
    }
    
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
    
    // Get the notification first to have the userId
    const notification = await prisma.notification.findUnique({
      where: { id }
    });
    
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    // Delete notification
    await prisma.notification.delete({
      where: { id }
    });
    
    // Emit socket event
    const io = (global as any).io;
    if (io) {
      io.to(`user:${notification.userId}`).emit('notification_deleted', { id });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
} 