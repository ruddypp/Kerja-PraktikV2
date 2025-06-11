import { NextResponse } from 'next/server';
import { ItemStatus, RequestStatus } from '@prisma/client';

// GET all statuses, returning the appropriate enums based on type
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    let statuses = [];
    let statusType = '';
    
    if (type === 'item') {
      // Return item statuses
      statuses = Object.values(ItemStatus).map(status => ({
        id: `item_${status}`,
        name: status,
        type: 'item'
      }));
      statusType = 'item';
    } else if (type === 'request' || type === 'calibration') {
      // Return request statuses
      statuses = Object.values(RequestStatus).map(status => ({
        id: `${type}_${status}`,
        name: status,
        type: type
      }));
      statusType = type;
    } else {
      // Return all statuses
      const itemStatuses = Object.values(ItemStatus).map(status => ({
        id: `item_${status}`,
        name: status,
        type: 'item'
      }));
      
      const requestStatuses = Object.values(RequestStatus).map(status => ({
        id: `request_${status}`,
        name: status,
        type: 'request'
      }));

      const calibrationStatuses = Object.values(RequestStatus).map(status => ({
        id: `calibration_${status}`,
        name: status,
        type: 'calibration'
      }));
      
      statuses = [...itemStatuses, ...requestStatuses, ...calibrationStatuses];
    }
    
    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error fetching statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statuses' },
      { status: 500 }
    );
  }
}

// POST - no longer needed as statuses are now enums
export async function POST(request: Request) {
  return NextResponse.json(
    { 
      error: 'Statuses are now defined as enums in the schema',
      message: 'Status values cannot be added at runtime'
    },
    { status: 400 }
  );
} 