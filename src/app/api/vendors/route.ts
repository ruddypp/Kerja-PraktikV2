import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

// GET all vendors - accessible by all authenticated users
export async function GET(request: Request) {
  try {
    // Verify the user is authenticated (but don't check role)
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get search query and pagination params from URL
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '10');
    // For calibration vendor selection, allow much higher limits
    const limit = requestedLimit > 1000 ? 10000 : requestedLimit;
    const skip = (page - 1) * limit;
    
    // Log the query params for debugging
    console.log('Vendor query params:', { search, page, limit, skip, timestamp: searchParams.get('timestamp') });
    
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
    
    // Get total count for pagination
    const totalVendors = await prisma.vendor.count({
      where: whereClause
    });
    
    // Get vendors with pagination
    const vendors = await prisma.vendor.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      skip: skip,
      take: limit,
      // Only return essential fields for user display
      select: {
        id: true,
        name: true, 
        address: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        service: true
      }
    });
    
    // Return data with pagination info
    return NextResponse.json(
      {
        items: vendors,
        total: totalVendors,
        page,
        limit,
        totalPages: Math.ceil(totalVendors / limit)
      },
      {
        headers: {
          // Add caching header for 5 minutes to reduce frequent requests
          'Cache-Control': 'public, max-age=300, s-maxage=300'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
} 