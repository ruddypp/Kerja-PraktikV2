import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

// PUT: Mark a specific notification as read
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get user from request
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Need to await params in Next.js route handlers
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }
    
    // Update the notification
    const notification = await prisma.notification.update({
      where: { 
        id: parseInt(id)
      },
      data: { 
        isRead: true 
      }
    });
    
    return NextResponse.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
} 