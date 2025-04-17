import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DocumentStatus } from '@prisma/client';
import { formatDocumentResponse } from '@/lib/api/documents';

export async function POST(req: NextRequest) {
  try {
    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string || file.name;
    const typeId = formData.get('typeId') as string;
    const uploadedById = formData.get('uploadedById') as string;
    const status = formData.get('status') as DocumentStatus || DocumentStatus.DRAFT;
    const requestId = formData.get('requestId') as string;
    const calibrationId = formData.get('calibrationId') as string;
    const rentalId = formData.get('rentalId') as string;
    const projectId = formData.get('projectId') as string;
    
    // Validate required fields
    if (!file || !typeId || !uploadedById) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Generate a unique file name to prevent collisions
    const uniqueFileName = `${Date.now()}-${fileName}`;
    
    // Here you would upload the file to your storage service
    // For example, AWS S3, Google Cloud Storage, etc.
    // This is a placeholder for the actual upload logic
    
    // For demonstration, we'll assume a successful upload
    // and generate a mock URL
    const fileUrl = `/uploads/${uniqueFileName}`;
    
    // Calculate file size in bytes
    const fileSize = file.size;
    
    // Determine file type from extension
    const fileType = file.name.split('.').pop() || '';
    
    // Create document record in database
    const document = await prisma.document.create({
      data: {
        fileName,
        fileUrl,
        uploadedById: parseInt(uploadedById),
        typeId: parseInt(typeId),
        status,
        requestId: requestId ? parseInt(requestId) : null,
        calibrationId: calibrationId ? parseInt(calibrationId) : null,
        rentalId: rentalId ? parseInt(rentalId) : null,
        projectId: projectId ? parseInt(projectId) : null,
        version: 1
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
    
    // Format the document response using our utility function
    const formattedDocument = await formatDocumentResponse(document);
    
    // Add additional upload-specific fields
    const response = {
      ...formattedDocument,
      fileSize,
      fileType
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
} 