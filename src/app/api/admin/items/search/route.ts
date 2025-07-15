import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

// GET - Search items by name, serial number, or part number
export async function GET(request: Request) {
  try {
    // Verify the user is authenticated and is an admin
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get search query from URL
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    // Validate search query
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }
    
    // Limit results to prevent overwhelming the UI
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Search for items matching the query
    const items = await prisma.item.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { serialNumber: { contains: query, mode: 'insensitive' } },
          { partNumber: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        serialNumber: true,
        name: true,
        partNumber: true,
        status: true,
        lastVerifiedAt: true,
        customer: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      },
      take: limit
    });
    
    // Return the search results
    return NextResponse.json({
      query,
      results: items
    });
  } catch (error) {
    console.error('Error searching items:', error);
    return NextResponse.json(
      { error: 'Failed to search items' },
      { status: 500 }
    );
  }
} 