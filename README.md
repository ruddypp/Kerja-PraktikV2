# Paramata

## 1. Overview Sistem

Paramata adalah aplikasi manajemen inventaris komprehensif yang dirancang untuk membantu perusahaan mengelola peralatan, kalibrasi, pemeliharaan, dan penyewaan dengan sistem notifikasi terintegrasi. Sistem ini memudahkan pelacakan status peralatan secara real-time, menjadwalkan kalibrasi dan pemeliharaan, serta mengelola proses penyewaan dengan efisien.

Aplikasi ini dikembangkan untuk meningkatkan efisiensi operasional dengan:
- Meminimalkan waktu pencarian peralatan
- Memastikan kepatuhan jadwal kalibrasi
- Mempercepat proses pemeliharaan
- Mengoptimalkan penggunaan aset melalui sistem penyewaan
- Memberikan notifikasi otomatis untuk tindakan yang diperlukan

## 2. Nama Sistem

**Paramata** berasal dari kata "parameter" dan "data", mencerminkan fokus sistem pada pengelolaan parameter dan data peralatan secara komprehensif. Nama ini mewakili kemampuan sistem untuk mengukur, memantau, dan mengelola berbagai parameter peralatan teknis dalam satu platform terpadu.

## 3. Fitur Sistem

### 3.1 Manajemen Inventaris
- **Pelacakan Peralatan**: Sistem pencatatan lengkap untuk semua peralatan dengan nomor seri, nomor part, dan detail lainnya
- **Status Peralatan**: Pelacakan status peralatan (tersedia, dalam kalibrasi, disewa, dalam pemeliharaan)
- **Riwayat Peralatan**: Pencatatan lengkap riwayat penggunaan, kalibrasi, dan pemeliharaan
- **Pemeriksaan Inventaris**: Jadwal pemeriksaan berkala dengan dukungan jadwal berulang

### 3.2 Sistem Kalibrasi
- **Penjadwalan Kalibrasi**: Manajemen jadwal kalibrasi untuk semua peralatan
- **Sertifikat Kalibrasi**: Pembuatan dan penyimpanan sertifikat kalibrasi dengan nomor sertifikat otomatis
- **Pengingat Kalibrasi**: Notifikasi otomatis untuk kalibrasi yang akan jatuh tempo (H-30, H-7, H-1)
- **Vendor Kalibrasi**: Integrasi dengan data vendor untuk layanan kalibrasi eksternal

### 3.3 Manajemen Pemeliharaan
- **Permintaan Pemeliharaan**: Sistem untuk mengajukan dan melacak permintaan pemeliharaan
- **Laporan Layanan**: Pembuatan laporan layanan pelanggan (Customer Service Report)
- **Laporan Teknis**: Pembuatan laporan teknis dengan detail perbaikan dan suku cadang
- **Dokumentasi Visual**: Dukungan untuk foto sebelum dan sesudah pemeliharaan

### 3.4 Sistem Penyewaan
- **Permintaan Penyewaan**: Proses pengajuan dan persetujuan penyewaan peralatan
- **Pelacakan Status**: Manajemen status penyewaan (menunggu, disetujui, ditolak, selesai)
- **Pengingat Pengembalian**: Notifikasi otomatis untuk penyewaan yang akan jatuh tempo
- **Pencatatan Kondisi**: Dokumentasi kondisi peralatan saat dipinjam dan dikembalikan

### 3.5 Sistem Notifikasi
- **Real-time Notifications**: Polling otomatis setiap 30 detik menggunakan SWR
- **Preferensi Notifikasi**: Pengaturan per pengguna untuk jenis notifikasi
- **Panel Admin**: Halaman khusus untuk manajemen notifikasi
- **Analitik Notifikasi**: Dashboard statistik penggunaan notifikasi
- **Integrasi UI**: Badge counter di sidebar navigasi dan dropdown notifikasi di header

## 4. Role Sistem

Paramata memiliki tiga peran utama dengan tingkat akses dan kemampuan yang berbeda:

### 4.1 Admin
- Akses penuh ke semua fitur sistem
- Manajemen pengguna (tambah, edit, hapus)
- Konfigurasi sistem dan pengaturan global
- Melihat dan mengekspor laporan lengkap
- Mengelola vendor dan data master
- Menyetujui permintaan penyewaan dan pemeliharaan
- Mengatur jadwal kalibrasi dan pemeriksaan inventaris

### 4.2 Manager
- Melihat dashboard dan laporan analitik
- Menyetujui permintaan penyewaan dan pemeliharaan
- Melihat status inventaris dan riwayat peralatan
- Mengakses laporan kalibrasi dan pemeliharaan
- Melihat notifikasi sistem dan mengatur preferensi
- Mengelola jadwal pemeriksaan inventaris

### 4.3 User
- Mengajukan permintaan penyewaan peralatan
- Mengajukan permintaan pemeliharaan
- Melihat status peralatan yang tersedia
- Melihat riwayat penyewaan pribadi
- Menerima notifikasi terkait permintaan dan jadwal
- Mengakses dokumentasi peralatan

