import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ItemStatus } from '@prisma/client';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { z } from 'zod';

// Schema untuk validasi data penyelesaian kalibrasi
const completeCalibrationSchema = z.object({
  status: z.string().optional(),
  certificateNumber: z.string(),
  calibrationDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Calibration date must be a valid date"
  }),
  nextCalibrationDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Next calibration date must be a valid date"
  }),
  result: z.string()
});

// PATCH untuk menyelesaikan kalibrasi
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Mendapatkan user dari session dan memverifikasi status admin
    const user = await getUserFromRequest(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const id = params.id;
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

    const { certificateNumber, calibrationDate, nextCalibrationDate, result } = validation.data;

    // Menemukan kalibrasi yang ada
    const calibration = await prisma.calibration.findUnique({
      where: { id },
      include: {
        item: true,
        user: true
      }
    });

    if (!calibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }

    // Pastikan kalibrasi belum selesai
    if (calibration.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Calibration has already been completed' },
        { status: 400 }
      );
    }

    // Update status kalibrasi menjadi COMPLETED
    const updatedCalibration = await prisma.calibration.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        certificateUrl: certificateNumber, // Simpan nomor sertifikat sebagai URL
        validUntil: new Date(nextCalibrationDate), // Tanggal kalibrasi berikutnya sebagai validUntil
        calibrationDate: new Date(calibrationDate), // Update tanggal kalibrasi
      },
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        vendor: true
      }
    });

    // Update item status kembali ke AVAILABLE
    await prisma.item.update({
      where: { serialNumber: calibration.itemSerial },
      data: { status: ItemStatus.AVAILABLE }
    });

    // Buat log status kalibrasi
    await prisma.calibrationStatusLog.create({
      data: {
        calibrationId: id,
        status: 'COMPLETED',
        notes: `Calibration completed with result: ${result}. Certificate number: ${certificateNumber}`,
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
        endDate: new Date()
      }
    });

    // Buat notifikasi untuk user
    await prisma.notification.create({
      data: {
        userId: calibration.userId,
        type: 'CALIBRATION_STATUS_CHANGE',
        title: 'Calibration Completed',
        message: `Your calibration for ${calibration.item.name} has been completed`,
        isRead: false
      }
    });

    // Buat activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'COMPLETED_CALIBRATION',
        details: `Completed calibration for ${calibration.item.name}`,
        itemSerial: calibration.itemSerial
      }
    });

    return NextResponse.json(updatedCalibration);
  } catch (error) {
    console.error('Error completing calibration:', error);
    return NextResponse.json(
      { error: 'Failed to complete calibration' },
      { status: 500 }
    );
  }
} 