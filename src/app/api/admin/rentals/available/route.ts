import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { ItemStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';

    // Build where clause for search
    const whereClause: {
      status: ItemStatus;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        serialNumber?: { contains: string; mode: 'insensitive' };
        partNumber?: { contains: string; mode: 'insensitive' };
        description?: { contains: string; mode: 'insensitive' };
      }>
    } = {
      status: ItemStatus.AVAILABLE
    };
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.item.count({
      where: whereClause
    });
    
    const totalPages = Math.ceil(totalCount / limit);

    // Get available items (status = AVAILABLE)
    const availableItems = await prisma.item.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc'
      },
      skip,
      take: limit
    });

    // Return data with pagination metadata
    return NextResponse.json({
      data: availableItems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching available items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available items' },
      { status: 500 }
    );
  }
} 