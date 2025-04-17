import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatDocumentResponse } from '@/lib/api/documents';

interface VersionResponse {
  id: string;
  documentId: string;
  version: number;
  fileUrl: string;
  uploadedBy: {
    id: string;
    name: string;
  };
  createdAt: string;
}

// GET all versions of a document
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    // Find document to ensure it exists
    const document = await prisma.document.findUnique({
      where: { 
        id: parseInt(documentId) 
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Get historical versions
    const versions = await prisma.documentVersion.findMany({
      where: {
        documentId: parseInt(documentId)
      },
      include: {
        document: {
          include: {
            documentType: true
          }
        }
      },
      orderBy: {
        version: 'desc'
      }
    });
    
    // Format current version
    const currentVersion: VersionResponse = {
      id: 'current',
      documentId: document.id.toString(),
      version: document.version,
      fileUrl: document.fileUrl,
      uploadedBy: {
        id: document.uploadedBy.id.toString(),
        name: document.uploadedBy.name
      },
      createdAt: document.uploadedAt.toISOString()
    };
    
    // Format historical versions
    const formattedVersions: VersionResponse[] = [
      // Include current version first
      currentVersion,
      
      // Then include historical versions
      ...await Promise.all(versions.map(async (version) => {
        const user = await getUserById(version.uploadedById);
        return {
          id: version.id.toString(),
          documentId: version.documentId.toString(),
          version: version.version,
          fileUrl: version.fileUrl,
          uploadedBy: user,
          createdAt: version.createdAt.toISOString()
        };
      }))
    ];
    
    return NextResponse.json(formattedVersions);
  } catch (error) {
    console.error(error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST to create a new version
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const uploadedById = formData.get('uploadedById') as string;
    
    if (!file || !uploadedById) {
      return NextResponse.json(
        { error: 'File and user ID are required' },
        { status: 400 }
      );
    }
    
    // Find the document to ensure it exists and get current version
    const document = await prisma.document.findUnique({
      where: { 
        id: parseInt(documentId) 
      },
      include: {
        documentType: true
      }
    });
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Generate a unique file name for the new version
    const uniqueFileName = `${Date.now()}-${file.name}`;
    
    // Here you would upload the file to your storage service
    // This is a placeholder for the actual upload logic
    const fileUrl = `/uploads/${uniqueFileName}`;
    
    // Store the current version in document_versions table
    await prisma.documentVersion.create({
      data: {
        documentId: parseInt(documentId),
        version: document.version,
        fileUrl: document.fileUrl,
        uploadedById: document.uploadedById
      }
    });
    
    // Update the document with the new version
    const updatedDocument = await prisma.document.update({
      where: { 
        id: parseInt(documentId) 
      },
      data: {
        fileUrl: fileUrl,
        version: document.version + 1,
        uploadedById: parseInt(uploadedById),
        uploadedAt: new Date()
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true
          }
        },
        documentType: true
      }
    });
    
    // Create activity log for version update
    await prisma.activityLog.create({
      data: {
        userId: parseInt(uploadedById),
        activity: `Updated document "${document.fileName}" to version ${document.version + 1}`,
        createdAt: new Date()
      }
    });
    
    // Format response
    const response: VersionResponse = {
      id: 'new-version',
      documentId: documentId,
      version: updatedDocument.version,
      fileUrl: updatedDocument.fileUrl,
      uploadedBy: {
        id: updatedDocument.uploadedBy.id.toString(),
        name: updatedDocument.uploadedBy.name
      },
      createdAt: updatedDocument.uploadedAt.toISOString()
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to create document version' },
      { status: 500 }
    );
  }
}

// Helper function to get user by ID
async function getUserById(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true
    }
  });
  
  return {
    id: user?.id.toString() || '',
    name: user?.name || 'Unknown User'
  };
} 