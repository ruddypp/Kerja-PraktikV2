import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decodeToken } from '@/lib/auth';

// Helper function to get user ID from request
async function getUserId(request: Request): Promise<number | null> {
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
      if (userData?.id) {
        return userData.id;
      }
    }
  } catch (authError) {
    console.error('Error getting user from token:', authError);
  }
  
  return null; // Return null if no valid user found
}

// Generate certificate data for a calibration
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Get user ID from auth token
    const userId = await getUserId(request) || 2; // Default to user ID 2 if not found
    
    const id = parseInt(context.params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid calibration ID' },
        { status: 400 }
      );
    }
    
    // Get the calibration with all related data
    const calibration = await prisma.calibration.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            item: {
              include: {
                category: true
              }
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        status: true,
        vendor: true
      }
    });
    
    if (!calibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }
    
    // Verify user has access to this calibration
    if (calibration.request.user.id !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to view this certificate' },
        { status: 403 }
      );
    }
    
    // Verify calibration is completed
    if (calibration.status.name !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Certificate is not available because calibration is not completed' },
        { status: 400 }
      );
    }
    
    // Get format parameter (optional)
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    
    // Generate certificate data
    const certificateData = {
      id: calibration.id,
      calibrationDate: calibration.calibrationDate,
      item: {
        id: calibration.request.item.id,
        name: calibration.request.item.name,
        serialNumber: calibration.request.item.serialNumber,
        category: calibration.request.item.category.name,
        specification: calibration.request.item.specification
      },
      result: calibration.result,
      vendor: calibration.vendor ? {
        id: calibration.vendor.id,
        name: calibration.vendor.name,
        contactPerson: calibration.vendor.contactPerson,
        contactEmail: calibration.vendor.contactEmail,
        contactPhone: calibration.vendor.contactPhone
      } : null,
      validUntil: new Date(calibration.calibrationDate.getTime() + (365 * 24 * 60 * 60 * 1000)), // Valid for 1 year
      certificateNumber: `CAL-${calibration.id}-${new Date().getFullYear()}`,
      user: {
        id: calibration.request.user.id,
        name: calibration.request.user.name,
        email: calibration.request.user.email
      }
    };
    
    // If PDF format is requested, generate a PDF to download
    if (format === 'pdf') {
      // In a real API you would generate the PDF here and return it with proper Content-Type
      // For this example, we'll respond with a 501 Not Implemented
      return NextResponse.json(
        { error: 'PDF download is available through the frontend' },
        { status: 501 }
      );
    }
    
    return NextResponse.json(certificateData);
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificate' },
      { status: 500 }
    );
  }
} 