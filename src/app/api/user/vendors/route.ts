import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decodeToken } from '@/lib/auth';

// Helper function to get user ID from request
async function getUserId(request: Request): Promise<number | null> {
  try {
    // Get token from cookies manually
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [name, ...value] = c.split('=');
        return [name, value.join('=')];
      })
    );
    
    const token = cookies['auth_token'];
    
    if (token) {
      const userData = decodeToken(token);
      if (userData?.id) {
        return userData.id;
      }
    }
  } catch (authError) {
    console.error('Error getting user from token:', authError);
  }
  
  return null; // Return null if no valid user found
}

// GET vendors for user calibration requests
export async function GET(request: Request) {
  try {
    // Get user ID from auth token (not required for this endpoint but good to validate)
    const userId = await getUserId(request) || 2; // Default to user ID 2 if not found
    
    // Get all active vendors
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        contactPerson: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
} 