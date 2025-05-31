import prisma from '@/lib/prisma';

interface Status {
  id: number;
  name: string;
  type: string;
}

async function main() {
  try {
    // Check if PENDING status exists
    const pendingStatus = await prisma.status.findFirst({
      where: {
        name: 'PENDING',
        type: 'request'
      }
    });

    if (!pendingStatus) {
      console.log('Creating PENDING status for requests...');
      await prisma.status.create({
        data: {
          name: 'PENDING',
          type: 'request',
        }
      });
      console.log('PENDING status for requests created successfully!');
    } else {
      console.log('PENDING status for requests already exists, ID:', pendingStatus.id);
    }

    // Also check for APPROVED status
    const approvedStatus = await prisma.status.findFirst({
      where: {
        name: 'APPROVED',
        type: 'request'
      }
    });

    if (!approvedStatus) {
      console.log('Creating APPROVED status for requests...');
      await prisma.status.create({
        data: {
          name: 'APPROVED',
          type: 'request',
        }
      });
      console.log('APPROVED status for requests created successfully!');
    } else {
      console.log('APPROVED status for requests already exists, ID:', approvedStatus.id);
    }

    // Check for other necessary statuses
    const rejectedStatus = await prisma.status.findFirst({
      where: {
        name: 'REJECTED',
        type: 'request'
      }
    });

    if (!rejectedStatus) {
      console.log('Creating REJECTED status for requests...');
      await prisma.status.create({
        data: {
          name: 'REJECTED',
          type: 'request',
        }
      });
      console.log('REJECTED status for requests created successfully!');
    } else {
      console.log('REJECTED status for requests already exists, ID:', rejectedStatus.id);
    }

    // Print all statuses for verification
    const allStatuses = await prisma.status.findMany();
    console.log('\nAll statuses in database:');
    allStatuses.forEach((status: Status) => {
      console.log(`ID: ${status.id}, Name: ${status.name}, Type: ${status.type}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 