const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function standardizeCalibrationStatuses() {
  console.log('Starting calibration status standardization...');

  try {
    // Get all calibration statuses
    const calibrationStatuses = await prisma.status.findMany({
      where: {
        type: 'calibration'
      },
      include: {
        calibrations: true
      }
    });

    console.log(`Found ${calibrationStatuses.length} calibration statuses.`);

    // Group statuses by lowercase name
    const statusGroups = {};
    for (const status of calibrationStatuses) {
      const lowerName = status.name.toLowerCase();
      if (!statusGroups[lowerName]) {
        statusGroups[lowerName] = [];
      }
      statusGroups[lowerName].push(status);
    }

    console.log(`Grouped into ${Object.keys(statusGroups).length} unique lowercase names.`);

    // Process each group
    for (const [lowerName, statuses] of Object.entries(statusGroups)) {
      if (statuses.length === 1) {
        // Only one status with this name (case-insensitive)
        const status = statuses[0];
        if (status.name !== lowerName) {
          console.log(`Updating status ${status.id} from "${status.name}" to "${lowerName}"`);
          
          await prisma.status.update({
            where: { id: status.id },
            data: { name: lowerName }
          });
        }
      } else {
        // Multiple statuses with the same name (case-insensitive)
        console.log(`Found ${statuses.length} duplicate statuses for "${lowerName}"`);
        
        // Sort by ID (to prioritize older statuses)
        statuses.sort((a, b) => a.id - b.id);
        
        // Keep the first one and update its name if needed
        const primaryStatus = statuses[0];
        if (primaryStatus.name !== lowerName) {
          console.log(`Updating primary status ${primaryStatus.id} from "${primaryStatus.name}" to "${lowerName}"`);
          
          await prisma.status.update({
            where: { id: primaryStatus.id },
            data: { name: lowerName }
          });
        }
        
        // Merge all others into the primary status
        for (let i = 1; i < statuses.length; i++) {
          const duplicateStatus = statuses[i];
          console.log(`Merging duplicate status ${duplicateStatus.id} ("${duplicateStatus.name}") into primary status ${primaryStatus.id}`);
          
          // Update all calibrations referencing this status
          const updateCount = await prisma.calibration.updateMany({
            where: { statusId: duplicateStatus.id },
            data: { statusId: primaryStatus.id }
          });
          
          console.log(`Updated ${updateCount.count} calibrations to reference the primary status`);
          
          // Delete the duplicate status
          try {
            await prisma.status.delete({
              where: { id: duplicateStatus.id }
            });
            console.log(`Deleted duplicate status ${duplicateStatus.id}`);
          } catch (deleteError) {
            console.error(`Failed to delete status ${duplicateStatus.id}. It might still be referenced by other records:`, deleteError);
          }
        }
      }
    }

    console.log('Calibration status standardization completed successfully.');
  } catch (error) {
    console.error('Error standardizing calibration statuses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the standardization
standardizeCalibrationStatuses().then(() => {
  console.log('Script execution completed.');
}); 