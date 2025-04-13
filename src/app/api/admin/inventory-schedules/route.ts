import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all inventory schedules
export async function GET() {
  try {
    const schedules = await prisma.inventorySchedule.findMany({
      orderBy: {
        nextDate: 'asc'
      }
    });
    
    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching inventory schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory schedules' },
      { status: 500 }
    );
  }
}

// POST create a new inventory schedule
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, frequency, nextDate } = body;
    
    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Schedule name is required' },
        { status: 400 }
      );
    }
    
    if (!frequency) {
      return NextResponse.json(
        { error: 'Frequency is required' },
        { status: 400 }
      );
    }
    
    if (!nextDate) {
      return NextResponse.json(
        { error: 'Next date is required' },
        { status: 400 }
      );
    }
    
    // Validate frequency
    const validFrequencies = ['monthly', 'quarterly', 'yearly'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency. Must be monthly, quarterly, or yearly' },
        { status: 400 }
      );
    }
    
    // Create schedule
    const schedule = await prisma.inventorySchedule.create({
      data: {
        name,
        description,
        frequency,
        nextDate: new Date(nextDate)
      }
    });
    
    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory schedule' },
      { status: 500 }
    );
  }
} 