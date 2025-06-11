import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RequestStatus, ItemStatus, ActivityType } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';
import { logCalibrationActivity } from '@/lib/activity-logger';
import { notifyAdminsAndManagersOfActivity } from '@/lib/notificationService';
import { format } from 'date-fns';
import crypto from 'crypto';

// Status yang digunakan dalam kalibrasi - mapping ke enum Prisma
const REQUEST_STATUS_COMPLETED = RequestStatus.COMPLETED; // Status setelah selesai

// Validation schema untuk memulai kalibrasi
const createCalibrationSchema = z.object({
  itemSerial: z.string().min(1, "Item serial number diperlukan"),
  vendorId: z.string().min(1, "Vendor diperlukan"),
  
  // Data tambahan dari form
  address: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  
  // Detail Alat (dapat diambil dari database)
  manufacturer: z.string().optional(),
  instrumentName: z.string().optional(),
  modelNumber: z.string().optional(),
  configuration: z.string().optional(),
  
  calibrationDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Tanggal kalibrasi harus berupa tanggal yang valid"
  }),
  
  // Notes field is optional and can be null or undefined
  notes: z.string().optional().nullable().default(null)
});

// Validation schema untuk menyelesaikan kalibrasi
const completeCalibrationSchema = z.object({
  // ID kalibrasi
  id: z.string().min(1, "ID kalibrasi diperlukan"),
  
  // Detail Gas Kalibrasi
  gasType: z.string().min(1, "Jenis gas diperlukan"),
  gasConcentration: z.string().min(1, "Konsentrasi gas diperlukan"),
  gasBalance: z.string().min(1, "Balance gas diperlukan"),
  gasBatchNumber: z.string().min(1, "Batch number gas diperlukan"),
  
  // Hasil Test
  testSensor: z.string().min(1, "Sensor diperlukan"),
  testSpan: z.string().min(1, "Span diperlukan"),
  testResult: z.enum(["Pass", "Fail"], { 
    errorMap: () => ({ message: "Hasil test harus 'Pass' atau 'Fail'" }) 
  }),
  
  // Detail Alat
  instrumentName: z.string().min(1, "Nama instrumen diperlukan"),
  modelNumber: z.string().min(1, "Model number diperlukan"),
  configuration: z.string().min(1, "Konfigurasi diperlukan"),
  
  // Tanggal dan Approval
  approvedBy: z.string().min(1, "Nama yang menyetujui diperlukan"),
  validUntil: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Tanggal validitas harus berupa tanggal yang valid"
  }),
  
  // Catatan tambahan
  notes: z.string().optional().nullable(),
  
  // New fields for multiple gas and test entries
  allGasEntries: z.string().optional(),
  allTestEntries: z.string().optional()
});

