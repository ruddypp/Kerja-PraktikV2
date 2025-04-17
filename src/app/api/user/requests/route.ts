import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Define enums locally
enum ItemStatus {
  AVAILABLE = "AVAILABLE",
  IN_USE = "IN_USE",
  IN_CALIBRATION = "IN_CALIBRATION",
  IN_RENTAL = "IN_RENTAL",
  IN_MAINTENANCE = "IN_MAINTENANCE"
}

enum RequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  COMPLETED = "COMPLETED"
}

// GET - Get all requests for a specific user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') as RequestStatus | null;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Build where conditions
    const where: any = {
      userId: parseInt(userId)
    };
    
    if (status) {
      where.status = status;
    }
    
    const requests = await prisma.request.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        approvedBy: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        requestDate: 'desc'
      }
    });
    
    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching user requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

// POST - Create a new request
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, itemId, reason } = body;
    
    // Validation
    if (!userId || !itemId) {
      return NextResponse.json(
        { error: 'User ID and Item ID are required' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      );
    }
    
    // Check if item exists and is available
    const item = await prisma.item.findUnique({
      where: { id: parseInt(itemId) }
    });
    
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 400 }
      );
    }
    
    if (item.status !== ItemStatus.AVAILABLE) {
      return NextResponse.json(
        { error: 'Item is not available for request' },
        { status: 400 }
      );
    }
    
    // Create the request
    const newRequest = await prisma.request.create({
      data: {
        userId: parseInt(userId),
        itemId: parseInt(itemId),
        reason,
        status: RequestStatus.PENDING,
        requestDate: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        item: {
          select: {
            id: true,
            name: true,
            serialNumber: true
          }
        }
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: parseInt(userId),
        activity: `Created request for item: ${item.name}`
      }
    });
    
    // Create notification for admin
    await prisma.notification.create({
      data: {
        // Assuming admin has ID 1, in real app would get from configuration
        userId: 1,
        type: "REQUEST_UPDATE",
        message: `New request from ${user.name} for item: ${item.name}`,
        relatedItemId: parseInt(itemId),
        read: false,
        createdAt: new Date()
      }
    });
    
    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating request:', error);
    return NextResponse.json(
      { error: 'Failed to create request' },
      { status: 500 }
    );
  }
}

// PATCH - Return request handling
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { requestId, userId } = body;
    
    if (!requestId || !userId) {
      return NextResponse.json(
        { error: 'Request ID and User ID are required' },
        { status: 400 }
      );
    }
    
    // Check if request exists and belongs to the user
    const existingRequest = await prisma.request.findFirst({
      where: {
        id: parseInt(requestId),
        userId: parseInt(userId),
        status: RequestStatus.APPROVED
      },
      include: {
        item: true
      }
    });
    
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Approved request not found' },
        { status: 404 }
      );
    }
    
    // Update request to COMPLETED
    const updatedRequest = await prisma.request.update({
      where: { id: parseInt(requestId) },
      data: {
        status: RequestStatus.COMPLETED,
        returnDate: new Date()
      }
    });
    
    // Update item status to AVAILABLE
    await prisma.item.update({
      where: { id: existingRequest.itemId },
      data: {
        status: ItemStatus.AVAILABLE
      }
    });
    
    // Add to item history
    await prisma.itemHistory.create({
      data: {
        itemId: existingRequest.itemId,
        activityType: "RETURN",
        relatedRequestId: parseInt(requestId),
        description: "Item returned by user",
        performedById: parseInt(userId),
        date: new Date()
      }
    });
    
    // Create notification for admin
    await prisma.notification.create({
      data: {
        // Assuming admin has ID 1
        userId: 1,
        type: "REQUEST_UPDATE",
        message: `Item ${existingRequest.item.name} has been returned`,
        relatedItemId: existingRequest.itemId,
        read: false,
        createdAt: new Date()
      }
    });
    
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error processing return request:', error);
    return NextResponse.json(
      { error: 'Failed to process return request' },
      { status: 500 }
    );
  }
} 