import { prisma } from '@/lib/prisma';
import { Document, DocumentStatus, User } from '@prisma/client';

export interface DocumentResponse {
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
  relatedItem?: string | null;
  relatedRequest?: string | null;
}

/**
 * Format a document object from the database into a consistent response format
 */
export async function formatDocumentResponse(
  document: Document & {
    uploadedBy: Pick<User, 'id' | 'name'>;
    checkedOutBy?: Pick<User, 'id' | 'name'> | null;
    documentType: { name: string };
    request?: any;
    calibration?: any;
    rental?: any;
    project?: any;
  }
): Promise<DocumentResponse> {
  // Determine related item if relationships are included
  let relatedItem = null;
  if (document.request?.item) {
    relatedItem = `Request: ${document.request.item.name}`;
  } else if (document.calibration?.item) {
    relatedItem = `Calibration: ${document.calibration.item.name}`;
  } else if (document.rental?.item) {
    relatedItem = `Rental: ${document.rental.item.name}`;
  } else if (document.project) {
    relatedItem = `Project: ${document.project.name}`;
  }
  
  // Determine related request or entity
  let relatedRequest = null;
  if (document.requestId) {
    relatedRequest = `Request #${document.requestId} by ${document.request?.user?.name || 'Unknown'}`;
  } else if (document.calibrationId) {
    relatedRequest = `Calibration #${document.calibrationId}`;
  } else if (document.rentalId) {
    relatedRequest = `Rental #${document.rentalId}`;
  } else if (document.projectId) {
    relatedRequest = `Project #${document.projectId}: ${document.project?.name || 'Unknown'}`;
  }
  
  return {
    id: document.id.toString(),
    fileName: document.fileName,
    documentType: document.documentType.name,
    status: document.status,
    uploadedBy: document.uploadedBy.name,
    uploadedAt: document.uploadedAt.toISOString(),
    version: document.version,
    fileUrl: document.fileUrl,
    isCheckedOut: document.isCheckedOut,
    checkedOutBy: document.checkedOutBy?.name || null,
    relatedItem,
    relatedRequest
  };
}

/**
 * Get documents with optional filtering
 */
export async function getDocuments({
  type,
  status,
  search,
  limit = 50,
  offset = 0,
  userId,
  dateFrom,
  dateTo,
  relatedTo
}: {
  type?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  relatedTo?: string;
}) {
  // Build where clause
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
  
  if (userId) {
    whereClause.uploadedById = parseInt(userId);
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
  try {
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
    
    // Format documents
    const formattedDocuments = await Promise.all(
      documents.map(doc => formatDocumentResponse(doc))
    );
    
    return {
      documents: formattedDocuments,
      pagination: {
        total: totalCount,
        offset,
        limit
      }
    };
  } catch (error) {
    console.error('Error fetching documents:', error);
    return {
      documents: [],
      pagination: {
        total: 0,
        offset,
        limit
      }
    };
  }
}

/**
 * Get document types for dropdown menus
 */
export async function getDocumentTypes() {
  try {
    const types = await prisma.documentType.findMany({
      orderBy: { name: 'asc' }
    });
    
    return types.map(type => ({
      id: type.id.toString(),
      name: type.name
    }));
  } catch (error) {
    console.error('Error fetching document types:', error);
    return [];
  }
} 