## 5. Techstack yang Digunakan

Paramata dibangun menggunakan teknologi modern untuk memastikan performa, skalabilitas, dan pengalaman pengguna yang optimal:

### 5.1 Frontend
- **Next.js**: Framework React dengan rendering sisi server
- **React**: Library JavaScript untuk membangun antarmuka pengguna
- **Tailwind CSS**: Framework CSS utility-first untuk desain responsif
- **SWR**: Library React Hooks untuk data fetching dan caching
- **Chart.js & React-Chartjs-2**: Visualisasi data interaktif
- **jsPDF**: Pembuatan dokumen PDF di sisi klien

### 5.2 Backend
- **Next.js API Routes**: API endpoints berbasis serverless
- **NextAuth.js**: Solusi autentikasi lengkap
- **Prisma ORM**: ORM modern untuk TypeScript dan Node.js
- **PDFKit**: Pembuatan PDF kompleks di sisi server

### 5.3 Database
- **PostgreSQL**: Database relasional untuk penyimpanan data utama

### 5.4 DevOps
- **Vercel**: Platform deployment untuk aplikasi Next.js
- **GitHub Actions**: CI/CD dan otomatisasi

## 6. Persyaratan Sistem

- Node.js (v18 atau lebih baru)
- npm (v9 atau lebih baru)
- PostgreSQL database
- Browser modern (Chrome, Firefox, Edge, Safari)
- Minimal RAM 4GB untuk pengembangan

## 7. Instalasi dan Pengaturan

### 7.1 Instalasi Dasar

1. Clone repositori:
   ```bash
   git clone <repository-url>
   cd paramata
   ```

2. Instal dependensi:
   ```bash
   npm install
   ```

3. Siapkan variabel lingkungan:
   ```bash
   cp .env.example .env
   # Edit file .env dengan detail koneksi database Anda
   ```

4. Jalankan migrasi database:
   ```bash
   npx prisma migrate deploy
   ```

5. Isi database dengan data awal (opsional):
   ```bash
   npm run seed
   ```

### 7.2 Menjalankan Aplikasi

#### Mode Pengembangan

Jalankan server pengembangan:

```bash
npm run dev
# atau
yarn dev
# atau
pnpm dev
# atau
bun dev
```

Buka [http://localhost:3000](http://localhost:3000) dengan browser Anda untuk melihat hasilnya.

#### Mode Produksi

Untuk build produksi:

```bash
npm run build
npm start
```

## 8. Struktur Kode

```
src/
├── app/
│   ├── context/
│   │   ├── NotificationContext.tsx    # Context provider notifikasi
│   │   └── UserContext.tsx            # Context provider pengguna
│   ├── api/
│   │   ├── notifications/             # API routes pengguna
│   │   ├── admin/                     # API routes admin
│   │   ├── manager/                   # API routes manager
│   │   ├── user/                      # API routes user biasa
│   │   ├── auth/                      # API routes autentikasi
│   │   └── cron/                      # API routes untuk cron job
│   ├── admin/                         # Halaman admin
│   ├── manager/                       # Halaman manager
│   └── user/                          # Halaman user biasa
├── components/
│   ├── DashboardLayout.tsx            # Layout dengan header notifikasi
│   ├── DashboardNavigation.tsx        # Navigasi dengan badge
│   └── ui/                            # Komponen UI reusable
├── lib/
│   ├── db.ts                          # Konfigurasi database
│   ├── auth.ts                        # Konfigurasi autentikasi
│   └── utils/                         # Utilitas dan helper
└── docs/
    └── notification-system.md         # Dokumentasi
```

## 9. Deployment

### 9.1 Deployment di Vercel

Cara termudah untuk men-deploy aplikasi Next.js Anda adalah menggunakan [Platform Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) dari pembuat Next.js.

### 9.2 Deployment di Linux

Untuk menjalankan aplikasi di server Linux, lihat panduan [LINUX_SETUP.md](./LINUX_SETUP.md) untuk instruksi detail.

## 10. Variabel Lingkungan

Berikut adalah variabel lingkungan yang diperlukan:

```
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/paramata?schema=public"

# NextAuth
NEXTAUTH_SECRET="kunci-rahasia-yang-aman"
NEXTAUTH_URL="http://localhost:3000"

# JWT
JWT_SECRET="kunci-jwt-yang-aman"

# Cron Jobs
CRON_API_KEY="kunci-api-cron-yang-aman"

# Email (opsional)
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="user@example.com"
EMAIL_SERVER_PASSWORD="password"
EMAIL_FROM="noreply@example.com"
```

## 11. Dukungan dan Kontribusi

Untuk pertanyaan, dukungan, atau kontribusi, silakan hubungi tim pengembang melalui:
- Email: support@paramata.com
- GitHub Issues: [github.com/paramata/issues](https://github.com/paramata/issues)
- Dokumentasi: [docs.paramata.com](https://docs.paramata.com)

## 12. Lisensi

Paramata dilisensikan di bawah [MIT License](./LICENSE).
