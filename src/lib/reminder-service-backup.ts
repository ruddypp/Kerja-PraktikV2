import { prisma } from './prisma';
import { addDays, format, isAfter, isBefore, startOfDay, differenceInDays } from 'date-fns';
import { createNotification } from './notification-service';
import { ActivityType } from './types';

// Type definitions for reminder data
interface CalibrationReminderData {
  type: 'CALIBRATION';
  reminderDate: Date;
  dueDate: Date;
  title: string;
  message: string;
  status: 'PENDING';
  emailSent: boolean;
  calibrationId?: string;
  userId: string;
  itemSerial?: string;
}

interface RentalReminderData {
  type: 'RENTAL';
  reminderDate: Date;
  dueDate: Date;
  title: string;
  message: string;
  status: 'PENDING';
  emailSent: boolean;
  rentalId?: string;
  userId: string;
  itemSerial?: string;
}

interface MaintenanceReminderData {
  type: 'MAINTENANCE';
  reminderDate: Date;
  dueDate: Date;
  title: string;
  message: string;
  status: 'PENDING';
  emailSent: boolean;
  maintenanceId?: string;
  userId: string;
  itemSerial?: string;
}

interface ScheduleReminderData {
  type: 'SCHEDULE';
  reminderDate: Date;
  dueDate: Date;
  title: string;
  message: string;
  status: 'PENDING';
  emailSent: boolean;
  scheduleId?: string;
  userId: string;
  itemSerial?: string;
}

