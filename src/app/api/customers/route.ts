import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { ActivityType } from '@prisma/client';

// Cache key for customers
const customers_CACHE_KEY = 'admin:customers';

// GET all customers
export async function GET(request: Request) {
  try {
    // Verify user is authenticated
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '10');
    
    // For calibration customer selection, allow much higher limits
    const limit = requestedLimit > 1000 ? 10000 : requestedLimit;
    
    // Log query params for debugging
    console.log('Admin customer query params:', { search, page, limit, timestamp: searchParams.get('timestamp') });
    
    // Calculate skip for pagination
    const skip = (page - 1) * limit;
    
    // Build where conditions - always exclude deleted customers
    const where: any = {
      isDeleted: false
    };
    
    if (search && search.trim() !== '') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { service: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Get customers with pagination - use select to specify only needed fields
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        select: {
          id: true,
          name: true,
          address: true,
          contactName: true,
          contactPhone: true,
          contactEmail: true,
          service: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          name: 'asc'
        },
        skip,
        take: limit
      }),
      prisma.customer.count({ where })
    ]);
    
    // Calculate total pages
    const totalPages = Math.ceil(total / limit);
    
    // Create response data
    const responseData = {
      items: customers,
      total,
      page,
      limit,
      totalPages
    };
    
    // Create response with cache headers
    const response = NextResponse.json(responseData);
    
    // Set cache control headers - cache for 1 minute
    response.headers.set('Cache-Control', 'public, max-age=60');
    response.headers.set('Expires', new Date(Date.now() + 60000).toUTCString());
    
    return response;
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// POST create a new customer
export async function POST(request: Request) {
  try {
    // Verify the user is an admin using our custom auth system
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { 
      name, 
      address,
      contactName,
      contactPhone,
      contactEmail,
      service
    } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'customer name is required' },
        { status: 400 }
      );
    }
    
    const newcustomer = await prisma.customer.create({
      data: {
        id: '',
        updatedAt: new Date(),
        name,
        address: address || null,
        contactName: contactName || null,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
        service: service || null
      }
    });
    
    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'CREATE_customer',
          details: `Added new customer: ${name}`,
          type: ActivityType.CUSTOMER_CREATED
        }
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    // Create response with cache busting headers
    const response = NextResponse.json(newcustomer, { status: 201 });
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    
    return response;
  } catch (error) {
    console.error('Error creating customer:', error);
    
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A customer with this name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}

// PATCH update customer
export async function PATCH(request: Request) {
  try {
    // Verify the user is an admin using our custom auth system
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract ID from URL
    const parts = new URL(request.url).pathname.split('/');
    const id = parts[parts.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { error: 'customer ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { 
      name, 
      address,
      contactName,
      contactPhone,
      contactEmail,
      service
    } = body;
    
    // Check if customer exists
    const existingcustomer = await prisma.customer.findUnique({
      where: { id }
    });
    
    if (!existingcustomer) {
      return NextResponse.json(
        { error: 'customer not found' },
        { status: 404 }
      );
    }
    
    // Update customer
    const updatedcustomer = await prisma.customer.update({
      where: { id },
      data: {
        name: name || undefined,
        address: address !== undefined ? address : undefined,
        contactName: contactName !== undefined ? contactName : undefined,
        contactPhone: contactPhone !== undefined ? contactPhone : undefined,
        contactEmail: contactEmail !== undefined ? contactEmail : undefined,
        service: service !== undefined ? service : undefined,
      }
    });
    
    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          type: ActivityType.CUSTOMER_UPDATED,
          userId: user.id,
          action: 'UPDATE_customer',
          details: `Updated customer: ${name}`
        }
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json(updatedcustomer);
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

// DELETE customer
export async function DELETE(request: Request) {
  try {
    // Verify the user is an admin using our custom auth system
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract ID from URL
    const parts = new URL(request.url).pathname.split('/');
    const id = parts[parts.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { error: 'customer ID is required' },
        { status: 400 }
      );
    }
    
    // Check if customer exists
    const existingcustomer = await prisma.customer.findUnique({
      where: { id }
    });
    
    if (!existingcustomer) {
      return NextResponse.json(
        { error: 'customer not found' },
        { status: 404 }
      );
    }
    
    // Check if customer is associated with any calibrations
    const calibrationCount = await prisma.calibration.count({
      where: { customerId: id }
    });
    
    if (calibrationCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with associated calibrations' },
        { status: 400 }
      );
    }
    
    // Delete customer
    await prisma.customer.delete({
      where: { id }
    });
    
    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          type: ActivityType.CUSTOMER_DELETED,
          userId: user.id,
          action: 'DELETE_customer',
          details: `Deleted customer: ${existingcustomer.name}`
        }
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
} 