import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
  id: string;
}

// POST reject a request
export async function POST(
  request: Request, 
  { params }: { params: Params }
) {
  try {
    // Parse request ID
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { rejectionReason, approvedBy } = body;
    
    console.log(`Rejecting request ${id} with reason: ${rejectionReason || 'none'}`);
    
    // Find the request
    const existingRequest = await prisma.request.findUnique({
      where: { id },
      include: {
        item: true,
        status: true
      }
    });
    
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    // Find the rejected status
    const rejectedStatus = await prisma.status.findFirst({
      where: { 
        name: { contains: 'rejected', mode: 'insensitive' },
        type: 'REQUEST'
      }
    });
    
    // If rejected status doesn't exist, create it
    let finalRejectedStatus = rejectedStatus;
    if (!rejectedStatus) {
      console.log('Creating REJECTED status for REQUEST type');
      finalRejectedStatus = await prisma.status.create({
        data: {
          name: 'rejected',
          type: 'request'
        }
      });
      console.log('Created rejected status:', finalRejectedStatus);
    }
    
    if (!finalRejectedStatus) {
      return NextResponse.json(
        { error: 'Failed to find or create rejected status' },
        { status: 500 }
      );
    }
    
    // Find available status for the item
    const availableStatus = await prisma.status.findFirst({
      where: {
        name: { contains: 'available', mode: 'insensitive' },
        type: { mode: 'insensitive', equals: 'item' }
      }
    });
    
    if (!availableStatus) {
      return NextResponse.json(
        { error: 'Available status not found for item' },
        { status: 500 }
      );
    }
    
    // Perform database operations in a transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update the request status
      const updatedRequest = await tx.request.update({
        where: { id },
        data: {
          status: {
            connect: { id: finalRejectedStatus.id }
          },
          reason: rejectionReason,
          approver: approvedBy ? {
            connect: { id: parseInt(approvedBy.toString()) }
          } : undefined
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
          status: true
        }
      });
      
      // Update the item status to available
      const updatedItem = await tx.item.update({
        where: { id: existingRequest.itemId },
        data: {
          status: {
            connect: { id: availableStatus.id }
          }
        }
      });
      
      // Create a notification
      const notification = await tx.notification.create({
        data: {
          userId: existingRequest.userId,
          message: `Your ${existingRequest.requestType} request for ${existingRequest.item.name} has been rejected${rejectionReason ? ': ' + rejectionReason : ''}`,
          isRead: false
        }
      });
      
      // Log the activity
      const activity = await tx.activityLog.create({
        data: {
          userId: approvedBy ? parseInt(approvedBy.toString()) : 1,
          activity: `${existingRequest.requestType} request for ${existingRequest.item.name} rejected`
        }
      });
      
      return { 
        updatedRequest, 
        updatedItem, 
        notification,
        activity
      };
    });
    
    return NextResponse.json({
      message: 'Request rejected successfully',
      data: result.updatedRequest
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    return NextResponse.json(
      { error: `Failed to reject request: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 