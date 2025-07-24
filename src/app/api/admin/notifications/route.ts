import { NextResponse } from 'next/server';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { 
  getUserNotifications, 
  markAllNotificationsAsRead,
  deleteAllReadNotifications,
  getUnreadNotificationCount,
  getOverdueNotifications
} from '@/lib/notification-service';

export async function GET(request: Request) {
  try {
    // console.log('Admin notifications API called');
    
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized', notifications: [] }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('countOnly') === 'true';
    const overdueOnly = searchParams.get('overdueOnly') === 'true';
    const type = searchParams.get('type') as 'SCHEDULE' | 'CALIBRATION' | 'RENTAL' | 'MAINTENANCE' | 'ALL' || 'ALL';
    const page = parseInt(searchParams.get('page') || '1');
    
    // Add anti-cache headers to all responses
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    
    if (countOnly) {
      try {
        const count = await getUnreadNotificationCount(user.id);
        // console.log(`Unread notification count for admin ${user.id}: ${count}`);
        
        return NextResponse.json({ count }, { headers });
      } catch (error) {
        console.error('Error getting unread notification count:', error);
        return NextResponse.json({ error: 'Failed to get unread count', count: 0 }, { status: 500, headers });
      }
    }
    
    if (overdueOnly) {
      try {
        const notifications = await getOverdueNotifications(user.id);
        // console.log(`Found ${notifications.length} overdue notifications for admin ${user.id}`);
        
        return NextResponse.json({ notifications }, { headers });
      } catch (error) {
        console.error('Error fetching overdue notifications:', error);
        return NextResponse.json({ error: 'Failed to fetch overdue notifications', notifications: [] }, { status: 500, headers });
      }
    }
    
    try {
      const data = await getUserNotifications(user.id, { page, type });
      // console.log(`Found ${data.notifications.length} notifications for admin ${user.id}`);
      
      return NextResponse.json(data, { headers });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications', notifications: [], total: 0, page: 1, totalPages: 0 }, { status: 500, headers });
    }
  } catch (error) {
    console.error('Error in admin notifications API:', error);
    return NextResponse.json({ error: 'Internal server error', notifications: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { action } = body;
    
    if (action === 'markAllRead') {
      try {
        await markAllNotificationsAsRead(user.id);
        const response = NextResponse.json({ success: true, message: 'All notifications marked as read' });
        
        // Add cache control headers
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        
        return response;
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return NextResponse.json({ error: 'Failed to mark all notifications as read' }, { status: 500 });
      }
    }
    
    if (action === 'deleteAllRead') {
      try {
        await deleteAllReadNotifications(user.id);
        const response = NextResponse.json({ success: true, message: 'All read notifications deleted' });
        
        // Add cache control headers
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        
        return response;
      } catch (error) {
        console.error('Error deleting all read notifications:', error);
        return NextResponse.json({ error: 'Failed to delete all read notifications' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in admin notifications POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 