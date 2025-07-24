import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { RequestStatus } from '@prisma/client';

// GET single customer by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify the user is authenticated
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Await params to avoid Next.js warning
    const { id } = await Promise.resolve(params);
    
    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id }
    });
    
    if (!customer) {
      return NextResponse.json(
        { error: 'customer not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

// PUT update customer - added to support frontend using PUT method
export async function PUT(
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
    
    const body = await request.json();
    const { 
      name, 
      address,
      contactName,
      contactPhone,
      contactEmail,
      service
    } = body;
    
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

// PATCH update customer
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
    
    const body = await request.json();
    const { 
      name, 
      address,
      contactName,
      contactPhone,
      contactEmail,
      service
    } = body;
    
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
    
    // Check if customer is associated with any active calibrations
    const activeCalibrationCount = await prisma.calibration.count({
      where: { 
        customerId: id,
        status: {
          in: [RequestStatus.PENDING, RequestStatus.APPROVED] // Hanya cek kalibrasi aktif
        }
      }
    });
    
    if (activeCalibrationCount > 0) {
      return NextResponse.json(
        { error: `Tidak dapat menghapus customer karena masih memiliki ${activeCalibrationCount} kalibrasi aktif` },
        { status: 400 }
      );
    }
    
    // Soft delete customer (mengubah status isDeleted menjadi true)
    await prisma.customer.update({
      where: { id },
      data: { isDeleted: true }
    });
    
    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
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