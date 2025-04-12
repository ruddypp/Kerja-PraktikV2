import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
        { status: 401 }
      );
    }
    
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
        { status: 404 }
      );
    }
    
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