// Check for due reminders and create notifications
export async function checkDueReminders(options?: { forceAll?: boolean }) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set ke awal hari untuk perbandingan yang akurat
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // console.log('Checking due reminders for date:', today.toISOString());
    
    // Cari reminder yang jatuh tempo atau akan jatuh tempo pada milestone tertentu
    const dueReminders = await prisma.reminder.findMany({
      where: {
        OR: [
          // Reminder yang sudah jatuh tempo dan belum diakui
          {
            dueDate: { lt: tomorrow },
            status: { in: ['PENDING', 'SENT'] },
            acknowledgedAt: null,
          },
          // Reminder kalibrasi yang akan jatuh tempo dalam 30 hari
          {
            type: 'CALIBRATION',
            status: { in: ['PENDING', 'SENT'] },
            acknowledgedAt: null,
            dueDate: {
              gte: today,
              lt: new Date(today.getTime() + 31 * 24 * 60 * 60 * 1000)
            }
          },
          // Reminder rental dan maintenance yang akan jatuh tempo dalam 7 hari
          {
            type: { in: ['RENTAL', 'MAINTENANCE'] },
            status: { in: ['PENDING', 'SENT'] },
            acknowledgedAt: null,
            dueDate: {
              gte: today,
              lt: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000)
            }
          },
        ]
      },
      include: {
        calibration: {
          include: { 
            item: true,
            customer: true 
          }
        },
        rental: {
          include: { 
            item: true,
            customer: true 
          }
        },
        maintenance: {
          include: { 
            item: true 
          }
        },
        inventoryCheck: true,
        item: true,
      }
    });
    
    // console.log(`Found ${dueReminders.length} due reminders`);
    
    const results = [];
    
    // Untuk setiap reminder yang jatuh tempo, buat notifikasi
    for (const reminder of dueReminders) {
      try {
        const dueDate = new Date(reminder.dueDate);
        const daysRemaining = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const isDueToday = daysRemaining === 0;
        const isOverdue = daysRemaining < 0;
        
        // console.log(`Processing reminder ${reminder.id}, due date: ${dueDate.toISOString()}, days remaining: ${daysRemaining}`);
        
        // Periksa apakah sudah ada notifikasi untuk reminder ini yang belum dibaca
        // dan dibuat dalam 24 jam terakhir (untuk mencegah spam notifikasi)
        const existingNotifications = await prisma.notification.findMany({
          where: {
            reminderId: reminder.id,
            isRead: false,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        });
        
        // Jika sudah ada notifikasi yang dibuat dalam 24 jam terakhir dan tidak dipaksa, lewati
        if (existingNotifications.length > 0 && !options?.forceAll) {
          // console.log(`Skipping reminder ${reminder.id}, notification already exists within last 24 hours`);
          
          results.push({
            reminderId: reminder.id,
            status: 'skipped',
            reason: 'Recent notification exists',
            reminderType: reminder.type,
            existingNotificationId: existingNotifications[0].id,
            daysRemaining
          });
          
          continue;
        }
        
        // Tentukan apakah notifikasi harus dibuat berdasarkan milestone
        let shouldCreateNotification = false;
        
        switch (reminder.type) {
          case 'CALIBRATION':
            // Untuk kalibrasi, notifikasi pada H-30, H-7, H-1, dan saat jatuh tempo/terlambat
            shouldCreateNotification = 
              isOverdue || 
              isDueToday || 
              daysRemaining === 1 ||
              daysRemaining === 7 || 
              daysRemaining === 30;
            break;
          case 'RENTAL':
          case 'MAINTENANCE':
            // Untuk rental dan maintenance, notifikasi pada H-7, H-1, dan saat jatuh tempo/terlambat
            shouldCreateNotification = 
              isOverdue || 
              isDueToday || 
              daysRemaining === 1 || 
              daysRemaining === 7;
            break;
          case 'SCHEDULE':
            // Untuk jadwal, notifikasi pada H-1 dan saat jatuh tempo/terlambat
            shouldCreateNotification = 
              isOverdue || 
              isDueToday || 
              daysRemaining === 1;
            break;
          default:
            shouldCreateNotification = isOverdue || isDueToday;
        }
        
        // Jika tidak memenuhi kriteria untuk notifikasi berdasarkan tipe dan hari, lewati
        if (!shouldCreateNotification && !options?.forceAll) {
          // console.log(`Skipping reminder ${reminder.id}, does not meet notification criteria`);
          
          results.push({
            reminderId: reminder.id,
            status: 'skipped',
            reason: 'Does not meet notification criteria',
            reminderType: reminder.type,
            daysRemaining
          });
          
          continue;
        }
        
        // Ambil informasi item dan detail lainnya
        let itemName = 'Item';
        let serialNumber = '';
        let customerName = '';
        let actionText = '';
        
        // Ambil data dari relasi yang sudah di-include
        if (reminder.type === 'CALIBRATION' && reminder.calibration) {
          const calibration = reminder.calibration;
          itemName = calibration.item?.name || 'Peralatan';
          serialNumber = calibration.item?.serialNumber || '';
          customerName = calibration.customer?.name || '';
          actionText = 'Segera kirim email ke pelanggan untuk penjadwalan ulang kalibrasi.';
        } else if (reminder.type === 'RENTAL' && reminder.rental) {
          const rental = reminder.rental;
          itemName = rental.item?.name || 'Peralatan';
          serialNumber = rental.item?.serialNumber || '';
          customerName = rental.customer?.name || '';
          actionText = 'Segera hubungi pelanggan untuk pengembalian rental.';
        } else if (reminder.type === 'MAINTENANCE' && reminder.maintenance) {
          const maintenance = reminder.maintenance;
          itemName = maintenance.item?.name || 'Peralatan';
          serialNumber = maintenance.item?.serialNumber || '';
          actionText = 'Segera lakukan pemeriksaan maintenance rutin.';
        } else if (reminder.type === 'SCHEDULE' && reminder.inventoryCheck) {
          const schedule = reminder.inventoryCheck;
          itemName = schedule.name || 'Jadwal Pemeriksaan';
          actionText = 'Segera lakukan pemeriksaan inventaris sesuai jadwal.';
        } else if (reminder.item) {
          // Fallback ke item yang terkait langsung
          itemName = reminder.item.name || 'Item';
          serialNumber = reminder.item.serialNumber || '';
        }
        
        // Buat pesan yang sesuai dan terstruktur
        let title, message;
        const reminderTypeText = 
          reminder.type === 'CALIBRATION' ? 'Kalibrasi' :
          reminder.type === 'RENTAL' ? 'Rental' :
          reminder.type === 'MAINTENANCE' ? 'Maintenance' :
          reminder.type === 'SCHEDULE' ? 'Jadwal' : reminder.type;
        
        if (isOverdue) {
          title = `⚠️ ${reminderTypeText}: ${itemName} - Terlambat ${Math.abs(daysRemaining)} hari`;
          message = `${itemName}${serialNumber ? ` (${serialNumber})` : ''}${customerName ? ` untuk ${customerName}` : ''} terlambat ${Math.abs(daysRemaining)} hari. ${actionText}`;
        } else if (isDueToday) {
          title = `🔔 ${reminderTypeText}: ${itemName} - Jatuh tempo hari ini`;
          message = `${itemName}${serialNumber ? ` (${serialNumber})` : ''}${customerName ? ` untuk ${customerName}` : ''} jatuh tempo hari ini. ${actionText}`;
        } else if (daysRemaining === 1) {
          title = `🔔 ${reminderTypeText}: ${itemName} - H-1`;
          message = `${itemName}${serialNumber ? ` (${serialNumber})` : ''}${customerName ? ` untuk ${customerName}` : ''} akan jatuh tempo besok. ${actionText}`;
        } else if (daysRemaining === 7) {
          title = `🔔 ${reminderTypeText}: ${itemName} - H-7`;
          message = `${itemName}${serialNumber ? ` (${serialNumber})` : ''}${customerName ? ` untuk ${customerName}` : ''} akan jatuh tempo dalam 7 hari. ${actionText}`;
        } else if (daysRemaining === 30) {
          title = `🔔 ${reminderTypeText}: ${itemName} - H-30`;
          message = `${itemName}${serialNumber ? ` (${serialNumber})` : ''}${customerName ? ` untuk ${customerName}` : ''} akan jatuh tempo dalam 30 hari. ${actionText}`;
        } else {
          title = `🔔 ${reminderTypeText}: ${itemName}`;
          message = `${itemName}${serialNumber ? ` (${serialNumber})` : ''}${customerName ? ` untuk ${customerName}` : ''} akan jatuh tempo pada ${dueDate.toLocaleDateString()}. ${actionText}`;
        }
        
        // Dapatkan user ID dari reminder
        const userId = reminder.userId;
        
        // Buat notifikasi baru
        const notification = await createNotification({
          title,
          message,
          userId,
          reminderId: reminder.id,
          shouldPlaySound: true, // Pastikan suara diputar
        });
        
        // console.log(`Created notification ${notification.id} for reminder ${reminder.id}`);
        
        // Update status reminder menjadi SENT
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'SENT' }
        });
        
        results.push({
          reminderId: reminder.id,
          notificationId: notification.id,
          status: 'created',
          reminderType: reminder.type,
          itemName,
          serialNumber,
          customerName,
          daysRemaining,
          title
        });
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        results.push({
          reminderId: reminder.id,
          error: String(error),
          status: 'error'
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error checking due reminders:', error);
    throw error;
  }
}

