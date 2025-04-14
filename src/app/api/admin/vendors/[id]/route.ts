import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decodeToken } from '@/lib/auth';

// Helper function to get admin status
async function isAdminUser(request: Request): Promise<boolean> {
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
      if (userData?.role === 'Admin') {
        return true;
      }
    }
  } catch (authError) {
    console.error('Error getting user from token:', authError);
  }
  
  return false;
}

// GET a single vendor by ID
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Check if user is admin
    const isAdmin = await isAdminUser(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const id = parseInt(context.params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid vendor ID' },
        { status: 400 }
      );
    }
    
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        calibrations: {
          include: {
            request: {
              include: {
                item: true,
                status: true
              }
            },
            status: true
          }
        }
      }
    });
    
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor' },
      { status: 500 }
    );
  }
}

// PATCH update a vendor
export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Check if user is admin
    const isAdmin = await isAdminUser(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const id = parseInt(context.params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid vendor ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { name, address, contactPerson, contactEmail, contactPhone, services, rating } = body;
    
    // Verify vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id }
    });
    
    if (!existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }
    
    // Update vendor
    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        name,
        address,
        contactPerson,
        contactEmail,
        contactPhone,
        services,
        rating: rating ? parseFloat(rating) : undefined
      }
    });
    
    return NextResponse.json(updatedVendor);
  } catch (error) {
    console.error('Error updating vendor:', error);
    
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A vendor with this name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

// DELETE a vendor
export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Check if user is admin
    const isAdmin = await isAdminUser(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const id = parseInt(context.params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid vendor ID' },
        { status: 400 }
      );
    }
    
    // Check if vendor is associated with any calibrations
    const calibrationCount = await prisma.calibration.count({
      where: { vendorId: id }
    });
    
    if (calibrationCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vendor that is associated with calibrations' },
        { status: 400 }
      );
    }
    
    // Delete vendor
    await prisma.vendor.delete({
      where: { id }
    });
    
    return NextResponse.json(
      { message: 'Vendor deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
} 