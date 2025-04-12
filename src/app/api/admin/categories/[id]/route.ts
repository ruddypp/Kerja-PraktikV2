import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
  id: string;
}

// GET a single category by ID
export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }
    
    const category = await prisma.category.findUnique({
      where: { id }
    });
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

// PATCH update a category
export async function PATCH(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { name, description } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }
    
    // Check if category exists
    const exists = await prisma.category.findUnique({
      where: { id }
    });
    
    if (!exists) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        description: description ?? exists.description
      }
    });
    
    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE a category
export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }
    
    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        items: true
      }
    });
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    // Check if category has items
    if (category.items.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with associated items' },
        { status: 400 }
      );
    }
    
    // Delete the category
    await prisma.category.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
} 