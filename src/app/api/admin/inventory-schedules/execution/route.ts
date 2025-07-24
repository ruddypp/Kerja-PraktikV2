import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { ActivityType, Item } from '@prisma/client';

// POST - Create or get an ongoing inventory execution for a schedule
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { scheduleId } = body;

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    const schedule = await prisma.inventoryCheck.findUnique({
      where: { id: scheduleId },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }


    let execution = await prisma.inventoryCheckExecution.findFirst({
      where: {
        scheduleId: scheduleId,
        status: 'IN_PROGRESS',
      },
    });

    if (!execution) {

      execution = await prisma.inventoryCheckExecution.create({
        data: {
          name: `Execution for: ${schedule.name || 'Unnamed Schedule'}`,
          scheduleId: scheduleId,
          userId: user.id,
          status: 'IN_PROGRESS',
          date: new Date(),
        },
      });

      // We don't have a specific activity type for this, so we'll use a generic one.
      // Consider adding INVENTORY_EXECUTION_STARTED to the enum in schema.prisma later.
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          type: ActivityType.ITEM_UPDATED, // Using a generic type for now
          action: 'Inventory Execution Started',
          details: `Started execution for schedule: ${schedule.name || 'Unnamed Schedule'}`,
        },
      });
    }

    // Get items already verified in this specific execution
    const verifiedExecutionItems = await prisma.inventoryCheckExecutionItem.findMany({
      where: { executionId: execution.id },
      select: { itemSerial: true, verified: true },
    });
    const verifiedItemMap = new Map(
      verifiedExecutionItems.map((i: { itemSerial: string; verified: boolean }) => [i.itemSerial, i.verified])
    );

    // Use the items from the schedule itself, not all items from the database
    const responseItems = schedule.items.map(({ item }: { item: Item }) => ({
      serialNumber: item.serialNumber,
      name: item.name,
      status: item.status,
      lastVerifiedAt: item.lastVerifiedAt?.toISOString() || null,
      verified: verifiedItemMap.get(item.serialNumber) || false,
    }));

    const response = {
      executionId: execution.id,
      name: execution.name,
      scheduleId: execution.scheduleId,
      scheduleName: schedule.name || 'Unnamed Schedule',
      date: execution.date.toISOString(),
      status: execution.status,
      items: responseItems,
    };

    return NextResponse.json(response, { status: 200 }); // Use 200 for 'OK' since we might be fetching an existing one
  } catch (error) {
    console.error('[API] Error creating/fetching inventory execution:', error);
    return NextResponse.json(
      { error: 'Failed to create or fetch inventory execution' },
      { status: 500 }
    );
  }
} 