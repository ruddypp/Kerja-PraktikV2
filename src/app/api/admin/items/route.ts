import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ItemStatus } from '@prisma/client';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

// GET all items
export async function GET(request: Request) {
  try {
    console.log('Admin items API called');
    
    // Verifikasi admin
    const user = await getUserFromRequest(request);
    console.log('User from request:', user ? `${user.name} (${user.role})` : 'Not authenticated');
    
    if (!isAdmin(user)) {
      console.log('User is not admin, returning unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    console.log('Query params:', { category, status, search, page, limit, skip });
    
    // Build where conditions with proper typing
    const where: Record<string, unknown> = {};
    
    if (category && category !== 'all') {
      // Hapus kondisi category karena field sudah tidak ada
      // where.category = category; 
    }
    
    if (status && status !== 'all') {
      where.status = status as ItemStatus;
    }
    
    if (search && search.trim() !== '') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        // Menghapus pencarian di description untuk optimasi
        // { description: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    console.log('Database query where clause:', where);
    
    // Get count by status - optimasi dengan Promise.all
    const [totalItems, countByStatus] = await Promise.all([
      // Get total count for pagination
      prisma.item.count({ where }),
      
      // Dapatkan status counts dalam satu request
      Promise.all([
        prisma.item.count({ where: { ...where, status: ItemStatus.AVAILABLE }}),
        prisma.item.count({ where: { ...where, status: ItemStatus.IN_CALIBRATION }}),
        prisma.item.count({ where: { ...where, status: ItemStatus.RENTED }}),
        prisma.item.count({ where: { ...where, status: ItemStatus.IN_MAINTENANCE }})
      ]).then(([AVAILABLE, IN_CALIBRATION, RENTED, IN_MAINTENANCE]) => {
        return { AVAILABLE, IN_CALIBRATION, RENTED, IN_MAINTENANCE };
      })
    ]);
    
    // Create the actual data fetch promise, including maintenance and calibration history
    const items = await prisma.item.findMany({
      where,
      select: {
        serialNumber: true,
        name: true,
        partNumber: true,
        sensor: true,
        // Optimasi select, hanya ambil field yang diperlukan
        description: false,
        status: true,
        lastVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            name: true
          }
        },
        calibrations: {
          select: {
            id: true,
            status: true,
            calibrationDate: true,
            // Kurangi data yang tidak perlu di list
            validUntil: false,
            certificateNumber: false,
            certificateUrl: false,
            vendor: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            calibrationDate: 'desc'
          },
          take: 1
        },
        maintenances: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: false,
            // Hapus referensi laporan yang tidak diperlukan di listing
            serviceReport: false,
            technicalReport: false
          },
          orderBy: {
            startDate: 'desc'
          },
          take: 1
        },
        rentals: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: false,
            returnDate: false,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          where: {
            status: 'APPROVED',
            returnDate: null
          },
          take: 1
        }
      },
      orderBy: {
        name: 'asc'
      },
      skip: skip,
      take: limit
    });
    
    console.log(`Found ${items.length} items in database (page ${page} of ${Math.ceil(totalItems / limit)})`);
    
    // Buat respons dengan header cache
    const response = NextResponse.json({
      items: items || [],
      total: totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      countByStatus
    });
    
    // Tambahkan header Cache-Control
    response.headers.set('Cache-Control', 'public, max-age=60');
    
    return response;
  } catch (error) {
    console.error('Error fetching items:', error);
    // Return empty array instead of error to prevent UI crash
    return NextResponse.json({ 
      items: [], 
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
      countByStatus: {
        AVAILABLE: 0,
        IN_CALIBRATION: 0,
        RENTED: 0,
        IN_MAINTENANCE: 0
      }
    });
  }
}

// POST create a new item
export async function POST(request: Request) {
  try {
    // Verifikasi admin
    const user = await getUserFromRequest(request);
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Buat respons dengan header no-cache untuk memastikan data fresh
    const response = NextResponse.json(
      await prisma.item.create({
        data: {
          serialNumber: data.serialNumber,
          name: data.name,
          partNumber: data.partNumber,
          sensor: data.sensor,
          description: data.description,
          customerId: data.customerId,
          status: data.status
        },
      })
    );
    
    // Set header Cache-Control untuk memastikan tidak ada caching
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    
    return response;
  } catch (error: any) {
    console.error('Error creating item:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Item dengan serial number tersebut sudah ada' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Gagal menambahkan item baru' },
      { status: 500 }
    );
  }
}

