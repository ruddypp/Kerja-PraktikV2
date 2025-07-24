import { PrismaClient, Role } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Mulai seeding...');

  try {
    // Hapus data yang ada - hapus tabel anak terlebih dahulu
    console.log('Menghapus data lama...');

    // Hapus Calibration terlebih dahulu karena memiliki foreign key ke Item
    await prisma.$executeRaw`TRUNCATE TABLE "Calibration" CASCADE;`;
    
    // Sekarang aman untuk menghapus Item dan customer
    await prisma.$executeRaw`TRUNCATE TABLE "Item" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "Customer" CASCADE;`;
    
    // Hapus User juga
    await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE;`;

    console.log('Data lama berhasil dihapus');

    // Buat user dengan role yang berbeda
    console.log('Membuat users...');
    
    const users = [
      {
        email: 'user@paramata.com',
        password: await bcrypt.hash('user123', 10),
        name: 'User Paramata',
        role: Role.USER
      },
      {
        email: 'admin@paramata.com',
        password: await bcrypt.hash('admin123', 10),
        name: 'Admin Paramata',
        role: Role.ADMIN
      }
    ];

    for (const userData of users) {
      await prisma.user.create({
        data: userData
      });
      console.log(`User ${userData.email} berhasil dibuat`);
    }

    console.log('2 users berhasil dibuat');

    // Buat 100 customer
    const customers = [];
    console.log('Membuat customer...');
    for (let i = 0; i < 100; i++) {
      const customer = await prisma.customer.create({
        data: {
          id: faker.string.uuid(),
          name: faker.company.name(),
          address: faker.location.streetAddress(),
          contactName: faker.person.fullName(),
          contactPhone: faker.phone.number(),
          contactEmail: faker.internet.email(),
          service: faker.company.catchPhrase(),
          isDeleted: false,
          updatedAt: new Date(),
        },
      });
      customers.push(customer);
      
      if (i % 10 === 0) {
        console.log(`${i} customer dibuat...`);
      }
    }

    console.log('100 customer berhasil dibuat');

    // Buat 1000 item
    console.log('Membuat item...');
    for (let i = 0; i < 1000; i++) {
      const randomcustomer = customers[Math.floor(Math.random() * customers.length)];
      
      await prisma.item.create({
        data: {
          serialNumber: faker.string.alphanumeric(10).toUpperCase(),
          name: faker.commerce.productName(),
          partNumber: faker.string.alphanumeric(8).toUpperCase(),
          sensor: faker.helpers.arrayElement(['Temperature', 'Pressure', 'Humidity', 'Vibration', 'None']),
          description: faker.commerce.productDescription(),
          customerId: randomcustomer.id,
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
}

main()
  .catch((e) => {
    console.error('Error dalam eksekusi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });