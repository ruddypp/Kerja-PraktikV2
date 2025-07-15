import { sign, verify } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from './prisma';

export interface UserData {
  id: string;
  email: string;
  name?: string;
  role: Role;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Simplified auth options for our custom auth solution
export const authOptions = {
  secret: JWT_SECRET,
};

/**
 * Menghasilkan token JWT dengan payload pengguna
 */
export function generateToken(payload: UserData): string {
  return sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

/**
 * Memverifikasi token JWT
 */
export function verifyToken(token: string): UserData | null {
  try {
    return verify(token, JWT_SECRET) as UserData;
  } catch {
    return null;
  }
}

/**
 * Mendekode token tanpa verifikasi (untuk middleware)
 */
export function decodeToken(token: string): UserData | null {
  try {
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return decoded as UserData;
  } catch {
    return null;
  }
}

/**
 * Fungsi untuk mendapatkan user dari token pada API request
 */
export async function getUserFromRequest(req: Request): Promise<UserData | null> {
  try {
    let token: string | undefined;
    
    // First try Authorization header
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // If no token in Authorization header, try cookies
    if (!token) {
      const cookieHeader = req.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').filter(Boolean).map(c => {
          const [name, ...value] = c.split('=');
          return [name, value.join('=')];
        })
      );
      token = cookies['auth_token'];
    }
    
    if (!token) {
      return null;
    }
    
    const userData = verifyToken(token);
    
    if (!userData) {
      return null;
    }
    
    // Validate user in database
    const user = await prisma.user.findUnique({
      where: { id: userData.id }
    });
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
  } catch (error) {
    console.error('Error getting user from request:', error);
    return null;
  }
}

/**
 * Mengecek apakah user adalah admin
 */
export function isAdmin(user: UserData | null): boolean {
  return user?.role === Role.ADMIN;
}

/**
 * Fungsi untuk mendapatkan route berdasarkan role
 */
export function getRedirectPathByRole(role: Role): string {
  if (role === Role.ADMIN) {
    return '/admin-dashboard';
  }
  return '/user/barang';
}