"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { ItemStatus } from "@prisma/client";
import { ArrowLeftIcon, SearchIcon, WrenchIcon, ChevronLeft, ChevronRight, XIcon } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// Konstanta untuk caching
const CACHE_DURATION = 60000; // 1 menit
const CACHE_KEY_PREFIX = 'user_maintenance_items_';
const SEARCH_CACHE_PREFIX = 'user_maintenance_search_';

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

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function NewMaintenancePage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isStartingMaintenance, setIsStartingMaintenance] = useState(false);
  const [selectedItemSerial, setSelectedItemSerial] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchItems(pagination.page, pagination.limit);
    
    // Handler untuk menutup suggestion ketika klik di luar
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [pagination.limit]);

  // Fungsi untuk mendapatkan cache key berdasarkan parameter
  const getCacheKey = (page: number, limit: number, query: string = '') => {
    return `${CACHE_KEY_PREFIX}${query ? 'search_' + query + '_' : ''}page_${page}_limit_${limit}`;
  };

  const fetchItems = async (page: number, limit: number, searchQuery: string = '') => {
    try {
      setLoading(true);
      
      const cacheKey = getCacheKey(page, limit, searchQuery);
      const cachedData = sessionStorage.getItem(cacheKey);
      const lastFetch = sessionStorage.getItem(`${cacheKey}_timestamp`);
      const now = Date.now();
      
      // Gunakan cache jika ada dan belum kedaluwarsa
      if (cachedData && lastFetch && now - parseInt(lastFetch) < CACHE_DURATION) {
        const data = JSON.parse(cachedData);
        setItems(data.items || []);
        setPagination({
          page: data.page,
          limit: data.limit,
          total: data.total,
          totalPages: data.totalPages
        });
        setLoading(false);
        return;
      }
      
      // Build query params
      const params = new URLSearchParams();
      params.append('status', ItemStatus.AVAILABLE);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      const response = await fetch(`/api/user/items?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }

      const data = await response.json();
      
      // Cache hasil
      sessionStorage.setItem(cacheKey, JSON.stringify({
        items: data.items || [],
        page: data.page || page,
        limit: data.limit || limit,
        total: data.total || 0,
        totalPages: data.totalPages || 0
      }));
      sessionStorage.setItem(`${cacheKey}_timestamp`, now.toString());
      
      setItems(data.items || []);
      setPagination({
        page: data.page || page,
        limit: data.limit || limit,
        total: data.total || 0,
        totalPages: data.totalPages || 0
      });
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Gagal mengambil data barang");
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk mencari item dengan caching
  const searchItems = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsSearching(true);
    try {
      // Check search cache first
      const searchCacheKey = `${SEARCH_CACHE_PREFIX}${term}`;
      const cachedResults = sessionStorage.getItem(searchCacheKey);
      
      if (cachedResults) {
        const data = JSON.parse(cachedResults);
        setSearchResults(data);
        setShowSuggestions(true);
        setIsSearching(false);
        return;
      }
      
      const params = new URLSearchParams();
      params.append('status', ItemStatus.AVAILABLE);
      params.append('search', term);
      params.append('limit', '5'); // Hanya tampilkan 5 suggestion
      
      const res = await fetch(`/api/user/items?${params.toString()}`, {
        headers: { 'Cache-Control': 'max-age=30' }
      });
      
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        
        // Cache search results (for 5 minutes)
        sessionStorage.setItem(searchCacheKey, JSON.stringify(items));
        
        setSearchResults(items);
        setShowSuggestions(true);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching items:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);
  
  // Improved debounce search with useEffect and cleanup
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debouncing
    searchTimeoutRef.current = setTimeout(() => {
      searchItems(searchTerm);
    }, 300);
    
    // Cleanup on unmount or searchTerm change
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, searchItems]);

  // Handle item selection
  const handleItemSelect = (item: Item) => {
    setSelectedItemSerial(item.serialNumber);
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    // Reset pagination to first page when searching
    setPagination({...pagination, page: 1});
    fetchItems(1, pagination.limit, searchTerm);
  };

  const handlePageChange = (newPage: number) => {
    setPagination({...pagination, page: newPage});
    fetchItems(newPage, pagination.limit, searchTerm);
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
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Link
            href="/user/maintenance"
            className="inline-flex items-center text-green-600 hover:text-green-800"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Kembali ke daftar maintenance
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <h1 className="text-2xl font-bold mb-6">Mulai Maintenance Baru</h1>
          <p className="mb-4 text-gray-600">
            Pilih barang yang tersedia untuk memulai proses maintenance.
          </p>

          {/* Search Bar dengan Suggestion */}
          <div className="mb-6 relative" ref={searchRef}>
            <form onSubmit={handleSearch}>
              <div className="flex items-center">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                    placeholder="Cari barang berdasarkan nama, serial number, atau part number..."
                    className="w-full p-2 pl-10 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setShowSuggestions(false);
                        fetchItems(1, pagination.limit, '');
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      title="Hapus pencarian"
                    >
                      <XIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="ml-2 bg-green-600 hover:bg-green-700 text-white p-2 rounded-md disabled:opacity-50"
                >
                  {isSearching ? "Mencari..." : "Cari"}
                </button>
              </div>
            </form>

            {/* Suggestion Dropdown */}
            {showSuggestions && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500 mx-auto mb-2"></div>
                    Sedang mencari...
                  </div>
                ) : searchResults.length > 0 ? (
                  <ul className="py-1">
                    {searchResults.map((item) => (
                      <li 
                        key={item.serialNumber}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleItemSelect(item)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-gray-600">SN: {item.serialNumber}</div>
                            <div className="text-sm text-gray-500">PN: {item.partNumber}</div>
                          </div>
                          <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            Available
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : searchTerm.length >= 2 ? (
                  <div className="p-4 text-center text-gray-500">
                    Tidak ditemukan barang yang sesuai
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
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
                          selectedItemSerial === item.serialNumber ? "bg-green-50" : ""
                        }`}
                        onClick={() => setSelectedItemSerial(item.serialNumber)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="radio"
                            name="selectedItem"
                            checked={selectedItemSerial === item.serialNumber}
                            onChange={() => setSelectedItemSerial(item.serialNumber)}
                            className="h-4 w-4 text-green-600 focus:ring-green-500"
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

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-700">
                  Menampilkan <span className="font-medium">{items.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span>
                  {' - '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>
                  {' dari '}
                  <span className="font-medium">{pagination.total}</span> barang
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Halaman sebelumnya"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, idx) => {
                      // Logic to show pages around current page
                      let pageNum = pagination.page;
                      if (pagination.totalPages <= 5) {
                        pageNum = idx + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = idx + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + idx;
                      } else {
                        pageNum = pagination.page - 2 + idx;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                            pagination.page === pageNum
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Halaman berikutnya"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={startMaintenance}
                  disabled={!selectedItemSerial || isStartingMaintenance}
                  className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <WrenchIcon className="mr-2 h-5 w-5" />
                  {isStartingMaintenance ? "Memulai..." : "Mulai Maintenance"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 