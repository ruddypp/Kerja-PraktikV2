import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

// GET single vendor by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify the user is an admin
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Await params to avoid Next.js warning
    const { id } = await Promise.resolve(params);
    
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id }
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

// PATCH update vendor
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify the user is an admin
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Await params to avoid Next.js warning
    const { id } = await Promise.resolve(params);
    
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
    
    const body = await request.json();
    const { 
      name, 
      address,
      contactName,
      contactPhone,
      contactEmail,
      service
    } = body;
    
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
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify the user is an admin
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Await params to avoid Next.js warning
    const { id } = await Promise.resolve(params);
    
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