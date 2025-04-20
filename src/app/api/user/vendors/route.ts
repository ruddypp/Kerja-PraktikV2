import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

// GET all vendors (read-only for user)
export async function GET(request: Request) {
  try {
    // Verifikasi user
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
          { service: { contains: search, mode: 'insensitive' } }
        ]
      };
    }
    
    // User hanya bisa melihat data vendor dasar, tanpa info performa
    const vendors = await prisma.vendor.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        address: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        service: true
      },
      orderBy: { name: 'asc' }
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