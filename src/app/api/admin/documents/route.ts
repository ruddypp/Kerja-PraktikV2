import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DocumentStatus } from '@prisma/client';
import { getDocuments, formatDocumentResponse } from '@/lib/api/documents';

// Define document response interface
interface DocumentResponse {
  id: string;
  fileName: string;
  documentType: string;
  status: DocumentStatus;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
  fileUrl: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || undefined;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
    
    // Use the utility function to get and format documents
    const result = await getDocuments({
      type,
      status,
      search,
      limit,
      offset
    });
    
    // If pagination is requested, return the full result with pagination info
    if (searchParams.has('limit') || searchParams.has('offset')) {
      return NextResponse.json(result);
    }
    
    // Otherwise, return just the documents array for backward compatibility
    return NextResponse.json(result.documents);
  } catch (error) {
    console.error(error);
    // Return empty array to prevent UI crash
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, typeId, fileUrl, uploadedById, status, requestId, calibrationId, rentalId, projectId, version } = body;
    
    // Validate required fields
    if (!fileName || !typeId || !fileUrl || !uploadedById) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create new document
    const document = await prisma.document.create({
      data: {
        fileName,
        fileUrl,
        uploadedById: parseInt(uploadedById),
        typeId: parseInt(typeId),
        status: status || DocumentStatus.DRAFT,
        requestId: requestId ? parseInt(requestId) : null,
        calibrationId: calibrationId ? parseInt(calibrationId) : null,
        rentalId: rentalId ? parseInt(rentalId) : null,
        projectId: projectId ? parseInt(projectId) : null,
        version: version ? parseInt(version) : 1
      },
      include: {
        uploadedBy: {
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
        checkedOutBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Create activity log for document upload
    await prisma.activityLog.create({
      data: {
        userId: parseInt(uploadedById),
        activity: `Document "${fileName}" uploaded`,
        createdAt: new Date()
      }
    });
    
    // Format the document response
    const formattedDocument = await formatDocumentResponse(document);
    
    return NextResponse.json(formattedDocument);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('id');
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    // Get document info before deletion for activity log
    const document = await prisma.document.findUnique({
      where: { id: parseInt(documentId) },
      include: {
        uploadedBy: {
          select: { name: true }
        }
      }
    });
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Delete document
    await prisma.document.delete({
      where: { id: parseInt(documentId) }
    });
    
    // Create activity log for document deletion
    await prisma.activityLog.create({
      data: {
        userId: document.uploadedById,
        activity: `Document "${document.fileName}" deleted`,
        createdAt: new Date()
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
} 