import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ItemStatus, RequestStatus, ActivityType } from '@prisma/client';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { z } from 'zod';
import { monthToRoman } from '@/lib/report-number-generator';
import crypto from 'crypto';
import { Calibration } from '@/lib/types';
import { Customer } from '@/lib/types';
import { logCalibrationActivity } from '@/lib/activity-logger';
import { handleCalibrationStatusChange } from '@/lib/reminder-service';
import { format } from 'date-fns';

// Schema untuk validasi data penyelesaian kalibrasi
const completeCalibrationSchema = z.object({
  status: z.string().optional(),
  // certificateNumber is no longer required as input
  
  // Date fields
  calibrationDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Calibration date must be a valid date"
  }),
  validUntil: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Valid until date must be a valid date"
  }),
  
  // Gas calibration details (legacy fields)
  gasType: z.string().optional(),
  gasConcentration: z.string().optional(),
  gasBalance: z.string().optional(),
  gasBatchNumber: z.string().optional(),
  
  // Test results (legacy fields)
  testSensor: z.string().optional(),
  testSpan: z.string().optional(),
  testResult: z.string().optional(),
  
  // Instrument details
  instrumentName: z.string().optional(),
  modelNumber: z.string().optional(),
  configuration: z.string().optional(),
  
  // Approval
  approvedBy: z.string().optional(),
  
  // Notes
  notes: z.string().optional(),
  
  // Arrays of entries - stored as JSON strings
  allGasEntries: z.string().optional(),
  allTestEntries: z.string().optional()
});

