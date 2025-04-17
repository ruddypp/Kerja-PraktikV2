import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Use consistent import
import { ItemStatus } from '@prisma/client'; // Import from prisma/client instead of redefining

// Interface for the item response
interface ItemResponse {
  id: string;
  name: string;
  serialNumber: string | null;
  specification: string | null;
  status: ItemStatus;
  lastVerifiedDate: Date | null;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
}

// GET - Get all items for a specific user, with simpler filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    // Build where conditions with proper typing
    const whereClause: any = {};
    
    if (categoryId && categoryId !== 'all') {
      whereClause.categoryId = parseInt(categoryId);
    }
    
    if (status && status !== 'all') {
      whereClause.status = status as ItemStatus;
    }
    
    if (search && search.trim() !== '') {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { specification: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Create the actual data fetch promise
    const items = await prisma.item.findMany({
      where: whereClause,
      include: {
        category: true
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    // Format the response
    const formattedItems: ItemResponse[] = items.map(item => ({
      id: item.id.toString(),
      name: item.name,
      serialNumber: item.serialNumber,
      specification: item.specification,
      status: item.status,
      lastVerifiedDate: item.lastVerifiedDate,
      categoryId: item.categoryId,
      category: {
        id: item.category.id,
        name: item.category.name
      }
    }));
    
    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('Error fetching items:', error);
    // Return empty array instead of error to prevent UI crash
    return NextResponse.json([], { status: 500 });
  }
} 