// Mark a reminder as acknowledged and add to activity log
export async function markReminderAcknowledged(reminderId: string) {
  // console.log(`[markReminderAcknowledged] Marking reminder ${reminderId} as acknowledged`);
  
  try {
    // Get the reminder details first
    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
      include: {
        calibration: true,
        rental: true,
        maintenance: true,
        inventoryCheck: true,
        item: true,
      },
    });
    
    if (!reminder) {
      throw new Error(`Reminder with ID ${reminderId} not found`);
    }
    
    // Update the reminder with acknowledgedAt field and status
    const updatedReminder = await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date()
      }
    });
    
    // console.log(`[markReminderAcknowledged] Updated reminder status to ACKNOWLEDGED: ${updatedReminder.id}`);
    
    // Also mark related notifications as read
    const relatedNotifications = await prisma.notification.findMany({
      where: { reminderId: reminderId }
    });
    
    if (relatedNotifications.length > 0) {
      // console.log(`[markReminderAcknowledged] Marking ${relatedNotifications.length} related notifications as read`);
      
      await prisma.notification.updateMany({
        where: { reminderId: reminderId },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    }
    
    // Create activity log entry
    let itemName = reminder.item?.name || 'Unknown item';
    let itemSerial = reminder.item?.serialNumber || 'Unknown';
    let activityType = ActivityType.NOTIFICATION_CREATED; // Use an existing activity type
    let description = `Reminder for ${itemName} (${itemSerial}) was acknowledged`;
    
    switch (reminder.type) {
      case 'CALIBRATION':
        activityType = ActivityType.CALIBRATION_CREATED;
        description = `Calibration reminder for ${itemName} (${itemSerial}) was acknowledged`;
        break;
      case 'RENTAL':
        activityType = ActivityType.RENTAL_CREATED;
        description = `Rental reminder for ${itemName} (${itemSerial}) was acknowledged`;
        break;
      case 'MAINTENANCE':
        activityType = ActivityType.MAINTENANCE_CREATED;
        description = `Maintenance reminder for ${itemName} (${itemSerial}) was acknowledged`;
        break;
      case 'SCHEDULE':
        activityType = ActivityType.NOTIFICATION_CREATED;
        const scheduleName = reminder.inventoryCheck?.name || 'Unknown schedule';
        description = `Schedule reminder for "${scheduleName}" was acknowledged`;
        break;
    }
    
    // Log the activity
    await prisma.activityLog.create({
      data: {
        type: activityType,
        action: "Reminder acknowledged",
        details: description,
        userId: reminder.userId,
        itemSerial: reminder.itemSerial,
      },
    });
    
    // console.log(`[markReminderAcknowledged] Reminder ${reminderId} marked as acknowledged and logged to activity log`);
    
    return updatedReminder;
  } catch (error) {
    console.error(`[markReminderAcknowledged] Error marking reminder as acknowledged:`, error);
    throw error;
  }
}

