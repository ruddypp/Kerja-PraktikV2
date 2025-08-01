# 🔄 Database Restore Feature - Panduan Lengkap

## 🎉 **Fitur Baru: Restore Database dari File .sql**

### 📍 **Lokasi:** `http://localhost:3000/admin/settings` → Tab "Data"

---

## 🎯 **Fitur yang Ditambahkan**

### ✅ **1. Database Restore Card**
- **Posisi:** Di sebelah kanan card "Database Backup"
- **Fungsi:** Upload dan restore database dari file .sql
- **Icon:** Upload icon (biru)
- **Layout:** Responsive grid layout

### ✅ **2. File Upload Interface**
- **Drag & Drop Area:** Visual file upload zone
- **File Validation:** Hanya menerima file .sql
- **Size Limit:** Maksimal 100MB
- **Preview:** Menampilkan nama file dan ukuran

### ✅ **3. Restore Process**
- **Confirmation Dialog:** SweetAlert2 dengan konfirmasi "RESTORE"
- **Progress Indicator:** Loading state dengan spinner
- **psql Integration:** Menggunakan psql command untuk restore
- **Error Handling:** Comprehensive error messages

---

## 🎨 **UI/UX Design**

### **Restore Card Layout:**
```
┌─────────────────────────────────────┐
│ 📤 Restore Database                 │
│ Pulihkan database dari file .sql    │
├─────────────────────────────────────┤
│ ℹ️ Informasi:                       │
│ Restore akan mengganti seluruh data │
├─────────────────────────────────────┤
│ Persyaratan File:                   │
│ • Format: .sql (PostgreSQL)         │
│ • Ukuran: Max 100MB                 │
│ • Kompatibel dengan PostgreSQL      │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │  📁 Klik untuk memilih file     │ │
│ │     atau drag & drop            │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [🔄 Restore Database]               │
└─────────────────────────────────────┘
```

