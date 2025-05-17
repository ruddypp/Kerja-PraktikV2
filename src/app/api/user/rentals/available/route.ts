import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ItemStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get available items (status = AVAILABLE)
    const availableItems = await prisma.item.findMany({
      where: {
        status: ItemStatus.AVAILABLE
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(availableItems);
  } catch (error) {
    console.error('Error fetching available items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available items' },
      { status: 500 }
    );
  }
} 