import { NextResponse } from 'next/server';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { markNotificationAsRead, deleteNotification } from '@/lib/notification-service';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
      // Ensure params is fully resolved before using its properties
      const { id } = params;
      
      const notification = await prisma.notification.findUnique({
        where: {
          id,
          userId: user.id,
        },
        include: {
          reminder: {
            include: {
              calibration: {
                include: {
                  item: true,
                  customer: true,
                },
              },
              rental: {
                include: {
                  item: true,
                  customer: true,
                },
              },
              maintenance: {
                include: {
                  item: true,
                },
              },
              inventoryCheck: true,
            },
          },
        },
      });
      
      if (!notification) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }
      
      const response = NextResponse.json({ notification });
      
      // Add cache control headers
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    } catch (error) {
      console.error('Error fetching notification:', error);
      return NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in admin notification GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
      // Ensure params is fully resolved before using its properties
      const { id } = params;
      
      const notification = await prisma.notification.findUnique({
        where: {
          id,
          userId: user.id,
        },
      });
      
      if (!notification) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }
      
      const body = await request.json();
      
      let updatedNotification;
      
      if (body.isRead) {
        updatedNotification = await markNotificationAsRead(id);
      } else {
        updatedNotification = await prisma.notification.update({
          where: { id },
          data: body,
        });
      }
      
      const response = NextResponse.json({ notification: updatedNotification });
      
      // Add cache control headers
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      return response;
    } catch (error) {
      console.error('Error updating notification:', error);
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in admin notification PATCH API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
      // Ensure params is fully resolved before using its properties
      const { id } = params;
      
      const notification = await prisma.notification.findUnique({
        where: {
          id,
          userId: user.id,
        },
      });
      
      if (!notification) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }
      
      await deleteNotification(id);
      
      const response = NextResponse.json({ success: true });
      
      // Add cache control headers
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      return response;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in admin notification DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 