// Mark a reminder as email sent
export async function markReminderEmailSent(reminderId: string) {
  return prisma.reminder.update({
    where: { id: reminderId },
    data: {
      emailSent: true,
      emailSentAt: new Date(),
    },
  });
}

// Create a reminder for calibration (30 days before due date)
export async function createCalibrationReminder(calibrationId: string) {
  // console.log(`[createCalibrationReminder] Memulai pembuatan reminder untuk kalibrasi ID: ${calibrationId}`);
  
  if (!calibrationId) {
    console.error('[createCalibrationReminder] Error: calibrationId tidak valid');
    throw new Error('calibrationId tidak valid');
  }
  
  try {
    // Ambil data kalibrasi
    const calibration = await prisma.calibration.findUnique({
      where: { id: calibrationId },
      include: {
        item: true,
        customer: true,
      },
    });

    if (!calibration) {
      console.error(`[createCalibrationReminder] Error: Kalibrasi dengan ID ${calibrationId} tidak ditemukan`);
      throw new Error('Calibration not found');
    }
    
    // console.log(`[createCalibrationReminder] Kalibrasi ditemukan untuk item: ${calibration.itemSerial}`);
    
    // Gunakan validUntil jika ada, jika tidak, buat validUntil = calibrationDate + 365 hari
    let validUntilDate;
    
    if (calibration.validUntil) {
      validUntilDate = new Date(calibration.validUntil);
    } else {
      // Set validUntil to 365 days after calibrationDate
      const calibrationDate = new Date(calibration.calibrationDate);
      validUntilDate = addDays(calibrationDate, 365);
      
      // Update calibration with new validUntil date
      await prisma.calibration.update({
        where: { id: calibrationId },
        data: { validUntil: validUntilDate }
      });
      
      // console.log(`[createCalibrationReminder] Updated calibration with validUntil date: ${validUntilDate.toISOString()}`);
    }
    
    // Buat tanggal reminder 30 hari sebelum validUntil
    const reminderDate = addDays(validUntilDate, -30);
    
    // console.log(`[createCalibrationReminder] Tanggal jatuh tempo: ${validUntilDate.toISOString()}, Tanggal reminder: ${reminderDate.toISOString()}`);
    
    // Cek apakah reminder sudah ada
    const existingReminder = await prisma.reminder.findFirst({
      where: {
        calibrationId,
        type: 'CALIBRATION',
      },
    });
    
    // Siapkan data untuk judul dan pesan
    const itemName = calibration.item?.name || 'Peralatan';
    const serialNumber = calibration.item?.serialNumber || 'Tidak diketahui';
    const formattedDate = format(validUntilDate, 'dd MMM yyyy');
    const title = `Kalibrasi Akan Segera Berakhir: ${itemName}`;
    const message = `Kalibrasi untuk ${itemName} (SN: ${serialNumber}) akan berakhir pada ${formattedDate}. Harap segera kirim email ke pelanggan.`;
    
    // Update atau buat reminder
    if (existingReminder) {
      // console.log(`[createCalibrationReminder] Reminder sudah ada, mengupdate reminder ID: ${existingReminder.id}`);
      
      const updatedReminder = await prisma.reminder.update({
        where: { id: existingReminder.id },
        data: {
          reminderDate,
          dueDate: validUntilDate,
          title,
          message,
          status: 'PENDING',
          emailSent: false,
        },
      });
      
      // console.log(`[createCalibrationReminder] Reminder berhasil diupdate: ${updatedReminder.id}`);
      return updatedReminder;
    }
    
    // Buat reminder baru
    // console.log('[createCalibrationReminder] Membuat reminder baru');
    
    // Pastikan userId valid
    if (!calibration.userId) {
      console.error('[createCalibrationReminder] Error: userId tidak valid');
      throw new Error('userId tidak valid');
    }
    
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
          connect: { id: calibrationId },
        },
        item: {
          connect: { serialNumber: calibration.itemSerial },
        },
        user: {
          connect: { id: calibration.userId },
        },
      },
    });
    
    // console.log(`[createCalibrationReminder] Reminder baru berhasil dibuat: ${reminder.id}`);
    return reminder;
  } catch (error) {
    console.error(`[createCalibrationReminder] Error dalam pembuatan reminder:`, error);
    throw error;
  }
}

