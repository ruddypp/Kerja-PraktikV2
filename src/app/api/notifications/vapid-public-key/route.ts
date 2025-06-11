import { NextRequest, NextResponse } from 'next/server';

// Public key for VAPID should be stored in environment variables
// This is a placeholder. In production, you would use a real VAPID key
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEI9wSH7G9vwO-_0lK3X8vONNjHTJ-g8Nv60D47Vv2kxCi1ZvzHr4XYrQCM4i5Q6N8-Dd7y-zZZyFY5Wxhi0_EE';

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ 
      success: true, 
      publicKey: VAPID_PUBLIC_KEY 
    });
  } catch (error) {
    console.error('Error retrieving VAPID public key:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve VAPID public key' },
      { status: 500 }
    );
  }
} 