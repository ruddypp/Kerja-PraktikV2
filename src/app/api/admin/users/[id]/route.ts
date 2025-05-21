import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { Role } from '@prisma/client';

// Define type for update data
interface UserUpdateData {
  name: string;
  email: string;
  role: Role;
  password?: string;
}

// Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authorized (should be admin)
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Make sure to await params in Next.js 13+
    const userId = params.id;
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.email || !data.role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if email is being changed and if it's already in use
    if (data.email !== existingUser.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email: data.email }
      });
      
      if (emailInUse) {
        return NextResponse.json(
          { error: 'Email is already in use' },
          { status: 409 }
        );
      }
    }
    
    // Update data object
    const updateData: UserUpdateData = {
      name: data.name,
      email: data.email,
      role: data.role
    };
    
    // Only update password if provided
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    
    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authorized (should be admin)
    const currentUser = await getUserFromRequest(request);
    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Get the user ID from params
    const userId = params.id;
    
    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if trying to delete self
    if (currentUser.id === userId) {
      return NextResponse.json(
        { error: 'Anda tidak dapat menghapus akun yang sedang Anda gunakan' },
        { status: 400 }
      );
    }
    
    // Check for ownership or special accounts
    // Find the user who was created first (the owner/super admin)
    const firstAdmin = await prisma.user.findFirst({
      where: { role: Role.ADMIN },
      orderBy: { createdAt: 'asc' }
    });
    
    // If trying to delete the original admin (owner)
    if (firstAdmin && firstAdmin.id === userId) {
      return NextResponse.json(
        { error: 'Akun ini adalah Owner/Super Admin dan tidak dapat dihapus' },
        { status: 400 }
      );
    }
    
    // If target is admin, make sure we're not deleting the last admin
    if (targetUser.role === Role.ADMIN) {
      const adminCount = await prisma.user.count({
        where: { role: Role.ADMIN }
      });
      
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Tidak dapat menghapus admin terakhir dalam sistem' },
          { status: 400 }
        );
      }
    }
    
    // Step 1: Handle notifications - delete them
    try {
      await prisma.notification.deleteMany({
        where: { userId: userId }
      });
      console.log('Notifications deleted successfully');
    } catch (err) {
      console.error('Error deleting notifications:', err);
      // Continue with other operations even if this fails
    }
    
    // Step 2: Handle activity logs - update affectedUserId to null
    try {
      await prisma.activityLog.updateMany({
        where: { affectedUserId: userId },
        data: { affectedUserId: null }
      });
      console.log('Activity logs (affected user) updated successfully');
    } catch (err) {
      console.error('Error updating activity logs (affected user):', err);
    }
    
    // Step 3: Handle activity logs created by user - delete them
    try {
      await prisma.activityLog.deleteMany({
        where: { userId: userId }
      });
      console.log('Activity logs deleted successfully');
    } catch (err) {
      console.error('Error deleting activity logs:', err);
    }
    
    // Step 4: Handle status logs - delete them
    try {
      await prisma.rentalStatusLog.deleteMany({
        where: { userId: userId }
      });
      console.log('Rental status logs deleted successfully');
    } catch (err) {
      console.error('Error deleting rental status logs:', err);
    }
    
    try {
      await prisma.maintenanceStatusLog.deleteMany({
        where: { userId: userId }
      });
      console.log('Maintenance status logs deleted successfully');
    } catch (err) {
      console.error('Error deleting maintenance status logs:', err);
    }
    
    try {
      await prisma.calibrationStatusLog.deleteMany({
        where: { userId: userId }
      });
      console.log('Calibration status logs deleted successfully');
    } catch (err) {
      console.error('Error deleting calibration status logs:', err);
    }
    
    // Step 5: Handle inventory checks
    try {
      const inventoryChecks = await prisma.inventoryCheck.findMany({
        where: { userId: userId },
        select: { id: true }
      });
      
      const inventoryCheckIds = inventoryChecks.map(check => check.id);
      
      if (inventoryCheckIds.length > 0) {
        // Delete inventory check items
        await prisma.inventoryCheckItem.deleteMany({
          where: { checkId: { in: inventoryCheckIds } }
        });
        console.log('Inventory check items deleted successfully');
        
        // Transfer ownership of inventory checks to admin
        await prisma.inventoryCheck.updateMany({
          where: { userId: userId },
          data: { userId: currentUser.id }
        });
        console.log('Inventory checks transferred successfully');
      }
    } catch (err) {
      console.error('Error handling inventory checks:', err);
    }
    
    // Step 6: Transfer rentals
    try {
      await prisma.rental.updateMany({
        where: { userId: userId },
        data: { userId: currentUser.id }
      });
      console.log('Rentals transferred successfully');
    } catch (err) {
      console.error('Error transferring rentals:', err);
    }
    
    // Step 7: Transfer calibrations
    try {
      await prisma.calibration.updateMany({
        where: { userId: userId },
        data: { userId: currentUser.id }
      });
      console.log('Calibrations transferred successfully');
    } catch (err) {
      console.error('Error transferring calibrations:', err);
    }
    
    // Step 8: Transfer maintenances
    try {
      await prisma.maintenance.updateMany({
        where: { userId: userId },
        data: { userId: currentUser.id }
      });
      console.log('Maintenances transferred successfully');
    } catch (err) {
      console.error('Error transferring maintenances:', err);
    }
    
    // Step 9: Delete the user
    try {
      await prisma.user.delete({
        where: { id: userId }
      });
      console.log('User deleted successfully');
    } catch (err) {
      console.error('Error deleting user:', err);
      throw err; // Re-throw this error as it's critical
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Pengguna berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    
    // Provide more specific error messages based on the error type
    if (error instanceof Error) {
      console.error('Detailed error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check for foreign key constraint errors
      if (error.message.includes('foreign key constraint')) {
        return NextResponse.json(
          { error: `Gagal menghapus pengguna karena constraint database: ${error.message}` },
          { status: 400 }
        );
      }
      
      // Check for transaction errors
      if (error.message.includes('transaction')) {
        return NextResponse.json(
          { error: `Gagal dalam transaksi database: ${error.message}` },
          { status: 500 }
        );
      }
    }
    
    // Return a generic error with more details in development
    return NextResponse.json(
      { 
        error: 'Gagal menghapus pengguna. Silakan coba lagi.',
        details: process.env.NODE_ENV !== 'production' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
} 