// Automatically create reminder when calibration status changes to COMPLETED
export async function handleCalibrationStatusChange(calibrationId: string, status: string) {
  // console.log(`[handleCalibrationStatusChange] Dipanggil dengan calibrationId: ${calibrationId}, status: ${status}`);
  
  // Only create reminder if status is COMPLETED
  if (status === 'COMPLETED') {
    try {
      // console.log('[handleCalibrationStatusChange] Status COMPLETED, mencoba membuat reminder');
      const reminder = await createCalibrationReminder(calibrationId);
      // console.log('[handleCalibrationStatusChange] Reminder otomatis berhasil dibuat:', reminder.id);
      return reminder;
    } catch (error) {
      console.error('[handleCalibrationStatusChange] Gagal membuat reminder otomatis:', error);
      throw error;
    }
  } else {
    // console.log(`[handleCalibrationStatusChange] Status bukan COMPLETED (${status}), tidak membuat reminder`);
  }
  return null;
}

// Create a reminder for maintenance (7 days before due date)
export async function createMaintenanceReminder(maintenanceId: string) {
  // console.log(`[createMaintenanceReminder] Starting to create reminder for maintenance ID: ${maintenanceId}`);
  
  if (!maintenanceId) {
    console.error('[createMaintenanceReminder] Error: maintenanceId is invalid');
    throw new Error('maintenanceId is invalid');
  }
  
  try {
    // Get maintenance data
    const maintenance = await prisma.maintenance.findUnique({
      where: { id: maintenanceId },
      include: {
        item: true,
        user: true,
      },
    });

    if (!maintenance) {
      console.error(`[createMaintenanceReminder] Error: Maintenance with ID ${maintenanceId} not found`);
      throw new Error('Maintenance not found');
    }
    
    // console.log(`[createMaintenanceReminder] Maintenance found for item: ${maintenance.itemSerial}`);
    
    // Use endDate if available, otherwise use current date
    let endDate = new Date();
    if (maintenance.endDate) {
      endDate = new Date(maintenance.endDate);
    } else {
      // console.log('[createMaintenanceReminder] Warning: endDate not found, using current date instead');
      // Try to update the maintenance with an endDate
      try {
        await prisma.maintenance.update({
          where: { id: maintenanceId },
          data: { endDate },
        });
        // console.log('[createMaintenanceReminder] Successfully updated maintenance with current date as endDate');
      } catch (updateError) {
        console.error('[createMaintenanceReminder] Failed to update maintenance with endDate:', updateError);
        // Continue with current date even if update fails
      }
    }
    
    // Calculate due date (30 days after maintenance end)
    const dueDate = addDays(endDate, 30);
    
    // Create reminder date 7 days before due date
    const reminderDate = addDays(dueDate, -7);
    
    // console.log(`[createMaintenanceReminder] Maintenance end date: ${endDate.toISOString()}, Due date: ${dueDate.toISOString()}, Reminder date: ${reminderDate.toISOString()}`);
    
    // Check if reminder already exists
    const existingReminder = await prisma.$queryRaw`
      SELECT * FROM "Reminder" 
      WHERE "maintenanceId" = ${maintenanceId} 
      AND "type"::text = 'MAINTENANCE' 
      LIMIT 1
    `;
    
    // Prepare data for title and message
    const itemName = maintenance.item?.name || 'Equipment';
    const serialNumber = maintenance.item?.serialNumber || 'Unknown';
    const formattedDate = format(dueDate, 'dd MMM yyyy');
    const title = `Maintenance Due: ${itemName}`;
    const message = `Maintenance for ${itemName} (SN: ${serialNumber}) is due on ${formattedDate}.`;
    
    // Update or create reminder
    if (existingReminder && Array.isArray(existingReminder) && existingReminder.length > 0) {
      // console.log(`[createMaintenanceReminder] Reminder already exists, updating reminder ID: ${existingReminder[0].id}`);
      
      const updatedReminder = await prisma.reminder.update({
        where: { id: existingReminder[0].id },
        data: {
          reminderDate,
          dueDate,
          title,
          message,
          status: 'PENDING',
          emailSent: false,
        },
      });
      
      // console.log(`[createMaintenanceReminder] Reminder successfully updated: ${updatedReminder.id}`);
      return updatedReminder;
    }
    
    // Create new reminder
    // console.log('[createMaintenanceReminder] Creating new reminder');
    
    // Make sure userId is valid
    if (!maintenance.userId) {
      console.error('[createMaintenanceReminder] Error: userId is invalid');
      throw new Error('userId is invalid');
    }
    
    // Create the reminder with maintenanceId directly in the data object
    const reminderData: MaintenanceReminderData = {
      type: 'MAINTENANCE',
      reminderDate,
      dueDate,
      title,
      message,
      status: 'PENDING',
      emailSent: false,
      maintenanceId,
      userId: maintenance.userId
    };
    
    // Add itemSerial if available
    if (maintenance.itemSerial) {
      reminderData.itemSerial = maintenance.itemSerial;
    }
    
    const reminder = await prisma.reminder.create({
      data: reminderData as any
    });
    
    // console.log(`[createMaintenanceReminder] New reminder successfully created: ${reminder.id}`);
    return reminder;
  } catch (error) {
    console.error(`[createMaintenanceReminder] Error creating reminder:`, error);
    throw error;
  }
}

