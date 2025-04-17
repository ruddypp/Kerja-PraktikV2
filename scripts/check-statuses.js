const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatuses() {
  try {
    const requestStatuses = await prisma.status.findMany({
      where: { type: 'REQUEST' }
    });

    console.log('Request statuses:', requestStatuses);

    // Check if rejected status exists
    const rejectedStatus = requestStatuses.find(s => 
      s.name.toLowerCase() === 'rejected'
    );

    if (!rejectedStatus) {
      console.log('Creating rejected status...');
      await prisma.status.create({
        data: {
          name: 'REJECTED',
          type: 'REQUEST'
        }
      });
      console.log('Rejected status created successfully');
    } else {
      console.log('Rejected status exists:', rejectedStatus);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatuses(); 