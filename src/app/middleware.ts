import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { decodeToken } from '@/lib/auth';
import { Role } from '@prisma/client';

export function middleware(request: NextRequest) {
  // Login path checking
  if (request.nextUrl.pathname === '/login') {
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
      }
    }
  }
  
  return NextResponse.next();
} 