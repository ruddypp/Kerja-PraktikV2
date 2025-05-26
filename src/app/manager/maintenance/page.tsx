"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Search, Filter, ClipboardCheckIcon, RefreshCw, PlusIcon } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useRouter } from "next/navigation";

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

export default function ManagerMaintenancePage() {
  const router = useRouter();
  const [maintenances, setMaintenances] = useState<MaintenanceItem[]>([]);
  const [filteredMaintenances, setFilteredMaintenances] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // Konstanta untuk caching
  const CACHE_DURATION = 60000; // 1 menit
  const CACHE_KEY = 'manager_maintenance_data';
  const CACHE_TIMESTAMP_KEY = 'manager_maintenance_last_fetch';

  // Fungsi untuk membersihkan cache
  const invalidateCache = useCallback(() => {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
  }, []);

  // Declare applyFilters with useCallback before it's used
  const applyFilters = useCallback(() => {
    let result = [...maintenances];
    
    // Apply search filter
    if (searchQuery) {
      const lowerSearchQuery = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.item.name.toLowerCase().includes(lowerSearchQuery) ||
          item.itemSerial.toLowerCase().includes(lowerSearchQuery) ||
          item.user.name.toLowerCase().includes(lowerSearchQuery)
      );
    }
    
    // Apply status filter
    if (statusFilter !== "ALL") {
      result = result.filter((item) => item.status === statusFilter);
    }
    
    setFilteredMaintenances(result);
  }, [maintenances, searchQuery, statusFilter]);

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
        setFilteredMaintenances(data);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/manager/maintenance");
      
      if (!response.ok) {
        throw new Error("Failed to fetch maintenance data");
      }
      
      const data = await response.json();
      
      // Simpan data ke cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      sessionStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
      
      setMaintenances(data);
      setFilteredMaintenances(data);
    } catch (error) {
      console.error("Error fetching maintenances:", error);
      toast.error("Gagal mengambil data maintenance");
      
      // Coba gunakan data cache yang lama jika ada
      const oldCache = sessionStorage.getItem(CACHE_KEY);
      if (oldCache) {
        try {
          setMaintenances(JSON.parse(oldCache));
          setFilteredMaintenances(JSON.parse(oldCache));
          toast.success("Menampilkan data terakhir dari cache");
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

  useEffect(() => {
    if (maintenances.length > 0) {
      const filtered = maintenances.filter((maintenance) =>
        maintenance.item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        maintenance.itemSerial.toLowerCase().includes(searchQuery.toLowerCase()) ||
        maintenance.user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMaintenances(filtered);
    }
  }, [searchQuery, maintenances]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

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
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h1 className="text-2xl font-bold">Maintenance Barang</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 text-sm"
              disabled={loading}
            >
              <RefreshCw size={14} />
              {loading ? "Memuat..." : "Refresh Data"}
            </button>
            <Link
              href="/manager/maintenance/new"
              className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
            >
              <PlusIcon size={14} />
              Maintenance Baru
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cari
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
                  placeholder="Cari barang, SN, atau user"
                  defaultValue={searchQuery}
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
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
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
              {searchQuery || statusFilter !== "ALL"
                ? "Tidak ada hasil yang cocok dengan filter yang dipilih"
                : "Belum ada data maintenance yang tersedia"}
            </p>
          </div>
        ) : (
          <>
            {/* Table view for medium and larger screens */}
            <div className="hidden md:block bg-white rounded-lg border border-gray-100 overflow-hidden">
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
                          <div className="flex items-center">
                            <Link 
                              href={`/manager/maintenance/${maintenance.id}`}
                              className={maintenance.status === "PENDING" ? "text-green-600 hover:text-green-800" : "text-blue-600 hover:text-blue-900"}
                            >
                              {maintenance.status === "PENDING" ? "Lapor Hasil" : "Lihat Detail"}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card view for small screens */}
            <div className="md:hidden space-y-4">
              {filteredMaintenances.map((maintenance) => (
                <div key={maintenance.id} className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">{maintenance.item.name}</h3>
                      <p className="text-xs text-gray-500">{maintenance.item.partNumber}</p>
                    </div>
                    <div>{getStatusBadge(maintenance.status)}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <p className="text-gray-500">Serial Number:</p>
                      <p className="font-medium">{maintenance.itemSerial}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">User:</p>
                      <p className="font-medium">{maintenance.user.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tanggal Mulai:</p>
                      <p className="font-medium">{formatDate(maintenance.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tanggal Selesai:</p>
                      <p className="font-medium">{maintenance.endDate ? formatDate(maintenance.endDate) : "-"}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-center">
                    <Link 
                      href={`/manager/maintenance/${maintenance.id}`}
                      className={`text-sm font-medium ${maintenance.status === "PENDING" ? "text-green-600 hover:text-green-800" : "text-blue-600 hover:text-blue-900"}`}
                    >
                      {maintenance.status === "PENDING" ? "Lapor Hasil" : "Lihat Detail"}
                    </Link>
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