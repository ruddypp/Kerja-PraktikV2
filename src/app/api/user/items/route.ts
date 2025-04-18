import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ItemStatus } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

// Interface for the item response
interface ItemResponse {
  serialNumber: string;
  name: string;
  partNumber: string;
  category: string | null;
  sensor: string | null;
  description: string | null;
  customerId: string | null;
  customer: {
    id: string;
    name: string;
  } | null;
  status: ItemStatus;
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// GET - Get all items for a specific user, dengan filtering sederhana
export async function GET(request: NextRequest) {
  try {
    // Verify session user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    
    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Build where conditions
    const where: Record<string, any> = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Get total count for pagination
    const totalItems = await prisma.item.count({ where });
    
    // Get items with pagination
    const items = await prisma.item.findMany({
      where,
      include: {
        customer: true
      },
      orderBy: {
        name: 'asc'
      },
      skip: skip,
      take: limit
    });
    
    // Return paginated response
    return NextResponse.json({
      items: items,
      total: totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit)
    });
  } catch (error) {
    console.error('Error fetching user items:', error);
    return NextResponse.json(
      { 
        items: [], 
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        error: 'Failed to fetch items' 
      }, 
      { status: 500 }
    );
  }
} 