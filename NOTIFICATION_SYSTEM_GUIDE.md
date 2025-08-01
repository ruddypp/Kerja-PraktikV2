# 🔔 Sistem Notifikasi & Reminder - Panduan Lengkap

## 📋 **Ringkasan Perubahan**

Sistem notifikasi telah diperbaiki sesuai dengan alur yang Anda inginkan:

### ✅ **Yang Sudah Diperbaiki:**

1. **Alur User vs Admin** - Sekarang sesuai dengan kebutuhan
2. **Timing notifikasi** - H-30, H-7, H-1, H-0 sesuai tipe
3. **Pesan notifikasi** - Jelas, spesifik, dan informatif
4. **Toast notification** - Desain baru dengan urgency indicators
5. **Polling optimized** - 10 menit sekali untuk mengurangi beban server

---

## 🔄 **Alur Notifikasi Per Fitur**

### 1. **📅 SCHEDULES (Jadwal Pemeriksaan)**
```
User buat jadwal → Reminder masuk ke ADMIN
                ↓
            H-0: Notifikasi ke ADMIN + USER
                ↓
        Notifikasi 2x sehari sampai selesai
```

**Detail:**
- **Kapan reminder dibuat:** Saat user membuat jadwal
- **Siapa yang dapat reminder:** ADMIN
- **Kapan notifikasi muncul:** H-0 (hari H)
- **Siapa yang dapat notifikasi:** ADMIN + USER (yang buat jadwal)
- **Frekuensi:** 2x sehari sampai status berubah selesai

### 2. **🔬 CALIBRATION (Kalibrasi)**
```
User buat kalibrasi → Reminder masuk ke ADMIN
                   ↓
            Status COMPLETED → Countdown 365 hari
                   ↓
            H-30: Notifikasi ke ADMIN + USER
                   ↓
            Tombol "Kirim Email" tersedia
```

**Detail:**
- **Kapan reminder dibuat:** Setelah status COMPLETED
- **Siapa yang dapat reminder:** ADMIN
- **Countdown:** 365 hari dari tanggal kalibrasi
- **Kapan notifikasi muncul:** H-30 (30 hari sebelum berakhir)
- **Siapa yang dapat notifikasi:** ADMIN + USER (yang buat kalibrasi)
- **Fitur khusus:** Tombol kirim email ke customer

### 3. **🚚 RENTAL (Penyewaan)**
```
User buat rental → Reminder masuk ke ADMIN
                ↓
        H-7: Notifikasi ke ADMIN + USER
                ↓
        H-0: Notifikasi ke ADMIN + USER
```

**Detail:**
- **Kapan reminder dibuat:** Saat user membuat rental (status APPROVED)
- **Siapa yang dapat reminder:** ADMIN
- **Kapan notifikasi muncul:** H-7 dan H-0
- **Siapa yang dapat notifikasi:** ADMIN + USER (yang buat rental)
- **Tidak ada fitur email otomatis**

### 4. **🔧 MAINTENANCE (Pemeliharaan)**
```
User buat maintenance → Reminder masuk ke ADMIN
                     ↓
            H-7: Notifikasi ke ADMIN + USER
                     ↓
            H-0: Notifikasi ke ADMIN + USER
```

**Detail:**
- **Kapan reminder dibuat:** Saat user membuat maintenance
- **Siapa yang dapat reminder:** ADMIN
- **Kapan notifikasi muncul:** H-7 dan H-0
- **Siapa yang dapat notifikasi:** ADMIN + USER (yang buat maintenance)
- **Tidak ada fitur email otomatis**

---

## 🎨 **Format Notifikasi Baru**

### **Toast Notification**
Sekarang toast notification memiliki:

1. **Urgency Indicators:**
   - 💥 **OVERDUE** - Merah (terlambat)
   - 🔥 **H-0** - Orange (jatuh tempo hari ini)
   - ⚠️ **H-1** - Kuning (besok)
   - 🔔 **H-7** - Biru (7 hari lagi)
   - 📅 **H-30** - Indigo (30 hari lagi)

2. **Informasi Lengkap:**
   - Judul jelas dengan nama item
   - Pesan spesifik dengan tindakan yang harus dilakukan
   - Metadata (tipe, urgency, role)
   - Tombol aksi yang relevan

3. **Durasi Berdasarkan Urgency:**
   - Overdue: 20 detik
   - H-0: 15 detik
   - Lainnya: 12 detik

### **Bell Icon**
- Badge count menunjukkan jumlah notifikasi belum dibaca
- Dropdown menampilkan notifikasi terprioritasi
- Sorting berdasarkan urgency dan tanggal

### **Halaman Notifikasi**
- Filter berdasarkan tipe (Calibration, Rental, Maintenance, Schedule)
- Informasi konteks (siapa yang buat request)
- Status dan deadline yang jelas

---

## 📝 **Contoh Pesan Notifikasi**

### **Calibration H-30:**
```
🔔 Kalibrasi Akan Berakhir: Timbangan Digital ABC
Kalibrasi untuk Timbangan Digital ABC (SN: TIM001) untuk PT. Maju Jaya akan berakhir dalam 30 hari. Segera kirim email ke pelanggan untuk penjadwalan ulang kalibrasi.
```

