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

interface Params {
  id: string;
}

// GET a specific request
export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }
    
    const req = await prisma.request.findUnique({
      where: { id },
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
      }
    });
    
    if (!req) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(req);
  } catch (error) {
    console.error('Error fetching request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    );
  }
}

// PATCH - Update request status (approve, reject, complete)
export async function PATCH(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { status, approvedById } = body;
    
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }
    
    // Get the current request to check its status
    const currentRequest = await prisma.request.findUnique({
      where: { id },
      include: {
        item: true
      }
    });
    
    if (!currentRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    // Process based on the status change
    let itemStatusUpdate = {};
    let activityType = "";
    let activityDescription = "";
    
    switch (status) {
      case RequestStatus.APPROVED:
        if (currentRequest.status !== RequestStatus.PENDING) {
          return NextResponse.json(
            { error: 'Only pending requests can be approved' },
            { status: 400 }
          );
        }
        
        if (!approvedById) {
          return NextResponse.json(
            { error: 'Approver ID is required for approval' },
            { status: 400 }
          );
        }
        
        // Update the item status to IN_USE
        itemStatusUpdate = { status: ItemStatus.IN_USE };
        activityType = "USAGE";
        activityDescription = `Request approved by admin, item status changed to IN_USE`;
        break;
        
      case RequestStatus.REJECTED:
        if (currentRequest.status !== RequestStatus.PENDING) {
          return NextResponse.json(
            { error: 'Only pending requests can be rejected' },
            { status: 400 }
          );
        }
        
        activityDescription = `Request rejected by admin`;
        break;
        
      case RequestStatus.COMPLETED:
        if (currentRequest.status !== RequestStatus.APPROVED) {
          return NextResponse.json(
            { error: 'Only approved requests can be completed' },
            { status: 400 }
          );
        }
        
        // Update the item status back to AVAILABLE
        itemStatusUpdate = { status: ItemStatus.AVAILABLE };
        activityType = "RETURN";
        activityDescription = `Request completed, item returned and status changed to AVAILABLE`;
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid status update' },
          { status: 400 }
        );
    }
    
    // Update the request
    const updateData: any = {
      status: status as RequestStatus
    };
    
    // Add approvedById if provided
    if (approvedById) {
      updateData.approvedById = parseInt(approvedById);
    }
    
    // If completing the request, add returnDate
    if (status === RequestStatus.COMPLETED) {
      updateData.returnDate = new Date();
    }
    
    // Start a transaction to update both request and item if needed
    const [updatedRequest] = await prisma.$transaction([
      // Update the request
      prisma.request.update({
        where: { id },
        data: updateData,
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
          approvedBy: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      
      // Update the item status if needed
      ...Object.keys(itemStatusUpdate).length > 0 
        ? [
            prisma.item.update({
              where: { id: currentRequest.itemId },
              data: itemStatusUpdate
            })
          ] 
        : [],
        
      // Add to item history
      ...activityType 
        ? [
            prisma.itemHistory.create({
              data: {
                itemId: currentRequest.itemId,
                activityType: activityType as any,
                relatedRequestId: id,
                description: activityDescription,
                performedById: approvedById ? parseInt(approvedById) : 1, // Default to admin id 1 if not provided
                date: new Date()
              }
            })
          ] 
        : [],
        
      // Create notification for the user
      prisma.notification.create({
        data: {
          userId: currentRequest.userId,
          type: "REQUEST_UPDATE",
          message: `Your request for "${currentRequest.item.name}" has been ${status.toLowerCase()}`,
          relatedItemId: currentRequest.itemId,
          read: false,
          createdAt: new Date()
        }
      })
    ]);
    
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a request
export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }
    
    // Check if request exists
    const req = await prisma.request.findUnique({
      where: { id }
    });
    
    if (!req) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    // Only pending requests can be deleted
    if (req.status !== RequestStatus.PENDING) {
      return NextResponse.json(
        { error: 'Only pending requests can be deleted' },
        { status: 400 }
      );
    }
    
    await prisma.request.delete({
      where: { id }
    });
    
    return NextResponse.json({ 
      message: 'Request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting request:', error);
    return NextResponse.json(
      { error: 'Failed to delete request' },
      { status: 500 }
    );
  }
}