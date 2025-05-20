import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

// This is a proxy route that forwards the request to the user route with manager access
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate manager user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the user is an manager
    if (user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized. Manager access required.' },
        { status: 403 }
      );
    }
    
    // Get the parameters - await params to fix Next.js error
    const { id: maintenanceId } = await params;
    const reportType = request.nextUrl.searchParams.get("type") || "csr";
    
    console.log(`Manager requesting ${reportType} report for maintenance ID:`, maintenanceId);
    
    // Check if maintenance exists
    const maintenance = await prisma.maintenance.findUnique({
      where: { id: maintenanceId },
    });
    
    if (!maintenance) {
      console.log('Maintenance not found for ID:', maintenanceId);
      return NextResponse.json(
        { error: 'Maintenance not found' },
        { status: 404 }
      );
    }
    
    // Construct the user API URL
    const userReportUrl = new URL(`/api/user/maintenance/${maintenanceId}/report?type=${reportType}`, request.url);
    
    // Forward the request to the user route with manager access header
    console.log('Forwarding request to user maintenance report endpoint with manager access');
    const response = await fetch(userReportUrl.toString(), {
      headers: {
        'x-manager-access': 'true',
        'Cookie': request.headers.get('cookie') || '',
      }
    });
    
    // Check if the response is successful
    if (!response.ok) {
      try {
        const errorData = await response.json();
        console.log('Error from user report endpoint:', errorData);
        return NextResponse.json(
          { error: errorData.error || 'Failed to generate report', details: errorData.details },
          { status: response.status }
        );
      } catch {
        // If it's not JSON, get the text (no need to name the error)
        const errorText = await response.text();
        console.log('Error text from user report endpoint:', errorText);
        return NextResponse.json(
          { error: 'Failed to generate report', details: errorText },
          { status: response.status }
        );
      }
    }
    
    // Get the content type to determine if it's a PDF
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
      console.log('Received PDF response from user report endpoint');
      const pdfData = await response.arrayBuffer();
      
      // Get content-disposition from the response or create a default one
      const contentDisposition = response.headers.get('content-disposition') || 
        `inline; filename="${reportType === 'csr' ? 'CSR' : 'TR'}_${maintenanceId}.pdf"`;
      
      // Return the PDF as response
      return new NextResponse(pdfData, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': contentDisposition,
        },
      });
    }
    
    // If response is not a PDF, return it as is (likely JSON)
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error processing manager maintenance report request:', error);
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : "Unknown error";
      
    return NextResponse.json(
      { error: 'Failed to generate report', details: errorMessage },
      { status: 500 }
    );
  }
} 