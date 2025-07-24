import { sign, verify } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from './prisma';
import { getServerSession } from 'next-auth';

export interface UserData {
  id: string;
  email: string;
  name?: string;
  role: Role;
}

const JWT_SECRET = process.env.JWT_SECRET || 'IPRMMO9cijZRNeDksgKv1GVOhlkSOhRIK/6cBX59ImE=';

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
    console.log('[getUserFromRequest] Starting to get user from request');
    
    let token: string | undefined;
    
    // First try Authorization header
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('[getUserFromRequest] Token found in Authorization header');
    }
    
    // If no token in Authorization header, try cookies
    if (!token) {
      console.log('[getUserFromRequest] No token in Authorization header, checking cookies');
      const cookieHeader = req.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').filter(Boolean).map(c => {
          const [name, ...value] = c.split('=');
          return [name, value.join('=')];
        })
      );
      token = cookies['auth_token'];
      
      // Also try next-auth session token
      if (!token && cookies['next-auth.session-token']) {
        console.log('[getUserFromRequest] Found next-auth session token');
        // For next-auth session token, we need to get the user from the database
        try {
          const sessionToken = cookies['next-auth.session-token'];
          // Gunakan prisma client langsung
          const session = await prisma.$queryRaw`
            SELECT s.*, u.* 
            FROM "Session" s
            JOIN "User" u ON s."userId" = u.id
            WHERE s."sessionToken" = ${sessionToken}
            LIMIT 1
          `;
          
          if (session && Array.isArray(session) && session.length > 0) {
            const userData = session[0];
            console.log(`[getUserFromRequest] User found from next-auth session: ${userData.id}`);
            return {
              id: userData.id,
              name: userData.name || undefined,
              email: userData.email || '',
              role: userData.role as Role,
            };
          }
        } catch (sessionError) {
          console.error('[getUserFromRequest] Error getting user from next-auth session:', sessionError);
        }
      }
    }
    
    if (!token) {
      console.log('[getUserFromRequest] No token found in request');
      return null;
    }
    
    console.log('[getUserFromRequest] Verifying token');
    const userData = verifyToken(token);
    
    if (!userData) {
      console.log('[getUserFromRequest] Invalid token');
      return null;
    }
    
    // Validate user in database
    console.log(`[getUserFromRequest] Looking up user in database: ${userData.id}`);
    const user = await prisma.user.findUnique({
      where: { id: userData.id }
    });
    
    if (!user) {
      console.log('[getUserFromRequest] User not found in database');
      return null;
    }
    
    console.log(`[getUserFromRequest] User found: ${user.id}, role: ${user.role}`);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
  } catch (error) {
    console.error('[getUserFromRequest] Error getting user from request:', error);
    return null;
  }
}

// Helper function to check if user is admin
export function isAdmin(user: any): boolean {
  return user && user.role === 'ADMIN';
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