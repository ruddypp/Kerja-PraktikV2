import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { decodeToken } from './lib/auth';
import { Role } from '@prisma/client';

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  console.log(`Middleware URL: ${request.url}, Path: ${path}`);

  // Login path specific behavior
  if (path === '/login') {
    // Check if user is already logged in
    const authToken = request.cookies.get('auth_token');
    console.log(`Login path, auth token exists: ${!!authToken?.value}`);
    
    if (authToken?.value) {
      try {
        const decoded = decodeToken(authToken.value);
        console.log(`Decoded token on login path:`, decoded);
        
        // Redirect already logged in users
        if (decoded?.role === Role.ADMIN) {
          return NextResponse.redirect(new URL('/admin-dashboard', request.url));
        } else if (decoded?.role === Role.USER) {
          return NextResponse.redirect(new URL('/user/barang', request.url));
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        // Invalid token, stay on login page
      }
    }
    return NextResponse.next();
  }

  // For all other protected paths, require authentication
  const authToken = request.cookies.get('auth_token');
  console.log(`Protected path ${path}, auth token exists: ${!!authToken?.value}`);
  
  if (!authToken?.value) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token for protected routes
  try {
    const decoded = decodeToken(authToken.value);
    console.log(`Decoded token:`, decoded);
    
    if (!decoded) {
      throw new Error('Invalid token');
    }
    
    // Role-based path restrictions
    if ((path === '/admin-dashboard' || path.startsWith('/admin/')) && decoded.role !== Role.ADMIN) {
      console.log(`Non-admin accessing admin page, redirecting`);
      return NextResponse.redirect(new URL('/user/barang', request.url));
    }
    
    if (path.startsWith('/user/') && decoded.role !== Role.USER) {
      console.log(`Non-user accessing user page, redirecting`);
      return NextResponse.redirect(new URL('/admin-dashboard', request.url));
    }
    
    // Special handling for root paths
    if (path === '/' || path === '') {
      if (decoded.role === Role.ADMIN) {
        return NextResponse.redirect(new URL('/admin-dashboard', request.url));
      } else if (decoded.role === Role.USER) {
        return NextResponse.redirect(new URL('/user/barang', request.url));
      }
    }
    
    // Special handling for /user path to directly redirect to /user/barang
    if (path === '/user') {
      return NextResponse.redirect(new URL('/user/barang', request.url));
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('Error verifying token:', error);
    // Clear invalid token and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }
}

// Configure middleware matcher to exclude API routes
export const config = {
  matcher: [
    // Exclude API routes, static files, and images
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 