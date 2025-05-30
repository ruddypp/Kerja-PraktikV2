import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RequestStatus } from '@prisma/client';

export interface MonthlyActivityData {
  month: number;
  rentals: number;
  calibrations: number;
  maintenance: number;
}

export interface EquipmentActivityResponse {
  year: number;
  monthlyData: MonthlyActivityData[];
}

export async function GET(request: Request) {
  try {
    // Get year from query parameters or use current year
    const url = new URL(request.url);
    const yearParam = url.searchParams.get('year');
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
    
    // Initialize monthly data structure
    const monthlyData: MonthlyActivityData[] = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      rentals: 0,
      calibrations: 0,
      maintenance: 0
    }));

    // Calculate start and end dates for the year
    const startDate = new Date(year, 0, 1); // January 1st of the year
    const endDate = new Date(year, 11, 31, 23, 59, 59); // December 31st of the year
    
    // Get rentals data for the year
    const rentals = await prisma.rental.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: [RequestStatus.APPROVED, RequestStatus.COMPLETED]
        }
      },
      select: {
        createdAt: true,
      }
    });
    
    // Get calibrations data for the year
    const calibrations = await prisma.calibration.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: [RequestStatus.APPROVED, RequestStatus.COMPLETED]
        }
      },
      select: {
        createdAt: true,
      }
    });
    
    // Get maintenance data for the year
    const maintenance = await prisma.maintenance.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: [RequestStatus.APPROVED, RequestStatus.COMPLETED]
        }
      },
      select: {
        createdAt: true,
      }
    });
    
    // Process rental data
    rentals.forEach(rental => {
      const month = rental.createdAt.getMonth();
      monthlyData[month].rentals += 1;
    });
    
    // Process calibration data
    calibrations.forEach(calibration => {
      const month = calibration.createdAt.getMonth();
      monthlyData[month].calibrations += 1;
    });
    
    // Process maintenance data
    maintenance.forEach(maint => {
      const month = maint.createdAt.getMonth();
      monthlyData[month].maintenance += 1;
    });
    
    // Return the complete response
    const response: EquipmentActivityResponse = {
      year,
      monthlyData
    };
    
    // Set cache headers
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=60'); // Cache for 60 seconds
    headers.set('Vary', 'Cookie'); // Vary cache by cookie
    
    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error('Error fetching equipment activity data:', error);
    
    // Return empty data in case of error
    const emptyResponse: EquipmentActivityResponse = {
      year: new Date().getFullYear(),
      monthlyData: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        rentals: 0,
        calibrations: 0,
        maintenance: 0
      }))
    };
    
    return NextResponse.json(emptyResponse, { status: 500 });
  }
} 