import { NextResponse } from 'next/server';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

// Fungsi untuk mendapatkan template email untuk kalibrasi
export async function getEmailTemplateForCalibration(calibrationId: string) {
  try {
    const calibration = await prisma.calibration.findUnique({
      where: { id: calibrationId },
      include: {
        item: true,
        customer: true,
      },
    });

    if (!calibration || !calibration.item || !calibration.customer) {
      console.error('Calibration, item, or customer not found for ID:', calibrationId);
      return null;
    }

    const dueDate = calibration.validUntil || calibration.calibrationDate;
    if (!dueDate) {
      console.error('No valid due date for calibration ID:', calibrationId);
      return null;
    }

    const item = calibration.item;
    const customer = calibration.customer;
    
    const subject = `Pengingat Kalibrasi: ${item.name || 'Peralatan'} (${item.serialNumber || 'Tidak diketahui'})`;
    const body = `
Yth. ${customer.contactName || customer.name},

Kami ingin mengingatkan bahwa kalibrasi untuk peralatan ${item.name || 'Peralatan'} (Nomor Seri: ${item.serialNumber || 'Tidak diketahui'}) akan jatuh tempo pada ${format(new Date(dueDate), 'dd MMM yyyy')}.

Mohon hubungi kami untuk menjadwalkan layanan kalibrasi.

Detail Peralatan:
- Nama: ${item.name || 'Tidak diketahui'}
- Nomor Seri: ${item.serialNumber || 'Tidak diketahui'}
- Nomor Part: ${item.partNumber || 'Tidak diketahui'}
${item.sensor ? `- Sensor: ${item.sensor}` : ''}

Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.

Salam hormat,
Tim Paramata
    `;
    
    return { 
      subject, 
      body, 
      email: customer.contactEmail 
    };
  } catch (error) {
    console.error('Error generating email template:', error);
    return null;
  }
}

// Fungsi untuk menandai reminder sebagai email terkirim
export async function markEmailSent(reminderId: string) {
  return prisma.reminder.update({
    where: { id: reminderId },
    data: {
      emailSent: true,
      emailSentAt: new Date(),
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Gunakan getUserFromRequest dan isAdmin untuk autentikasi
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure params is fully resolved before using its properties
    const { id } = params;
    
    const reminder = await prisma.reminder.findUnique({
      where: { id },
      include: {
        calibration: {
          include: {
            item: true,
            customer: true
          }
        },
      },
    });
    
    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }
    
    if (reminder.type !== 'CALIBRATION' || !reminder.calibrationId) {
      return NextResponse.json({ error: 'Not a calibration reminder' }, { status: 400 });
    }
    
    const emailTemplate = await getEmailTemplateForCalibration(reminder.calibrationId);
    
    if (!emailTemplate) {
      return NextResponse.json({ error: 'Failed to generate email template' }, { status: 500 });
    }
    
    return NextResponse.json({ emailTemplate });
  } catch (error) {
    console.error('Error generating email template:', error);
    return NextResponse.json({ error: 'Failed to generate email template' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Gunakan getUserFromRequest dan isAdmin untuk autentikasi
    const user = await getUserFromRequest(request);
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure params is fully resolved before using its properties
    const { id } = params;
    
    // Mark the email as sent
    const updatedReminder = await markEmailSent(id);
    
    return NextResponse.json({ success: true, reminder: updatedReminder });
  } catch (error) {
    console.error('Error marking email as sent:', error);
    return NextResponse.json({ error: 'Failed to mark email as sent' }, { status: 500 });
  }
} 