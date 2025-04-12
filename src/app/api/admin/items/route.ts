import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all items with category and status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const statusId = searchParams.get('statusId');
    const search = searchParams.get('search');
    
    // Build where conditions with proper typing
    const where: Record<string, unknown> = {};
    
    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }
    
    if (statusId) {
      where.statusId = parseInt(statusId);
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { specification: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Create Promise that will reject after 10 seconds
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000);
    });
    
    // Create the actual data fetch promise
    const fetchData = prisma.item.findMany({
      where: where as any, // Type assertion needed for Prisma
      include: {
        category: true,
        status: true
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    // Race the promises - whichever finishes first wins
    const items = await Promise.race([fetchData, timeout]);
    
    return NextResponse.json(items || []);
  } catch (error) {
    console.error('Error fetching items:', error);
    // Return empty array instead of error to prevent UI crash
    return NextResponse.json([]);
  }
}

// POST create a new item
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, categoryId, specification, serialNumber, statusId } = body;
    
    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }
    
    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }
    
    if (!statusId) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }
    
    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) }
    });
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 400 }
      );
    }
    
    // Check if status exists
    const status = await prisma.status.findFirst({
      where: { 
        id: parseInt(statusId),
        type: 'item'
      }
    });
    
    if (!status) {
      return NextResponse.json(
        { error: 'Invalid status for item' },
        { status: 400 }
      );
    }
    
    // Create item
    const item = await prisma.item.create({
      data: {
        name,
        categoryId: parseInt(categoryId),
        specification,
        serialNumber,
        statusId: parseInt(statusId)
      },
      include: {
        category: true,
        status: true
      }
    });
    
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
} 