// PATCH update an item
export async function PATCH(request: Request) {
  try {
    // Verifikasi admin
    const user = await getUserFromRequest(request);
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get('serialNumber');
    
    if (!serialNumber) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { 
      name,
      partNumber,
      sensor,
      description,
      customerId,
      status
    } = body;
    
    console.log('PATCH - Received update request for item:', serialNumber);
    console.log('PATCH - Request body:', body);
    console.log('PATCH - Customer ID value:', customerId);
    
    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }
    
    if (!partNumber) {
      return NextResponse.json(
        { error: 'Part number is required' },
        { status: 400 }
      );
    }
    
    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { serialNumber }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    console.log('PATCH - Existing item:', existingItem);
    
    // Update item data object with proper typing
    const itemData: {
      name: string,
      partNumber: string,
      sensor: string | null,
      description: string | null,
      customerId: string | null,
      status: ItemStatus
    } = {
      name,
      partNumber,
      sensor: sensor || null,
      description: description || null,
      customerId: customerId || null,
      status: status || existingItem.status
    };
    
    console.log('PATCH - Item data to update:', itemData);
    
    // Update the item
    const updatedItem = await prisma.item.update({
      where: { serialNumber },
      data: itemData,
      include: {
        customer: true
      }
    });
    
    console.log('PATCH - Updated item:', updatedItem);
    
    // Create an activity log
    await prisma.activityLog.create({
      data: {
        user: { connect: { id: user?.id || '' } },
        item: { connect: { serialNumber } },
        action: 'UPDATED',
        details: `Item ${name} (${serialNumber}) updated`
      }
    });
    
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

// DELETE method for items
export async function DELETE(request: Request) {
  try {
    // Verify admin
    const user = await getUserFromRequest(request);
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get('serialNumber');
    
    if (!serialNumber) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }
    
    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { serialNumber },
      include: {
        calibrations: {
          include: {
            statusLogs: true,
            certificate: true
          }
        },
        rentals: {
          include: {
            statusLogs: true
          }
        },
        maintenances: {
          include: {
            statusLogs: true,
            serviceReport: {
              include: {
                parts: true
              }
            },
            technicalReport: {
              include: {
                partsList: true
              }
            }
          }
        },
        histories: true,
        inventoryCheckItems: true,
        activityLogs: true
      }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    console.log(`Attempting full deletion of item ${serialNumber} with ALL related records`);
    
    try {
      // 1. Hapus semua relasi CalibrationStatusLog
      for (const calibration of existingItem.calibrations || []) {
        if (calibration.statusLogs?.length > 0) {
          await prisma.calibrationStatusLog.deleteMany({
            where: { calibrationId: calibration.id }
          });
        }
        
        // Hapus sertifikat kalibrasi jika ada
        if (calibration.certificate) {
          await prisma.calibrationCertificate.delete({
            where: { calibrationId: calibration.id }
          });
        }
      }
      
      // 2. Hapus semua relasi MaintenanceStatusLog dan laporan terkait
      for (const maintenance of existingItem.maintenances || []) {
        if (maintenance.statusLogs?.length > 0) {
          await prisma.maintenanceStatusLog.deleteMany({
            where: { maintenanceId: maintenance.id }
          });
        }
        
        // Hapus ServiceReport dan parts jika ada
        if (maintenance.serviceReport) {
          // Hapus parts terlebih dahulu
          if (maintenance.serviceReport.parts?.length > 0) {
            await prisma.serviceReportPart.deleteMany({
              where: { serviceReportId: maintenance.serviceReport.id }
            });
          }
          
          await prisma.serviceReport.delete({
            where: { maintenanceId: maintenance.id }
          });
        }
        
        // Hapus TechnicalReport dan partsList jika ada
        if (maintenance.technicalReport) {
          // Hapus parts terlebih dahulu
          if (maintenance.technicalReport.partsList?.length > 0) {
            await prisma.technicalReportPart.deleteMany({
              where: { technicalReportId: maintenance.technicalReport.id }
            });
          }
          
          await prisma.technicalReport.delete({
            where: { maintenanceId: maintenance.id }
          });
        }
      }
      
      // 3. Hapus semua relasi RentalStatusLog
      for (const rental of existingItem.rentals || []) {
        if (rental.statusLogs?.length > 0) {
          await prisma.rentalStatusLog.deleteMany({
            where: { rentalId: rental.id }
          });
        }
      }
      
      // 4. Hapus inventoryCheckItems
      if (existingItem.inventoryCheckItems?.length > 0) {
        await prisma.inventoryCheckItem.deleteMany({
          where: { itemSerial: serialNumber }
        });
      }
      
      // 5. Hapus activityLogs
      if (existingItem.activityLogs?.length > 0) {
        await prisma.activityLog.deleteMany({
          where: { itemSerial: serialNumber }
        });
      }
      
      // 6. Hapus histories
      if (existingItem.histories?.length > 0) {
        await prisma.itemHistory.deleteMany({
          where: { itemSerial: serialNumber }
        });
      }
      
      // 7. Hapus calibrations
      if (existingItem.calibrations?.length > 0) {
        await prisma.calibration.deleteMany({
          where: { itemSerial: serialNumber }
        });
      }
      
      // 8. Hapus maintenances
      if (existingItem.maintenances?.length > 0) {
        await prisma.maintenance.deleteMany({
          where: { itemSerial: serialNumber }
        });
      }
      
      // 9. Hapus rentals
      if (existingItem.rentals?.length > 0) {
        await prisma.rental.deleteMany({
          where: { itemSerial: serialNumber }
        });
      }
      
      // 10. Hapus item
      await prisma.item.delete({
        where: { serialNumber }
      });
      
      // Buat activity log penghapusan (tanpa relasi ke item)
      await prisma.activityLog.create({
        data: {
          userId: user?.id || '',
          action: 'DELETED',
          details: `Item ${existingItem.name} (${serialNumber}) deleted from inventory along with all related records`
        }
      });
      
      return NextResponse.json({ 
        success: true,
        message: 'Item dan semua data terkait berhasil dihapus'
      });
      
    } catch (error) {
      console.error(`Error in deletion process for item ${serialNumber}:`, error);
      return NextResponse.json(
        { error: `Failed to delete item: ${error}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
} 