### **Color Scheme:**
- **Primary:** Blue (#2563eb) untuk restore actions
- **Info:** Blue background untuk informational messages
- **Success:** Green untuk successful operations
- **Error:** Red untuk error states

---

## 🔧 **Technical Implementation**

### **Frontend (React):**
```typescript
// File upload state
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [isRestoreLoading, setIsRestoreLoading] = useState(false);

// File validation
const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file) {
    // Validate .sql extension
    if (!file.name.endsWith('.sql')) {
      toast.error('Hanya file .sql yang diperbolehkan');
      return;
    }
    
    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Ukuran file terlalu besar. Maksimal 100MB');
      return;
    }
    
    setSelectedFile(file);
  }
};

// Restore process
const handleRestore = async () => {
  const formData = new FormData();
  formData.append('sqlFile', selectedFile);
  
  const response = await fetch('/api/admin/settings/restore', {
    method: 'POST',
    body: formData
  });
};
```

### **Backend API (Next.js):**
```typescript
// API Route: /api/admin/settings/restore
export async function POST(request: NextRequest) {
  // 1. Authentication check
  const user = await getUserFromRequest(request);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse uploaded file
  const formData = await request.formData();
  const sqlFile = formData.get('sqlFile') as File;

  // 3. File validation
  if (!sqlFile.name.endsWith('.sql')) {
    return NextResponse.json({ error: 'Only .sql files allowed' }, { status: 400 });
  }

  // 4. Save to temporary location
  const tempFilePath = path.join(tempDir, `restore_${uuidv4()}.sql`);
  fs.writeFileSync(tempFilePath, buffer);

  // 5. Execute psql restore
  const psqlCommand = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${tempFilePath}"`;
  const { stdout, stderr } = await execAsync(psqlCommand, { env: { PGPASSWORD: dbPassword } });

  // 6. Cleanup and response
  fs.unlinkSync(tempFilePath);
  return NextResponse.json({ success: true, message: 'Restore completed' });
}
```

---

## 🔐 **Security Features**

### **1. Authentication & Authorization:**
```typescript
// Only admin users can restore
const user = await getUserFromRequest(request);
if (!user || !isAdmin(user)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### **2. File Validation:**
```typescript
// Extension validation
if (!sqlFile.name.endsWith('.sql')) {
  return NextResponse.json({ error: 'Only .sql files allowed' }, { status: 400 });
}

// Size validation (100MB limit)
if (sqlFile.size > 100 * 1024 * 1024) {
  return NextResponse.json({ error: 'File too large' }, { status: 400 });
}
```

### **3. Temporary File Handling:**
```typescript
// Unique temporary filename
const tempFileName = `restore_${uuidv4()}.sql`;

// Automatic cleanup
try {
  fs.unlinkSync(tempFilePath);
  console.log('🗑️ Temporary file cleaned up');
} catch (cleanupError) {
  console.warn('⚠️ Failed to cleanup temporary file:', cleanupError);
}
```

---

## 🗄️ **Database Integration**

### **psql Command Structure:**
```bash
psql -h localhost -p 5432 -U postgres -d paramata_db -f "/path/to/restore.sql"
```

### **Environment Variables:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=paramata_db
DB_USER=postgres
DB_PASSWORD=your_password
```

### **Authentication:**
```typescript
// Set PGPASSWORD for psql authentication
const env = { ...process.env };
if (dbPassword) {
  env.PGPASSWORD = dbPassword;
}

const { stdout, stderr } = await execAsync(psqlCommand, { env });
```

---

## ⚠️ **Error Handling**

### **Common Error Scenarios:**

#### **1. Authentication Errors:**
```typescript
if (execError.message.includes('password authentication failed')) {
  errorMessage = 'Database authentication failed. Check credentials.';
}
```

#### **2. Connection Errors:**
```typescript
if (execError.message.includes('could not connect')) {
  errorMessage = 'Could not connect to database. Check connection.';
}
```

#### **3. Permission Errors:**
```typescript
if (execError.message.includes('permission denied')) {
  errorMessage = 'Permission denied. Check database user permissions.';
}
```

#### **4. File Errors:**
```typescript
if (execError.message.includes('does not exist')) {
  errorMessage = 'Database or table does not exist.';
}
```

---

## 🚀 **Usage Flow**

### **Step 1: Access Restore Feature**
1. Login sebagai admin
2. Buka `http://localhost:3000/admin/settings`
3. Pilih tab "Data"
4. Lihat card "Restore Database" di sebelah kanan

### **Step 2: Upload SQL File**
1. Click area "Klik untuk memilih file .sql"
2. Pilih file .sql dari komputer
3. Verify file name dan size muncul
4. File harus berformat .sql dan maksimal 100MB

### **Step 3: Confirm Restore**
1. Click tombol "Restore Database"
2. Dialog konfirmasi muncul dengan detail file
3. Ketik "RESTORE" untuk konfirmasi
4. Click "Restore Database" untuk melanjutkan

### **Step 4: Monitor Progress**
1. Loading spinner muncul dengan text "Memproses..."
2. Toast notification menunjukkan progress
3. Proses restore berjalan di background
4. Halaman akan refresh otomatis setelah selesai

---

## 📊 **Layout Changes**

### **Before (2 Cards):**
```
┌─────────────────┐ ┌─────────────────┐
│   Backup DB     │ │   Reset DB      │
│                 │ │                 │
└─────────────────┘ └─────────────────┘
```

### **After (3 Cards):**
```
┌─────────────────┐ ┌─────────────────┐
│   Backup DB     │ │   Restore DB    │
│                 │ │                 │
└─────────────────┘ └─────────────────┘
┌─────────────────────────────────────┐
│           Reset DB                  │
│        (Full Width)                 │
└─────────────────────────────────────┘
```

### **Grid Layout:**
```css
/* 2 columns for backup & restore */
.grid-cols-1.lg:grid-cols-2

/* Full width for reset */
.lg:col-span-2
```

---

## 🧪 **Testing Guide**

### **Test Case 1: Valid SQL File**
1. **Input:** Valid .sql file < 100MB
2. **Expected:** File uploaded successfully, restore button enabled
3. **Action:** Click restore, confirm with "RESTORE"
4. **Expected:** Database restored, success message, page refresh

### **Test Case 2: Invalid File Type**
1. **Input:** .txt or .json file
2. **Expected:** Error message "Hanya file .sql yang diperbolehkan"
3. **Action:** File rejected, no upload

### **Test Case 3: File Too Large**
1. **Input:** .sql file > 100MB
2. **Expected:** Error message "Ukuran file terlalu besar"
3. **Action:** File rejected, no upload

### **Test Case 4: Database Connection Error**
1. **Input:** Valid file, but DB offline
2. **Expected:** Error message about connection failure
3. **Action:** Restore fails gracefully with error message

### **Test Case 5: Authentication Error**
1. **Input:** Valid file, wrong DB credentials
2. **Expected:** Error message about authentication failure
3. **Action:** Restore fails with credential error

---

## 📁 **Files Created/Modified**

### **New Files:**
- ✅ `src/app/api/admin/settings/restore/route.ts` - Restore API endpoint

### **Modified Files:**
- ✅ `src/app/admin/settings/page.tsx` - Added restore UI and functionality

### **Dependencies:**
- ✅ `uuid` - For generating unique temporary filenames
- ✅ `child_process` - For executing psql commands
- ✅ `fs` - For file system operations

---

## 🎉 **Result**

### ✅ **Before:**
- Hanya ada fitur Backup dan Reset
- Tidak bisa restore dari file backup

### ✅ **After:**
- **Backup:** Create database backups (SQL/DUMP)
- **Restore:** Upload dan restore dari file .sql ⭐ **NEW**
- **Reset:** Clear database to initial state

### 🔗 **Complete Workflow:**
1. **Backup** → Create .sql file
2. **Download** → Get backup file
3. **Restore** → Upload .sql file to restore database ⭐
4. **Reset** → Clear all data if needed

**Fitur restore database dari file .sql berhasil ditambahkan dengan integrasi psql yang lengkap!** 🚀