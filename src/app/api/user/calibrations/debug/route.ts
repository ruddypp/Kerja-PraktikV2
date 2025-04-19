import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

// This endpoint is for debugging purposes only
// It returns all data about a calibration to help diagnose issues
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const serialNumber = searchParams.get('serialNumber');
    const showAll = searchParams.get('showAll') === 'true';
    
    // Build query based on parameters
    let where: any = {};
    
    if (id) {
      where.id = id;
    }
    
    if (serialNumber) {
      where.itemSerial = serialNumber;
    }
    
    // Restrict to user's own calibrations unless they're an admin
    if (!showAll || user.role !== 'ADMIN') {
      where.userId = user.id;
    }
    
    // Query database
    const calibrations = await prisma.calibration.findMany({
      where,
      include: {
        item: true,
        vendor: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        statusLogs: {
          include: {
            changedBy: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Get raw database values for some fields
    let rawData = null;
    if (id) {
      rawData = await prisma.$queryRaw`
        SELECT 
          "id", 
          "certificateNumber", 
          "gasType", 
          "gasConcentration", 
          "gasBalance",
          "gasBatchNumber",
          "testSensor", 
          "testSpan", 
          "testResult", 
          "approvedBy"
        FROM "Calibration"
        WHERE "id" = ${id}
      `;
    }
    
    // Return all collected data
    return NextResponse.json({
      calibrations,
      rawData,
      meta: {
        count: calibrations.length,
        user: {
          id: user.id,
          role: user.role
        },
        queryParams: {
          id,
          serialNumber,
          showAll
        }
      }
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 