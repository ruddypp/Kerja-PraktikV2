import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/app/api/auth/authUtils';

// GET /api/notifications/preferences - Get user notification preferences
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Find user preferences or create default ones
    let preferences = await prisma.notificationPreference.findUnique({
      where: {
        userId: session.userId,
      },
    });

    // If preferences don't exist, return default values
    if (!preferences) {
      return NextResponse.json({
        success: true,
        preferences: {
          rentalNotifications: true,
          calibrationNotifications: true,
          maintenanceNotifications: true,
          inventoryNotifications: true,
          systemNotifications: true,
          emailNotifications: false,
          pushNotifications: false,
        },
      });
    }

    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/preferences - Update user notification preferences
export async function PUT(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { preferences } = await req.json();

    if (!preferences) {
      return NextResponse.json(
        { success: false, message: 'Missing preferences data' },
        { status: 400 }
      );
    }

    // Update or create preferences
    const updatedPreferences = await prisma.notificationPreference.upsert({
      where: {
        userId: session.userId,
      },
      update: {
        rentalNotifications: preferences.rentalNotifications ?? true,
        calibrationNotifications: preferences.calibrationNotifications ?? true,
        maintenanceNotifications: preferences.maintenanceNotifications ?? true, 
        inventoryNotifications: preferences.inventoryNotifications ?? true,
        systemNotifications: preferences.systemNotifications ?? true,
        emailNotifications: preferences.emailNotifications ?? false,
        pushNotifications: preferences.pushNotifications ?? false,
      },
      create: {
        userId: session.userId,
        rentalNotifications: preferences.rentalNotifications ?? true,
        calibrationNotifications: preferences.calibrationNotifications ?? true,
        maintenanceNotifications: preferences.maintenanceNotifications ?? true,
        inventoryNotifications: preferences.inventoryNotifications ?? true,
        systemNotifications: preferences.systemNotifications ?? true,
        emailNotifications: preferences.emailNotifications ?? false,
        pushNotifications: preferences.pushNotifications ?? false,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Notification preferences updated successfully',
      preferences: updatedPreferences
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
} 