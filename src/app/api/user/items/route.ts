import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ItemStatus, ActivityType } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

// Item schema for validation
const itemSchema = z.object({
  serialNumber: z.string().min(1, "Serial number is required"),
  name: z.string().min(1, "Name is required"),
  partNumber: z.string().min(1, "Part number is required"),
  sensor: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  status: z.nativeEnum(ItemStatus)
});

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
    // For calibration item selection, allow much higher limits
    const requestedLimit = parseInt(searchParams.get('limit') || '10');
    const limit = requestedLimit > 1000 ? 50000 : requestedLimit; // Support up to 50,000 items if requested
    
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
    
    // For large limit requests (for calibration form), optimize by selecting fewer fields
    const select = (limit > 1000) ? {
      serialNumber: true,
      name: true,
      partNumber: true,
      sensor: true,
      status: true,
    } : {
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
    };
    
    // Get items with pagination - select only needed fields
    const items = await prisma.item.findMany({
      where,
      select,
      orderBy: {
        name: 'asc'
      },
      skip: skip,
      take: limit
    });
    
    // For optimized requests, skip counting total if not needed for pagination
    const totalItems = limit > 1000 ? items.length : await prisma.item.count({ where });
    
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

// POST - Create a new item (user can create items)
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Validate the data
    try {
      itemSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        );
      }
    }
    
    // Check if item with same serial number already exists
    const existingItem = await prisma.item.findUnique({
      where: { serialNumber: data.serialNumber }
    });
    
    if (existingItem) {
      return NextResponse.json(
        { error: 'Item dengan serial number tersebut sudah ada' },
        { status: 409 }
      );
    }
    
    // Create the item
    const newItem = await prisma.item.create({
      data: {
        serialNumber: data.serialNumber,
        name: data.name,
        partNumber: data.partNumber,
        sensor: data.sensor || null,
        description: data.description || null,
        customerId: data.customerId || null,
        status: data.status || ItemStatus.AVAILABLE
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        type: ActivityType.ITEM_CREATED,
        action: 'Item Created',
        details: `User ${user.name} created item ${newItem.name} (${newItem.serialNumber})`,
        itemSerial: newItem.serialNumber
      }
    });
    
    // Return response with no-cache headers
    const response = NextResponse.json(newItem);
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    
    return response;
  } catch (error: any) {
    console.error('Error creating item:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Item dengan serial number tersebut sudah ada' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Gagal menambahkan item baru' },
      { status: 500 }
    );
  }
}

// PATCH - Update an item (user can update items)
export async function PATCH(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get('serialNumber');
    
    if (!serialNumber) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { 
      name,
      partNumber,
      sensor,
      description,
      customerId,
      status
    } = body;
    
    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }
    
    if (!partNumber) {
      return NextResponse.json(
        { error: 'Part number is required' },
        { status: 400 }
      );
    }
    
    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { serialNumber }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    // Update item data
    const itemData = {
      name,
      partNumber,
      sensor: sensor || null,
      description: description || null,
      customerId: customerId || null,
      status: status || existingItem.status
    };
    
    // Update the item
    const updatedItem = await prisma.item.update({
      where: { serialNumber },
      data: itemData,
      include: {
        customer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        type: ActivityType.ITEM_UPDATED,
        action: 'Item Updated',
        details: `User ${user.name} updated item ${updatedItem.name} (${updatedItem.serialNumber})`,
        itemSerial: updatedItem.serialNumber
      }
    });
    
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

// DELETE method is not implemented for users - they cannot delete items
export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: 'Delete operation not allowed for users' },
    { status: 403 }
  );
}