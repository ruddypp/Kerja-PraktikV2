import { prisma } from './prisma';
import { addDays, format, differenceInDays } from 'date-fns';
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

/**
 * ALUR NOTIFIKASI SESUAI KEBUTUHAN:
 * 
 * 1. SCHEDULES: 
 *    - User buat → Reminder masuk ke ADMIN
 *    - H-0: Notifikasi ke ADMIN dan USER
 *    - Notifikasi 2x sehari sampai selesai
 * 
 * 2. CALIBRATION:
 *    - User buat → Reminder masuk ke ADMIN  
 *    - Setelah COMPLETED → Countdown 365 hari
 *    - H-30: Notifikasi ke ADMIN dan USER (kirim email)
 * 
 * 3. RENTAL & MAINTENANCE:
 *    - User buat → Reminder masuk ke ADMIN
 *    - H-7: Notifikasi ke ADMIN dan USER
 *    - H-0: Notifikasi ke ADMIN dan USER
 */

// Get all admin users
async function getAdminUsers() {
  return await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, name: true, email: true }
  });
}

// Check for due reminders and create notifications with improved logic
export async function checkDueReminders(options?: { forceAll?: boolean }) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('🔍 Checking due reminders for date:', today.toISOString());
    
    // Cari reminder yang perlu diproses berdasarkan milestone
    const dueReminders = await prisma.reminder.findMany({
      where: {
        OR: [
          // Reminder yang sudah jatuh tempo (overdue)
          {
            dueDate: { lt: today },
            status: { in: ['PENDING', 'SENT'] },
            acknowledgedAt: null,
          },
          // Reminder yang jatuh tempo hari ini (H-0)
          {
            dueDate: {
              gte: today,
              lt: addDays(today, 1)
            },
            status: { in: ['PENDING', 'SENT'] },
            acknowledgedAt: null,
          },
          // Reminder H-1 (besok)
          {
            dueDate: {
              gte: addDays(today, 1),
              lt: addDays(today, 2)
            },
            status: { in: ['PENDING', 'SENT'] },
            acknowledgedAt: null,
          },
          // Reminder H-7 (7 hari lagi) untuk RENTAL dan MAINTENANCE
          {
            type: { in: ['RENTAL', 'MAINTENANCE'] },
            dueDate: {
              gte: addDays(today, 7),
              lt: addDays(today, 8)
            },
            status: { in: ['PENDING', 'SENT'] },
            acknowledgedAt: null,
          },
          // Reminder H-30 (30 hari lagi) untuk CALIBRATION
          {
            type: 'CALIBRATION',
            dueDate: {
              gte: addDays(today, 30),
              lt: addDays(today, 31)
            },
            status: { in: ['PENDING', 'SENT'] },
            acknowledgedAt: null,
          },
        ]
      },
      include: {
        calibration: {
          include: { 
            item: true,
            customer: true,
            user: true // Include user who created calibration
          }
        },
        rental: {
          include: { 
            item: true,
            customer: true,
            user: true // Include user who created rental
          }
        },
        maintenance: {
          include: { 
            item: true,
            user: true // Include user who created maintenance
          }
        },
        inventoryCheck: {
          include: {
            createdBy: true, // FIXED: Use createdBy instead of user
            items: true
          }
        },
        item: true,
        user: true, // Admin user assigned to reminder
      }
    });
    
    console.log(`📋 Found ${dueReminders.length} reminders to process`);
    
    const results = [];
    const adminUsers = await getAdminUsers();
    
    // Process each reminder
    for (const reminder of dueReminders) {
      try {
        const dueDate = new Date(reminder.dueDate);
        const daysRemaining = differenceInDays(dueDate, today);
        const isDueToday = daysRemaining === 0;
        const isOverdue = daysRemaining < 0;
        
        console.log(`🔄 Processing reminder ${reminder.id}, type: ${reminder.type}, days remaining: ${daysRemaining}`);
        
        // Check if notification already exists for this milestone
        const existingNotifications = await prisma.notification.findMany({
          where: {
            reminderId: reminder.id,
            isRead: false,
            createdAt: {
              gte: new Date(Date.now() - 12 * 60 * 60 * 1000) // Last 12 hours
            }
          }
        });
        
        // Skip if recent notification exists (unless forced)
        if (existingNotifications.length > 0 && !options?.forceAll) {
          console.log(`⏭️ Skipping reminder ${reminder.id}, recent notification exists`);
          results.push({
            reminderId: reminder.id,
            status: 'skipped',
            reason: 'Recent notification exists'
          });
          continue;
        }
        
        // Determine if notification should be created based on milestone
        let shouldCreateNotification = false;
        let notificationMilestone = '';
        
        switch (reminder.type) {
          case 'CALIBRATION':
            if (daysRemaining === 30) {
              shouldCreateNotification = true;
              notificationMilestone = 'H-30';
            } else if (isDueToday || isOverdue) {
              shouldCreateNotification = true;
              notificationMilestone = isOverdue ? 'OVERDUE' : 'H-0';
            }
            break;
            
          case 'RENTAL':
          case 'MAINTENANCE':
            if (daysRemaining === 7) {
              shouldCreateNotification = true;
              notificationMilestone = 'H-7';
            } else if (isDueToday || isOverdue) {
              shouldCreateNotification = true;
              notificationMilestone = isOverdue ? 'OVERDUE' : 'H-0';
            }
            break;
            
          case 'SCHEDULE':
            if (isDueToday || isOverdue) {
              shouldCreateNotification = true;
              notificationMilestone = isOverdue ? 'OVERDUE' : 'H-0';
            }
            break;
        }
        
        if (!shouldCreateNotification && !options?.forceAll) {
          console.log(`⏭️ Skipping reminder ${reminder.id}, not at notification milestone`);
          results.push({
            reminderId: reminder.id,
            status: 'skipped',
            reason: 'Not at notification milestone'
          });
          continue;
        }
        
        // Get item and user information
        let itemName = 'Item';
        let serialNumber = '';
        let customerName = '';
        let originalUserId = ''; // User who created the original request
        let actionText = '';
        
        if (reminder.type === 'CALIBRATION' && reminder.calibration) {
          const calibration = reminder.calibration;
          itemName = calibration.item?.name || 'Peralatan';
          serialNumber = calibration.item?.serialNumber || '';
          customerName = calibration.customer?.name || '';
          originalUserId = calibration.userId || '';
          actionText = notificationMilestone === 'H-30' 
            ? 'Segera kirim email ke pelanggan untuk penjadwalan ulang kalibrasi.'
            : 'Kalibrasi telah berakhir, segera lakukan kalibrasi ulang.';
        } else if (reminder.type === 'RENTAL' && reminder.rental) {
          const rental = reminder.rental;
          itemName = rental.item?.name || 'Peralatan';
          serialNumber = rental.item?.serialNumber || '';
          customerName = rental.customer?.name || '';
          originalUserId = rental.userId || '';
          actionText = 'Segera hubungi pelanggan untuk pengembalian rental.';
        } else if (reminder.type === 'MAINTENANCE' && reminder.maintenance) {
          const maintenance = reminder.maintenance;
          itemName = maintenance.item?.name || 'Peralatan';
          serialNumber = maintenance.item?.serialNumber || '';
          originalUserId = maintenance.userId || '';
          actionText = 'Segera lakukan pemeriksaan maintenance rutin.';
        } else if (reminder.type === 'SCHEDULE' && reminder.inventoryCheck) {
          const schedule = reminder.inventoryCheck;
          itemName = schedule.name || 'Jadwal Pemeriksaan';
          originalUserId = schedule.createdBy?.id || ''; // FIXED: Use createdBy.id
          actionText = 'Segera lakukan pemeriksaan inventaris sesuai jadwal.';
        }
        
        // Create notification messages
        const { title, message } = createNotificationMessage(
          reminder.type,
          itemName,
          serialNumber,
          customerName,
          notificationMilestone,
          daysRemaining,
          actionText
        );
        
        // Create notifications for both ADMIN and original USER (if different)
        const notificationsCreated = [];
        
        // 1. Create notification for ADMIN users
        for (const admin of adminUsers) {
          const adminNotification = await createNotification({
            title: `[ADMIN] ${title}`,
            message: `${message} (Permintaan dari: ${originalUserId ? 'User' : 'System'})`,
            userId: admin.id,
            reminderId: reminder.id,
            shouldPlaySound: true,
          });
          notificationsCreated.push(adminNotification);
          console.log(`✅ Created admin notification ${adminNotification.id} for ${admin.name}`);
        }
        
        // 2. Create notification for original USER (if exists and different from admin)
        if (originalUserId && !adminUsers.some(admin => admin.id === originalUserId)) {
          const userNotification = await createNotification({
            title: `[USER] ${title}`,
            message: message,
            userId: originalUserId,
            reminderId: reminder.id,
            shouldPlaySound: true,
          });
          notificationsCreated.push(userNotification);
          console.log(`✅ Created user notification ${userNotification.id} for original user`);
        }
        
        // Update reminder status
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'SENT' }
        });
        
        results.push({
          reminderId: reminder.id,
          notificationIds: notificationsCreated.map(n => n.id),
          status: 'created',
          reminderType: reminder.type,
          milestone: notificationMilestone,
          itemName,
          serialNumber,
          customerName,
          daysRemaining,
          title,
          notificationsCount: notificationsCreated.length
        });
        
      } catch (error) {
        console.error(`❌ Error processing reminder ${reminder.id}:`, error);
        results.push({
          reminderId: reminder.id,
          error: String(error),
          status: 'error'
        });
      }
    }
    
    console.log(`🎯 Processed ${results.length} reminders, created ${results.filter(r => r.status === 'created').length} notification sets`);
    return results;
    
  } catch (error) {
    console.error('❌ Error checking due reminders:', error);
    throw error;
  }
}