### **Rental H-7:**
```
⚠️ Rental Akan Berakhir: Mikroskop XYZ - 7 Hari Lagi
Rental Mikroskop XYZ (SN: MIK002) untuk CV. Berkah akan berakhir dalam 7 hari. Segera hubungi pelanggan untuk pengembalian rental.
```

### **Maintenance Overdue:**
```
💥 Maintenance: Centrifuge DEF - Terlambat 3 Hari
Centrifuge DEF (SN: CEN003) sudah terlambat 3 hari. SEGERA TINDAK LANJUTI! Segera lakukan pemeriksaan maintenance rutin.
```

### **Schedule H-0:**
```
🔥 Jadwal Pemeriksaan: Inventaris Bulanan - Jatuh Tempo Hari Ini
Pemeriksaan inventaris "Inventaris Bulanan" jatuh tempo hari ini. Segera lakukan pemeriksaan inventaris sesuai jadwal.
```

---

## ⚙️ **Optimasi Performa**

### **Polling Frequency:**
- **Sebelum:** 45 detik = 80 request/jam
- **Sesudah:** 10 menit = 6 request/jam
- **Pengurangan:** 87% lebih ringan

### **Smart Polling:**
- Hanya polling saat tab aktif/visible
- Rate limiting untuk mencegah spam
- Deduplication otomatis untuk notifikasi

### **Caching & Performance:**
- Background deletion untuk duplikasi
- Optimized database queries
- Enhanced error handling

---

## 🔧 **File yang Dimodifikasi**

### **Core Files:**
1. `src/lib/reminder-service.ts` - Logic reminder yang diperbaiki
2. `src/lib/notification-service.ts` - Service notifikasi yang enhanced
3. `src/app/context/NotificationContext.tsx` - Context dengan toast baru
4. `src/components/NotificationBell.tsx` - Bell component yang dioptimasi

### **Backup Files:**
- `src/lib/reminder-service-backup.ts`
- `src/lib/notification-service-backup.ts`
- `src/app/context/NotificationContext-backup.tsx`
- `src/components/NotificationBell-backup.tsx`

---

## 🚀 **Cara Testing**

### **1. Test Alur Calibration:**
```bash
1. User buat kalibrasi baru
2. Admin ubah status ke COMPLETED
3. Cek reminder masuk ke admin (due date 365 hari dari sekarang)
4. Ubah due date ke hari ini untuk test notifikasi
5. Jalankan cron: GET /api/cron/reminders?force=true
6. Cek notifikasi muncul di admin dan user
```

### **2. Test Alur Rental:**
```bash
1. User buat rental baru
2. Admin approve rental
3. Cek reminder masuk ke admin (due date sesuai end date rental)
4. Ubah due date ke 7 hari dari sekarang untuk test H-7
5. Jalankan cron dan cek notifikasi
```

### **3. Test Toast Notification:**
```bash
1. Buat notifikasi dengan berbagai urgency level
2. Cek tampilan toast dengan warna dan icon yang berbeda
3. Test tombol "Lihat Detail" dan "Tutup"
4. Cek durasi toast sesuai urgency
```

---

## 📊 **Monitoring & Debugging**

### **Console Logs:**
Sistem sekarang memiliki logging yang lebih baik:
```
🔍 Checking due reminders for date: 2024-01-15
📋 Found 5 reminders to process
🔄 Processing reminder abc123, type: CALIBRATION, days remaining: 0
✅ Created admin notification def456 for Admin User
✅ Created user notification ghi789 for original user
🎯 Processed 5 reminders, created 3 notification sets
```

### **API Endpoints untuk Debug:**
- `GET /api/cron/reminders?force=true` - Force check reminders
- `GET /api/admin/notifications` - Get admin notifications
- `GET /api/user/notifications` - Get user notifications
- `GET /api/user/notifications?overdueOnly=true` - Get overdue only

---

## ✅ **Checklist Implementasi**

- [x] Alur user → admin reminder
- [x] Notifikasi ke admin + user saat deadline
- [x] Pesan jelas dan spesifik
- [x] Toast notification dengan urgency indicators
- [x] Polling optimized (10 menit)
- [x] Deduplication notifikasi
- [x] Enhanced error handling
- [x] Comprehensive logging
- [x] Backup files tersimpan
- [x] Documentation lengkap

---

## 🎯 **Hasil Akhir**

Sistem notifikasi sekarang:

1. ✅ **Sesuai alur yang diinginkan** - User buat → Admin dapat reminder → Deadline → Notifikasi ke keduanya
2. ✅ **Pesan jelas dan informatif** - Tidak ada lagi "Reminder masuk" yang ambigu
3. ✅ **Toast notification yang menarik** - Dengan urgency indicators dan informasi lengkap
4. ✅ **Performa optimal** - 87% pengurangan beban server
5. ✅ **Tidak ada duplikasi** - Smart deduplication system
6. ✅ **Easy to maintain** - Code yang bersih dengan logging yang baik

**Restart aplikasi Anda dan sistem notifikasi baru siap digunakan!** 🚀