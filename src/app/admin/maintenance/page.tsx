"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Search, Filter, ClipboardCheckIcon } from "lucide-react";
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
  serviceReport: any;
  technicalReport: any;
}

export default function AdminMaintenancePage() {
  const [maintenances, setMaintenances] = useState<MaintenanceItem[]>([]);
  const [filteredMaintenances, setFilteredMaintenances] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchMaintenances();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [maintenances, searchTerm, statusFilter]);

  const fetchMaintenances = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/maintenance");
      
      if (!response.ok) {
        throw new Error("Failed to fetch maintenance data");
      }
      
      const data = await response.json();
      setMaintenances(data);
    } catch (error) {
      console.error("Error fetching maintenances:", error);
      toast.error("Gagal mengambil data maintenance");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                      Laporan
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
                          {maintenance.itemSerial}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{maintenance.user.name}</div>
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
                        {maintenance.status === "COMPLETED" && (
                          <div className="space-y-1">
                            <a
                              href={`/api/admin/maintenance/${maintenance.id}/report?type=csr`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-800 block"
                            >
                              Service Report
                            </a>
                            <a
                              href={`/api/admin/maintenance/${maintenance.id}/report?type=technical`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-800 block"
                            >
                              Technical Report
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/admin/maintenance/${maintenance.id}`}
                          className="text-green-600 hover:text-green-800"
                        >
                          Lihat Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 