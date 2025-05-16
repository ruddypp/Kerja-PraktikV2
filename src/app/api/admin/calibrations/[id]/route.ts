import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { ItemStatus, RequestStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

// GET a single calibration by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify user is authenticated
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the calibration ID
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Calibration ID is required' },
        { status: 400 }
      );
    }
    
    // Fetch the calibration
    const calibration = await prisma.calibration.findUnique({
      where: { id },
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        vendor: true,
        certificate: {
          include: {
            gasEntries: true,
            testEntries: true
          }
        },
        statusLogs: {
          include: {
            changedBy: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        activityLogs: true
      }
    });
    
    if (!calibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }

    // Allow access to any authenticated user
    console.log('Allowing access to calibration. User ID:', user.id, 'Calibration ID:', calibration.id);
    
    return NextResponse.json(calibration);
  } catch (error) {
    console.error('Error fetching calibration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calibration' },
      { status: 500 }
    );
  }
}

// PATCH update a calibration
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify user is authenticated
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the calibration ID
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Calibration ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { vendorId, status, notes, validUntil } = body;
    
    // Verify calibration exists
    const calibration = await prisma.calibration.findUnique({
      where: { id },
          include: {
            item: true,
            user: true
      }
    });
    
    if (!calibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }
    
    // Allow access to any authenticated user, but with different permissions based on role
    const isAdmin = user.role === 'ADMIN';
    console.log('Allowing update to calibration. User ID:', user.id, 'Calibration ID:', calibration.id, 'Is admin:', isAdmin);
    
    // Prepare update data with different permissions for admin vs owner
    const updateData: Prisma.CalibrationUpdateInput = {};
    
    // Anyone can update notes
    if (notes) updateData.notes = notes;
    
    // Admin-only fields
    if (isAdmin) {
      if (vendorId) updateData.vendor = { connect: { id: vendorId } };
      if (status) updateData.status = status as RequestStatus;
    if (validUntil) updateData.validUntil = new Date(validUntil);
    
    // If completing, update item status back to AVAILABLE
    if (status === 'COMPLETED' && calibration.status !== 'COMPLETED') {
      await prisma.item.update({
        where: { serialNumber: calibration.itemSerial },
        data: { status: ItemStatus.AVAILABLE }
      });
      
      // Update item history
      await prisma.itemHistory.updateMany({
        where: {
          itemSerial: calibration.itemSerial,
          action: 'CALIBRATED',
          relatedId: id,
          endDate: null
        },
        data: {
          endDate: new Date()
        }
      });
      }
    }
    
    // Update the calibration
    const updatedCalibration = await prisma.calibration.update({
      where: { id },
      data: updateData,
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        vendor: true,
        certificate: {
          include: {
            gasEntries: true,
            testEntries: true
          }
        },
        statusLogs: {
          include: {
            changedBy: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    
    // Create status log if status changed (admin only)
    if (isAdmin && status) {
      await prisma.calibrationStatusLog.create({
        data: {
          calibrationId: id,
          status: status as RequestStatus,
          notes: notes || `Calibration status updated to ${status} by admin`,
          userId: user.id
        }
      });
      
      // Create notification for the user
      const statusMap: Record<string, string> = {
        'IN_PROGRESS': 'updated to in progress',
        'COMPLETED': 'completed',
        'CANCELLED': 'cancelled'
      };
      
      // Don't create notification if the user is updating their own calibration
      if (user.id !== calibration.userId) {
      await prisma.notification.create({
        data: {
          userId: calibration.userId,
          type: 'CALIBRATION_STATUS_CHANGE',
          title: `Calibration ${statusMap[status] || 'Updated'}`,
          message: `Your calibration for ${calibration.item.name} has been ${statusMap[status] || 'updated'}`,
          isRead: false
        }
      });
      }
    }
    
    return NextResponse.json(updatedCalibration);
  } catch (error) {
    console.error('Error updating calibration:', error);
    return NextResponse.json(
      { error: 'Failed to update calibration' },
      { status: 500 }
    );
  }
}

// DELETE a calibration
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verifikasi user admin menggunakan helper function yang konsisten
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Di Next.js 15, params adalah objek yang harus diawait
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Calibration ID is required' },
        { status: 400 }
      );
    }

    // Use a transaction to ensure all operations succeed or fail together
    return await prisma.$transaction(async (tx) => {
      // Verify calibration exists
      const calibration = await tx.calibration.findUnique({
        where: { id },
        include: {
          item: true,
          certificate: true,
          statusLogs: true
        }
      });

      if (!calibration) {
        return NextResponse.json(
          { error: 'Calibration not found' },
          { status: 404 }
        );
      }

      try {
        // 1. Delete certificate first (if exists)
        if (calibration.certificate) {
          await tx.calibrationCertificate.delete({
            where: { id: calibration.certificate.id }
          });
        }
        
        // 2. Delete status logs
        if (calibration.statusLogs && calibration.statusLogs.length > 0) {
          await tx.calibrationStatusLog.deleteMany({
            where: { calibrationId: id }
          });
        }
        
        // 3. Update item history entries instead of deleting them
        await tx.itemHistory.updateMany({
          where: { 
            relatedId: id,
            action: 'CALIBRATED'
          },
          data: {
            details: `Calibration record deleted by admin (${user.name})`,
            endDate: new Date()
          }
        });
        
        // If item is in calibration, set it back to available
        if (calibration.item.status === ItemStatus.IN_CALIBRATION) {
          await tx.item.update({
            where: { serialNumber: calibration.itemSerial },
            data: { status: ItemStatus.AVAILABLE }
          });
        }
        
        // 4. Now delete the calibration itself
        await tx.calibration.delete({
          where: { id }
        });

        // Create activity log
        await tx.activityLog.create({
          data: {
            userId: user.id,
            itemSerial: calibration.itemSerial,
            action: 'DELETED_CALIBRATION',
            details: `Deleted calibration record for ${calibration.item.name}`,
            type: 'CALIBRATION_DELETED'
          }
        });
        
        return NextResponse.json({ 
          success: true, 
          message: 'Calibration successfully deleted' 
        });
      } catch (deleteError) {
        console.error('Specific error during deletion process:', deleteError);
        // Handle specific database errors
        if (deleteError instanceof Prisma.PrismaClientKnownRequestError) {
          if (deleteError.code === 'P2003') {
            return NextResponse.json(
              { error: 'Cannot delete calibration: It is referenced by other records in the system' },
              { status: 400 }
            );
          } else if (deleteError.code === 'P2025') {
            return NextResponse.json(
              { error: 'Calibration or related record not found' },
              { status: 404 }
            );
          } else {
            return NextResponse.json(
              { error: `Database error (${deleteError.code}): ${deleteError.message}` },
              { status: 400 }
            );
          }
        }
        
        // Handle general errors
        return NextResponse.json(
          { error: deleteError instanceof Error ? deleteError.message : 'Failed to delete calibration' },
          { status: 500 }
        );
      }
    }, {
      maxWait: 5000, // 5s max wait
      timeout: 10000 // 10s timeout
    });
  } catch (error) {
    console.error('Error deleting calibration:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to delete calibration';
    const statusCode = 500;
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      errorMessage = `Database error (${error.code}): ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage, details: String(error) },
      { status: statusCode }
    );
  }
} 