// PATCH untuk menyelesaikan kalibrasi
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Mendapatkan user dari session
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the id from params asynchronously as required by Next.js
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Calibration ID is required' },
        { status: 400 }
      );
    }

    // Parse dan validasi request body
    const body = await request.json();
    const validation = completeCalibrationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }

    const { 
      calibrationDate, 
      validUntil, 
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
      notes,
      allGasEntries,
      allTestEntries 
    } = validation.data;

    // Menemukan kalibrasi yang ada
    const calibration = await prisma.calibration.findUnique({
      where: { id },
      include: {
        item: true,
        user: true,
        certificate: true
      }
    }) as Calibration | null;

    if (!calibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }
    
    // Fetch customer data separately if needed
    if (calibration.customerId) {
      calibration.customer = await prisma.customer.findUnique({
        where: { id: calibration.customerId }
      }) as Customer;
    }

    // Verifikasi akses - user harus memiliki akses ke kalibrasi ini
    const isOwner = calibration.userId === user.id;
    const isAdmin = user.role === 'ADMIN';
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses untuk menyelesaikan kalibrasi ini' },
        { status: 403 }
      );
    }

    // Pastikan kalibrasi belum selesai
    if (calibration.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Calibration has already been completed' },
        { status: 400 }
      );
    }

    // Generate certificate number: format 1/CAL-PBI/V/2025
    const today = new Date();
    const month = today.getMonth() + 1; // January is 0
    const year = today.getFullYear();
    const romanMonth = monthToRoman(month);
    
    // Count completed calibrations for this year to get the sequence number
    const calibrationCount = await prisma.calibration.count({
      where: {
        status: 'COMPLETED',
        updatedAt: {
          gte: new Date(year, 0, 1), // From January 1st of current year
          lt: new Date(year + 1, 0, 1) // Until January 1st of next year
        }
      }
    });
    
    const certificateNumber = `${calibrationCount + 1}/CAL-PBI/${romanMonth}/${year}`;

    // Update status kalibrasi menjadi COMPLETED
    const updatedCalibration = await prisma.calibration.update({
      where: { id },
      data: {
        status: 'COMPLETED' as RequestStatus,
        certificateNumber: certificateNumber,
        validUntil: new Date(validUntil),
        calibrationDate: new Date(calibrationDate),
        notes: notes
      },
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Fetch customer data separately for updated calibration if needed
    if (updatedCalibration.customerId) {
      (updatedCalibration as any).customer = await prisma.customer.findUnique({
        where: { id: updatedCalibration.customerId }
      });
    }

    // Buat reminder otomatis untuk kalibrasi yang selesai
    try {
      console.log('Mencoba membuat reminder otomatis untuk kalibrasi ID:', id);
      
      // Pastikan ID valid
      if (!id) {
        console.error('ID kalibrasi tidak valid untuk membuat reminder');
        throw new Error('ID kalibrasi tidak valid');
      }
      
      // Cek apakah kalibrasi memiliki tanggal validUntil yang valid
      if (!validUntil) {
        console.error('Tanggal validUntil tidak valid untuk membuat reminder');
        throw new Error('Tanggal validUntil tidak valid');
      }
      
      // Buat reminder secara langsung tanpa menggunakan fungsi handleCalibrationStatusChange
      const validUntilDate = new Date(validUntil);
      const reminderDate = new Date(validUntilDate);
      reminderDate.setDate(validUntilDate.getDate() - 30); // 30 hari sebelum jatuh tempo
      
      // Siapkan data untuk reminder
      const itemName = updatedCalibration.item?.name || 'Peralatan';
      const serialNumber = updatedCalibration.item?.serialNumber || 'Tidak diketahui';
      const title = `Kalibrasi Akan Segera Berakhir: ${itemName}`;
      const message = `Kalibrasi untuk ${itemName} (SN: ${serialNumber}) akan berakhir pada ${format(validUntilDate, 'dd MMM yyyy')}.`;
      
      // Buat reminder baru
      const reminder = await prisma.reminder.create({
        data: {
          type: 'CALIBRATION',
          reminderDate,
          dueDate: validUntilDate,
          title,
          message,
          status: 'PENDING',
          emailSent: false,
          calibration: {
            connect: { id }
          },
          item: {
            connect: { serialNumber: updatedCalibration.itemSerial }
          },
          user: {
            connect: { id: updatedCalibration.userId }
          }
        }
      });
      
      console.log('Reminder berhasil dibuat:', reminder.id);
    } catch (error) {
      console.error('Gagal membuat reminder otomatis:', error);
      // Lanjutkan proses meskipun pembuatan reminder gagal
    }

    // Parse gas entries and test entries from JSON strings
    let gasEntriesData: any[] = [];
    let testEntriesData: any[] = [];

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

    // Get item name safely
    const itemName = calibration.item?.name || "Unknown";
    
    // Get customer details safely
    const customerName = calibration.customer?.name || null;
    const customerAddress = calibration.customer?.address || null;
    const customerPhone = calibration.customer?.contactPhone || null;

    // Create or update the certificate with related entries
    if (calibration.certificate) {
      // Update existing certificate
      await prisma.calibrationCertificate.update({
        where: { id: calibration.certificate.id },
        data: {
          // Instrument details
          manufacturer: itemName,
          instrumentName,
          modelNumber,
          configuration,
          
          // customer details
          customerName,
          customerAddress,
          customerPhone,
          
          // Approval
          approvedBy
        }
      });
      
      // Delete existing entries and create new ones
      await prisma.$transaction([
        // Delete existing entries
        prisma.$executeRaw`DELETE FROM "GasCalibrationEntry" WHERE "certificateId" = ${calibration.certificate.id}`,
        prisma.$executeRaw`DELETE FROM "TestResultEntry" WHERE "certificateId" = ${calibration.certificate.id}`
      ]);
      
      // Create new gas entries
      for (const entry of gasEntriesData) {
        await prisma.$executeRaw`
          INSERT INTO "GasCalibrationEntry" ("id", "certificateId", "gasType", "gasConcentration", "gasBalance", "gasBatchNumber", "createdAt", "updatedAt") 
          VALUES (
            ${crypto.randomUUID()}, 
            ${calibration.certificate.id}, 
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
            ${calibration.certificate.id}, 
            ${entry.testSensor || ''}, 
            ${entry.testSpan || ''}, 
            ${entry.testResult || 'Pass'}, 
            ${new Date()}, 
            ${new Date()}
          )
        `;
      }
    } else {
      // Create new certificate with entries
      const certificate = await prisma.calibrationCertificate.create({
        data: {
          calibrationId: id,
          // Instrument details
          manufacturer: itemName,
          instrumentName,
          modelNumber,
          configuration,
          
          // customer details
          customerName,
          customerAddress,
          customerPhone,
          
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

    // Update item status kembali ke AVAILABLE
    await prisma.item.update({
      where: { serialNumber: calibration.itemSerial },
      data: { status: ItemStatus.AVAILABLE }
    });

    // Buat log status kalibrasi
    await prisma.calibrationStatusLog.create({
      data: {
        calibrationId: id,
        status: 'COMPLETED' as RequestStatus,
        notes: `Calibration completed. Certificate number: ${certificateNumber}`,
        userId: user.id
      }
    });

    // Update item history
    await prisma.itemHistory.updateMany({
      where: {
        itemSerial: calibration.itemSerial,
        action: 'CALIBRATED',
        relatedId: id,
        endDate: null
      },
      data: {
        endDate: new Date(),
        details: `Kalibrasi selesai dengan nomor sertifikat: ${certificateNumber}`
      }
    });

    // Buat activity log
    await logCalibrationActivity(
      user.id,
      'CALIBRATION_UPDATED',
      id,
      calibration.itemSerial,
      `Completed calibration for ${itemName}`
    );

    return NextResponse.json(updatedCalibration);
  } catch (error) {
    console.error('Error completing calibration:', error);
    return NextResponse.json(
      { error: 'Failed to complete calibration' },
      { status: 500 }
    );
  }
} 