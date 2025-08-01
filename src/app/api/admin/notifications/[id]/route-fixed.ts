import { NextResponse } from 'next/server';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { 
  markNotificationAsRead,
  deleteNotification
} from '@/lib/notification-service';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;
    
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify notification belongs to admin user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (notification.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { isRead } = body;

    if (typeof isRead === 'boolean') {
      const updatedNotification = await markNotificationAsRead(notificationId);
      
      if (updatedNotification === null) {
        return NextResponse.json({ error: 'Notification not found or already deleted' }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: true, 
        notification: updatedNotification 
      });
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  } catch (error) {
    console.error('Error updating admin notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;
    
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify notification belongs to admin user (only if it exists)
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (notification && notification.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete notification - handle case where it might already be deleted
    const deletedNotification = await deleteNotification(notificationId);
    
    if (deletedNotification === null) {
      // Notification was already deleted or not found - still return success
      return NextResponse.json({ 
        success: true, 
        message: 'Notification was already deleted' 
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Notification deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting admin notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}