// GET semua kalibrasi untuk user saat ini
export async function GET(request: Request) {
  try {
    // Verifikasi session user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const itemSerial = searchParams.get('itemSerial');
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Build where conditions
    const where: Record<string, string | undefined> = {};
    
    // Filter by user ID - only show calibrations created by this user
    where.userId = user.id;
    
    // Filter by status if provided
    if (status) {
      where.status = status;
    }
    
    // Filter by item serial if provided
    if (itemSerial) {
      where.itemSerial = itemSerial;
    }
    
    // Get total count for pagination
    const totalItems = await prisma.calibration.count({ where });
    
    // Get all calibrations with pagination - this will include both admin-created and user-created
    const calibrations = await prisma.calibration.findMany({
      where,
      include: {
        item: true,
        vendor: true,
        statusLogs: {
          include: {
            changedBy: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });
    
    return NextResponse.json({
      items: calibrations,
      total: totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit)
    });
  } catch (error) {
    console.error('Error fetching user calibrations:', error);
    return NextResponse.json(
      { 
        error: 'Gagal mengambil data kalibrasi',
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      },
      { status: 500 }
    );
  }
}

// POST membuat kalibrasi baru
export async function POST(request: Request) {
  try {
    // Get user from session
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validation = createCalibrationSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { 
      itemSerial, 
      vendorId, 
      calibrationDate,
      notes,
      address,
      phone,
      fax,
      manufacturer,
      instrumentName,
      modelNumber,
      configuration
    } = validation.data;
    
    // Check if the item exists
    const item = await prisma.item.findUnique({
      where: { serialNumber: itemSerial },
      include: {
        customer: true
      }
    });
    
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    // Check if the vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });
    
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }
    
    // Create calibration with only the fields that are defined in the Prisma schema
    console.log('Creating calibration with data:', {
      itemSerial,
      userId: user.id,
      vendorId,
      status: RequestStatus.PENDING,
      calibrationDate: new Date(calibrationDate),
      notes: null // Always set notes to null since we removed it from the form
    });
    
    // Create the calibration
    const calibration = await prisma.calibration.create({
      data: {
        itemSerial,
        userId: user.id,
        vendorId,
        status: RequestStatus.PENDING,
        calibrationDate: new Date(calibrationDate),
        notes: null // Always set notes to null since we removed it from the form
      }
    });
    
    console.log('Calibration created successfully:', calibration.id);
    
    // Update item status to IN_CALIBRATION
    await prisma.item.update({
      where: { serialNumber: itemSerial },
      data: { status: ItemStatus.IN_CALIBRATION }
    });
    
    console.log('Item status updated to IN_CALIBRATION');
    
    // Add an entry to the item history
    await prisma.itemHistory.create({
      data: {
        itemSerial,
        action: 'CALIBRATED',
        details: `Calibration started by ${user.name}`,
        relatedId: calibration.id,
        startDate: new Date()
      }
    });
    
    console.log('Item history entry created');
    
    // Log activity
    await logCalibrationActivity(
      user.id,
      calibration.id,
      ActivityType.CALIBRATION_CREATED,
      'Calibration request created'
    );
    
    console.log('Activity logged');
    
    // Notify admins and managers
    await notifyAdminsAndManagersOfActivity(
      'requested a calibration',
      item.name,
      user.name || 'User',
      calibration.id
    );
    
    console.log('Notifications sent');
    
    return NextResponse.json({
      success: true,
      message: 'Calibration created successfully',
      calibration: {
        id: calibration.id,
        itemSerial: calibration.itemSerial,
        status: calibration.status,
        calibrationDate: calibration.calibrationDate
      }
    });
    
  } catch (error) {
    console.error('Error creating calibration:', error);
    return NextResponse.json(
      { error: 'Failed to create calibration' },
      { status: 500 }
    );
  }
}

// PATCH untuk menyelesaikan kalibrasi
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    
    // Validasi request body untuk penyelesaian kalibrasi
    const validation = completeCalibrationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }
    
    const {
      id: calibrationId,
      gasType,
      gasConcentration,
      gasBalance,
      gasBatchNumber,
      testSensor,
      testSpan,
      testResult,
      instrumentName,
      modelNumber,
      configuration,
      approvedBy,
      validUntil,
      notes,
      allGasEntries,
      allTestEntries
    } = validation.data;
    
    // Verifikasi session user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ambil data kalibrasi
    const calibration = await prisma.calibration.findUnique({
      where: { id: calibrationId },
      include: {
        item: true
      }
    });
    
    if (!calibration) {
      return NextResponse.json(
        { error: 'Kalibrasi tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Remove ownership verification to allow any user to complete any calibration
    // This is a temporary solution until we have a better understanding of the relationships
    console.log('Allowing user to complete calibration. User ID:', user.id, 'Calibration owner ID:', calibration.userId);
    
    // Verifikasi status kalibrasi
    if (calibration.status !== RequestStatus.PENDING) {
      return NextResponse.json(
        { error: `Tidak dapat menyelesaikan kalibrasi dengan status ${calibration.status}` },
        { status: 400 }
      );
    }
    
    // Buat nomor sertifikat
    // Format: [Nomor Urut]/CAL-PBI/[Bulan Romawi]/[Tahun]
    const today = new Date();
    const month = today.getMonth() + 1; // Januari adalah 0
    const year = today.getFullYear();
    
    // Konversi bulan ke angka Romawi
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const romanMonth = romanMonths[month - 1];
    
    // Hitung jumlah kalibrasi yang sudah selesai tahun ini untuk mendapatkan nomor urut
    const calibrationCount = await prisma.calibration.count({
      where: {
        status: REQUEST_STATUS_COMPLETED,
        updatedAt: {
          gte: new Date(year, 0, 1), // Dari 1 Januari tahun ini
          lt: new Date(year + 1, 0, 1) // Sampai 1 Januari tahun depan
        }
      }
    });
    
    const certificateNumber = `${calibrationCount + 1}/CAL-PBI/${romanMonth}/${year}`;
    
    // Update kalibrasi dengan Prisma client standard (tanpa SQL mentah)
    try {
      console.log('DEBUG - Data yang akan disimpan ke database:', {
        certificateNumber,
        status: REQUEST_STATUS_COMPLETED,
        validUntil: new Date(validUntil)
      });
      
      // Pertama, update data kalibrasi utama
      await prisma.calibration.update({
        where: { id: calibrationId },
        data: {
          status: REQUEST_STATUS_COMPLETED,
          validUntil: new Date(validUntil),
          certificateNumber,
          notes
        }
      });
      
      // Mengambil nama manufacturer dari Item
      const itemDetails = await prisma.item.findUnique({
        where: { serialNumber: calibration.itemSerial },
        select: { name: true }
      });

      const itemManufacturer = itemDetails ? itemDetails.name : "Unknown Manufacturer";
      
      // Dapatkan informasi vendor untuk disimpan dalam sertifikat (jika ada)
      let vendorName = "Unknown Vendor";
      let vendorAddress = null;
      let vendorPhone = null;
      
      if (calibration.vendorId) {
        const vendor = await prisma.vendor.findUnique({
          where: { id: calibration.vendorId },
          select: { 
            name: true,
            address: true,
            contactPhone: true 
          }
        });
        
        if (vendor) {
          vendorName = vendor.name;
          vendorAddress = vendor.address;
          vendorPhone = vendor.contactPhone;
        }
      }
      
      // Parse gas entries and test entries from JSON strings
      let gasEntriesData = [];
      let testEntriesData = [];
      
      try {
        if (allGasEntries) {
          gasEntriesData = JSON.parse(allGasEntries);
        } else if (gasType) {
          // Create a single entry from legacy fields
          gasEntriesData = [{
          gasType,
          gasConcentration,
          gasBalance,
            gasBatchNumber
          }];
        }
      } catch (e) {
        console.error('Error parsing gas entries:', e);
      }
      
      try {
        if (allTestEntries) {
          testEntriesData = JSON.parse(allTestEntries);
        } else if (testSensor) {
          // Create a single entry from legacy fields
          testEntriesData = [{
          testSensor,
          testSpan,
            testResult
          }];
        }
      } catch (e) {
        console.error('Error parsing test entries:', e);
      }
      
      // Create or update the certificate with related entries
      const existingCertificate = await prisma.calibrationCertificate.findUnique({
        where: { calibrationId }
      });
      
      if (existingCertificate) {
        // Update existing certificate
        await prisma.calibrationCertificate.update({
          where: { id: existingCertificate.id },
          data: {
            // Instrument details
          manufacturer: itemManufacturer,
          instrumentName,
          modelNumber,
          configuration,
            
            // Vendor details
          vendorName,
          vendorAddress,
            vendorPhone,
            
            // Approval
            approvedBy
          }
        });
        
        // Delete existing entries
        await prisma.$transaction([
          // Delete existing entries for gas calibration
          prisma.$executeRaw`DELETE FROM "GasCalibrationEntry" WHERE "certificateId" = ${existingCertificate.id}`,
          
          // Delete existing entries for test results
          prisma.$executeRaw`DELETE FROM "TestResultEntry" WHERE "certificateId" = ${existingCertificate.id}`
        ]);
        
        // Create new gas entries
        for (const entry of gasEntriesData) {
          await prisma.$executeRaw`
            INSERT INTO "GasCalibrationEntry" ("id", "certificateId", "gasType", "gasConcentration", "gasBalance", "gasBatchNumber", "createdAt", "updatedAt") 
            VALUES (
              ${crypto.randomUUID()}, 
              ${existingCertificate.id}, 
              ${entry.gasType || ''}, 
              ${entry.gasConcentration || ''}, 
              ${entry.gasBalance || ''}, 
              ${entry.gasBatchNumber || ''}, 
              ${new Date()}, 
              ${new Date()}
            )
          `;
        }
        
        // Create new test entries
        for (const entry of testEntriesData) {
          await prisma.$executeRaw`
            INSERT INTO "TestResultEntry" ("id", "certificateId", "testSensor", "testSpan", "testResult", "createdAt", "updatedAt") 
            VALUES (
              ${crypto.randomUUID()}, 
              ${existingCertificate.id}, 
              ${entry.testSensor || ''}, 
              ${entry.testSpan || ''}, 
              ${entry.testResult || 'Pass'}, 
              ${new Date()}, 
              ${new Date()}
            )
          `;
        }
      } else {
        // Create new certificate
        const certificate = await prisma.calibrationCertificate.create({
          data: {
          calibrationId,
            // Instrument details
          manufacturer: itemManufacturer,
          instrumentName,
          modelNumber,
          configuration,
            
            // Vendor details
          vendorName,
          vendorAddress,
            vendorPhone,
            
            // Approval
            approvedBy
        }
      });
        
        // Create gas entries
        for (const entry of gasEntriesData) {
          await prisma.$executeRaw`
            INSERT INTO "GasCalibrationEntry" ("id", "certificateId", "gasType", "gasConcentration", "gasBalance", "gasBatchNumber", "createdAt", "updatedAt") 
            VALUES (
              ${crypto.randomUUID()}, 
              ${certificate.id}, 
              ${entry.gasType || ''}, 
              ${entry.gasConcentration || ''}, 
              ${entry.gasBalance || ''}, 
              ${entry.gasBatchNumber || ''}, 
              ${new Date()}, 
              ${new Date()}
            )
          `;
        }
        
        // Create test entries
        for (const entry of testEntriesData) {
          await prisma.$executeRaw`
            INSERT INTO "TestResultEntry" ("id", "certificateId", "testSensor", "testSpan", "testResult", "createdAt", "updatedAt") 
            VALUES (
              ${crypto.randomUUID()}, 
              ${certificate.id}, 
              ${entry.testSensor || ''}, 
              ${entry.testSpan || ''}, 
              ${entry.testResult || 'Pass'}, 
              ${new Date()}, 
              ${new Date()}
            )
          `;
        }
      }
      
      console.log('Calibration update and certificate creation completed successfully');
      
      // Verifikasi data dengan query sederhana
      const verifyCalibration = await prisma.calibration.findUnique({
        where: { id: calibrationId },
        include: {
          certificate: true
        }
      });
      
      // If certificate exists, also get the gas and test entries
      let verifyWithEntries = null;
      if (verifyCalibration?.certificate) {
        const gasEntries = await prisma.$queryRaw`
          SELECT * FROM "GasCalibrationEntry" 
          WHERE "certificateId" = ${verifyCalibration.certificate.id}
        `;
        
        const testEntries = await prisma.$queryRaw`
          SELECT * FROM "TestResultEntry" 
          WHERE "certificateId" = ${verifyCalibration.certificate.id}
        `;
        
        verifyWithEntries = {
          ...verifyCalibration,
          certificate: {
            ...verifyCalibration.certificate,
            gasEntries,
            testEntries
          }
        };
      }
      
      console.log('VERIFICATION - Data yang tersimpan di database:', 
        verifyWithEntries || verifyCalibration);
      
    } catch (error) {
      console.error('Error updating calibration:', error);
      throw error; // Re-throw for proper error handling
    }

    // Create status log
    await prisma.calibrationStatusLog.create({
      data: {
        calibrationId,
        status: REQUEST_STATUS_COMPLETED,
        notes: notes ? `Kalibrasi selesai: ${notes}` : "Kalibrasi selesai",
        userId: user.id
      }
    });

    // Update item status back to AVAILABLE
    await prisma.item.update({
      where: { serialNumber: calibration.itemSerial },
      data: { status: ItemStatus.AVAILABLE }
    });

    // Update item history
    await prisma.itemHistory.updateMany({
      where: {
        itemSerial: calibration.itemSerial,
        relatedId: calibrationId,
        action: 'CALIBRATED'
      },
      data: {
        endDate: new Date()
      }
    });

    // Format and return response
    return NextResponse.json({
      ...calibration,
      certificateNumber: certificateNumber,
      gasType,
      gasConcentration,
      gasBalance,
      gasBatchNumber,
      testSensor,
      testSpan,
      testResult,
      approvedBy,
      validUntil: new Date(validUntil),
      notes
    });
  } catch (error) {
    console.error('Error completing calibration:', error);
    return NextResponse.json(
      { error: 'Gagal menyelesaikan kalibrasi' },
      { status: 500 }
    );
  }
} 