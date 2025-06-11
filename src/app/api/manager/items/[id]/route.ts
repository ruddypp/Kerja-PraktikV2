import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
  id: string;
}

// GET a single item by ID
export async function GET(
  request: Request,
  context: { params: Params }
) {
  try {
    const params = await context.params;
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
  context: { params: Params }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid item ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { name, categoryId, specification, serialNumber, statusId, lastVerifiedDate } = body;
    
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
        statusId: statusId ? parseInt(statusId) : undefined,
        lastVerifiedDate: lastVerifiedDate !== undefined ? lastVerifiedDate : existingItem.lastVerifiedDate
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
  context: { params: Params }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    
    // Get force delete parameter from query string
    const url = new URL(request.url);
    const forceDelete = url.searchParams.get('force') === 'true';
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid item ID' },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Check if item exists with all related entities
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        requests: {
          include: {
            calibration: true,
            rental: true,
            documents: true
          }
        },
        itemHistory: true
      }
    });
    
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // If item has associated requests and force delete is not enabled
    if (item.requests && item.requests.length > 0 && !forceDelete) {
      // Find the "Retired" or similar status for items
      const retiredStatus = await prisma.status.findFirst({
        where: {
          name: { in: ['Retired', 'RETIRED', 'retired', 'Inactive', 'INACTIVE', 'inactive'] },
          type: 'item'
        }
      });
      
      // If retired status doesn't exist, create it
      let statusId;
      if (!retiredStatus) {
        const newStatus = await prisma.status.create({
          data: {
            name: 'RETIRED',
            type: 'item'
          }
        });
        statusId = newStatus.id;
      } else {
        statusId = retiredStatus.id;
      }
      
      // Update the item to retired status instead of deleting
      const updatedItem = await prisma.item.update({
        where: { id },
        data: {
          statusId: statusId
        },
        include: {
          category: true,
          status: true
        }
      });
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Item marked as retired because it has associated requests',
          item: updatedItem
        },
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // If force delete is enabled, cascade delete all related records
    if (forceDelete) {
      try {
        // Use a transaction for the entire deletion process
        await prisma.$transaction(async (tx) => {
          // Delete in this specific order to avoid foreign key constraint issues
          
          // 1. First, remove any itemHistory entries
          if (item.itemHistory && item.itemHistory.length > 0) {
            await tx.itemHistory.deleteMany({
              where: { itemId: id }
            });
          }
          
          // 2. Process each request and its related records
          for (const request of item.requests) {
            // 2a. Delete any documents attached to the request
            if (request.documents && request.documents.length > 0) {
              await tx.document.deleteMany({
                where: { requestId: request.id }
              });
            }
            
            // 2b. Delete any calibration record if it exists
            if (request.calibration) {
              await tx.calibration.delete({
                where: { id: request.calibration.id }
              });
            }
            
            // 2c. Delete any rental record if it exists
            if (request.rental) {
              await tx.rental.delete({
                where: { id: request.rental.id }
              });
            }
            
            // 2d. Finally delete the request itself
            await tx.request.delete({
              where: { id: request.id }
            });
          }
          
          // 3. Finally delete the item itself
          await tx.item.delete({
            where: { id }
          });
        });
        
        return NextResponse.json(
          { 
            success: true,
            message: 'Item and all associated records have been permanently deleted'
          },
          { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } catch (txError) {
        console.error('Transaction error during deletion:', txError);
        return NextResponse.json(
          { error: 'Failed to delete item and its related records. Please try again.' },
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      // If no associated requests, just delete the item
      await prisma.item.delete({
        where: { id }
      });
      
      return NextResponse.json(
        { 
          success: true,
          message: 'Item deleted successfully'
        },
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 