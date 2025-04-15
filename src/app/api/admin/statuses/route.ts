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

// POST create a new status
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type } = body;
    
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }
    
    // Check if status already exists
    const existingStatus = await prisma.status.findFirst({
      where: {
        AND: [
          {
            name: {
              mode: 'insensitive',
              contains: name
            }
          },
          {
            type: {
              mode: 'insensitive',
              equals: type
            }
          }
        ]
      }
    });
    
    if (existingStatus) {
      return NextResponse.json(existingStatus);
    }
    
    // Create new status
    const newStatus = await prisma.status.create({
      data: {
        name: name.toLowerCase(),
        type: type.toLowerCase()
      }
    });
    
    return NextResponse.json(newStatus, { status: 201 });
  } catch (error) {
    console.error('Error creating status:', error);
    return NextResponse.json(
      { error: 'Failed to create status' },
      { status: 500 }
    );
  }
} 