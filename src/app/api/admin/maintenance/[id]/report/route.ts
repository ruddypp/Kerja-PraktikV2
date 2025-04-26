import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

// This is a proxy route that forwards the request to the user route with admin access
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate admin user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the user is an admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }
    
    // Get the parameters
    const { id: maintenanceId } = params;
    const reportType = request.nextUrl.searchParams.get("type") || "csr";
    
    // Create a new request to forward to the user route
    const userRoute = `/api/user/maintenance/${maintenanceId}/report?type=${reportType}`;
    
    // Forward the request to the user route with admin access header
    const response = await fetch(new URL(userRoute, request.url), {
      headers: {
        'x-admin-access': 'true'
      }
    });
    
    // Check if the response is successful
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to generate report' },
        { status: response.status }
      );
    }
    
    // Get the pdf content
    const pdfBytes = await response.arrayBuffer();
    
    // Get content-disposition from the response
    const contentDisposition = response.headers.get('content-disposition') || 
      `inline; filename="report_${maintenanceId}.pdf"`;
    
    // Return the PDF as response
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': contentDisposition,
      },
    });
  } catch (error) {
    console.error('Error processing admin maintenance report request:', error);
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : "Unknown error";
      
    return NextResponse.json(
      { error: 'Failed to generate report', details: errorMessage },
      { status: 500 }
    );
  }
} 