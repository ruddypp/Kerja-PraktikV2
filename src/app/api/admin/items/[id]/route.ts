import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
  id: string;
}

// GET a single item by ID
export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid item ID' },
        { status: 400 }
      );
    }
    
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        status: true
      }
    });
    
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item' },
      { status: 500 }
    );
  }
}

// PATCH update an item
export async function PATCH(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid item ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { name, categoryId, specification, serialNumber, statusId } = body;
    
    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }
    
    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    // Check if category exists if provided
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) }
      });
      
      if (!category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 400 }
        );
      }
    }
    
    // Check if status exists if provided
    if (statusId) {
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
    }
    
    // Update the item
    const updatedItem = await prisma.item.update({
      where: { id },
      data: {
        name,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        specification,
        serialNumber,
        statusId: statusId ? parseInt(statusId) : undefined
      },
      include: {
        category: true,
        status: true
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

// DELETE an item
export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid item ID' },
        { status: 400 }
      );
    }
    
    // Check if item exists
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        requests: true
      }
    });
    
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    // Check if item has associated requests
    if (item.requests.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete item with associated requests' },
        { status: 400 }
      );
    }
    
    // Delete the item
    await prisma.item.delete({
      where: { id }
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