import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Get authenticated user and verify admin status
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get schedule ID from request body
    const body = await request.json();
    const { scheduleId } = body;
    
    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the schedule exists
    const schedule = await prisma.inventoryCheck.findUnique({
      where: { id: scheduleId }
    });
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    if (schedule.completedDate) {
      return NextResponse.json(
        { error: 'This inventory check has already been completed' },
        { status: 400 }
      );
    }
    
    // Create a new inventory check record
    const inventoryCheck = await prisma.inventoryCheck.update({
      where: { id: scheduleId },
      data: {
        completedDate: new Date()
      }
    });
    
      // Get all items
    const items = await prisma.item.findMany();
      
    // Update items and create inventory check items
      for (const item of items) {
      // Update lastVerifiedAt for the item
      await prisma.item.update({
        where: { serialNumber: item.serialNumber },
        data: { lastVerifiedAt: new Date() }
        });
        
      // Create inventory check item record
      await prisma.inventoryCheckItem.create({
          data: {
          checkId: scheduleId,
          itemSerial: item.serialNumber,
          verifiedStatus: item.status,
          notes: `Verified during scheduled inventory check`
        }
      });
      
      // Create history record for each item
      await prisma.itemHistory.create({
        data: {
          itemSerial: item.serialNumber,
          action: 'VERIFIED',
          details: `Verified during scheduled inventory check`,
          startDate: new Date()
        }
      });
    }
    
    // Create activity log
    await prisma.activityLog.create({
      data: {
          userId: user.id,
        action: 'INVENTORY_CHECK',
        details: `Performed scheduled inventory check`
        }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Inventory check completed successfully'
    });
  } catch (error) {
    console.error('Error performing inventory check:', error);
    return NextResponse.json(
      { error: 'Failed to perform inventory check' },
      { status: 500 }
    );
  }
} 