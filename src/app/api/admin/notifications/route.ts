import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/app/api/auth/authUtils';

// GET /api/admin/notifications - Get all notifications (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session.userId || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const isRead = searchParams.get('isRead');

    // Build the filter
    const filter: any = {};
    
    if (userId) {
      filter.userId = userId;
    }
    
    if (type) {
      filter.type = type;
    }
    
    if (isRead !== null) {
      filter.isRead = isRead === 'true';
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get notifications with pagination
    const notifications = await prisma.notification.findMany({
      where: filter,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Get total count for pagination
    const totalCount = await prisma.notification.count({
      where: filter,
    });

    return NextResponse.json({
      success: true,
      notifications,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/admin/notifications - Create a notification for a specific user or role (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session.userId || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { userId, roleId, title, message, type, relatedId } = await req.json();

    if ((!userId && !roleId) || !title || !message || !type) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    let notifications = [];

    // If userId is provided, create notification for that user
    if (userId) {
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          relatedId,
        },
      });
      notifications.push(notification);
    }

    // If roleId is provided, create notifications for all users with that role
    if (roleId) {
      const users = await prisma.user.findMany({
        where: {
          role: roleId,
        },
        select: {
          id: true,
        },
      });

      const roleNotifications = await Promise.all(
        users.map((user) =>
          prisma.notification.create({
            data: {
              userId: user.id,
              title,
              message,
              type,
              relatedId,
            },
          })
        )
      );

      notifications = [...notifications, ...roleNotifications];
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notifications created successfully',
      count: notifications.length 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating notifications:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create notifications' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/notifications - Delete all notifications (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session.userId || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');

    // Build the filter
    const filter: any = {};
    
    if (userId) {
      filter.userId = userId;
    }
    
    if (type) {
      filter.type = type;
    }

    // Delete notifications based on the filter
    const { count } = await prisma.notification.deleteMany({
      where: filter,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Notifications deleted successfully',
      count 
    });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
} 