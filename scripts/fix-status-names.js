// This script fixes status name inconsistencies by standardizing all names to lowercase
// Run with: node fix-status-names.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixStatusNames() {
  console.log('Starting status name standardization...');
  console.log('--------------------------------------');

  try {
    // Get all statuses
    const allStatuses = await prisma.status.findMany();
    console.log(`Found ${allStatuses.length} status records`);

    // Group by lowercase name and type
    const statusGroups = {};
    
    allStatuses.forEach(status => {
      const key = `${status.name.toLowerCase()}:${status.type}`;
      if (!statusGroups[key]) {
        statusGroups[key] = [];
      }
      statusGroups[key].push(status);
    });
    
    // Process each group
    for (const key of Object.keys(statusGroups)) {
      const statuses = statusGroups[key];
      const [name, type] = key.split(':');
      
      if (statuses.length > 1) {
        console.log(`\nFound ${statuses.length} statuses for "${name}" (${type}):`);
        statuses.forEach(status => {
          console.log(`  ID: ${status.id}, Name: "${status.name}", Type: "${status.type}"`);
        });
        
        // Keep the most used ID (or the first one if counts are equal)
        const primaryStatus = statuses[0];
        const othersToMerge = statuses.slice(1);
        
        console.log(`\nStandardizing to lowercase: "${name}"`);
        
        // Update primary status to lowercase
        await prisma.status.update({
          where: { id: primaryStatus.id },
          data: { name: name }
        });
        
        // For each other status, reassign references and delete
        for (const statusToMerge of othersToMerge) {
          console.log(`  Processing status ID ${statusToMerge.id} (${statusToMerge.name})...`);
          
          // Update item references
          const itemCount = await prisma.item.count({
            where: { statusId: statusToMerge.id }
          });
          if (itemCount > 0) {
            console.log(`    Updating ${itemCount} items from status ID ${statusToMerge.id} to ${primaryStatus.id}`);
            await prisma.item.updateMany({
              where: { statusId: statusToMerge.id },
              data: { statusId: primaryStatus.id }
            });
          }
          
          // Update request references
          const requestCount = await prisma.request.count({
            where: { statusId: statusToMerge.id }
          });
          if (requestCount > 0) {
            console.log(`    Updating ${requestCount} requests from status ID ${statusToMerge.id} to ${primaryStatus.id}`);
            await prisma.request.updateMany({
              where: { statusId: statusToMerge.id },
              data: { statusId: primaryStatus.id }
            });
          }
          
          // Update calibration references
          const calibrationCount = await prisma.calibration.count({
            where: { statusId: statusToMerge.id }
          });
          if (calibrationCount > 0) {
            console.log(`    Updating ${calibrationCount} calibrations from status ID ${statusToMerge.id} to ${primaryStatus.id}`);
            await prisma.calibration.updateMany({
              where: { statusId: statusToMerge.id },
              data: { statusId: primaryStatus.id }
            });
          }
          
          // Update rental references
          const rentalCount = await prisma.rental.count({
            where: { statusId: statusToMerge.id }
          });
          if (rentalCount > 0) {
            console.log(`    Updating ${rentalCount} rentals from status ID ${statusToMerge.id} to ${primaryStatus.id}`);
            await prisma.rental.updateMany({
              where: { statusId: statusToMerge.id },
              data: { statusId: primaryStatus.id }
            });
          }
          
          // Now delete the redundant status
          try {
            console.log(`    Deleting status ID ${statusToMerge.id}`);
            await prisma.status.delete({
              where: { id: statusToMerge.id }
            });
          } catch (error) {
            console.error(`    Failed to delete status ID ${statusToMerge.id}:`, error.message);
          }
        }
      } else if (statuses[0].name !== name) {
        // Just update the case to lowercase if no duplicates
        console.log(`\nUpdating single status "${statuses[0].name}" (${type}) to lowercase "${name}"`);
        await prisma.status.update({
          where: { id: statuses[0].id },
          data: { name: name }
        });
      }
    }

    // Ensure critical statuses exist
    await ensureCriticalStatuses();

    console.log('\nStatus name standardization completed successfully');
  } catch (error) {
    console.error('Error standardizing status names:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Function to ensure that critical statuses exist in the system
async function ensureCriticalStatuses() {
  console.log('\nEnsuring critical statuses exist...');
  
  const criticalStatuses = [
    { name: 'rejected', type: 'request' },
    { name: 'completed', type: 'request' },
    { name: 'pending', type: 'request' },
    { name: 'approved', type: 'request' },
    { name: 'available', type: 'item' },
    { name: 'in use', type: 'item' },
    { name: 'maintenance', type: 'item' },
    { name: 'calibration', type: 'item' }
  ];
  
  for (const status of criticalStatuses) {
    // Check if status exists (case insensitive)
    const existingStatus = await prisma.status.findFirst({
      where: {
        name: {
          mode: 'insensitive',
          equals: status.name
        },
        type: {
          mode: 'insensitive',
          equals: status.type
        }
      }
    });
    
    if (!existingStatus) {
      console.log(`  Creating missing critical status: "${status.name}" (${status.type})`);
      await prisma.status.create({
        data: {
          name: status.name,
          type: status.type
        }
      });
    } else {
      console.log(`  Critical status "${status.name}" (${status.type}) already exists with ID ${existingStatus.id}`);
    }
  }
}

// Run the standardization function
fixStatusNames(); 