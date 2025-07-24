import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Mark all notifications as read
    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false
      },
      data: {
        isRead: true
      }
    });
    
    // Set cache control headers to prevent stale data
    const response = NextResponse.json({
      success: true,
      message: 'All notifications marked as read and cache reset',
      user: {
        id: user.id,
        role: user.role
      },
      timestamp: new Date().toISOString()
    });
    
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error in reset notifications API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 