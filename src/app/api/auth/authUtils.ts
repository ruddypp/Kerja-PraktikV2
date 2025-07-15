import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

/**
 * Verify authentication for API routes
 * Returns the user data if authenticated, or null if not
 */
export async function verifyAuth(req: NextRequest) {
  const user = await getUserFromRequest(req);
  
  if (!user) {
    return null;
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
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  if (user.role !== 'ADMIN') {
    throw new Error('Forbidden - Admin access required');
  }
  
  return user;
} 