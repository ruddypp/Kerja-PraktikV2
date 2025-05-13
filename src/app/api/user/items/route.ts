import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    const status = searchParams.get('status') as ItemStatus | null;
    const serialNumber = searchParams.get('serialNumber');
    const basicDetails = searchParams.get('basicDetails') === 'true';
    
    // If requesting a single item with basic details, return just that item quickly
    if (serialNumber && basicDetails) {
      const item = await prisma.item.findUnique({
        where: { serialNumber },
        select: {
          serialNumber: true,
          name: true,
          partNumber: true,
          sensor: true,
          description: true,
          customerId: true,
          customer: {
            select: {
              id: true,
              name: true
            }
          },
          status: true,
          lastVerifiedAt: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      
      return NextResponse.json(item);
    }
    
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
        // Removing description search to optimize query
        // { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Filter by status if provided
    if (status) {
      where.status = status;
    }
    
    // Get total count for pagination - do this only when needed
    const totalItems = await prisma.item.count({ where });
    
    // Get items with pagination - select only needed fields
    const items = await prisma.item.findMany({
      where,
      select: {
        serialNumber: true,
        name: true,
        partNumber: true,
        sensor: true,
        description: true,
        customerId: true,
        status: true,
        lastVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
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
      skip: skip,
      take: limit
    });
    
    // Siapkan response dengan header cache
    const response = NextResponse.json({
      items: items,
      total: totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit)
    });
    
    // Set header Cache-Control untuk memungkinkan browser caching
    // max-age=60 berarti cache akan valid selama 60 detik
    response.headers.set('Cache-Control', 'public, max-age=60');
    
    return response;
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