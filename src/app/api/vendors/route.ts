import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

// GET all vendors - accessible by all authenticated users
export async function GET(request: Request) {
  try {
    // Verify the user is authenticated (but don't check role)
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get search query from URL
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    
    let whereClause = {};
    
    if (search) {
      whereClause = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { service: { contains: search, mode: 'insensitive' } },
          { contactName: { contains: search, mode: 'insensitive' } }
        ]
      };
    }
    
    const vendors = await prisma.vendor.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      // Only return essential fields for user display
      select: {
        id: true,
        name: true,
        contactName: true,
        contactPhone: true,
        service: true
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