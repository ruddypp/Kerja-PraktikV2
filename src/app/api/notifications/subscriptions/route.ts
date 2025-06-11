import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/app/api/auth/authUtils';

// Store push subscription endpoint
export async function POST(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await req.json();
    if (!subscription) {
      return NextResponse.json(
        { success: false, message: 'Missing subscription data' },
        { status: 400 }
      );
    }

    // Store subscription in database
    await prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        userId: session.userId,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
        updatedAt: new Date(),
      },
      create: {
        userId: session.userId,
        endpoint: subscription.endpoint,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription saved successfully' 
    });
  } catch (error) {
    console.error('Error storing push subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to store subscription' },
      { status: 500 }
    );
  }
}

// Delete push subscription endpoint
export async function DELETE(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json(
        { success: false, message: 'Missing endpoint' },
        { status: 400 }
      );
    }

    // Remove subscription from database
    await prisma.pushSubscription.delete({
      where: {
        endpoint: endpoint,
        userId: session.userId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription removed successfully' 
    });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
} 