import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatDocumentResponse } from '@/lib/api/documents';

// POST to check out a document
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const { userId } = await req.json();
    
    if (!documentId || !userId) {
      return NextResponse.json(
        { error: 'Document ID and user ID are required' },
        { status: 400 }
      );
    }
    
    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id: parseInt(documentId) },
      include: {
        uploadedBy: {
          select: { 
            id: true,
            name: true 
          }
        },
        documentType: {
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
    
    // Check if document is already checked out
    if (document.isCheckedOut) {
      return NextResponse.json(
        { error: 'Document is already checked out' },
        { status: 400 }
      );
    }
    
    // Update document to checked out status
    const updatedDocument = await prisma.document.update({
      where: { id: parseInt(documentId) },
      data: {
        isCheckedOut: true,
        checkedOutById: parseInt(userId)
      },
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
          select: { name: true }
        }
      }
    });
    
    // Create activity log for check out
    await prisma.activityLog.create({
      data: {
        userId: parseInt(userId),
        activity: `Checked out document "${document.fileName}" (ID: ${documentId})`,
        createdAt: new Date()
      }
    });
    
    // Format response using our utility function
    const formattedDocument = await formatDocumentResponse(updatedDocument);
    
    return NextResponse.json(formattedDocument);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to check out document' },
      { status: 500 }
    );
  }
}

// DELETE to check in a document
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const { userId } = await req.json();
    
    if (!documentId || !userId) {
      return NextResponse.json(
        { error: 'Document ID and user ID are required' },
        { status: 400 }
      );
    }
    
    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id: parseInt(documentId) },
      include: {
        documentType: {
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
    
    // Check if document is actually checked out
    if (!document.isCheckedOut) {
      return NextResponse.json(
        { error: 'Document is not checked out' },
        { status: 400 }
      );
    }
    
    // Check if the user is the one who checked it out
    if (document.checkedOutById !== parseInt(userId)) {
      // Allow admin override or higher permissions here if needed
      // For now, just return an error
      return NextResponse.json(
        { error: 'Only the user who checked out the document can check it back in' },
        { status: 403 }
      );
    }
    
    // Update document to checked in status
    const updatedDocument = await prisma.document.update({
      where: { id: parseInt(documentId) },
      data: {
        isCheckedOut: false,
        checkedOutById: null
      },
      include: {
        uploadedBy: {
          select: { 
            id: true,
            name: true 
          }
        },
        documentType: {
          select: { name: true }
        }
      }
    });
    
    // Create activity log for check in
    await prisma.activityLog.create({
      data: {
        userId: parseInt(userId),
        activity: `Checked in document "${document.fileName}" (ID: ${documentId})`,
        createdAt: new Date()
      }
    });
    
    // Format response using our utility function
    const formattedDocument = await formatDocumentResponse(updatedDocument);
    
    return NextResponse.json({
      success: true,
      document: formattedDocument
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to check in document' },
      { status: 500 }
    );
  }
} 