// Create clear and specific notification messages
function createNotificationMessage(
  type: string,
  itemName: string,
  serialNumber: string,
  customerName: string,
  milestone: string,
  daysRemaining: number,
  actionText: string
) {
  const reminderTypeText = {
    'CALIBRATION': 'Kalibrasi',
    'RENTAL': 'Rental',
    'MAINTENANCE': 'Maintenance',
    'SCHEDULE': 'Jadwal Pemeriksaan'
  }[type] || type;
  
  const itemInfo = `${itemName}${serialNumber ? ` (${serialNumber})` : ''}`;
  const customerInfo = customerName ? ` untuk ${customerName}` : '';
  
  let title = '';
  let message = '';
  
  switch (milestone) {
    case 'H-30':
      title = `🔔 ${reminderTypeText}: ${itemName} - 30 Hari Lagi`;
      message = `${itemInfo}${customerInfo} akan berakhir dalam 30 hari. ${actionText}`;
      break;
      
    case 'H-7':
      title = `⚠️ ${reminderTypeText}: ${itemName} - 7 Hari Lagi`;
      message = `${itemInfo}${customerInfo} akan jatuh tempo dalam 7 hari. ${actionText}`;
      break;
      
    case 'H-1':
      title = `🚨 ${reminderTypeText}: ${itemName} - Besok`;
      message = `${itemInfo}${customerInfo} akan jatuh tempo besok. ${actionText}`;
      break;
      
    case 'H-0':
      title = `🔥 ${reminderTypeText}: ${itemName} - Jatuh Tempo Hari Ini`;
      message = `${itemInfo}${customerInfo} jatuh tempo hari ini. ${actionText}`;
      break;
      
    case 'OVERDUE':
      title = `💥 ${reminderTypeText}: ${itemName} - Terlambat ${Math.abs(daysRemaining)} Hari`;
      message = `${itemInfo}${customerName} sudah terlambat ${Math.abs(daysRemaining)} hari. SEGERA TINDAK LANJUTI! ${actionText}`;
      break;
      
    default:
      title = `🔔 ${reminderTypeText}: ${itemName}`;
      message = `${itemInfo}${customerInfo} memerlukan perhatian. ${actionText}`;
  }
  
  return { title, message };
}

