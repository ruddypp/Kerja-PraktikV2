import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create Roles
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

  // Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      roleId: adminRole.id,
    },
  });

  // Create Regular User
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Regular User',
      email: 'user@example.com',
      password: userPassword,
      roleId: userRole.id,
    },
  });

  // Create Categories
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

  console.log("Basic database entities have been seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 