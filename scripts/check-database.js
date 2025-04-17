// This script checks and reports the current status records in the database
// Run with: node check-database.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('Checking database status records...');
  console.log('-----------------------------------');

  try {
    // Get all statuses
    const allStatuses = await prisma.status.findMany({
      orderBy: {
        type: 'asc'
      }
    });
    
    console.log(`\nFound ${allStatuses.length} status records:`);
    
    // Group by type
    const statusesByType = {};
    
    allStatuses.forEach(status => {
      if (!statusesByType[status.type]) {
        statusesByType[status.type] = [];
      }
      statusesByType[status.type].push(status);
    });
    
    // Print statuses by type
    Object.keys(statusesByType).sort().forEach(type => {
      console.log(`\n${type.toUpperCase()} STATUSES:`);
      statusesByType[type].forEach(status => {
        console.log(`  ID: ${status.id}, Name: "${status.name}", Type: "${status.type}"`);
      });
    });
    
    // Check for inconsistent status naming (uppercase vs lowercase)
    console.log('\nPotential naming inconsistencies:');
    const statusNameMap = {};
    
    allStatuses.forEach(status => {
      const lowerName = status.name.toLowerCase();
      if (!statusNameMap[lowerName]) {
        statusNameMap[lowerName] = [];
      }
      statusNameMap[lowerName].push(status);
    });
    
    let inconsistenciesFound = false;
    
    Object.keys(statusNameMap).forEach(lowerName => {
      if (statusNameMap[lowerName].length > 1) {
        inconsistenciesFound = true;
        console.log(`\nInconsistent naming for "${lowerName}":`);
        statusNameMap[lowerName].forEach(status => {
          console.log(`  ID: ${status.id}, Name: "${status.name}", Type: "${status.type}"`);
        });
      }
    });
    
    if (!inconsistenciesFound) {
      console.log('  No naming inconsistencies found!');
    }
    
    console.log('\nDatabase check completed successfully.');
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check function
checkDatabase(); 