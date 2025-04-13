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

  // Buat Regular User
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

  // Buat Status
  const statuses = [
    // Item Status
    { type: 'item', name: 'Available' },
    { type: 'item', name: 'In Use' },
    { type: 'item', name: 'In Calibration' },
    { type: 'item', name: 'Maintenance' },
    { type: 'item', name: 'Rented' },
    { type: 'item', name: 'Damaged' },
    { type: 'item', name: 'Retired' },
    // Request Status
    { type: 'request', name: 'Pending' },
    { type: 'request', name: 'Approved' },
    { type: 'request', name: 'Rejected' },
    { type: 'request', name: 'Completed' },
    // Rental Status
    { type: 'rental', name: 'Active' },
    { type: 'rental', name: 'Returned' },
    { type: 'rental', name: 'Overdue' },
    // Calibration Status
    { type: 'calibration', name: 'Scheduled' },
    { type: 'calibration', name: 'In Progress' },
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

  // Buat Vendors
  const vendors = [
    {
      name: 'Teknokalibrasi',
      address: 'Jl. Kalibrasi No. 123, Jakarta',
      contactPerson: 'Andi Pratama',
      contactEmail: 'andi@teknokalibrasi.com',
      contactPhone: '081234567890',
      services: 'Kalibrasi alat ukur, elektronik, dan mekanik',
      rating: 4.8,
    },
    {
      name: 'Precisa Calibration',
      address: 'Jl. Industri Blok A5, Bandung',
      contactPerson: 'Budi Santoso',
      contactEmail: 'budi@precisacal.com',
      contactPhone: '087654321098',
      services: 'Kalibrasi peralatan laboratorium',
      rating: 4.5,
    },
    {
      name: 'MeterCal',
      address: 'Jl. Pemuda No. 45, Surabaya',
      contactPerson: 'Cindy Wijaya',
      contactEmail: 'cindy@metercal.id',
      contactPhone: '089876543210',
      services: 'Kalibrasi alat ukur industri dan laboratorium',
      rating: 4.7,
    },
  ];

  for (let i = 0; i < vendors.length; i++) {
    await prisma.vendor.upsert({
      where: { id: i + 1 },
      update: {},
      create: vendors[i],
    });
  }

  // Buat Document Types
  const documentTypes = [
    { name: 'Sertifikat Kalibrasi' },
    { name: 'Manual Penggunaan' },
    { name: 'Dokumen Rental' },
    { name: 'Laporan Kerusakan' },
    { name: 'Dokumen Inventarisasi' },
    { name: 'Dokumen Proyek' },
  ];

  for (let i = 0; i < documentTypes.length; i++) {
    await prisma.documentType.upsert({
      where: { id: i + 1 },
      update: {},
      create: documentTypes[i],
    });
  }

  // Buat Projects
  const projects = [
    {
      name: 'Proyek Inventarisasi Q2 2023',
      description: 'Inventarisasi peralatan kuartal 2 tahun 2023',
      startDate: new Date('2023-04-01'),
      endDate: new Date('2023-06-30'),
    },
    {
      name: 'Upgrade Peralatan Lab',
      description: 'Pembaruan dan kalibrasi peralatan laboratorium',
      startDate: new Date('2023-05-15'),
      endDate: new Date('2023-07-30'),
    },
    {
      name: 'Peminjaman Alat Survei',
      description: 'Manajemen peminjaman alat untuk survei lapangan',
      startDate: new Date('2023-06-01'),
      endDate: new Date('2023-08-31'),
    },
  ];

  for (let i = 0; i < projects.length; i++) {
    await prisma.project.upsert({
      where: { id: i + 1 },
      update: {},
      create: projects[i],
    });
  }

  // Buat Project Members
  const projectMembers = [
    { projectId: 1, userId: adminUser.id, role: 'owner' },
    { projectId: 1, userId: regularUser.id, role: 'viewer' },
    { projectId: 2, userId: adminUser.id, role: 'owner' },
    { projectId: 3, userId: regularUser.id, role: 'editor' },
    { projectId: 3, userId: adminUser.id, role: 'viewer' },
  ];

  for (const member of projectMembers) {
    await prisma.projectMember.create({
      data: member,
    });
  }

  // Buat Inventory Schedules
  const schedules = [
    {
      name: 'Inventarisasi Bulanan',
      description: 'Pemeriksaan inventaris rutin bulanan untuk barang elektronik',
      frequency: 'monthly',
      nextDate: new Date(new Date().setDate(new Date().getDate() + 30)),
    },
    {
      name: 'Inventarisasi Triwulanan',
      description: 'Pemeriksaan inventaris triwulanan untuk semua kategori barang',
      frequency: 'quarterly',
      nextDate: new Date(new Date().setDate(new Date().getDate() + 90)),
    },
    {
      name: 'Inventarisasi Tahunan',
      description: 'Pemeriksaan inventaris menyeluruh akhir tahun',
      frequency: 'yearly',
      nextDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    },
  ];

  for (let i = 0; i < schedules.length; i++) {
    await prisma.inventorySchedule.upsert({
      where: { id: i + 1 },
      update: {},
      create: schedules[i],
    });
  }

  // Add some example items
  const items = [
    {
      name: 'Multimeter Digital',
      categoryId: 1, // Electronic
      specification: 'Fluke 115 Compact True-RMS Digital Multimeter',
      serialNumber: 'FLK-115-2023-001',
      statusId: 1, // Available
      lastVerifiedDate: new Date(),
    },
    {
      name: 'Torque Wrench',
      categoryId: 2, // Mechanical
      specification: 'Precision Torque Wrench 10-100 Nm',
      serialNumber: 'TRQ-100-2023-002',
      statusId: 1, // Available
      lastVerifiedDate: new Date(),
    },
    {
      name: 'Microscope',
      categoryId: 3, // Laboratory
      specification: 'Digital Microscope 1000x Magnification',
      serialNumber: 'MIC-1000-2023-003',
      statusId: 2, // In Use
      lastVerifiedDate: new Date(),
    },
    {
      name: 'Safety Harness',
      categoryId: 4, // Safety
      specification: 'Full Body Safety Harness with Lanyard',
      serialNumber: 'SAF-002-2023-004',
      statusId: 1, // Available
      lastVerifiedDate: new Date(),
    },
  ];

  for (let i = 0; i < items.length; i++) {
    await prisma.item.upsert({
      where: { id: i + 1 },
      update: {},
      create: items[i],
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