// Automatically create reminder when maintenance status changes to COMPLETED
export async function handleMaintenanceStatusChange(maintenanceId: string, status: string) {
  // console.log(`[handleMaintenanceStatusChange] Called with maintenanceId: ${maintenanceId}, status: ${status}`);
  
  // Only create reminder if status is COMPLETED
  if (status === 'COMPLETED') {
    try {
      // console.log('[handleMaintenanceStatusChange] Status COMPLETED, trying to create reminder');
      const reminder = await createMaintenanceReminder(maintenanceId);
      // console.log('[handleMaintenanceStatusChange] Automatic reminder successfully created:', reminder.id);
      return reminder;
    } catch (error) {
      console.error('[handleMaintenanceStatusChange] Failed to create automatic reminder:', error);
      // Log error but don't rethrow to prevent breaking the main flow
      return null;
    }
  } else {
    // console.log(`[handleMaintenanceStatusChange] Status is not COMPLETED (${status}), not creating reminder`);
  }
  return null;
}

// Create a reminder for rental (7 days before return date)
export async function createRentalReminder(rentalId: string) {
  // console.log(`[createRentalReminder] Starting to create reminder for rental ID: ${rentalId}`);
  
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      item: true,
      customer: true,
    },
  });

  if (!rental) {
    throw new Error('Rental not found');
  }

  const dueDate = rental.endDate;
  if (!dueDate) {
    throw new Error('Rental end date not found');
  }
  
  // Set reminder date to 7 days before due date
  const reminderDate = addDays(new Date(dueDate), -7); 

  // Check if a reminder already exists
  const existingReminder = await prisma.reminder.findFirst({
    where: {
      rentalId,
      type: 'RENTAL',
    },
  });

  const itemName = rental.item?.name || 'Equipment';
  const serialNumber = rental.item?.serialNumber || 'Unknown';
  const formattedDate = format(new Date(dueDate), 'dd MMM yyyy');
  const title = `Rental Return Due Soon: ${itemName}`;
  const message = `Rental for ${itemName} (SN: ${serialNumber}) must be returned by ${formattedDate}.`;

  if (existingReminder) {
    // Update existing reminder
    return prisma.reminder.update({
      where: { id: existingReminder.id },
      data: {
        reminderDate,
        dueDate,
        title,
        message,
        status: 'PENDING',
        emailSent: false,
      },
    });
  }

  // Create new reminder with direct field assignments
  const reminderData: RentalReminderData = {
    type: 'RENTAL',
    reminderDate,
    dueDate,
    title,
    message,
    status: 'PENDING',
    emailSent: false,
    rentalId,
    userId: rental.userId || rental.customerId || '',
  };

  // Add itemSerial if available
  if (rental.item) {
    reminderData.itemSerial = rental.item.serialNumber;
  }

  const reminder = await prisma.reminder.create({
    data: reminderData as any
  });
  
  // console.log(`[createRentalReminder] New reminder successfully created: ${reminder.id}`);
  return reminder;
}

