import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ItemStatus } from '@prisma/client';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

// GET all items
export async function GET(request: Request) {
  try {
    console.log('Admin items API called');
    
    // Verifikasi admin
    const user = await getUserFromRequest(request);
    console.log('User from request:', user ? `${user.name} (${user.role})` : 'Not authenticated');
    
    if (!isAdmin(user)) {
      console.log('User is not admin, returning unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    console.log('Query params:', { category, status, search, page, limit, skip });
    
    // Build where conditions with proper typing
    const where: any = {};
    
    if (category && category !== 'all') {
      where.category = category;
    }
    
    if (status && status !== 'all') {
      where.status = status as ItemStatus;
    }
    
    if (search && search.trim() !== '') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    console.log('Database query where clause:', where);
    
    // Get total count for pagination
    const totalItems = await prisma.item.count({ where });
    
    // Create the actual data fetch promise, including maintenance and calibration history
    const items = await prisma.item.findMany({
      where,
      include: {
        customer: true,
        calibrations: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        maintenances: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        rentals: {
          where: {
            status: 'APPROVED',
            returnDate: null
          },
          take: 1,
        }
      },
      orderBy: {
        name: 'asc'
      },
      skip: skip,
      take: limit
    });
    
    console.log(`Found ${items.length} items in database (page ${page} of ${Math.ceil(totalItems / limit)})`);
    
    // Return paginated response
    return NextResponse.json({
      items: items || [],
      total: totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit)
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    // Return empty array instead of error to prevent UI crash
    return NextResponse.json({ 
      items: [], 
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0
    });
  }
}

// POST create a new item
export async function POST(request: Request) {
  try {
    // Verifikasi admin
    const user = await getUserFromRequest(request);
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { 
      serialNumber,
      name,
      partNumber,
      category,
      sensor,
      description,
      customerId,
      status
    } = body;
    
    // Validation
    if (!serialNumber) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }
    
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
    
    // Check if item with same serial number already exists
    const existingItem = await prisma.item.findUnique({
      where: { serialNumber }
    });
    
    if (existingItem) {
      return NextResponse.json(
        { error: 'An item with this serial number already exists' },
        { status: 409 }
      );
    }
    
    // Create item data object with proper typing
    const itemData: any = {
      serialNumber,
      name,
      partNumber,
      sensor: sensor || null,
      description: description || null,
      customerId: customerId || null,
      status: status || ItemStatus.AVAILABLE
    };
    
    // Add category if provided
    if (category) {
      itemData.category = category;
    }
    
    // Create item
    const item = await prisma.item.create({
      data: itemData
    });
    
    // Create a history entry for the new item
    await prisma.itemHistory.create({
      data: {
        itemSerial: item.serialNumber,
        action: 'ADDED',
        details: 'Item added to inventory',
      }
    });
    
    // Create an activity log
    await prisma.activityLog.create({
      data: {
        user: { connect: { id: user?.id || '' } },
        item: { connect: { serialNumber: serialNumber } },
        action: 'ADDED',
        details: `Item ${name} (${serialNumber}) added to inventory`
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

// PATCH update an item
export async function PATCH(request: Request) {
  try {
    // Verifikasi admin
    const user = await getUserFromRequest(request);
    if (!isAdmin(user)) {
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
    
    console.log('PATCH - Received update request for item:', serialNumber);
    console.log('PATCH - Request body:', body);
    console.log('PATCH - Customer ID value:', customerId);
    
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
    
    console.log('PATCH - Existing item:', existingItem);
    
    // Update item data object with proper typing
    const itemData: any = {
      name,
      partNumber,
      sensor: sensor || null,
      description: description || null,
      customerId: customerId || null,
      status: status || existingItem.status
    };
    
    console.log('PATCH - Item data to update:', itemData);
    
    // Update the item
    const updatedItem = await prisma.item.update({
      where: { serialNumber },
      data: itemData,
      include: {
        customer: true
      }
    });
    
    console.log('PATCH - Updated item:', updatedItem);
    
    // Create an activity log
    await prisma.activityLog.create({
      data: {
        user: { connect: { id: user?.id || '' } },
        item: { connect: { serialNumber } },
        action: 'UPDATED',
        details: `Item ${name} (${serialNumber}) updated`
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

// DELETE method for items
export async function DELETE(request: Request) {
  try {
    // Verify admin
    const user = await getUserFromRequest(request);
    if (!isAdmin(user)) {
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
    
    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { serialNumber },
      include: {
        calibrations: true,
        rentals: true,
        maintenances: true,
        histories: true
      }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    // Check if item has related records
    const hasRelatedRecords = 
      (existingItem.calibrations && existingItem.calibrations.length > 0) ||
      (existingItem.rentals && existingItem.rentals.length > 0) ||
      (existingItem.maintenances && existingItem.maintenances.length > 0);
    
    if (hasRelatedRecords) {
      return NextResponse.json(
        { 
          error: 'Cannot delete item with related records',
          count: 
            (existingItem.calibrations?.length || 0) +
            (existingItem.rentals?.length || 0) +
            (existingItem.maintenances?.length || 0)
        },
        { status: 409 }
      );
    }
    
    // Delete item history first (to avoid foreign key constraints)
    if (existingItem.histories && existingItem.histories.length > 0) {
      await prisma.itemHistory.deleteMany({
        where: { itemSerial: serialNumber }
      });
    }
    
    // Delete the actual item
    await prisma.item.delete({
      where: { serialNumber }
    });
    
    // Create activity log for deletion
    await prisma.activityLog.create({
      data: {
        userId: user?.id || '',
        action: 'DELETED',
        details: `Item ${existingItem.name} (${serialNumber}) deleted from inventory`
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
} 