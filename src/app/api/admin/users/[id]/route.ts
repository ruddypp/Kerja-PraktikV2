import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
    
    // Delete the user
    await prisma.user.delete({
      where: { id: userId }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Pengguna berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus pengguna. Silakan coba lagi.' },
      { status: 500 }
    );
  }
} 