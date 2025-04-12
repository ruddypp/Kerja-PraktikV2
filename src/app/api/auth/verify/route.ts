import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Interface untuk decoded token
interface DecodedToken {
  id: number;
  email: string;
  role: string;
}

export async function GET(request: Request) {
  try {
    // Ambil token dari cookie
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [name, ...value] = c.split('=');
        return [name, value.join('=')];
      })
    );
    
    const token = cookies['auth_token'];
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }
    
    // Verifikasi token
    const decoded = verify(token, JWT_SECRET) as DecodedToken;
    
    return NextResponse.json({
      success: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Invalid token' },
      { status: 401 }
    );
  }
} 