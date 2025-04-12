import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decodeToken } from '@/lib/auth';

// GET all requests for current user
export async function GET(request: Request) {
  try {
    // Get user ID from auth token in cookies
    let userId = 2; // Default to mock user ID
    
    try {
      // Get token from cookies manually (similar to auth/me/route.ts)
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => {
          const [name, ...value] = c.split('=');
          return [name, value.join('=')];
        })
      );
      
      const token = cookies['auth_token'];
      
      if (token) {
        const userData = decodeToken(token);
        if (userData?.id) {
          userId = userData.id;
        }
      }
    } catch (authError) {
      console.error('Error getting user from token:', authError);
    }
    
    const { searchParams } = new URL(request.url);
    const requestType = searchParams.get('requestType');
    const statusId = searchParams.get('statusId');
    
    // Build where conditions
    const where: Record<string, unknown> = {
      userId: userId // Only requests for current user
    };
    
    if (requestType) {
      where.requestType = requestType;
    }
    
    if (statusId) {
      where.statusId = parseInt(statusId);
    }
    
    try {
      const requests = await prisma.request.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              name: true,
              serialNumber: true,
              status: true
            }
          },
          status: true
        },
        orderBy: {
          requestDate: 'desc'
        }
      });
      
      return NextResponse.json(requests);
    } catch (dbError) {
      // Return empty array if there's a database error
      console.error('Database error:', dbError);
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error fetching user requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

// POST create a new request
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, requestType, reason } = body;
    
    // Get user ID from auth token in cookies
    let userId = 2; // Default to mock user ID
    
    try {
      // Get token from cookies manually
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => {
          const [name, ...value] = c.split('=');
          return [name, value.join('=')];
        })
      );
      
      const token = cookies['auth_token'];
      
      if (token) {
        const userData = decodeToken(token);
        if (userData?.id) {
          userId = userData.id;
        }
      }
    } catch (authError) {
      console.error('Error getting user from token:', authError);
    }
    
    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }
    
    if (!requestType) {
      return NextResponse.json(
        { error: 'Request type is required' },
        { status: 400 }
      );
    }
    
    // Verify if the item exists and is available
    const item = await prisma.item.findUnique({
      where: { id: parseInt(itemId) },
      include: { status: true }
    });
    
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    // If item is not available, reject request
    const availableNames = ['Available', 'AVAILABLE', 'available'];
    if (!availableNames.includes(item.status.name)) {
      return NextResponse.json(
        { error: 'Item is not available for request. Current status: ' + item.status.name },
        { status: 400 }
      );
    }
    
    // Get or create PENDING status for requests
    let pendingStatus = await prisma.status.findFirst({
      where: {
        name: 'PENDING',
        type: 'request'
      }
    });
    
    // If PENDING status doesn't exist, create it
    if (!pendingStatus) {
      console.log('Creating PENDING status for requests');
      pendingStatus = await prisma.status.create({
        data: {
          name: 'PENDING',
          type: 'request',
        }
      });
    }
    
    // Create the request
    const newRequest = await prisma.request.create({
      data: {
        userId: userId,
        itemId: parseInt(itemId),
        requestType,
        reason: reason || null,
        requestDate: new Date(),
        statusId: pendingStatus.id
      },
      include: {
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
    
    // Create an activity log entry
    await prisma.activityLog.create({
      data: {
        userId: userId,
        activity: `New ${requestType} request created for item ${item.name}`
      }
    });
    
    // Notify admin (in a real app, you'd use email/push notifications)
    await prisma.notification.create({
      data: {
        userId: 1, // Admin user ID
        message: `New ${requestType} request from user ID ${userId} for item ${item.name}`,
        isRead: false
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

// PATCH update a request (for return requests)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action } = body;
    
    // Get user ID from auth token in cookies
    let userId = 2; // Default to mock user ID
    
    try {
      // Get token from cookies manually
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => {
          const [name, ...value] = c.split('=');
          return [name, value.join('=')];
        })
      );
      
      const token = cookies['auth_token'];
      
      if (token) {
        const userData = decodeToken(token);
        if (userData?.id) {
          userId = userData.id;
        }
      }
    } catch (authError) {
      console.error('Error getting user from token:', authError);
    }
    
    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }
    
    if (action !== 'return') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
    
    // Verify if the request exists and belongs to the user
    const existingRequest = await prisma.request.findUnique({
      where: { 
        id: parseInt(id),
        userId: userId
      },
      include: {
        item: true,
        status: true
      }
    });
    
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Check if request is in the right state to be returned (must be APPROVED)
    // Accept variations of APPROVED status name
    const approvedNames = ['APPROVED', 'Approved', 'approved'];
    if (!approvedNames.includes(existingRequest.status.name)) {
      return NextResponse.json(
        { error: 'Only approved requests can be returned' },
        { status: 400 }
      );
    }
    
    // Get or create PENDING status for requests (for return request)
    let pendingStatus = await prisma.status.findFirst({
      where: {
        name: 'PENDING',
        type: 'request'
      }
    });
    
    // If PENDING status doesn't exist, create it
    if (!pendingStatus) {
      console.log('Creating PENDING status for requests');
      pendingStatus = await prisma.status.create({
        data: {
          name: 'PENDING',
          type: 'request',
        }
      });
    }
    
    // Create a new request for return
    const returnRequest = await prisma.request.create({
      data: {
        userId: userId,
        itemId: existingRequest.itemId,
        requestType: 'return',
        reason: `Return for request #${id}`,
        requestDate: new Date(),
        statusId: pendingStatus.id
      },
      include: {
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
    
    // Create an activity log entry
    await prisma.activityLog.create({
      data: {
        userId: userId,
        activity: `Return request created for item ${existingRequest.item.name}`
      }
    });
    
    // Notify admin
    await prisma.notification.create({
      data: {
        userId: 1, // Admin user ID
        message: `Return request from user ID ${userId} for item ${existingRequest.item.name}`,
        isRead: false
      }
    });
    
    return NextResponse.json(returnRequest);
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    );
  }
} 