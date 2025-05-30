# Sistem Notifikasi Paramata

Dokumen ini menjelaskan sistem notifikasi yang diimplementasikan dalam aplikasi Paramata Inventory Management System.

## Arsitektur Sistem

Sistem notifikasi dibangun dengan pendekatan client-side real-time menggunakan SWR (Stale-While-Revalidate) untuk polling efisien. Komponen utama sistem ini meliputi:

1. **NotificationContext** - Context provider React untuk mengelola state notifikasi
2. **NotificationDropdown** - UI komponen untuk menampilkan notifikasi di header
3. **Badge Counter** - Indikator jumlah notifikasi belum dibaca di menu navigasi
4. **Admin Panel** - Panel khusus untuk admin mengelola notifikasi

## Fitur Utama

### 1. Real-time Notifications
- Polling otomatis setiap 30 detik menggunakan SWR
- Deduplikasi permintaan dalam interval 5 detik
- Optimistic UI updates untuk responsivitas cepat

### 2. Preferensi Notifikasi
- Pengaturan per pengguna untuk jenis notifikasi
- Opsi untuk aktivasi/deaktivasi notifikasi email
- Dukungan untuk push notifications browser (opt-in)

### 3. Panel Admin
- Halaman `/admin/notifications` untuk manajemen notifikasi
- Kemampuan mengirim notifikasi ke pengguna/role tertentu
- Fitur filter dan pencarian notifikasi
- Hapus notifikasi individual atau massal

### 4. Analitik Notifikasi
- Dashboard statistik penggunaan notifikasi
- Metrik tentang tingkat keterlibatan pengguna
- Tren dan distribusi notifikasi berdasarkan jenis

### 5. Integrasi UI
- Badge counter di sidebar navigasi
- Dropdown notifikasi di header aplikasi
- Card notifikasi di dashboard admin
- Halaman notifikasi lengkap untuk setiap role

## Jenis Notifikasi

| Tipe | Deskripsi | Ikon |
|------|-----------|------|
| GENERAL_INFO | Informasi umum sistem | Informasi |
| RENTAL_REQUEST | Permintaan rental baru | Tas |
| RENTAL_STATUS_CHANGE | Perubahan status rental | Tas |
| CALIBRATION_REMINDER | Pengingat kalibrasi | Pengaturan |
| CALIBRATION_STATUS_CHANGE | Perubahan status kalibrasi | Pengaturan |
| RENTAL_DUE_REMINDER | Pengingat jatuh tempo rental | Tas |
| MAINTENANCE_REMINDER | Pengingat maintenance | Alat |
| INVENTORY_SCHEDULE | Jadwal inventarisasi | Dokumen |

## API Endpoints

### Endpoint Pengguna
- `GET /api/notifications` - Mendapatkan notifikasi untuk pengguna saat ini
- `PUT /api/notifications/:id/read` - Menandai notifikasi sebagai dibaca
- `PUT /api/notifications/read-all` - Menandai semua notifikasi sebagai dibaca
- `DELETE /api/notifications/:id` - Menghapus notifikasi tertentu
- `DELETE /api/notifications` - Menghapus semua notifikasi pengguna
- `GET /api/notifications/preferences` - Mendapatkan preferensi notifikasi
- `PUT /api/notifications/preferences` - Memperbarui preferensi notifikasi

### Endpoint Admin
- `GET /api/admin/notifications` - Mendapatkan semua notifikasi (dengan filter)
- `POST /api/admin/notifications` - Membuat notifikasi baru
- `DELETE /api/admin/notifications` - Menghapus notifikasi terfilter
- `GET /api/admin/notifications/stats` - Mendapatkan statistik notifikasi

## Struktur Kode

```
src/
├── app/
│   ├── context/
│   │   └── NotificationContext.tsx    # Context provider
│   ├── api/
│   │   ├── notifications/             # API routes pengguna
│   │   └── admin/notifications/       # API routes admin
│   └── admin/
│       └── notifications/             # Halaman admin
├── components/
│   ├── DashboardLayout.tsx            # Layout dengan header notifikasi
│   ├── DashboardNavigation.tsx        # Navigasi dengan badge
│   ├── Sidebar.tsx                    # Sidebar dengan menu notifikasi
│   └── ui/
│       └── NotificationDropdown.tsx   # Dropdown notifikasi
└── docs/
    └── notification-system.md         # Dokumentasi
```

## Integrasi dengan Role Pengguna

### Admin
- Akses ke panel admin notifikasi
- Kemampuan mengirim notifikasi ke pengguna lain
- Analitik dan statistik notifikasi
- Dokumentasi sistem notifikasi

### Manager
- Akses ke halaman notifikasi pribadi
- Pengelolaan preferensi notifikasi
- Notifikasi tentang persetujuan dan pengawasan

### User
- Akses ke notifikasi pribadi
- Pengelolaan preferensi notifikasi
- Notifikasi tentang tugas dan informasi terkait

## Optimasi Performa

Sistem ini dioptimalkan untuk performa dengan:

1. **SWR Caching** - Meminimalkan permintaan berlebihan ke server
2. **Deduplikasi** - Mencegah multiple API calls dalam interval pendek
3. **Refreshing Interval** - Polling setiap 30 detik untuk keseimbangan real-time dan performa
4. **Optimistic Updates** - UI diperbarui sebelum permintaan selesai untuk responsivitas

## Keamanan

1. Validasi permintaan di sisi server
2. Pemeriksaan otorisasi berbasis role
3. Sanitasi input untuk mencegah injeksi
4. Perlindungan CSRF untuk semua permintaan

## Pengembangan di Masa Depan

- Implementasi WebSockets untuk notifikasi real-time tanpa polling
- Dukungan untuk notifikasi di perangkat seluler
- Sistem templating notifikasi yang dapat dikonfigurasi
- Integrasi dengan layanan notifikasi eksternal (SMS, WhatsApp) 