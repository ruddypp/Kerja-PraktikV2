import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
  id: string;
}

interface ItemWithCategory {
  id: number;
  name: string;
  serialNumber: string | null;
  status: string;
  lastVerifiedDate: Date | null;
  category: {
    id: number;
    name: string;
  }
}

interface InventoryVerification {
  id: number;
  executionId: number;
  itemId: number;
}

// GET - Retrieve a specific inventory execution by ID
export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = parseInt(params?.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid execution ID' },
        { status: 400 }
      );
    }
    
    // Get the execution record
    const execution = await prisma.inventoryExecution.findUnique({
      where: { id },
      include: {
        schedule: true
      }
    });
    
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }
    
    // Get all items for inventory check
    const items = await prisma.item.findMany({
      include: {
        category: true
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    // Get verification records for this execution
    const verifications = await prisma.inventoryVerification.findMany({
      where: {
        executionId: id
      }
    });
    
    // Map of verified item IDs
    const verifiedItemMap = new Map<number, boolean>();
    verifications.forEach((v: { itemId: number }) => verifiedItemMap.set(v.itemId, true));
    
    // Format the response
    const response = {
      id: execution.id,
      name: execution.name,
      scheduleId: execution.scheduleId,
      scheduleName: execution.schedule.name,
      date: execution.date.toISOString(),
      status: execution.status,
      items: items.map((item: ItemWithCategory) => ({
        id: item.id,
        name: item.name,
        serialNumber: item.serialNumber,
        categoryName: item.category.name,
        status: item.status,
        lastVerifiedDate: item.lastVerifiedDate ? item.lastVerifiedDate.toISOString() : null,
        verified: verifiedItemMap.has(item.id)
      }))
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching inventory execution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory execution' },
      { status: 500 }
    );
  }
} 