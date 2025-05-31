<<<<<<< HEAD
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
=======
import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcryptjs';
>>>>>>> 0989372 (add fitur inventory dan history)

const prisma = new PrismaClient();

async function main() {
<<<<<<< HEAD
  console.log('Mulai seeding...');

  try {
    // Hapus data yang ada - hapus tabel anak terlebih dahulu
    console.log('Menghapus data lama...');

    // Hapus Calibration terlebih dahulu karena memiliki foreign key ke Item
    await prisma.$executeRaw`TRUNCATE TABLE "Calibration" CASCADE;`;
    
    // Sekarang aman untuk menghapus Item dan Vendor
    await prisma.$executeRaw`TRUNCATE TABLE "Item" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "Vendor" CASCADE;`;

    console.log('Data lama berhasil dihapus');

    // Buat 100 vendor
    const vendors = [];
    console.log('Membuat vendor...');
    for (let i = 0; i < 1000; i++) { // Diubah dari 1000 menjadi 100 sesuai komentar awal
      const vendor = await prisma.vendor.create({
        data: {
          name: faker.company.name(),
          address: faker.location.streetAddress(),
          contactName: faker.person.fullName(),
          contactPhone: faker.phone.number(),
          contactEmail: faker.internet.email(),
          service: faker.company.catchPhrase(),
          isDeleted: false,
        },
      });
      vendors.push(vendor);
      
      if (i % 10 === 0) {
        console.log(`${i} vendor dibuat...`);
      }
    }

    console.log('100 vendor berhasil dibuat');

    // Buat 1000 item
    console.log('Membuat item...');
    for (let i = 0; i < 10000; i++) { // Diubah dari 10000 menjadi 1000 sesuai dengan kebutuhan
      const randomVendor = vendors[Math.floor(Math.random() * vendors.length)];
      
      await prisma.item.create({
        data: {
          serialNumber: faker.string.alphanumeric(10).toUpperCase(),
          name: faker.commerce.productName(),
          partNumber: faker.string.alphanumeric(8).toUpperCase(),
          sensor: faker.helpers.arrayElement(['Temperature', 'Pressure', 'Humidity', 'Vibration', 'None']),
          description: faker.commerce.productDescription(),
          customerId: randomVendor.id,
          status: "AVAILABLE", // Menggunakan status enum yang valid
        },
      });
      
      if (i % 100 === 0) {
        console.log(`${i} item dibuat...`);
      }
    }

    console.log('1000 item berhasil dibuat');
    console.log('Seeding selesai!');
  } catch (error) {
    console.error('Error dalam seeding:', error);
    throw error; // Re-throw error untuk ditangani di blok catch setelah fungsi main
  }
=======
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
>>>>>>> 0989372 (add fitur inventory dan history)
}

main()
  .catch((e) => {
<<<<<<< HEAD
    console.error('Error dalam eksekusi seed:', e);
=======
    console.error(e);
>>>>>>> 0989372 (add fitur inventory dan history)
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
<<<<<<< HEAD
  });
=======
  }); 
>>>>>>> 0989372 (add fitur inventory dan history)
