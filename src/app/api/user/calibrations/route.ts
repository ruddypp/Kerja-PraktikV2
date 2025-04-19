import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RequestStatus, ItemStatus, NotificationType } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

// Status yang digunakan dalam kalibrasi - mapping ke enum Prisma
const ITEM_STATUS_IN_CALIBRATION = ItemStatus.IN_CALIBRATION; // Status untuk kalibrasi dan item
const REQUEST_STATUS_COMPLETED = RequestStatus.COMPLETED; // Status setelah selesai
const REQUEST_STATUS_CANCELLED = RequestStatus.CANCELLED; // Status jika dibatalkan

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
  
  notes: z.string().optional().nullable()
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
  
  // Tanggal dan Approval
  approvedBy: z.string().min(1, "Nama yang menyetujui diperlukan"),
  validUntil: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Tanggal validitas harus berupa tanggal yang valid"
  }),
  
  // Catatan tambahan
  notes: z.string().optional().nullable()
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
    
    // Build where conditions
    const where: Record<string, any> = {
      userId: user.id
    };
    
    if (status) {
      where.status = status;
    }
    
    if (itemSerial) {
      where.itemSerial = itemSerial;
    }
    
    // Get calibrations for user
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
      }
    });
    
    return NextResponse.json(calibrations);
  } catch (error) {
    console.error('Error fetching user calibrations:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data kalibrasi' },
      { status: 500 }
    );
  }
}

// POST membuat kalibrasi baru
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validasi request body
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
      calibrationDate 
    } = validation.data;
    
    // Verifikasi session user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify if the item exists and is available
    const item = await prisma.item.findUnique({
      where: { serialNumber: itemSerial }
    });
    
    if (!item) {
      return NextResponse.json(
        { error: 'Item tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // If item is not available, reject calibration
    if (item.status !== ItemStatus.AVAILABLE) {
      return NextResponse.json(
        { error: `Item tidak tersedia untuk kalibrasi. Status saat ini: ${item.status}` },
        { status: 400 }
      );
    }
    
    // Create calibration record - hanya gunakan field yang ada dalam database
    const calibration = await prisma.calibration.create({
      data: {
        userId: user.id,
        itemSerial: itemSerial,
        status: RequestStatus.PENDING,
        calibrationDate: new Date(calibrationDate),
        vendorId
      }
    });
    
    // Update item status to IN_CALIBRATION - ini yang dipakai untuk display status
    await prisma.item.update({
      where: { serialNumber: itemSerial },
      data: { status: ItemStatus.IN_CALIBRATION }
    });
    
    // Create status log - gunakan status yang ada di database
    await prisma.calibrationStatusLog.create({
      data: {
        calibrationId: calibration.id,
        status: RequestStatus.PENDING, // Tetap pakai PENDING di database
        notes: "Kalibrasi dimulai",
        userId: user.id
      }
    });
    
    // Create activity log entry
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'INITIATED_CALIBRATION',
        details: `Kalibrasi baru dimulai untuk item ${item.name}`,
        itemSerial
      }
    });
    
    // Create item history record
    await prisma.itemHistory.create({
      data: {
        itemSerial,
        action: 'CALIBRATED',
        details: `Dikirim untuk kalibrasi`,
        relatedId: calibration.id,
        startDate: new Date()
      }
    });
    
    // Notify admin
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (admin) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'CALIBRATION_STATUS_CHANGE' as NotificationType,
          title: 'Kalibrasi Baru Dimulai',
          message: `Kalibrasi baru dimulai oleh ${user.name} untuk item ${item.name}`,
          isRead: false
        }
      });
    }
    
    // Return full calibration data
    const fullCalibration = await prisma.calibration.findUnique({
      where: { id: calibration.id },
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
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
      }
    });
    
    return NextResponse.json(fullCalibration);
  } catch (error) {
    console.error('Error creating calibration:', error);
    return NextResponse.json(
      { error: 'Gagal membuat kalibrasi' },
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
      approvedBy,
      validUntil,
      notes
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
    
    // Verifikasi bahwa kalibrasi milik user ini
    if (calibration.userId !== user.id) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke kalibrasi ini' },
        { status: 403 }
      );
    }
    
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
        gasType,
        gasConcentration,
        gasBalance,
        gasBatchNumber,
        testSensor,
        testSpan,
        testResult,
        approvedBy,
        notes,
        status: REQUEST_STATUS_COMPLETED,
        validUntil: new Date(validUntil)
      });
      
      // Pertama, update data kalibrasi utama
      const updatedCalibration = await prisma.calibration.update({
        where: { id: calibrationId },
        data: { 
          status: REQUEST_STATUS_COMPLETED,
          validUntil: new Date(validUntil),
          certificateNumber,
          notes
        }
      });
      
      // Kemudian, buat atau update sertifikat kalibrasi
      const certificate = await prisma.calibrationCertificate.upsert({
        where: { calibrationId },
        update: {
          gasType,
          gasConcentration,
          gasBalance,
          gasBatchNumber,
          testSensor,
          testSpan,
          testResult,
          manufacturer: calibration.manufacturer,
          instrumentName: calibration.instrumentName,
          modelNumber: calibration.modelNumber,
          configuration: calibration.configuration,
          approvedBy
        },
        create: {
          calibrationId,
          gasType,
          gasConcentration,
          gasBalance,
          gasBatchNumber,
          testSensor,
          testSpan,
          testResult,
          manufacturer: calibration.manufacturer,
          instrumentName: calibration.instrumentName,
          modelNumber: calibration.modelNumber,
          configuration: calibration.configuration,
          approvedBy
        }
      });
      
      console.log('Calibration update and certificate creation completed successfully');
      
      // Verifikasi data dengan query sederhana
      const verifyCalibration = await prisma.calibration.findUnique({
        where: { id: calibrationId },
        include: {
          certificate: true
        }
      });
      
      console.log('VERIFICATION - Data yang tersimpan di database:', verifyCalibration);
      
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

    // Notifikasi untuk admin tentang kalibrasi selesai
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    // Siapkan tanggal pengingat untuk notifikasi H-30
    const validUntilDate = new Date(validUntil);
    const reminderDate = new Date(validUntilDate);
    reminderDate.setDate(reminderDate.getDate() - 30);

    if (admin) {
    await prisma.notification.create({
      data: {
          userId: admin.id,
          type: 'CALIBRATION_STATUS_CHANGE',
          title: 'Kalibrasi Selesai',
          message: `Kalibrasi untuk item ${calibration.item.name} telah selesai oleh ${user.name}`,
        isRead: false
      }
    });
    
      // Notifikasi H-30 untuk admin
      // Hanya buat notifikasi jika tanggal reminder masih di masa depan
      if (reminderDate > new Date()) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'CALIBRATION_REMINDER',
            title: 'Pengingat Kalibrasi H-30',
            message: `Kalibrasi untuk item ${calibration.item.name} akan berakhir dalam 30 hari pada ${new Date(validUntil).toLocaleDateString('id-ID')}`,
            isRead: false
          }
        });
      }
    }

    // Notifikasi H-30 untuk user
    if (reminderDate > new Date()) {
      await prisma.notification.create({
        data: {
          userId: calibration.userId,
          type: 'CALIBRATION_REMINDER',
          title: 'Pengingat Kalibrasi H-30',
          message: `Kalibrasi untuk item ${calibration.item.name} akan berakhir dalam 30 hari pada ${new Date(validUntil).toLocaleDateString('id-ID')}`,
          isRead: false
        }
      });
    }

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