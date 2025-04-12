import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
  id: string;
}

// GET specific request by ID
export async function GET(
  request: Request, 
  { params }: { params: Params }
) {
  try {
    // Ensure we await the params object to resolve
    await Promise.resolve();
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }
    
    const requestData = await prisma.request.findUnique({
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
    
    if (!requestData) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(requestData);
  } catch (error) {
    console.error('Error fetching request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    );
  }
}

// PATCH update request status
export async function PATCH(
  request: Request, 
  { params }: { params: Params }
) {
  try {
    // Ensure we await the params object to resolve
    await Promise.resolve();
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { statusId, approvedBy } = body;
    
    if (!statusId) {
      return NextResponse.json(
        { error: 'Status ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Updating request ${id} to status ${statusId}`);
    
    // Check if request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id },
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
        { error: `Invalid status for request. Status ID ${statusId} not found with type 'request'` },
        { status: 400 }
      );
    }
    
    console.log(`Found status: ${status.name} (ID: ${status.id})`);
    
    // Update request
    const updatedRequest = await prisma.request.update({
      where: { id },
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
    
    // If approving, update the item status if needed (for rental or calibration)
    if (status.name === 'APPROVED') {
      if (existingRequest.requestType === 'rental') {
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
      } else if (existingRequest.requestType === 'calibration') {
        // Get "In Calibration" status ID
        const inCalibrationStatus = await prisma.status.findFirst({
          where: {
            name: 'In Calibration',
            type: 'item'
          }
        });
        
        if (inCalibrationStatus) {
          await prisma.item.update({
            where: { id: existingRequest.itemId },
            data: {
              statusId: inCalibrationStatus.id
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