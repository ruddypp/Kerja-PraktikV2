import { PrismaClient, ItemStatus, RequestStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        name: 'Admin User',
        password: adminPassword,
        role: 'ADMIN',
      },
      create: {
        name: 'Admin User',
        email: 'admin@example.com',
        password: adminPassword,
        role: 'ADMIN',
      },
    });
    
    console.log(`Upserted admin user: ${adminUser.email}`);
    
    // Create regular user
    const userPassword = await bcrypt.hash('user123', 10);
    
    const regularUser = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {
        name: 'Regular User',
        password: userPassword,
        role: 'USER',
      },
      create: {
        name: 'Regular User',
        email: 'user@example.com',
        password: userPassword,
        role: 'USER',
      },
    });
    
    console.log(`Upserted regular user: ${regularUser.email}`);
    
    // Create vendors
    const vendor1 = await prisma.vendor.upsert({
      where: { id: 'vendor-1' },
      update: {
        name: 'Precision Calibration Services',
        address: 'Jl. Industri No. 123, Jakarta',
        contactName: 'Budi Santoso',
        contactPhone: '081234567890',
        service: 'Kalibrasi peralatan elektronik',
      },
      create: {
        id: 'vendor-1',
        name: 'Precision Calibration Services',
        address: 'Jl. Industri No. 123, Jakarta',
        contactName: 'Budi Santoso',
        contactPhone: '081234567890',
        service: 'Kalibrasi peralatan elektronik',
      },
    });
    
    const vendor2 = await prisma.vendor.upsert({
      where: { id: 'vendor-2' },
      update: {
        name: 'Measurement Solutions',
        address: 'Jl. Teknik No. 45, Bandung',
        contactName: 'Dewi Pertiwi',
        contactPhone: '087654321098',
        service: 'Kalibrasi peralatan mekanik',
      },
      create: {
        id: 'vendor-2',
        name: 'Measurement Solutions',
        address: 'Jl. Teknik No. 45, Bandung',
        contactName: 'Dewi Pertiwi',
        contactPhone: '087654321098',
        service: 'Kalibrasi peralatan mekanik',
      },
    });
    
    console.log(`Created vendors: ${vendor1.name}, ${vendor2.name}`);
    
    // Create items
    const items = [
      {
        serialNumber: 'MULTI-001',
        name: 'Digital Multimeter',
        partNumber: 'DMM-X500',
        category: 'Measuring Instruments',
        sensor: 'Electronic',
        description: 'Multifungsi pengukur tegangan, arus, dan resistansi',
        customerId: 'vendor-1',
        status: ItemStatus.AVAILABLE,
      },
      {
        serialNumber: 'OSCI-001',
        name: 'Oscilloscope',
        partNumber: 'OSC-2000',
        category: 'Measuring Instruments',
        sensor: 'Electronic',
        description: 'Alat pengukur sinyal elektronik',
        customerId: 'vendor-1',
        status: ItemStatus.AVAILABLE,
      },
      {
        serialNumber: 'PRES-001',
        name: 'Pressure Gauge',
        partNumber: 'PG-100',
        category: 'Mechanical Instruments',
        sensor: 'Mechanical',
        description: 'Pengukur tekanan',
        customerId: 'vendor-2',
        status: ItemStatus.AVAILABLE,
      }
    ];
    
    for (const itemData of items) {
      try {
        const item = await prisma.item.upsert({
          where: { serialNumber: itemData.serialNumber },
          update: itemData,
          create: itemData
        });
        console.log(`Created item: ${item.name} (${item.serialNumber})`);
      } catch (error: any) {
        console.log(`Skipping item ${itemData.serialNumber}: ${error.message}`);
      }
    }
    
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 