// Create reminder for CALIBRATION (Admin gets reminder, after COMPLETED status)
export async function createCalibrationReminder(calibrationId: string) {
  console.log(`📅 [CALIBRATION] Creating reminder for calibration ID: ${calibrationId}`);
  
  if (!calibrationId) {
    throw new Error('calibrationId is required');
  }
  
  try {
    const calibration = await prisma.calibration.findUnique({
      where: { id: calibrationId },
      include: {
        item: true,
        customer: true,
        user: true,
      },
    });

    if (!calibration) {
      throw new Error('Calibration not found');
    }
    
    // Only create reminder if status is COMPLETED
    if (calibration.status !== 'COMPLETED') {
      console.log(`⏭️ [CALIBRATION] Skipping reminder creation, status is ${calibration.status}, not COMPLETED`);
      return null;
    }
    
    // Calculate due date (365 days after calibration completion)
    let validUntilDate;
    if (calibration.validUntil) {
      validUntilDate = new Date(calibration.validUntil);
    } else {
      const calibrationDate = new Date(calibration.calibrationDate);
      validUntilDate = addDays(calibrationDate, 365);
      
      // Update calibration with validUntil date
      await prisma.calibration.update({
        where: { id: calibrationId },
        data: { validUntil: validUntilDate }
      });
    }
    
    // Reminder date is 30 days before expiry
    const reminderDate = addDays(validUntilDate, -30);
    
    // Check if reminder already exists
    const existingReminder = await prisma.reminder.findFirst({
      where: {
        calibrationId,
        type: 'CALIBRATION',
      },
    });
    
    const itemName = calibration.item?.name || 'Peralatan';
    const serialNumber = calibration.item?.serialNumber || '';
    const customerName = calibration.customer?.name || '';
    const formattedDate = format(validUntilDate, 'dd MMM yyyy');
    const title = `Kalibrasi Akan Berakhir: ${itemName}`;
    const message = `Kalibrasi untuk ${itemName} (SN: ${serialNumber}) akan berakhir pada ${formattedDate}. Segera kirim email ke pelanggan.`;
    
    // Get admin users to assign reminder
    const adminUsers = await getAdminUsers();
    if (adminUsers.length === 0) {
      throw new Error('No admin users found');
    }
    
    if (existingReminder) {
      console.log(`🔄 [CALIBRATION] Updating existing reminder ${existingReminder.id}`);
      return await prisma.reminder.update({
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
    }
    
    // Create new reminder assigned to first admin
    console.log(`✅ [CALIBRATION] Creating new reminder assigned to admin`);
    const reminder = await prisma.reminder.create({
      data: {
        type: 'CALIBRATION',
        reminderDate,
        dueDate: validUntilDate,
        title,
        message,
        status: 'PENDING',
        emailSent: false,
        calibration: { connect: { id: calibrationId } },
        item: { connect: { serialNumber: calibration.itemSerial } },
        user: { connect: { id: adminUsers[0].id } }, // Assign to admin
      },
    });
    
    console.log(`✅ [CALIBRATION] Created reminder ${reminder.id} for admin`);
    return reminder;
    
  } catch (error) {
    console.error(`❌ [CALIBRATION] Error creating reminder:`, error);
    throw error;
  }
}

// Create reminder for RENTAL (Admin gets reminder when user creates rental)
export async function createRentalReminder(rentalId: string) {
  console.log(`📅 [RENTAL] Creating reminder for rental ID: ${rentalId}`);
  
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      item: true,
      customer: true,
      user: true,
    },
  });

  if (!rental) {
    throw new Error('Rental not found');
  }

  const dueDate = rental.endDate;
  if (!dueDate) {
    throw new Error('Rental end date not found');
  }
  
  // Reminder date is 7 days before due date
  const reminderDate = addDays(new Date(dueDate), -7);
  
  const itemName = rental.item?.name || 'Peralatan';
  const serialNumber = rental.item?.serialNumber || '';
  const customerName = rental.customer?.name || '';
  const formattedDate = format(new Date(dueDate), 'dd MMM yyyy');
  const title = `Rental Akan Berakhir: ${itemName}`;
  const message = `Rental ${itemName} (SN: ${serialNumber}) untuk ${customerName} akan berakhir pada ${formattedDate}.`;

  // Get admin users
  const adminUsers = await getAdminUsers();
  if (adminUsers.length === 0) {
    throw new Error('No admin users found');
  }

  // Check if reminder exists
  const existingReminder = await prisma.reminder.findFirst({
    where: {
      rentalId,
      type: 'RENTAL',
    },
  });

  if (existingReminder) {
    console.log(`🔄 [RENTAL] Updating existing reminder ${existingReminder.id}`);
    return await prisma.reminder.update({
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

  // Create new reminder assigned to admin
  console.log(`✅ [RENTAL] Creating new reminder assigned to admin`);
  const reminder = await prisma.reminder.create({
    data: {
      type: 'RENTAL',
      reminderDate,
      dueDate,
      title,
      message,
      status: 'PENDING',
      emailSent: false,
      rental: { connect: { id: rentalId } },
      item: { connect: { serialNumber: rental.item?.serialNumber || '' } },
      user: { connect: { id: adminUsers[0].id } }, // Assign to admin
    },
  });
  
  console.log(`✅ [RENTAL] Created reminder ${reminder.id} for admin`);
  return reminder;
}

// Create reminder for MAINTENANCE (Admin gets reminder when user creates maintenance)
export async function createMaintenanceReminder(maintenanceId: string) {
  console.log(`📅 [MAINTENANCE] Creating reminder for maintenance ID: ${maintenanceId}`);
  
  const maintenance = await prisma.maintenance.findUnique({
    where: { id: maintenanceId },
    include: {
      item: true,
      user: true,
    },
  });

  if (!maintenance) {
    throw new Error('Maintenance not found');
  }
  
  // Use endDate if available, otherwise use current date + 30 days
  let dueDate = new Date();
  if (maintenance.endDate) {
    dueDate = addDays(new Date(maintenance.endDate), 30);
  } else {
    dueDate = addDays(new Date(), 30);
    
    // Update maintenance with endDate
    await prisma.maintenance.update({
      where: { id: maintenanceId },
      data: { endDate: new Date() }
    });
  }
  
  // Reminder date is 7 days before due date
  const reminderDate = addDays(dueDate, -7);
  
  const itemName = maintenance.item?.name || 'Peralatan';
  const serialNumber = maintenance.item?.serialNumber || '';
  const formattedDate = format(dueDate, 'dd MMM yyyy');
  const title = `Maintenance Akan Jatuh Tempo: ${itemName}`;
  const message = `Maintenance ${itemName} (SN: ${serialNumber}) akan jatuh tempo pada ${formattedDate}.`;

  // Get admin users
  const adminUsers = await getAdminUsers();
  if (adminUsers.length === 0) {
    throw new Error('No admin users found');
  }

  // Check if reminder exists
  const existingReminder = await prisma.reminder.findFirst({
    where: {
      maintenanceId,
      type: 'MAINTENANCE',
    },
  });

  if (existingReminder) {
    console.log(`🔄 [MAINTENANCE] Updating existing reminder ${existingReminder.id}`);
    return await prisma.reminder.update({
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

  // Create new reminder assigned to admin
  console.log(`✅ [MAINTENANCE] Creating new reminder assigned to admin`);
  const reminder = await prisma.reminder.create({
    data: {
      type: 'MAINTENANCE',
      reminderDate,
      dueDate,
      title,
      message,
      status: 'PENDING',
      emailSent: false,
      maintenance: { connect: { id: maintenanceId } },
      item: { connect: { serialNumber: maintenance.itemSerial } },
      user: { connect: { id: adminUsers[0].id } }, // Assign to admin
    },
  });
  
  console.log(`✅ [MAINTENANCE] Created reminder ${reminder.id} for admin`);
  return reminder;
}

// Create reminder for SCHEDULE (Admin gets reminder when user creates schedule)
export async function createScheduleReminder(scheduleId: string) {
  console.log(`📅 [SCHEDULE] Creating reminder for schedule ID: ${scheduleId}`);
  
  const schedule = await prisma.inventoryCheck.findUnique({
    where: { id: scheduleId },
    include: {
      items: {
        include: {
          item: true
        }
      },
      createdBy: true, // FIXED: Use createdBy instead of user
    },
  });

  if (!schedule) {
    throw new Error('Schedule not found');
  }

  const dueDate = schedule.scheduledDate;
  // For schedules, reminder date is same as due date (H-0)
  const reminderDate = new Date(dueDate);

  const title = `Jadwal Pemeriksaan: ${schedule.name || 'Jadwal'}`;
  const message = `Pemeriksaan inventaris "${schedule.name || 'Jadwal'}" dijadwalkan untuk hari ini.`;

  // Get admin users
  const adminUsers = await getAdminUsers();
  if (adminUsers.length === 0) {
    throw new Error('No admin users found');
  }

  // Check if reminder exists
  const existingReminder = await prisma.reminder.findFirst({
    where: {
      scheduleId,
      type: 'SCHEDULE',
    },
  });

  if (existingReminder) {
    console.log(`🔄 [SCHEDULE] Updating existing reminder ${existingReminder.id}`);
    return await prisma.reminder.update({
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

  // Get first item if available
  const firstItem = schedule.items && schedule.items.length > 0 ? schedule.items[0].item : null;

  // Create new reminder assigned to admin
  console.log(`✅ [SCHEDULE] Creating new reminder assigned to admin`);
  const reminder = await prisma.reminder.create({
    data: {
      type: 'SCHEDULE',
      reminderDate,
      dueDate,
      title,
      message,
      status: 'PENDING',
      emailSent: false,
      inventoryCheck: { connect: { id: scheduleId } },
      ...(firstItem && { item: { connect: { serialNumber: firstItem.serialNumber } } }),
      user: { connect: { id: adminUsers[0].id } }, // Assign to admin
    },
  });
  
  console.log(`✅ [SCHEDULE] Created reminder ${reminder.id} for admin`);
  return reminder;
}

// Status change handlers
export async function handleCalibrationStatusChange(calibrationId: string, status: string) {
  console.log(`🔄 [CALIBRATION] Status change: ${calibrationId} → ${status}`);
  
  if (status === 'COMPLETED') {
    try {
      const reminder = await createCalibrationReminder(calibrationId);
      console.log(`✅ [CALIBRATION] Auto-created reminder for completed calibration`);
      return reminder;
    } catch (error) {
      console.error(`❌ [CALIBRATION] Failed to create reminder:`, error);
      throw error;
    }
  }
  return null;
}

export async function handleRentalStatusChange(rentalId: string, status: string) {
  console.log(`🔄 [RENTAL] Status change: ${rentalId} → ${status}`);
  
  if (status === 'APPROVED') {
    try {
      const reminder = await createRentalReminder(rentalId);
      console.log(`✅ [RENTAL] Auto-created reminder for approved rental`);
      return reminder;
    } catch (error) {
      console.error(`❌ [RENTAL] Failed to create reminder:`, error);
      throw error;
    }
  }
  return null;
}

export async function handleMaintenanceStatusChange(maintenanceId: string, status: string) {
  console.log(`🔄 [MAINTENANCE] Status change: ${maintenanceId} → ${status}`);
  
  // Create reminder when maintenance is created (not when completed)
  if (status === 'PENDING' || status === 'IN_PROGRESS') {
    try {
      const reminder = await createMaintenanceReminder(maintenanceId);
      console.log(`✅ [MAINTENANCE] Auto-created reminder for maintenance`);
      return reminder;
    } catch (error) {
      console.error(`❌ [MAINTENANCE] Failed to create reminder:`, error);
      return null; // Don't throw to avoid breaking main flow
    }
  }
  return null;
}

export async function handleScheduleStatusChange(scheduleId: string) {
  console.log(`🔄 [SCHEDULE] Creating reminder for new schedule: ${scheduleId}`);
  
  try {
    const reminder = await createScheduleReminder(scheduleId);
    console.log(`✅ [SCHEDULE] Auto-created reminder for schedule`);
    return reminder;
  } catch (error) {
    console.error(`❌ [SCHEDULE] Failed to create reminder:`, error);
    throw error;
  }
}

// Mark reminder as acknowledged
export async function markReminderAcknowledged(reminderId: string) {
  console.log(`✅ Marking reminder ${reminderId} as acknowledged`);
  
  try {
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
    
    // Update reminder status
    const updatedReminder = await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date()
      }
    });
    
    // Mark related notifications as read
    await prisma.notification.updateMany({
      where: { reminderId: reminderId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
    
    // Log activity
    const itemName = reminder.item?.name || 'Unknown item';
    const itemSerial = reminder.item?.serialNumber || 'Unknown';
    
    await prisma.activityLog.create({
      data: {
        type: ActivityType.NOTIFICATION_CREATED,
        action: "Reminder acknowledged",
        details: `${reminder.type} reminder for ${itemName} (${itemSerial}) was acknowledged`,
        userId: reminder.userId,
        itemSerial: reminder.itemSerial,
      },
    });
    
    console.log(`✅ Reminder ${reminderId} acknowledged and logged`);
    return updatedReminder;
    
  } catch (error) {
    console.error(`❌ Error acknowledging reminder:`, error);
    throw error;
  }
}

// Mark reminder email as sent
export async function markReminderEmailSent(reminderId: string) {
  return prisma.reminder.update({
    where: { id: reminderId },
    data: {
      emailSent: true,
      emailSentAt: new Date(),
    },
  });
}