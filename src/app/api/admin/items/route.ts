import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Define ItemStatus enum locally
enum ItemStatus {
  AVAILABLE = "AVAILABLE",
  IN_USE = "IN_USE",
  IN_CALIBRATION = "IN_CALIBRATION",
  IN_RENTAL = "IN_RENTAL",
  IN_MAINTENANCE = "IN_MAINTENANCE"
}

// GET all items with category and status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    // Build where conditions with proper typing
    const where: any = {};
    
    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }
    
    if (status) {
      where.status = status as ItemStatus;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { specification: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Create the actual data fetch promise
    const items = await prisma.item.findMany({
      where,
      include: {
        category: true
      },
      orderBy: {
        id: 'asc'
      }
    });
    
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
    const { name, categoryId, specification, serialNumber, status, lastVerifiedDate } = body;
    
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
    
    if (!status || !Object.values(ItemStatus).includes(status as ItemStatus)) {
      return NextResponse.json(
        { error: 'Valid status is required' },
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
    
    // Create item
    const item = await prisma.item.create({
      data: {
        name,
        categoryId: parseInt(categoryId),
        specification,
        serialNumber,
        status: status as ItemStatus,
        lastVerifiedDate: lastVerifiedDate || null
      },
      include: {
        category: true
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