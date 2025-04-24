"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { ItemStatus } from "@prisma/client";
import { ArrowLeftIcon, SearchIcon, WrenchIcon } from "lucide-react";

interface Item {
  serialNumber: string;
  name: string;
  partNumber: string;
  sensor: string | null;
  description: string | null;
  customer: {
    id: string;
    name: string;
  } | null;
  status: ItemStatus;
}

export default function NewMaintenancePage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isStartingMaintenance, setIsStartingMaintenance] = useState(false);
  const [selectedItemSerial, setSelectedItemSerial] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableItems();
  }, []);

  const fetchAvailableItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/user/items?status=${ItemStatus.AVAILABLE}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }

      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("Error fetching available items:", error);
      toast.error("Gagal mengambil data barang");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchAvailableItems();
      return;
    }

    setIsSearching(true);
    fetch(`/api/user/items?status=${ItemStatus.AVAILABLE}&search=${searchQuery}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items || []);
        setIsSearching(false);
      })
      .catch((error) => {
        console.error("Error searching items:", error);
        toast.error("Gagal mencari barang");
        setIsSearching(false);
      });
  };

  const startMaintenance = async () => {
    if (!selectedItemSerial) {
      toast.error("Pilih barang terlebih dahulu");
      return;
    }

    try {
      setIsStartingMaintenance(true);
      
      const response = await fetch('/api/user/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemSerial: selectedItemSerial }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal memulai maintenance');
      }
      
      toast.success('Maintenance berhasil dimulai');
      router.push(`/user/maintenance/${data.id}`);
    } catch (error: unknown) {
      console.error('Error starting maintenance:', error);
      let errorMessage = 'Gagal memulai maintenance';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsStartingMaintenance(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link
          href="/user/maintenance"
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Kembali ke daftar maintenance
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-6">Mulai Maintenance Baru</h1>
        <p className="mb-4 text-gray-600">
          Pilih barang yang tersedia untuk memulai proses maintenance.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex items-center">
            <div className="relative flex-grow">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari barang berdasarkan nama, serial number, atau part number..."
                className="w-full p-2 pl-10 border border-gray-300 rounded-md"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="ml-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md disabled:opacity-50"
            >
              {isSearching ? "Mencari..." : "Cari"}
            </button>
          </div>
        </form>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-yellow-50 p-4 rounded-md">
            <p className="text-yellow-700">
              Tidak ada barang yang tersedia untuk maintenance. Semua barang
              sedang digunakan atau dalam proses lain.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pilih
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Barang
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Serial Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Part Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sensor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr
                      key={item.serialNumber}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedItemSerial === item.serialNumber ? "bg-blue-50" : ""
                      }`}
                      onClick={() => setSelectedItemSerial(item.serialNumber)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="radio"
                          name="selectedItem"
                          checked={selectedItemSerial === item.serialNumber}
                          onChange={() => setSelectedItemSerial(item.serialNumber)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          aria-label={`Select ${item.name} for maintenance`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.serialNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.partNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.sensor || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.customer?.name || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={startMaintenance}
                disabled={!selectedItemSerial || isStartingMaintenance}
                className="inline-flex items-center bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <WrenchIcon className="mr-2 h-5 w-5" />
                {isStartingMaintenance ? "Memulai..." : "Mulai Maintenance"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 