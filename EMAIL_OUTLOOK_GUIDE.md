# 📧 Email Integration: Gmail → Outlook

## 🔄 **Perubahan yang Dilakukan**

### ✅ **Sebelum (Gmail):**
```typescript
// URL Gmail
const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(customer.contactEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
```

### ✅ **Sesudah (Outlook):**
```typescript
// URL Outlook
const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(customer.contactEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
```

---

## 🎯 **Fitur Email Kalibrasi**

### **Lokasi:** `http://localhost:3000/admin/reminders`

### **Cara Kerja:**
1. **Admin melihat reminder kalibrasi** yang akan jatuh tempo
2. **Click tombol "Kirim Email (Outlook)"** pada reminder kalibrasi
3. **Outlook web terbuka** dengan email template yang sudah terisi
4. **Admin tinggal review dan kirim** email ke customer

### **Template Email yang Dibuat:**
```
Subject: Pengingat Kalibrasi: [Nama Item] ([Serial Number])

Body:
Yth. [Customer Name],

Kami ingin mengingatkan bahwa kalibrasi untuk peralatan [Item Name] 
(Nomor Seri: [Serial Number]) akan jatuh tempo pada [Due Date].

Mohon hubungi kami untuk menjadwalkan layanan kalibrasi.

Detail Peralatan:
- Nama: [Item Name]
- Nomor Seri: [Serial Number]  
- Nomor Part: [Part Number]
- Sensor: [Sensor Info] (jika ada)

Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.

Salam hormat,
Tim Paramata
```

---

## 🔗 **URL Schemes Comparison**

### **Gmail URL Scheme:**
```
https://mail.google.com/mail/?view=cm&fs=1&to=EMAIL&su=SUBJECT&body=BODY
```

### **Outlook URL Scheme:**
```
https://outlook.live.com/mail/0/deeplink/compose?to=EMAIL&subject=SUBJECT&body=BODY
```

### **Parameter Mapping:**
| Gmail | Outlook | Description |
|-------|---------|-------------|
| `to=` | `to=` | Recipient email |
| `su=` | `subject=` | Email subject |
| `body=` | `body=` | Email body |

---

## 🎨 **UI Changes**

### **Button Text Update:**
```typescript
// SEBELUM:
"Kirim Email"

// SESUDAH:  
"Kirim Email (Outlook)"
```

### **Button Color:**
```typescript
// Warna biru untuk Outlook
className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md text-xs"
```

---

## 🔧 **Technical Details**

### **Function: `getEmailLink()`**
- **Input:** Reminder object dengan data kalibrasi
- **Output:** Outlook compose URL dengan template email
- **Validation:** Hanya untuk reminder type 'CALIBRATION' dengan customer email

### **Data yang Digunakan:**
```typescript
const calibration = reminder.calibration;
const customer = calibration.customer;
const itemName = calibration.item?.name;
const serialNumber = calibration.item?.serialNumber;
const partNumber = calibration.item?.partNumber;
const sensorInfo = calibration.item?.sensor;
const dueDate = calibration.validUntil || calibration.calibrationDate;
```

### **URL Encoding:**
```typescript
// Semua parameter di-encode untuk keamanan
to=${encodeURIComponent(customer.contactEmail)}
subject=${encodeURIComponent(subject)}
body=${encodeURIComponent(body)}
```

---

## 🌐 **Browser Compatibility**

### **Outlook Web Support:**
- ✅ **Chrome** - Full support
- ✅ **Firefox** - Full support  
- ✅ **Edge** - Full support
- ✅ **Safari** - Full support

### **Fallback Options:**
Jika Outlook tidak tersedia, user bisa:
1. **Copy email content** dari template
2. **Manual compose** di email client pilihan
3. **Use default email client** dengan `mailto:` scheme

---

## 🚀 **Testing Guide**

### **Test Scenario 1: Normal Flow**
1. Buka `http://localhost:3000/admin/reminders`
2. Cari reminder kalibrasi yang memiliki customer email
3. Click "Kirim Email (Outlook)"
4. Verify Outlook web terbuka dengan template terisi

### **Test Scenario 2: Missing Email**
1. Reminder kalibrasi tanpa customer email
2. Verify tombol email tidak muncul

### **Test Scenario 3: Non-Calibration**
1. Reminder rental/maintenance/schedule
2. Verify tombol email tidak muncul

---

## 📱 **Mobile Considerations**

### **Mobile Outlook:**
- URL akan redirect ke Outlook mobile app jika terinstall
- Jika tidak ada app, akan buka Outlook web mobile

### **Alternative Mobile Flow:**
```typescript
// Bisa ditambahkan deteksi mobile untuk mailto fallback
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
  // Use mailto: scheme for better mobile experience
  const mailtoUrl = `mailto:${customer.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return mailtoUrl;
}
```

---

## 🔄 **Future Enhancements**

### **Possible Improvements:**
1. **Multi-provider support:** Gmail, Outlook, Yahoo options
2. **Email tracking:** Track when emails are sent
3. **Template customization:** Admin bisa edit template
4. **Bulk email:** Kirim ke multiple customers sekaligus
5. **Email history:** Log email yang sudah dikirim

### **Implementation Ideas:**
```typescript
// Multi-provider selector
const emailProviders = [
  { name: 'Outlook', url: outlookUrl },
  { name: 'Gmail', url: gmailUrl },
  { name: 'Default', url: mailtoUrl }
];
```

---

## 📁 **Files Modified**

### **Main File:**
- ✅ `src/app/admin/reminders/page.tsx` - Updated email link to Outlook

### **Backup File:**
- 📁 `src/app/admin/reminders/page-backup.tsx` - Original Gmail version

### **Changes Summary:**
- **Line ~250:** Updated `getEmailLink()` function
- **URL changed:** Gmail → Outlook web compose
- **Button text:** Added "(Outlook)" indicator
- **Comments:** Updated to reflect Outlook usage

---

## 🎉 **Result**

### ✅ **Before:**
- Click "Kirim Email" → Opens Gmail compose

### ✅ **After:**  
- Click "Kirim Email (Outlook)" → Opens Outlook compose

**Email integration berhasil diubah dari Gmail ke Outlook!** 🚀

### 🔗 **Test URL Example:**
```
https://outlook.live.com/mail/0/deeplink/compose?to=customer@example.com&subject=Pengingat%20Kalibrasi%3A%20Timbangan%20Digital&body=Yth.%20Budi%2C%0A%0AKami%20ingin%20mengingatkan...
```

**Sekarang admin bisa langsung kirim email reminder kalibrasi melalui Outlook!** 📧