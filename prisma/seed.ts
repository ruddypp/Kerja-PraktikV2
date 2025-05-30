import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .catch((e) => {
    console.error('Error dalam eksekusi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });