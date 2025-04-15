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
    const { statusId, approvedBy, rejectionReason } = body;
    
    if (!statusId) {
      return NextResponse.json(
        { error: 'Status ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Updating request ${id} to status ${statusId}, rejectionReason: ${rejectionReason || 'none'}`);
    
    // Check if request exists
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
    
    // Check if status exists
    const status = await prisma.status.findFirst({
      where: { 
        id: parseInt(statusId),
        type: 'request'
      }
    });
    
    if (!status) {
      const allStatuses = await prisma.status.findMany({
        where: { type: 'request' }
      });
      console.log('Available request statuses:', allStatuses);
      
      return NextResponse.json(
        { error: `Invalid status for request. Status ID ${statusId} not found with type 'request'` },
        { status: 400 }
      );
    }
    
    console.log(`Found status: ${status.name} (ID: ${status.id})`);
    
    // Update request with additional notes field for rejected status
    const updateData: Record<string, any> = {
      status: {
        connect: { id: parseInt(statusId) }
      },
      approvedBy: approvedBy ? parseInt(approvedBy) : null
    };
    
    // If rejected, add rejection reason to notes
    if (status.name.toLowerCase() === 'rejected' && rejectionReason) {
      updateData.notes = rejectionReason;
      console.log(`Adding rejection reason to notes: ${rejectionReason}`);
    }
    
    try {
      // Update request
      const updatedRequest = await prisma.request.update({
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
      
      console.log(`Request updated successfully: ${JSON.stringify(updatedRequest)}`);
      
      // Handle request-specific status changes
      const statusName = status.name.toLowerCase();
      
      // If approving a calibration request
      if (statusName === 'approved' && existingRequest.requestType === 'calibration') {
        // Get IN_CALIBRATION status for items
        const inCalibrationStatus = await prisma.status.findFirst({
          where: {
            name: {
              mode: 'insensitive',
              contains: 'in_calibration'
            },
            type: 'item'
          }
        });
        
        if (inCalibrationStatus) {
          // Update item status to IN_CALIBRATION
          await prisma.item.update({
            where: { id: existingRequest.itemId },
            data: {
              status: {
                connect: { id: inCalibrationStatus.id }
              }
            }
          });
          
          // Create appropriate notifications
          await prisma.notification.create({
            data: {
              userId: existingRequest.userId,
              message: `Your calibration request for ${existingRequest.item.name} has been approved`,
              isRead: false
            }
          });
          
          // Log the activity
          await prisma.activityLog.create({
            data: {
              userId: approvedBy ? parseInt(approvedBy) : 1,
              activity: `Calibration request for ${existingRequest.item.name} approved`
            }
          });
        }
      }
      
      // If rejecting a request
      if (statusName === 'rejected') {
        console.log(`Processing rejection for request ${id}`);
        
        // Get AVAILABLE status for item
        const availableStatus = await prisma.status.findFirst({
          where: {
            name: {
              mode: 'insensitive',
              contains: 'available'
            },
            type: 'item'
          }
        });
        
        if (availableStatus) {
          console.log(`Found available status: ${availableStatus.name} (ID: ${availableStatus.id})`);
          
          // Update item status back to AVAILABLE
          const updatedItem = await prisma.item.update({
            where: { id: existingRequest.itemId },
            data: {
              status: {
                connect: { id: availableStatus.id }
              }
            }
          });
          
          console.log(`Item updated successfully: ${JSON.stringify(updatedItem)}`);
        } else {
          console.log('No available status found for item');
        }
        
        try {
          // Create appropriate notifications
          const notification = await prisma.notification.create({
            data: {
              userId: existingRequest.userId,
              message: `Your ${existingRequest.requestType} request for ${existingRequest.item.name} has been rejected${rejectionReason ? ': ' + rejectionReason : ''}`,
              isRead: false
            }
          });
          
          console.log(`Notification created: ${JSON.stringify(notification)}`);
          
          // Log the activity
          const activity = await prisma.activityLog.create({
            data: {
              userId: approvedBy ? parseInt(approvedBy) : 1,
              activity: `${existingRequest.requestType} request for ${existingRequest.item.name} rejected`
            }
          });
          
          console.log(`Activity log created: ${JSON.stringify(activity)}`);
        } catch (notificationError) {
          console.error('Error creating notification or activity log:', notificationError);
          // Continue with the request update even if notification fails
        }
      }
      
      // If completing, update the item status back to available
      if (statusName === 'completed') {
        // Get "Available" status ID
        const availableStatus = await prisma.status.findFirst({
          where: {
            name: {
              mode: 'insensitive',
              contains: 'available'
            },
            type: 'item'
          }
        });
        
        if (availableStatus) {
          await prisma.item.update({
            where: { id: existingRequest.itemId },
            data: {
              status: {
                connect: { id: availableStatus.id }
              }
            }
          });
        }
      }
      
      return NextResponse.json(updatedRequest);
    } catch (updateError) {
      console.error('Error updating request:', updateError);
      return NextResponse.json(
        { error: `Failed to update request: ${(updateError as Error).message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing request update:', error);
    return NextResponse.json(
      { error: `Failed to update request status: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}