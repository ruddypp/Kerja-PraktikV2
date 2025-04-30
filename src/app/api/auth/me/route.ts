import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, verifyToken } from '@/lib/auth';

// GET current user
export async function GET(request: Request) {
  try {
    // First try to get user from request (which checks cookies)
    let user = await getUserFromRequest(request);

    // If no user found, try Authorization header
    if (!user) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const userData = verifyToken(token);
        if (userData) {
          // Validate user in database
          const dbUser = await prisma.user.findUnique({
            where: { id: userData.id }
          });
          
          if (dbUser) {
            user = {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              role: dbUser.role
            };
          }
        }
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }
    
    // Get user with minimal required fields
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: currentUser
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current user' },
      { status: 500 }
    );
  }
}