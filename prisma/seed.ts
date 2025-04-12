import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Buat Roles
  const adminRole = await prisma.role.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Admin',
      description: 'Administrator dengan akses penuh',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'User',
      description: 'Pengguna standar',
    },
  });

  // Hash password
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  // Buat Admin User
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      roleId: adminRole.id,
    },
  });

  // Buat Regular User
  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Regular User',
      email: 'user@example.com',
      password: userPassword,
      roleId: userRole.id,
    },
  });

  // Buat Status
  const statuses = [
    // Item Status
    { type: 'item', name: 'Available' },
    { type: 'item', name: 'In Use' },
    { type: 'item', name: 'Maintenance' },
    { type: 'item', name: 'Retired' },
    // Request Status
    { type: 'request', name: 'Pending' },
    { type: 'request', name: 'Approved' },
    { type: 'request', name: 'Rejected' },
    // Rental Status
    { type: 'rental', name: 'Active' },
    { type: 'rental', name: 'Returned' },
    { type: 'rental', name: 'Overdue' },
    // Calibration Status
    { type: 'calibration', name: 'Scheduled' },
    { type: 'calibration', name: 'Completed' },
    { type: 'calibration', name: 'Failed' },
  ];

  for (let i = 0; i < statuses.length; i++) {
    await prisma.status.upsert({
      where: { id: i + 1 },
      update: {},
      create: statuses[i],
    });
  }

  // Buat Categories
  const categories = [
    { name: 'Electronic', description: 'Electronic equipment and devices' },
    { name: 'Mechanical', description: 'Mechanical tools and machinery' },
    { name: 'Laboratory', description: 'Laboratory equipment' },
    { name: 'Safety', description: 'Safety equipment' },
  ];

  for (let i = 0; i < categories.length; i++) {
    await prisma.category.upsert({
      where: { id: i + 1 },
      update: {},
      create: categories[i],
    });
  }

  console.log('Database seeded successfully!');
  console.log('Admin login: admin@example.com / admin123');
  console.log('User login: user@example.com / user123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 