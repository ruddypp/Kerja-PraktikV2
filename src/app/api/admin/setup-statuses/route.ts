import { NextResponse } from 'next/server';
import { RequestStatus } from '@prisma/client';

export async function GET() {
  try {
    // The statuses are now built into the schema as enums
    // We just need to return the available values
    
    // Get all RequestStatus enum values
    const requestStatuses = Object.values(RequestStatus);
    
    return NextResponse.json({
      success: true,
      message: "Status enums are built into the schema - no setup needed",
      requestStatuses,
      statusMappings: {
        PENDING: RequestStatus.PENDING,
        APPROVED: RequestStatus.APPROVED,
        REJECTED: RequestStatus.REJECTED,
        COMPLETED: RequestStatus.COMPLETED
      }
    });
  } catch (error) {
    console.error('Error handling status request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process status request' },
      { status: 500 }
    );
  }
} 