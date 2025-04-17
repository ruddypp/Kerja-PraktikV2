import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Define enums locally since they might not be directly accessible
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

// GET all requests with filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as RequestStatus | null;
    const search = searchParams.get('search');
    
    // Build where conditions
    const where: any = {};
    
    if (statusFilter) {
      where.status = statusFilter;
    }
    
    if (search) {
      where.OR = [
        { reason: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { item: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    const requests = await prisma.request.findMany({
      where,
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
            serialNumber: true,
            status: true
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
    console.error('Error fetching requests:', error);
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
    
    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating request:', error);
    return NextResponse.json(
      { error: 'Failed to create request' },
      { status: 500 }
    );
  }
}

// POST update request status (approve, reject, complete)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, statusId, approvedBy } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }
    
    if (!statusId) {
      return NextResponse.json(
        { error: 'Status ID is required' },
        { status: 400 }
      );
    }
    
    // Check if request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id: parseInt(id) },
      include: {
        item: true
      }
    });
    
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    // Check if status exists
    const status = await prisma.status.findFirst({
      where: { 
        id: parseInt(statusId),
        type: 'request'
      }
    });
    
    if (!status) {
      return NextResponse.json(
        { error: 'Invalid status for request' },
        { status: 400 }
      );
    }
    
    // Update request
    const updatedRequest = await prisma.request.update({
      where: { id: parseInt(id) },
      data: {
        statusId: parseInt(statusId),
        approvedBy: approvedBy ? parseInt(approvedBy) : null
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
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        status: true
      }
    });
    
    // If approving, update the item status if needed (for using item)
    if (status.name === 'APPROVED') {
      if (existingRequest.requestType === 'request') {
        // Get "In Use" status ID
        const inUseStatus = await prisma.status.findFirst({
          where: {
            name: 'In Use',
            type: 'item'
          }
        });
        
        if (inUseStatus) {
          await prisma.item.update({
            where: { id: existingRequest.itemId },
            data: {
              statusId: inUseStatus.id
            }
          });
        }
      } 
    }
    
    // If completing, update the item status back to available
    if (status.name === 'COMPLETED') {
      // Get "Available" status ID
      const availableStatus = await prisma.status.findFirst({
        where: {
          name: 'Available',
          type: 'item'
        }
      });
      
      if (availableStatus) {
        await prisma.item.update({
          where: { id: existingRequest.itemId },
          data: {
            statusId: availableStatus.id
          }
        });
      }
    }
    
    // Create an activity log entry
    await prisma.activityLog.create({
      data: {
        userId: approvedBy ? parseInt(approvedBy) : 1, // Default to admin if no approver
        activity: `Request ${id} status updated to ${status.name}`
      }
    });
    
    // Create a notification for the user
    await prisma.notification.create({
      data: {
        userId: existingRequest.userId,
        message: `Your request for ${existingRequest.item.name} has been ${status.name.toLowerCase()}`
      }
    });
    
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    );
  }
} 