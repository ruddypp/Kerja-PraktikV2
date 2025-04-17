import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding statuses...');

  // ItemStatus values
  const itemStatuses = [
    { name: 'AVAILABLE', type: 'item' },
    { name: 'IN_USE', type: 'item' },
    { name: 'IN_CALIBRATION', type: 'item' },
    { name: 'IN_RENTAL', type: 'item' },
    { name: 'IN_MAINTENANCE', type: 'item' }
  ];

  // RequestStatus values
  const requestStatuses = [
    { name: 'PENDING', type: 'request' },
    { name: 'APPROVED', type: 'request' },
    { name: 'REJECTED', type: 'request' },
    { name: 'COMPLETED', type: 'request' }
  ];

  // CalibrationStatus values
  const calibrationStatuses = [
    { name: 'PENDING', type: 'calibration' },
    { name: 'APPROVED', type: 'calibration' },
    { name: 'IN_PROGRESS', type: 'calibration' },
    { name: 'COMPLETED', type: 'calibration' },
    { name: 'REJECTED', type: 'calibration' }
  ];

  // RentalStatus values
  const rentalStatuses = [
    { name: 'PENDING', type: 'rental' },
    { name: 'APPROVED', type: 'rental' },
    { name: 'ACTIVE', type: 'rental' },
    { name: 'RETURNED', type: 'rental' },
    { name: 'REJECTED', type: 'rental' }
  ];

  // Combine all status arrays
  const allStatuses = [
    ...itemStatuses,
    ...requestStatuses,
    ...calibrationStatuses,
    ...rentalStatuses
  ];

  // Insert statuses
  for (const status of allStatuses) {
    // Check if status already exists
    const existingStatus = await prisma.status.findFirst({
      where: {
        name: status.name,
        type: status.type
      }
    });

    if (!existingStatus) {
      await prisma.status.create({
        data: status
      });
      console.log(`Created status: ${status.name} (${status.type})`);
    } else {
      console.log(`Status already exists: ${status.name} (${status.type})`);
    }
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 