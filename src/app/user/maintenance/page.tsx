"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { PlusIcon, ClipboardCheckIcon } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface Maintenance {
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
  serviceReport: any;
  technicalReport: any;
}

export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchMaintenances();
  }, []);

  const fetchMaintenances = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/maintenance");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Gagal mengambil data maintenance");
      }
      
      setMaintenances(data);
    } catch (error) {
      console.error("Error fetching maintenances:", error);
      toast.error("Gagal mengambil data maintenance");
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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Maintenance Barang</h1>
          <Link
            href="/user/maintenance/new"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <PlusIcon className="mr-2 h-5 w-5" />
            Mulai Maintenance Baru
          </Link>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
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
                  {maintenances.map((maintenance) => (
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
                              href={`/api/user/maintenance/${maintenance.id}/report?type=csr`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-800 block"
                            >
                              Service Report
                            </a>
                            <a
                              href={`/api/user/maintenance/${maintenance.id}/report?type=technical`}
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
                        {maintenance.status === "PENDING" ? (
                          <Link
                            href={`/user/maintenance/${maintenance.id}`}
                            className="text-green-600 hover:text-green-800"
                          >
                            Lapor Hasil
                          </Link>
                        ) : (
                          <Link
                            href={`/user/maintenance/${maintenance.id}`}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Lihat Detail
                          </Link>
                        )}
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