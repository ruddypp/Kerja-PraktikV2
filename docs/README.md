# Paramata - Dokumentasi

Dokumentasi sistem aplikasi Paramata Inventory Management System.

## Sistem Utama

Paramata terdiri dari beberapa sistem utama:

1. [**Sistem Notifikasi**](./notification-system.md) - Pengelolaan notifikasi real-time untuk semua pengguna
2. **Sistem Inventaris** - Pengelolaan peralatan dan inventaris
3. **Sistem Kalibrasi** - Penjadwalan dan pelacakan kalibrasi peralatan
4. **Sistem Rental** - Pengelolaan peminjaman peralatan
5. **Sistem Maintenance** - Penjadwalan dan pelacakan maintenance peralatan

## Akses Berdasarkan Role

### Admin
- Akses penuh ke semua sistem
- Pengelolaan pengguna
- Pengaturan sistem
- Panel admin untuk notifikasi
- Analitik data

### Manager
- Akses ke sebagian besar fitur
- Persetujuan permintaan
- Laporan dan analitik
- Notifikasi terkait persetujuan
- Pengawasan inventaris

### User
- Akses terbatas sesuai kebutuhan
- Permintaan rental
- Melihat jadwal kalibrasi
- Menerima notifikasi pribadi
- Melaporkan masalah

## Integrasi UI

Semua sistem terintegrasi dalam antarmuka pengguna yang konsisten:

- **Sidebar** - Navigasi utama dengan menu berdasarkan role
- **Header** - Informasi pengguna dan dropdown notifikasi
- **Dashboard** - Ikhtisar data dan akses cepat ke fitur utama
- **Halaman Detail** - Tampilan dan pengelolaan data spesifik

## Pengembangan

Untuk kontribusi pengembangan:

1. Fork repositori
2. Buat branch fitur (`git checkout -b feature/amazing-feature`)
3. Commit perubahan (`git commit -m 'Add some amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## Kontak

Untuk informasi lebih lanjut, hubungi tim pengembangan Paramata. 