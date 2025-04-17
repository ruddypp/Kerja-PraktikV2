import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DocumentStatus } from '@prisma/client';

interface DocumentResponse {
  id: string;
  fileName: string;
  documentType: string;
  status: DocumentStatus;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
  fileUrl: string;
  isCheckedOut: boolean;
  checkedOutBy: string | null;
  relatedItem: string | null;
  relatedRequest: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const uploadedBy = searchParams.get('uploadedBy');
    const relatedTo = searchParams.get('relatedTo');
    const checkoutStatus = searchParams.get('checkoutStatus');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build an advanced search query
    const whereClause: any = {};
    
    if (type && type !== 'all') {
      if (/^\d+$/.test(type)) {
        whereClause.typeId = parseInt(type);
      } else {
        whereClause.documentType = {
          name: {
            equals: type,
            mode: 'insensitive'
          }
        };
      }
    }
    
    if (status && status !== 'all') {
      whereClause.status = status as DocumentStatus;
    }
    
    if (search) {
      whereClause.OR = [
        { fileName: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (dateFrom || dateTo) {
      whereClause.uploadedAt = {};
      
      if (dateFrom) {
        whereClause.uploadedAt.gte = new Date(dateFrom);
      }
      
      if (dateTo) {
        whereClause.uploadedAt.lte = new Date(dateTo);
      }
    }
    
    if (uploadedBy) {
      whereClause.uploadedById = parseInt(uploadedBy);
    }
    
    if (checkoutStatus) {
      whereClause.isCheckedOut = checkoutStatus === 'checked-out';
    }
    
    // Handle related entities
    if (relatedTo && relatedTo !== 'all') {
      const [entityType, entityId] = relatedTo.split(':');
      
      if (entityType && entityId) {
        switch (entityType) {
          case 'request':
            whereClause.requestId = parseInt(entityId);
            break;
          case 'calibration':
            whereClause.calibrationId = parseInt(entityId);
            break;
          case 'rental':
            whereClause.rentalId = parseInt(entityId);
            break;
          case 'project':
            whereClause.projectId = parseInt(entityId);
            break;
        }
      }
    }
    
    // Execute query with pagination
    const [documents, totalCount] = await Promise.all([
      prisma.document.findMany({
        where: whereClause,
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true
            }
          },
          checkedOutBy: {
            select: {
              id: true,
              name: true
            }
          },
          documentType: {
            select: {
              name: true
            }
          },
          request: {
            select: {
              id: true,
              user: {
                select: {
                  name: true
                }
              },
              item: {
                select: {
                  name: true
                }
              }
            }
          },
          calibration: {
            select: {
              id: true,
              item: {
                select: {
                  name: true
                }
              }
            }
          },
          rental: {
            select: {
              id: true,
              item: {
                select: {
                  name: true
                }
              }
            }
          },
          project: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          uploadedAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.document.count({
        where: whereClause
      })
    ]);
    
    // Format response
    const formattedDocuments: DocumentResponse[] = documents.map(doc => {
      // Determine related item
      let relatedItem = null;
      if (doc.request?.item) {
        relatedItem = `Request: ${doc.request.item.name}`;
      } else if (doc.calibration?.item) {
        relatedItem = `Calibration: ${doc.calibration.item.name}`;
      } else if (doc.rental?.item) {
        relatedItem = `Rental: ${doc.rental.item.name}`;
      } else if (doc.project) {
        relatedItem = `Project: ${doc.project.name}`;
      }
      
      // Determine related request
      let relatedRequest = null;
      if (doc.requestId) {
        relatedRequest = `Request #${doc.requestId} by ${doc.request?.user.name || 'Unknown'}`;
      } else if (doc.calibrationId) {
        relatedRequest = `Calibration #${doc.calibrationId}`;
      } else if (doc.rentalId) {
        relatedRequest = `Rental #${doc.rentalId}`;
      } else if (doc.projectId) {
        relatedRequest = `Project #${doc.projectId}: ${doc.project?.name || 'Unknown'}`;
      }
      
      return {
        id: doc.id.toString(),
        fileName: doc.fileName,
        documentType: doc.documentType.name,
        status: doc.status,
        uploadedBy: doc.uploadedBy.name,
        uploadedAt: doc.uploadedAt.toISOString(),
        version: doc.version,
        fileUrl: doc.fileUrl,
        isCheckedOut: doc.isCheckedOut,
        checkedOutBy: doc.checkedOutBy?.name || null,
        relatedItem,
        relatedRequest
      };
    });
    
    return NextResponse.json({
      documents: formattedDocuments,
      pagination: {
        total: totalCount,
        offset,
        limit
      }
    });
  } catch (error) {
    console.error(error);
    // Return empty array to prevent UI crash
    return NextResponse.json({
      documents: [],
      pagination: {
        total: 0,
        offset: 0,
        limit: 50
      }
    }, { status: 500 });
  }
} 