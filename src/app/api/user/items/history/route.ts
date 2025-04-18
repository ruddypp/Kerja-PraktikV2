import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

// GET item history by serialNumber
export async function GET(request: Request) {
  try {
    // Verify user is authenticated
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get serialNumber from query params
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get('serialNumber');
    
    if (!serialNumber) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }
    
    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { serialNumber }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    // Get item history
    const itemHistory = await prisma.itemHistory.findMany({
      where: { itemSerial: serialNumber },
      orderBy: { startDate: 'desc' }
    });
    
    // Get activity logs related to the item
    const activityLogs = await prisma.activityLog.findMany({
      where: { itemSerial: serialNumber },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Get calibrations for the item
    const calibrations = await prisma.calibration.findMany({
      where: { itemSerial: serialNumber },
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Get maintenances for the item
    const maintenances = await prisma.maintenance.findMany({
      where: { itemSerial: serialNumber },
      orderBy: { createdAt: 'desc' }
    });
    
    // Combine all history data
    const history = {
      item: existingItem,
      itemHistory,
      activityLogs,
      calibrations,
      maintenances
    };
    
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching item history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item history' },
      { status: 500 }
    );
  }
} 