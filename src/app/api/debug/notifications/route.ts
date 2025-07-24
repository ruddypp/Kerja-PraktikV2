import { NextResponse } from 'next/server';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkDueReminders } from '@/lib/reminder-service';
import { createNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Informasi diagnostik dasar
    const diagnosticInfo = {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isDevelopment: process.env.NODE_ENV === 'development',
      },
    };
    
    // Tindakan yang berbeda untuk debugging
    switch (action) {
      case 'check_reminders': {
        console.log('Debug: Memicu pemeriksaan reminder yang jatuh tempo');
        const results = await checkDueReminders();
        return NextResponse.json({
          ...diagnosticInfo,
          action: 'check_reminders',
          results,
        });
      }
      
      case 'create_test_notification': {
        console.log('Debug: Membuat notifikasi uji');
        const notification = await createNotification({
          title: 'NOTIFIKASI UJI',
          message: 'Ini adalah notifikasi uji untuk memverifikasi sistem notifikasi.',
          userId: user.id,
          shouldPlaySound: true,
        });
        
        return NextResponse.json({
          ...diagnosticInfo,
          action: 'create_test_notification',
          notification,
        });
      }
      
      case 'list_due_reminders': {
        console.log('Debug: Mendapatkan daftar reminder yang jatuh tempo');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Cari reminder yang jatuh tempo hari ini atau sudah lewat
        const dueReminders = await prisma.$queryRaw`
          SELECT r.*, u.name as "userName", u.email as "userEmail"
          FROM "Reminder" r
          JOIN "User" u ON r."userId" = u.id
          WHERE r."dueDate" < ${tomorrow}
          AND r.status IN ('PENDING', 'SENT')
          AND (r."acknowledgedAt" IS NULL)
          ORDER BY r."dueDate" ASC
        `;
        
        return NextResponse.json({
          ...diagnosticInfo,
          action: 'list_due_reminders',
          today: today.toISOString(),
          tomorrow: tomorrow.toISOString(),
          dueReminders,
        });
      }
      
      case 'list_recent_notifications': {
        console.log('Debug: Mendapatkan notifikasi terbaru');
        const recentNotifications = await prisma.notification.findMany({
          where: {
            userId: user.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
          include: {
            reminder: true,
          },
        });
        
        return NextResponse.json({
          ...diagnosticInfo,
          action: 'list_recent_notifications',
          recentNotifications,
        });
      }
      
      case 'reset_notifications': {
        // Mark all notifications as read for this user
        console.log('Debug: Resetting notification state for user');
        
        // Mark all as read
        await prisma.notification.updateMany({
          where: {
            userId: user.id,
            isRead: false
          },
          data: {
            isRead: true
          }
        });
        
        // Clear any stale cache headers
        const response = NextResponse.json({
          ...diagnosticInfo,
          action: 'reset_notifications',
          message: 'All notifications marked as read and cache reset'
        });
        
        // Set cache control headers
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        
        return response;
      }
      
      default:
        return NextResponse.json({
          ...diagnosticInfo,
          availableActions: [
            'check_reminders',
            'create_test_notification',
            'list_due_reminders',
            'list_recent_notifications',
            'reset_notifications'
          ],
          message: 'Silakan pilih tindakan dengan parameter ?action=nama_tindakan',
        });
    }
  } catch (error) {
    console.error('Error in debug notifications API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 