// Automatically create reminder when rental is approved
export async function handleRentalStatusChange(rentalId: string, status: string) {
  // console.log(`[handleRentalStatusChange] Called with rentalId: ${rentalId}, status: ${status}`);
  
  // Only create reminder if status is APPROVED
  if (status === 'APPROVED') {
    try {
      // console.log('[handleRentalStatusChange] Status APPROVED, trying to create reminder');
      const reminder = await createRentalReminder(rentalId);
      // console.log('[handleRentalStatusChange] Automatic reminder successfully created:', reminder.id);
      return reminder;
    } catch (error) {
      console.error('[handleRentalStatusChange] Failed to create automatic reminder:', error);
      throw error;
    }
  } else {
    // console.log(`[handleRentalStatusChange] Status is not APPROVED (${status}), not creating reminder`);
  }
  return null;
}

// Create a reminder for inventory check schedule (on the day)
export async function createScheduleReminder(scheduleId: string) {
  // console.log(`[createScheduleReminder] Starting to create reminder for schedule ID: ${scheduleId}`);
  
  const schedule = await prisma.inventoryCheck.findUnique({
    where: { id: scheduleId },
    include: {
      items: {
        include: {
          item: true
        }
      }
    },
  });

  if (!schedule) {
    throw new Error('Schedule not found');
  }

  const dueDate = schedule.scheduledDate;
  // For schedules, the reminder date is the same as the due date (on the day)
  const reminderDate = new Date(dueDate);

  // Check if a reminder already exists
  const existingReminder = await prisma.reminder.findFirst({
    where: {
      scheduleId,
      type: 'SCHEDULE',
    },
  });

  const title = `Jadwal Pemeriksaan Hari Ini: ${schedule.name || 'Jadwal'}`;
  const message = `Pemeriksaan inventaris "${schedule.name || 'Jadwal'}" dijadwalkan untuk hari ini.`;

  if (existingReminder) {
    // Update existing reminder
    return prisma.reminder.update({
      where: { id: existingReminder.id },
      data: {
        reminderDate,
        dueDate,
        title,
        message,
        status: 'PENDING',
        emailSent: false,
      },
    });
  }

  // Find admin users to assign the reminder
  const adminUsers = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    take: 1,
  });

  if (adminUsers.length === 0) {
    throw new Error('No admin users found to assign the reminder');
  }

  // Get first item if available
  const firstItem = schedule.items && schedule.items.length > 0 ? schedule.items[0].item : null;

  // Create reminder data
  const reminderData: ScheduleReminderData = {
    type: 'SCHEDULE',
    reminderDate,
    dueDate,
    title,
    message,
    status: 'PENDING',
    emailSent: false,
    scheduleId,
    userId: adminUsers[0].id
  };

  // Add itemSerial if available
  if (firstItem) {
    reminderData.itemSerial = firstItem.serialNumber;
  }

  const reminder = await prisma.reminder.create({ 
    data: reminderData as any 
  });
  
  // console.log(`[createScheduleReminder] New reminder successfully created: ${reminder.id}`);
  return reminder;
}

// Handle schedule status change (create reminder when schedule is created)
export async function handleScheduleStatusChange(scheduleId: string) {
  try {
    // console.log(`[handleScheduleStatusChange] Creating reminder for schedule ${scheduleId}`);
    const reminder = await createScheduleReminder(scheduleId);
    // console.log(`[handleScheduleStatusChange] Successfully created reminder ${reminder.id}`);
    return reminder;
  } catch (error) {
    console.error(`[handleScheduleStatusChange] Error creating reminder:`, error);
    throw error;
  }
} 