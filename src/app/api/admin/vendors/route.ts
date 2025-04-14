import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decodeToken } from '@/lib/auth';

// GET all vendors
export async function GET(request: Request) {
  try {
    // Get user from auth token
    let isAdmin = false;
    
    try {
      // Get token from cookies manually
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => {
          const [name, ...value] = c.split('=');
          return [name, value.join('=')];
        })
      );
      
      const token = cookies['auth_token'];
      
      if (token) {
        const userData = decodeToken(token);
        if (userData?.role === 'Admin') {
          isAdmin = true;
        }
      }
    } catch (authError) {
      console.error('Error getting user from token:', authError);
    }
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get search query from URL
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    
    let whereClause = {};
    
    if (search) {
      whereClause = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { services: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } }
        ]
      };
    }
    
    const vendors = await prisma.vendor.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });
    
    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

// POST create a new vendor
export async function POST(request: Request) {
  try {
    // Get user from auth token
    let isAdmin = false;
    
    try {
      // Get token from cookies manually
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => {
          const [name, ...value] = c.split('=');
          return [name, value.join('=')];
        })
      );
      
      const token = cookies['auth_token'];
      
      if (token) {
        const userData = decodeToken(token);
        if (userData?.role === 'Admin') {
          isAdmin = true;
        }
      }
    } catch (authError) {
      console.error('Error getting user from token:', authError);
    }
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, address, contactPerson, contactEmail, contactPhone, services } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Vendor name is required' },
        { status: 400 }
      );
    }
    
    const newVendor = await prisma.vendor.create({
      data: {
        name,
        address,
        contactPerson,
        contactEmail,
        contactPhone,
        services
      }
    });
    
    return NextResponse.json(newVendor, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A vendor with this name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
} 