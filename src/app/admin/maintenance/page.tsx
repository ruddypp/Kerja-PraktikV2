"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Search, Filter, ClipboardCheckIcon, RefreshCw, Trash2, PlusIcon } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface MaintenanceItem {
  id: string;
  itemSerial: string;
  status: string;
  startDate: string;
  endDate: string | null;
  item: {
    serialNumber: string;
    name: string;
    partNumber: string;
  };
  user: {
    name: string;
  };
  serviceReport: string;
  technicalReport: string;
}

export default function AdminMaintenancePage() {
  const [maintenances, setMaintenances] = useState<MaintenanceItem[]>([]);
  const [filteredMaintenances, setFilteredMaintenances] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // State untuk modal konfirmasi hapus
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [maintenanceToDelete, setMaintenanceToDelete] = useState<MaintenanceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Konstanta untuk caching
  const CACHE_DURATION = 60000; // 1 menit
  const CACHE_KEY = 'admin_maintenance_data';
  const CACHE_TIMESTAMP_KEY = 'admin_maintenance_last_fetch';

  // Fungsi untuk membersihkan cache
  const invalidateCache = useCallback(() => {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
  }, []);

  // Debounce function
  const debounce = useCallback(<T extends (...args: unknown[]) => void>(func: T, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }, []);

  // Declare applyFilters with useCallback before it's used
  const applyFilters = useCallback(() => {
    let result = [...maintenances];
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.item.name.toLowerCase().includes(lowerSearchTerm) ||
          item.item.serialNumber.toLowerCase().includes(lowerSearchTerm) ||
          item.user.name.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Apply status filter
    if (statusFilter !== "ALL") {
      result = result.filter((item) => item.status === statusFilter);
    }
    
    setFilteredMaintenances(result);
  }, [maintenances, searchTerm, statusFilter]);

  const fetchMaintenances = useCallback(async () => {
    try {
      setLoading(true);

      // Cek apakah ada data di cache dan masih valid
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      const lastFetch = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
      const now = Date.now();
      
      if (cachedData && lastFetch && now - parseInt(lastFetch) < CACHE_DURATION) {
        // Gunakan data dari cache jika masih valid
        const data = JSON.parse(cachedData);
        setMaintenances(data);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/maintenance");
      
      if (!response.ok) {
        throw new Error("Failed to fetch maintenance data");
      }
      
      const data = await response.json();
      
      // Simpan data ke cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      sessionStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
      
      setMaintenances(data);
    } catch (error) {
      console.error("Error fetching maintenances:", error);
      toast.error("Gagal mengambil data maintenance");
      
      // Coba gunakan data cache yang lama jika ada
      const oldCache = sessionStorage.getItem(CACHE_KEY);
      if (oldCache) {
        try {
          setMaintenances(JSON.parse(oldCache));
          toast.info("Menampilkan data terakhir dari cache");
        } catch (e) {
          console.error("Error parsing old cache:", e);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [CACHE_KEY, CACHE_TIMESTAMP_KEY, CACHE_DURATION]);

  useEffect(() => {
    fetchMaintenances();
  }, [fetchMaintenances]);

  // Debounced search
  const debouncedSearch = useCallback((term: string) => {
    // If we have an existing timeout, clear it
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // Set a new timeout
    searchTimeout.current = setTimeout(() => {
      setSearchTerm(term);
      applyFilters();
    }, 500);
    
    // Return a cleanup function
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [applyFilters]);

  useEffect(() => {
    applyFilters();
  }, [maintenances, searchTerm, statusFilter, applyFilters]);

  // Fungsi untuk membuka modal konfirmasi hapus
  const openDeleteModal = (maintenance: MaintenanceItem) => {
    setMaintenanceToDelete(maintenance);
    setShowDeleteModal(true);
  };

  // Fungsi untuk menghapus maintenance
  const deleteMaintenance = async () => {
    if (!maintenanceToDelete) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/admin/maintenance/${maintenanceToDelete.id}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal menghapus data maintenance");
      }
      
      toast.success("Data maintenance berhasil dihapus");
      
      // Hapus dari state
      setMaintenances(maintenances.filter(item => item.id !== maintenanceToDelete.id));
      
      // Invalidasi cache
      invalidateCache();
      
      // Tutup modal
      setShowDeleteModal(false);
      setMaintenanceToDelete(null);
    } catch (error) {
      console.error("Error deleting maintenance:", error);
      toast.error(error instanceof Error ? error.message : "Gagal menghapus data maintenance");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Handle refresh button
  const handleRefresh = () => {
    invalidateCache();
    fetchMaintenances();
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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Manajemen Maintenance</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
              disabled={loading}
            >
              <RefreshCw size={16} />
              {loading ? "Memuat..." : "Refresh Data"}
            </button>
            <Link
              href="/admin/maintenance/new"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
            >
              <PlusIcon size={16} />
              Mulai Maintenance Baru
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cari
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  placeholder="Cari berdasarkan nama barang, serial number, atau nama user"
                  defaultValue={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter status maintenance"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="PENDING">Dalam Proses</option>
                  <option value="COMPLETED">Selesai</option>
                  <option value="CANCELLED">Dibatalkan</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
          </div>
        ) : filteredMaintenances.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-100 p-6 text-center">
            <ClipboardCheckIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Tidak ada data maintenance</h3>
            <p className="mt-2 text-gray-500">
              {searchTerm || statusFilter !== "ALL"
                ? "Tidak ada hasil yang cocok dengan filter yang dipilih"
                : "Belum ada data maintenance yang tersedia"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Barang
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Serial Number
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      User
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Tanggal Mulai
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Tanggal Selesai
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMaintenances.map((maintenance) => (
                    <tr key={maintenance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {maintenance.item.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {maintenance.item.partNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {maintenance.itemSerial}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {maintenance.user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(maintenance.startDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {maintenance.endDate ? formatDate(maintenance.endDate) : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(maintenance.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-4">
                          <Link 
                            href={`/admin/maintenance/${maintenance.id}`}
                            className={maintenance.status === "PENDING" ? "text-green-600 hover:text-green-800" : "text-blue-600 hover:text-blue-900"}
                          >
                            {maintenance.status === "PENDING" ? "Lapor Hasil" : "Lihat Detail"}
                          </Link>
                          <button
                            onClick={() => openDeleteModal(maintenance)}
                            className="text-red-600 hover:text-red-900 flex items-center"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Hapus */}
      {showDeleteModal && maintenanceToDelete && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="relative bg-white rounded-lg max-w-md w-full mx-4 p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Konfirmasi Hapus</h3>
            <p className="text-sm text-gray-500 mb-4">
              Anda yakin ingin menghapus data maintenance untuk barang <span className="font-semibold">{maintenanceToDelete.item.name}</span> dengan serial number <span className="font-semibold">{maintenanceToDelete.itemSerial}</span>?
            </p>
            <p className="text-sm text-red-500 mb-6">
              Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data terkait maintenance ini.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                onClick={deleteMaintenance}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 