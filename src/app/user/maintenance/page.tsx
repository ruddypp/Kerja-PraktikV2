"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { PlusIcon, ClipboardCheckIcon } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// Define any missing interfaces for the maintenance reports
interface MaintenanceReport {
  id: string;
  file: string | null;
  createdAt: string;
  updatedAt: string;
  // Add any other necessary fields
}

interface Maintenance {
  id: string;
  itemSerial: string;
  userId: string;
  status: string;
  description: string;
  customerId: string | null;
  completedDate: string | null;
  startDate: string;
  endDate: string | null;
  serviceReport: MaintenanceReport | null;
  technicalReport: MaintenanceReport | null;
  createdAt: string;
  updatedAt: string;
  item: {
    serialNumber: string;
    name: string;
    partNumber: string;
  };
  customer: {
    id: string;
    name: string;
  } | null;
  // Add any other necessary fields
}

export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Durasi cache dalam milidetik (1 menit)
  const CACHE_DURATION = 60000;
  const CACHE_KEY = 'maintenanceData';
  const CACHE_TIMESTAMP_KEY = 'maintenanceLastFetch';

  // Fungsi untuk membersihkan cache
  const invalidateCache = useCallback(() => {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
  }, []);

  useEffect(() => {
    // Check if we need to force refresh based on URL parameters
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const timestamp = urlParams.get('t');
      
      // If timestamp parameter exists, force a refresh
      const forceRefresh = !!timestamp;
      
      if (forceRefresh) {
        // Clean up the URL if there's a timestamp parameter
        if (window.history && window.history.replaceState) {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
        fetchMaintenances(true);
      } else {
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        const lastFetch = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
        const now = Date.now();
        
        // Cek apakah cache masih valid (tidak lebih dari durasi yang ditentukan)
        if (cachedData && lastFetch && now - parseInt(lastFetch) < CACHE_DURATION) {
          try {
            setMaintenances(JSON.parse(cachedData));
            setLoading(false);
          } catch (e) {
            console.error("Error parsing cached data:", e);
            // Jika terjadi kesalahan parsing, hapus cache dan muat ulang data
            invalidateCache();
            fetchMaintenances(false);
          }
        } else {
          fetchMaintenances(false);
        }
      }
    }
  }, [invalidateCache]);

  const fetchMaintenances = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/user/maintenance", {
        headers: forceRefresh ? {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        } : {}
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal mengambil data maintenance");
      }
      
      const data = await response.json();
      
      setMaintenances(data);
      
      // Simpan data ke cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error("Error fetching maintenances:", error);
      const errorMessage = error instanceof Error ? error.message : "Gagal mengambil data maintenance";
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Coba gunakan data cache yang lama jika ada
      const oldCache = sessionStorage.getItem(CACHE_KEY);
      if (oldCache) {
        try {
          setMaintenances(JSON.parse(oldCache));
          toast.success("Menampilkan data terakhir dari cache");
        } catch (e) {
          console.error("Error parsing old cache:", e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Dalam Proses
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Selesai
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            Dibatalkan
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Responsive header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Maintenance Barang</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/user/maintenance/new"
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md flex items-center text-sm"
            >
              <PlusIcon className="mr-1 h-4 w-4" />
              Maintenance Baru
            </Link>
          </div>
        </div>

        {/* Workflow info box - made more responsive */}
        <div className="bg-green-50 border-l-4 border-green-500 p-3 md:p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs md:text-sm text-green-700">
                <strong>Alur Maintenance:</strong> Pilih barang yang tersedia untuk maintenance → Lakukan maintenance fisik → Isi formulir detail maintenance → Kirim laporan untuk menyelesaikan proses.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
          </div>
        ) : maintenances.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-100 p-6 text-center">
            <ClipboardCheckIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Belum ada Maintenance</h3>
            <p className="mt-2 text-gray-500">
              Anda belum memiliki riwayat maintenance. Mulai maintenance baru dengan mengklik tombol di atas.
            </p>
          </div>
        ) : (
          <>
            {/* Card view untuk semua ukuran layar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {maintenances.map((maintenance) => (
                <div key={maintenance.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
                  <div className="p-4 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-md font-medium text-gray-900">{maintenance.item.name}</h3>
                        <p className="text-sm text-gray-500">{maintenance.item.partNumber}</p>
                      </div>
                      <div>{getStatusBadge(maintenance.status)}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm flex-grow">
                      <div>
                        <p className="text-gray-500 font-medium">Serial Number</p>
                        <p className="text-gray-800">{maintenance.itemSerial}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Tanggal Mulai</p>
                        <p className="text-gray-800">{formatDate(maintenance.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Tanggal Selesai</p>
                        <p className="text-gray-800">{maintenance.endDate ? formatDate(maintenance.endDate) : "-"}</p>
                      </div>
                    </div>
                    
                    {maintenance.status === "COMPLETED" && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {maintenance.serviceReport && (
                          <a
                            href={`/api/user/maintenance/${maintenance.id}/report?type=csr`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:text-green-800 flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            CSR Report
                          </a>
                        )}
                        {maintenance.technicalReport && (
                          <a
                            href={`/api/user/maintenance/${maintenance.id}/report?type=technical`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:text-green-800 flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Technical Report
                          </a>
                        )}
                      </div>
                    )}
                    
                    <div className="pt-3 border-t border-gray-100 mt-auto">
                      {maintenance.status === "PENDING" ? (
                        <Link
                          href={`/user/maintenance/${maintenance.id}`}
                          className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          Lapor Hasil
                        </Link>
                      ) : (
                        <Link
                          href={`/user/maintenance/${maintenance.id}`}
                          className="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          Lihat Detail
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 