import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    // Validate ID
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID' },
        { status: 400 }
      );
    }
    
    // Find schedule
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
    console.error('Error fetching inventory schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory schedule' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { name, description, frequency, nextDate } = body;
    
    // Validate ID
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID' },
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
    
    // Validate frequency if provided
    if (frequency) {
      const validFrequencies = ['monthly', 'quarterly', 'yearly'];
      if (!validFrequencies.includes(frequency)) {
        return NextResponse.json(
          { error: 'Invalid frequency. Must be monthly, quarterly, or yearly' },
          { status: 400 }
        );
      }
    }
    
    // Update schedule
    const updatedSchedule = await prisma.inventorySchedule.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        frequency: frequency || undefined,
        nextDate: nextDate ? new Date(nextDate) : undefined
      }
    });
    
    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error('Error updating inventory schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory schedule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    // Validate ID
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID' },
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
    
    // Delete schedule
    await prisma.inventorySchedule.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory schedule' },
      { status: 500 }
    );
  }
} 