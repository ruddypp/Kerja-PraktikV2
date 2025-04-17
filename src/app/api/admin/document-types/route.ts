import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface DocumentTypeResponse {
  id: string;
  name: string;
}

export async function GET() {
  try {
    const documentTypes = await prisma.documentType.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    const formattedTypes: DocumentTypeResponse[] = documentTypes.map(type => ({
      id: type.id.toString(),
      name: type.name
    }));
    
    return NextResponse.json(formattedTypes);
  } catch (error) {
    console.error(error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'Document type name is required' },
        { status: 400 }
      );
    }
    
    const documentType = await prisma.documentType.create({
      data: {
        name
      }
    });
    
    return NextResponse.json({
      id: documentType.id.toString(),
      name: documentType.name
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create document type' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Document type ID is required' },
        { status: 400 }
      );
    }
    
    // Check if there are documents using this type
    const documentsCount = await prisma.document.count({
      where: {
        typeId: parseInt(id)
      }
    });
    
    if (documentsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete document type that is used by ${documentsCount} documents` },
        { status: 400 }
      );
    }
    
    await prisma.documentType.delete({
      where: {
        id: parseInt(id)
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete document type' }, { status: 500 });
  }
} 