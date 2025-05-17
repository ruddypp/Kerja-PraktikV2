// Test script to send notifications via the API
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Notification types from schema
const NOTIFICATION_TYPES = [
  'RENTAL_REQUEST',
  'RENTAL_STATUS_CHANGE',
  'CALIBRATION_REMINDER',
  'CALIBRATION_STATUS_CHANGE',
  'RENTAL_DUE_REMINDER',
  'MAINTENANCE_REMINDER',
  'INVENTORY_SCHEDULE',
  'VENDOR_INFO',
  'GENERAL_INFO'
];

// Test messages for each type
const TEST_MESSAGES = {
  RENTAL_REQUEST: "New rental request for MeshGuard H2S #SN-12345",
  RENTAL_STATUS_CHANGE: "Rental request #REQ-567 has been approved",
  CALIBRATION_REMINDER: "Calibration for ToxiRAE Pro #SN-789 is due in 7 days",
  CALIBRATION_STATUS_CHANGE: "Calibration for device #SN-456 is completed",
  RENTAL_DUE_REMINDER: "Rental #RNT-123 is due for return tomorrow",
  MAINTENANCE_REMINDER: "Maintenance scheduled for MiniRAE 3000 tomorrow",
  INVENTORY_SCHEDULE: "Monthly inventory check scheduled for next week",
  VENDOR_INFO: "Vendor RAE Systems has updated their contact information",
  GENERAL_INFO: "System maintenance scheduled for this weekend"
};

// Test titles
const TEST_TITLES = {
  RENTAL_REQUEST: "New Rental Request",
  RENTAL_STATUS_CHANGE: "Rental Status Updated",
  CALIBRATION_REMINDER: "Calibration Due Soon",
  CALIBRATION_STATUS_CHANGE: "Calibration Status Updated",
  RENTAL_DUE_REMINDER: "Rental Due Reminder",
  MAINTENANCE_REMINDER: "Maintenance Reminder",
  INVENTORY_SCHEDULE: "Inventory Schedule Update",
  VENDOR_INFO: "Vendor Information Update",
  GENERAL_INFO: "System Information"
};

async function main() {
  try {
    // Get a user to send notifications to
    const firstUser = await prisma.user.findFirst({
      where: { role: 'USER' }
    });

    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!firstUser || !adminUser) {
      console.error("No users found in database");
      return;
    }

    console.log(`Sending test notifications to user ${firstUser.name} (${firstUser.id})`);
    console.log(`Sending test notifications to admin ${adminUser.name} (${adminUser.id})`);
    
    // Create one notification for each type
    for (const type of NOTIFICATION_TYPES) {
      // Create notification for regular user
      await prisma.notification.create({
        data: {
          userId: firstUser.id,
          title: TEST_TITLES[type],
          message: TEST_MESSAGES[type],
          type: type,
          isRead: false,
        }
      });

      console.log(`Created ${type} notification for ${firstUser.name}`);
      
      // Create notification for admin
      await prisma.notification.create({
        data: {
          userId: adminUser.id,
          title: TEST_TITLES[type],
          message: TEST_MESSAGES[type],
          type: type,
          isRead: false,
        }
      });
      
      console.log(`Created ${type} notification for ${adminUser.name}`);
    }

    console.log("All test notifications created successfully!");
  } catch (error) {
    console.error("Error creating notifications:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 