import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all statuses, optionally filtered by type
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    const where = type ? { type } : {};
    
    const statuses = await prisma.status.findMany({
      where,
      orderBy: {
        id: 'asc'
      }
    });
    
    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error fetching statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statuses' },
      { status: 500 }
    );
  }
} 