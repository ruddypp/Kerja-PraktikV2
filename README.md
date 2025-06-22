# Paramata - Sistem Manajemen Inventaris

Paramata adalah aplikasi manajemen inventaris komprehensif yang dibangun menggunakan [Next.js](https://nextjs.org) dan diinisialisasi dengan [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). Aplikasi ini dirancang untuk mengelola inventaris peralatan, kalibrasi, pemeliharaan, dan penyewaan dengan sistem notifikasi terintegrasi.

## Persyaratan Sistem

- Node.js (v18 atau lebih baru)
- npm (v9 atau lebih baru)
- PostgreSQL database
- Browser modern (Chrome, Firefox, Edge, Safari)
- Minimal RAM 4GB untuk pengembangan

## Instalasi dan Pengaturan

### Instalasi Dasar

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

6. Siapkan aset statis:
   ```bash
   npm run setup-assets
   ```

### Menjalankan Aplikasi

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

## Fitur Utama

Paramata memiliki beberapa fitur utama yang komprehensif:

### 1. Manajemen Inventaris

- **Pelacakan Peralatan**: Sistem pencatatan lengkap untuk semua peralatan dengan nomor seri, nomor part, dan detail lainnya
- **Status Peralatan**: Pelacakan status peralatan (tersedia, dalam kalibrasi, disewa, dalam pemeliharaan)
- **Riwayat Peralatan**: Pencatatan lengkap riwayat penggunaan, kalibrasi, dan pemeliharaan
- **Pemeriksaan Inventaris**: Jadwal pemeriksaan berkala dengan dukungan jadwal berulang

### 2. Sistem Kalibrasi

- **Penjadwalan Kalibrasi**: Manajemen jadwal kalibrasi untuk semua peralatan
- **Sertifikat Kalibrasi**: Pembuatan dan penyimpanan sertifikat kalibrasi dengan nomor sertifikat otomatis
- **Pengingat Kalibrasi**: Notifikasi otomatis untuk kalibrasi yang akan jatuh tempo (H-30, H-7, H-1)
- **Vendor Kalibrasi**: Integrasi dengan data vendor untuk layanan kalibrasi eksternal

### 3. Manajemen Pemeliharaan

- **Permintaan Pemeliharaan**: Sistem untuk mengajukan dan melacak permintaan pemeliharaan
- **Laporan Layanan**: Pembuatan laporan layanan pelanggan (Customer Service Report)
- **Laporan Teknis**: Pembuatan laporan teknis dengan detail perbaikan dan suku cadang
- **Dokumentasi Visual**: Dukungan untuk foto sebelum dan sesudah pemeliharaan

### 4. Sistem Penyewaan

- **Permintaan Penyewaan**: Proses pengajuan dan persetujuan penyewaan peralatan
- **Pelacakan Status**: Manajemen status penyewaan (menunggu, disetujui, ditolak, selesai)
- **Pengingat Pengembalian**: Notifikasi otomatis untuk penyewaan yang akan jatuh tempo
- **Pencatatan Kondisi**: Dokumentasi kondisi peralatan saat dipinjam dan dikembalikan

### 5. Sistem Notifikasi

Paramata memiliki sistem notifikasi komprehensif yang memberikan informasi real-time kepada pengguna.

#### Arsitektur Sistem Notifikasi

Sistem notifikasi dibangun dengan pendekatan client-side real-time menggunakan SWR (Stale-While-Revalidate) untuk polling efisien. Komponen utama sistem ini meliputi:

1. **NotificationContext** - Context provider React untuk mengelola state notifikasi
2. **NotificationDropdown** - UI komponen untuk menampilkan notifikasi di header
3. **Badge Counter** - Indikator jumlah notifikasi belum dibaca di menu navigasi
4. **Panel Admin** - Panel khusus untuk admin mengelola notifikasi

#### Fitur Notifikasi

- **Real-time Notifications** - Polling otomatis setiap 30 detik menggunakan SWR
- **Preferensi Notifikasi** - Pengaturan per pengguna untuk jenis notifikasi
- **Panel Admin** - Halaman `/admin/notifications` untuk manajemen notifikasi
- **Analitik Notifikasi** - Dashboard statistik penggunaan notifikasi
- **Integrasi UI** - Badge counter di sidebar navigasi dan dropdown notifikasi di header

#### Jenis Notifikasi

| Tipe | Deskripsi | 
|------|-----------|
| GENERAL_INFO | Informasi umum sistem |
| RENTAL_REQUEST | Permintaan rental baru |
| RENTAL_STATUS_CHANGE | Perubahan status rental |
| CALIBRATION_REMINDER | Pengingat kalibrasi |
| CALIBRATION_STATUS_CHANGE | Perubahan status kalibrasi |
| RENTAL_DUE_REMINDER | Pengingat jatuh tempo rental |
| MAINTENANCE_REMINDER | Pengingat maintenance |
| INVENTORY_SCHEDULE | Jadwal inventarisasi |

#### API Endpoint Notifikasi

##### Endpoint Pengguna
- `GET /api/notifications` - Mendapatkan notifikasi untuk pengguna saat ini
- `PUT /api/notifications/:id/read` - Menandai notifikasi sebagai dibaca
- `PUT /api/notifications/read-all` - Menandai semua notifikasi sebagai dibaca
- `GET /api/notifications/preferences` - Mendapatkan preferensi notifikasi
- `PUT /api/notifications/preferences` - Memperbarui preferensi notifikasi

##### Endpoint Admin
- `GET /api/admin/notifications` - Mendapatkan semua notifikasi (dengan filter)
- `POST /api/admin/notifications` - Membuat notifikasi baru
- `GET /api/admin/notifications/stats` - Mendapatkan statistik notifikasi

### 6. Jadwal Berulang

Sistem ini mendukung jadwal inventaris berulang yang dapat diatur untuk diulang bulanan atau tahunan. Jadwal ini akan secara otomatis mengirimkan notifikasi kepada pengguna saat jadwal tersebut jatuh tempo.

#### Mengatur Cron Job

Untuk memastikan jadwal berulang berfungsi dengan baik, Anda perlu mengatur cron job untuk menjalankan pemroses jadwal. Ini dapat dilakukan menggunakan layanan cron seperti cron-job.org, GitHub Actions, atau skrip sederhana di server Anda.

##### Menggunakan Layanan Cron

Atur cron job untuk memanggil endpoint berikut setiap hari:

```
https://domain-anda.com/api/cron/inventory-schedules?key=KUNCI_API_CRON_ANDA
```

Anda harus mengatur variabel lingkungan `CRON_API_KEY` di file `.env` Anda untuk keamanan:

```
CRON_API_KEY=kunci-acak-aman-anda
```

##### Pengujian Pengembangan Lokal

Untuk menguji jadwal berulang secara lokal, Anda dapat memicu cron job secara manual dengan mengunjungi:

```
http://localhost:3000/api/cron/inventory-schedules?key=KUNCI_API_CRON_ANDA
```

Ini akan memproses semua jadwal berulang yang jatuh tempo, memperbarui tanggal kejadian berikutnya, dan mengirimkan notifikasi kepada pengguna.

#### Pengingat Notifikasi

Sistem juga memiliki cron job untuk pengingat notifikasi yang akan:

1. Memproses pengingat kalibrasi (H-30, H-7, H-1)
2. Memproses pengingat jatuh tempo penyewaan
3. Memproses pengingat jadwal inventaris

Cron job ini dapat diatur untuk memanggil:

```
https://domain-anda.com/api/cron/notification-reminders
```

## Struktur Database

Paramata menggunakan PostgreSQL dengan Prisma ORM. Berikut adalah model-model utama dalam database:

### Model Utama

- **User**: Pengguna sistem dengan peran ADMIN, MANAGER, atau USER
- **Item**: Peralatan yang dikelola dengan nomor seri unik
- **Rental**: Catatan penyewaan peralatan
- **Calibration**: Catatan kalibrasi peralatan
- **Maintenance**: Catatan pemeliharaan peralatan
- **Vendor**: Data vendor untuk kalibrasi dan pemeliharaan
- **InventoryCheck**: Jadwal pemeriksaan inventaris
- **Notification**: Notifikasi pengguna

### Relasi Utama

- Setiap Item dapat memiliki banyak Rental, Calibration, dan Maintenance
- Setiap User dapat memiliki banyak Rental, Calibration, dan Maintenance
- Setiap Notification terkait dengan satu User
- Setiap User memiliki satu NotificationPreference

## Teknologi yang Digunakan

Paramata dibangun menggunakan teknologi modern:

- **Frontend**: Next.js, React, Tailwind CSS, SWR
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL dengan Prisma ORM
- **Autentikasi**: NextAuth.js
- **PDF Generation**: PDFKit, jsPDF
- **Visualisasi Data**: Chart.js, React-Chartjs-2

## Struktur Kode

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

## Deployment

### Deployment di Vercel

Cara termudah untuk men-deploy aplikasi Next.js Anda adalah menggunakan [Platform Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) dari pembuat Next.js.

Lihat [dokumentasi deployment Next.js](https://nextjs.org/docs/app/building-your-application/deploying) untuk informasi lebih lanjut.

### Deployment di Linux

Untuk menjalankan aplikasi di server Linux, lihat panduan [LINUX_SETUP.md](./LINUX_SETUP.md) untuk instruksi detail.

## Variabel Lingkungan

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

## Sumber Daya Tambahan

Untuk mempelajari lebih lanjut tentang Next.js, lihat sumber daya berikut:

- [Dokumentasi Next.js](https://nextjs.org/docs) - pelajari tentang fitur dan API Next.js.
- [Belajar Next.js](https://nextjs.org/learn) - tutorial interaktif Next.js.

Anda dapat memeriksa [repositori GitHub Next.js](https://github.com/vercel/next.js) - umpan balik dan kontribusi Anda disambut!
