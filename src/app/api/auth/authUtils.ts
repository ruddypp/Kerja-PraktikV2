import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getServerSession } from "next-auth";

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
 * Protect API routes with authentication and optional role check
 * @param options - Options for protection
 * @returns User data if authenticated and has required role, or null if not
 */
export async function protect(options: { role?: string } = {}) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      console.log("No session found");
      return null;
    }
    
    // @ts-ignore - session.user might have role property added by our auth config
    const userRole = session.user.role;
    
    // If role is specified, check if user has required role
    if (options.role && userRole !== options.role) {
      console.log(`User role ${userRole} does not match required role ${options.role}`);
      return null;
    }
    
    return session.user;
  } catch (error) {
    console.error("Error in protect middleware:", error);
    return null;
  }
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