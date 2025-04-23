import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

// GET all vendors
export async function GET(request: Request) {
  try {
    // Verify the user is an admin using our custom auth system
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get search query from URL
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    
    console.log('GET vendors API called');
    
    // Build where conditions
    const whereCondition: {
      isDeleted: boolean;
      OR?: Array<
        { name: { contains: string; mode: 'insensitive' } } | 
        { service: { contains: string; mode: 'insensitive' } } |
        { contactName: { contains: string; mode: 'insensitive' } }
      >;
    } = {
      isDeleted: false // Hanya tampilkan vendor yang belum dihapus
    };
    
    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { service: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    console.log('Fetching vendors with where clause:', whereCondition);
    
    const vendors = await prisma.vendor.findMany({
      where: whereCondition,
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${vendors.length} vendors`);
    
    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

// POST create a new vendor
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
        { error: 'Vendor name is required' },
        { status: 400 }
      );
    }
    
    const newVendor = await prisma.vendor.create({
      data: {
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
          action: 'CREATE_VENDOR',
          details: `Added new vendor: ${name}`
        }
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json(newVendor, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A vendor with this name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}

// PATCH update vendor
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
        { error: 'Vendor ID is required' },
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
    
    // Check if vendor exists
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
          userId: user.id,
          action: 'UPDATE_VENDOR',
          details: `Updated vendor: ${name}`
        }
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json(updatedVendor);
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

// DELETE vendor
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
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }
    
    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id }
    });
    
    if (!existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }
    
    // Check if vendor is associated with any calibrations
    const calibrationCount = await prisma.calibration.count({
      where: { vendorId: id }
    });
    
    if (calibrationCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vendor with associated calibrations' },
        { status: 400 }
      );
    }
    
    // Delete vendor
    await prisma.vendor.delete({
      where: { id }
    });
    
    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'DELETE_VENDOR',
          details: `Deleted vendor: ${existingVendor.name}`
        }
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
} 