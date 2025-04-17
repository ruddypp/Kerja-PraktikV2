import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
  id: string;
}

// GET a specific inventory schedule
export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID' },
        { status: 400 }
      );
    }
    
    const schedule = await prisma.inventorySchedule.findUnique({
      where: { id }
    });
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// PATCH update an inventory schedule
export async function PATCH(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID' },
        { status: 400 }
      );
    }
    
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
    const validFrequencies = ['MONTHLY', 'QUARTERLY', 'YEARLY'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency. Must be MONTHLY, QUARTERLY, or YEARLY' },
        { status: 400 }
      );
    }
    
    // Check if schedule exists
    const existingSchedule = await prisma.inventorySchedule.findUnique({
      where: { id }
    });
    
    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    // Update schedule
    const updatedSchedule = await prisma.inventorySchedule.update({
      where: { id },
      data: {
        name,
        description,
        frequency: frequency as any,
        nextDate: new Date(nextDate)
      }
    });
    
    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

// DELETE an inventory schedule
export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID' },
        { status: 400 }
      );
    }
    
    // Check if schedule exists
    const schedule = await prisma.inventorySchedule.findUnique({
      where: { id }
    });
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    await prisma.inventorySchedule.delete({
      where: { id }
    });
    
    return NextResponse.json({ 
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
} 