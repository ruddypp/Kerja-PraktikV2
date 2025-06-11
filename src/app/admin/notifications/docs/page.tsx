'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useUser } from '@/app/context/UserContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { MdArrowBack, MdCode, MdLibraryBooks } from 'react-icons/md';
import dynamic from 'next/dynamic';

// Dynamically import SyntaxHighlighter with SSR disabled
const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then(mod => mod.Prism),
  { ssr: false }
);

// Add proper TypeScript interface for the CodeBlock props
interface CodeBlockProps {
  language: string;
  children: string;
}

// Do not use dynamic import for the style object - it's causing issues
// Instead, create a wrapper component that handles the style properly
const CodeBlock = ({ language, children }: CodeBlockProps) => {
  // Only load the style on the client side
  const [style, setStyle] = useState({});
  
  useEffect(() => {
    // Import the style only on the client side
    import('react-syntax-highlighter/dist/cjs/styles/prism').then(mod => {
      setStyle(mod.tomorrow);
    });
  }, []);
  
  return (
    <div className="rounded-lg overflow-hidden">
      <SyntaxHighlighter language={language} style={style}>
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

export default function NotificationDocsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user, router]);

  const tabs = [
    { id: 'overview', label: 'Ikhtisar' },
    { id: 'api', label: 'API Endpoints' },
    { id: 'models', label: 'Model Data' },
    { id: 'usage', label: 'Penggunaan' }
  ];

  const apiCodeExample = `// Contoh penggunaan API notifikasi

// 1. Mendapatkan semua notifikasi pengguna
fetch('/api/notifications', {
  credentials: 'include'
})
.then(res => res.json())
.then(data => console.log(data));

// 2. Membuat notifikasi baru (admin only)
fetch('/api/admin/notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    userId: 'user-id-123', // atau roleId: 'ADMIN'
    title: 'Judul Notifikasi',
    message: 'Pesan notifikasi',
    type: 'GENERAL_INFO'
  })
})
.then(res => res.json())
.then(data => console.log(data));

// 3. Mengubah preferensi notifikasi
fetch('/api/notifications/preferences', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    preferences: {
      pushNotifications: true,
      rentalNotifications: true
    }
  })
})
.then(res => res.json())
.then(data => console.log(data));`;

  const schemaCodeExample = `// Model Notification
model Notification {
  id          String           @id @default(uuid())
  user        User             @relation(fields: [userId], references: [id])
  userId      String
  title       String
  message     String
  type        NotificationType
  isRead      Boolean          @default(false)
  relatedId   String?
  actionUrl   String?
  actionLabel String?
  secondaryActionUrl String?
  secondaryActionLabel String?
  createdAt   DateTime         @default(now())
}

// Model NotificationPreference
model NotificationPreference {
  id                      String   @id @default(uuid())
  user                    User     @relation(fields: [userId], references: [id])
  userId                  String   @unique
  rentalNotifications     Boolean  @default(true)
  calibrationNotifications Boolean  @default(true)
  maintenanceNotifications Boolean  @default(true)
  inventoryNotifications  Boolean  @default(true)
  systemNotifications     Boolean  @default(true)
  emailNotifications      Boolean  @default(false)
  pushNotifications       Boolean  @default(false)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}`;

  const usageCodeExample = `// Menggunakan SWR untuk notifikasi real-time
import useSWR from 'swr';

// Fetcher function
const fetcher = url => fetch(url, { credentials: 'include' }).then(r => r.json());

// Dalam komponen React
const { data, error, mutate } = useSWR('/api/notifications', fetcher, {
  refreshInterval: 30000, // Refresh setiap 30 detik
  revalidateOnFocus: true,
  dedupingInterval: 5000  // Mencegah multiple requests dalam 5 detik
});

// Menampilkan notifikasi
if (data?.success) {
  const { notifications, unreadCount } = data;
  
  // Tampilkan badge di navbar
  <div className="notification-badge">{unreadCount}</div>
  
  // Tampilkan daftar notifikasi
  {notifications.map(notification => (
    <div key={notification.id}>
      <h3>{notification.title}</h3>
      <p>{notification.message}</p>
    </div>
  ))}
}`;

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dokumentasi Notifikasi</h1>
          
          <Link 
            href="/admin/notifications" 
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <MdArrowBack className="mr-2 h-5 w-5" />
            Kembali ke Panel Notifikasi
          </Link>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ikhtisar Sistem Notifikasi</h2>
              
              <p className="text-gray-700 mb-4">
                Sistem notifikasi Paramata menyediakan kemampuan untuk mengirim dan mengelola berbagai jenis notifikasi dalam aplikasi.
                Sistem ini didesain untuk memberikan pengalaman real-time dan interaktif bagi pengguna.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Fitur Utama</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Notifikasi real-time dengan SWR</li>
                    <li>Preferensi notifikasi per pengguna</li>
                    <li>Push notifications browser (jika diaktifkan)</li>
                    <li>Notifikasi dengan aksi interaktif</li>
                    <li>Pusat notifikasi terintegrasi</li>
                    <li>Panel administrasi untuk pengelolaan</li>
                  </ul>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Jenis Notifikasi</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Notifikasi Rental (permintaan, perubahan status)</li>
                    <li>Notifikasi Kalibrasi (pengingat, perubahan status)</li>
                    <li>Notifikasi Maintenance (pengingat jadwal)</li>
                    <li>Notifikasi Inventaris (jadwal pemeriksaan)</li>
                    <li>Informasi Vendor</li>
                    <li>Informasi Umum</li>
                  </ul>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Arsitektur Sistem</h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  <li><strong>Frontend:</strong> React dengan SWR untuk data fetching, React Context untuk state management</li>
                  <li><strong>Backend:</strong> Next.js API Routes untuk endpoint</li>
                  <li><strong>Database:</strong> PostgreSQL dengan Prisma ORM</li>
                  <li><strong>Fitur Real-time:</strong> SWR dengan interval polling optimal</li>
                </ul>
              </div>
            </div>
          )}
          
          {activeTab === 'api' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">API Endpoints</h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Endpoint Pengguna</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">/api/notifications</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">GET</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Mendapatkan semua notifikasi pengguna</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">/api/notifications</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">DELETE</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Menghapus semua notifikasi pengguna</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">/api/notifications/:id</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">DELETE</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Menghapus notifikasi tertentu</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">/api/notifications/:id/read</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">PUT</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Menandai notifikasi sebagai dibaca</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">/api/notifications/read-all</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">PUT</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Menandai semua notifikasi sebagai dibaca</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">/api/notifications/preferences</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">GET</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Mendapatkan preferensi notifikasi pengguna</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">/api/notifications/preferences</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">PUT</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Memperbarui preferensi notifikasi pengguna</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Endpoint Admin</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">/api/admin/notifications</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">GET</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Mendapatkan semua notifikasi dengan filter</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">/api/admin/notifications</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">POST</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Membuat notifikasi baru untuk pengguna/role</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">/api/admin/notifications</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">DELETE</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Menghapus notifikasi yang difilter</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">/api/admin/notifications/stats</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">GET</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Mendapatkan statistik notifikasi</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Contoh Penggunaan API</h3>
                <CodeBlock language="javascript">
                  {apiCodeExample}
                </CodeBlock>
              </div>
            </div>
          )}
          
          {activeTab === 'models' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Model Data</h2>
              
              <p className="text-gray-700 mb-4">
                Sistem notifikasi menggunakan beberapa model data utama yang diimplementasikan menggunakan Prisma ORM.
              </p>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Schema Database</h3>
                <CodeBlock language="javascript">
                  {schemaCodeExample}
                </CodeBlock>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tipe Notifikasi</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">RENTAL_REQUEST</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Permintaan rental baru</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">RENTAL_STATUS_CHANGE</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Perubahan status rental</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">CALIBRATION_REMINDER</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Pengingat kalibrasi</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">CALIBRATION_STATUS_CHANGE</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Perubahan status kalibrasi</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">RENTAL_DUE_REMINDER</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Pengingat jatuh tempo rental</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">MAINTENANCE_REMINDER</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Pengingat maintenance</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">INVENTORY_SCHEDULE</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Jadwal inventarisasi</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">VENDOR_INFO</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Informasi vendor</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">GENERAL_INFO</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Informasi umum</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'usage' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Penggunaan Notifikasi</h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Menggunakan SWR untuk Notifikasi Real-time</h3>
                <p className="text-gray-700 mb-4">
                  Sistem notifikasi menggunakan SWR untuk polling efisien dan pembaruan otomatis.
                </p>
                <CodeBlock language="javascript">
                  {usageCodeExample}
                </CodeBlock>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Mengirim Notifikasi Administratif</h3>
                <p className="text-gray-700 mb-4">
                  Admin dapat mengirim notifikasi ke pengguna tertentu atau seluruh pengguna dengan role tertentu.
                </p>
                <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                  <li>Buka halaman Admin Notifikasi di <code>/admin/notifications</code></li>
                  <li>Pilih jenis target (User Tertentu atau Semua User dengan Role)</li>
                  <li>Pilih user atau role yang akan menerima notifikasi</li>
                  <li>Pilih tipe notifikasi dari dropdown</li>
                  <li>Isi judul dan pesan notifikasi</li>
                  <li>Klik "Kirim Notifikasi"</li>
                </ol>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Best Practices</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-base font-medium text-gray-900 mb-2">Performa</h4>
                    <ul className="list-disc pl-5 space-y-1 text-gray-700">
                      <li>Gunakan SWR dengan interval yang sesuai (30-60 detik)</li>
                      <li>Implementasikan dedupingInterval untuk mencegah request berlebihan</li>
                      <li>Gunakan optimistic UI updates untuk responsivitas</li>
                    </ul>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-base font-medium text-gray-900 mb-2">UX</h4>
                    <ul className="list-disc pl-5 space-y-1 text-gray-700">
                      <li>Pastikan judul dan pesan notifikasi jelas dan informatif</li>
                      <li>Gunakan actionUrl dan actionLabel untuk memberikan konteks</li>
                      <li>Kelompokkan notifikasi sejenis untuk mengurangi kekacauan</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 