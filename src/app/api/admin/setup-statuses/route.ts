import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const results = [];
    
    // Check if PENDING status exists
    const pendingStatus = await prisma.status.findFirst({
      where: {
        name: 'PENDING',
        type: 'request'
      }
    });

    if (!pendingStatus) {
      const newStatus = await prisma.status.create({
        data: {
          name: 'PENDING',
          type: 'request',
        }
      });
      results.push(`Created PENDING status with ID: ${newStatus.id}`);
    } else {
      results.push(`PENDING status already exists with ID: ${pendingStatus.id}`);
    }

    // Check for APPROVED status
    const approvedStatus = await prisma.status.findFirst({
      where: {
        name: 'APPROVED',
        type: 'request'
      }
    });

    if (!approvedStatus) {
      const newStatus = await prisma.status.create({
        data: {
          name: 'APPROVED',
          type: 'request',
        }
      });
      results.push(`Created APPROVED status with ID: ${newStatus.id}`);
    } else {
      results.push(`APPROVED status already exists with ID: ${approvedStatus.id}`);
    }

    // Check for REJECTED status
    const rejectedStatus = await prisma.status.findFirst({
      where: {
        name: 'REJECTED',
        type: 'request'
      }
    });

    if (!rejectedStatus) {
      const newStatus = await prisma.status.create({
        data: {
          name: 'REJECTED',
          type: 'request',
        }
      });
      results.push(`Created REJECTED status with ID: ${newStatus.id}`);
    } else {
      results.push(`REJECTED status already exists with ID: ${rejectedStatus.id}`);
    }

    // Check for COMPLETED status
    const completedStatus = await prisma.status.findFirst({
      where: {
        name: 'COMPLETED',
        type: 'request'
      }
    });

    if (!completedStatus) {
      const newStatus = await prisma.status.create({
        data: {
          name: 'COMPLETED',
          type: 'request',
        }
      });
      results.push(`Created COMPLETED status with ID: ${newStatus.id}`);
    } else {
      results.push(`COMPLETED status already exists with ID: ${completedStatus.id}`);
    }

    // Get all statuses for verification
    const allStatuses = await prisma.status.findMany();
    
    // Log the specific IDs for debugging
    console.log('REQUEST STATUS IDs:');
    console.log(`PENDING: ${pendingStatus?.id || 'not set'}`);
    console.log(`APPROVED: ${approvedStatus?.id || 'not set'}`);
    console.log(`REJECTED: ${rejectedStatus?.id || 'not set'}`);
    console.log(`COMPLETED: ${completedStatus?.id || 'not set'}`);
    
    return NextResponse.json({
      success: true,
      results,
      allStatuses,
      statusIds: {
        PENDING: pendingStatus?.id,
        APPROVED: approvedStatus?.id,
        REJECTED: rejectedStatus?.id,
        COMPLETED: completedStatus?.id
      }
    });
  } catch (error) {
    console.error('Error setting up statuses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set up statuses' },
      { status: 500 }
    );
  }
} 