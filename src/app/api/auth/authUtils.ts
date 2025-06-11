import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

/**
 * Verify authentication for API routes
 * Returns the user data if authenticated, throws an error if not
 */
export async function verifyAuth(req: NextRequest) {
  const user = await getUserFromRequest(req);
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

/**
 * Verify if the user has admin role
 */
export async function verifyAdmin(req: NextRequest) {
  const user = await verifyAuth(req);
  
  if (user.role !== 'ADMIN') {
    throw new Error('Forbidden - Admin access required');
  }
  
  return user;
}

/**
 * Verify if the user has admin or manager role
 */
export async function verifyAdminOrManager(req: NextRequest) {
  const user = await verifyAuth(req);
  
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
    throw new Error('Forbidden - Admin or Manager access required');
  }
  
  return user;
} 