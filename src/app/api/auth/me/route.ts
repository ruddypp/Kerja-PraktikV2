import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
<<<<<<< HEAD
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
=======
import { verify } from 'jsonwebtoken';
import { UserData } from '@/lib/auth'; // Import UserData type

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: Request) {
  try {
    // Get token from cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').filter(c => c).map(c => {
        const [name, ...value] = c.split('=');
        return [name, value.join('=')];
      })
    );
    
    const token = cookies['auth_token'];
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
>>>>>>> 0989372 (add fitur inventory dan history)
        { status: 401 }
      );
    }
    
<<<<<<< HEAD
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
=======
    // Verify token with proper typing
    const decoded = verify(token, JWT_SECRET) as UserData;
    
    if (!decoded || !decoded.id) {
      throw new Error('Invalid token data');
    }
    
    // Get fresh user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: true
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
>>>>>>> 0989372 (add fitur inventory dan history)
        { status: 404 }
      );
    }
    
<<<<<<< HEAD
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
=======
    // Return user without password
    const userWithoutPassword = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roleId: user.roleId
    };
    
    return NextResponse.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 401 }
    );
  }
} 
>>>>>>> 0989372 (add fitur inventory dan history)
