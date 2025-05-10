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
const CACHE_KEY_PREFIX = 'admin_maintenance_items_';
const SEARCH_CACHE_PREFIX = 'admin_maintenance_search_';

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

export default function AdminNewMaintenancePage() {
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
      
      const response = await fetch(`/api/admin/items?${params.toString()}`);

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
      
      const res = await fetch(`/api/admin/items?${params.toString()}`, {
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
      
      const response = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemSerial: selectedItemSerial }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal memulai maintenance");
      }

      toast.success("Maintenance berhasil dimulai");
      
      // Redirect ke halaman maintenance admin
      router.push('/admin/maintenance');
    } catch (error) {
      console.error('Error starting maintenance:', error);
      toast.error(error instanceof Error ? error.message : "Gagal memulai maintenance");
    } finally {
      setIsStartingMaintenance(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/maintenance"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Kembali
          </Link>
          <h1 className="text-2xl font-bold">Mulai Maintenance Baru</h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Pilih Barang untuk Maintenance</h2>
            
            {/* Search form */}
            <div ref={searchRef} className="relative">
              <form onSubmit={handleSearch} className="mb-6">
                <div className="flex items-center">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      placeholder="Cari barang berdasarkan nama atau serial number"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full p-3 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <SearchIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    
                    {/* Clear search button */}
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                        title="Clear search"
                      >
                        <XIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="ml-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Cari
                  </button>
                </div>
                
                {/* Search suggestions */}
                {showSuggestions && (
                  <div className="absolute mt-1 w-full bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    {isSearching ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="inline-block animate-spin h-4 w-4 border-t-2 border-gray-500 rounded-full mr-2"></div>
                        Mencari...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <ul>
                        {searchResults.map((item) => (
                          <li
                            key={item.serialNumber}
                            className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => handleItemSelect(item)}
                          >
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-gray-600">
                              SN: {item.serialNumber} | {item.partNumber}
                            </div>
                            {item.customer && (
                              <div className="text-xs text-gray-500">
                                Customer: {item.customer.name}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        Tidak ada hasil yang cocok
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
            
            {/* Selected item */}
            {selectedItemSerial && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mt-4">
                <h3 className="text-md font-medium mb-2">Barang yang Dipilih:</h3>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      {items.find(i => i.serialNumber === selectedItemSerial)?.name || "Barang Terpilih"}
                    </p>
                    <p className="text-sm text-gray-600">
                      SN: {selectedItemSerial}
                    </p>
                    {items.find(i => i.serialNumber === selectedItemSerial)?.customer && (
                      <p className="text-xs text-gray-500 mt-1">
                        Customer: {items.find(i => i.serialNumber === selectedItemSerial)?.customer?.name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedItemSerial(null)}
                    className="text-red-500 hover:text-red-700"
                    title="Remove selected item"
                  >
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Item list */}
            {items.length > 0 && !loading ? (
              <div className="mt-6">
                <h3 className="text-md font-medium mb-2">Barang Tersedia untuk Maintenance:</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Nama Barang
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
                          Part Number
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Customer
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item) => (
                        <tr
                          key={item.serialNumber}
                          className={`hover:bg-gray-50 ${selectedItemSerial === item.serialNumber ? 'bg-green-50' : ''}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {item.serialNumber}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {item.partNumber}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {item.customer ? item.customer.name : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleItemSelect(item)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Pilih
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-700">
                      Menampilkan {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} barang
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className={`px-3 py-1 rounded ${pagination.page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        title="Previous page"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter(page => 
                          page === 1 || 
                          page === pagination.totalPages || 
                          (page >= pagination.page - 1 && page <= pagination.page + 1)
                        )
                        .map((page, index, array) => (
                          <div key={page} className="flex items-center">
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-1 text-gray-500">...</span>
                            )}
                            <button
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-1 rounded ${pagination.page === page ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                            >
                              {page}
                            </button>
                          </div>
                        ))}
                      
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className={`px-3 py-1 rounded ${pagination.page === pagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        title="Next page"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-md">
                <WrenchIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada barang tersedia</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Tidak ditemukan barang yang tersedia untuk maintenance.
                </p>
              </div>
            )}
            
            {/* Start maintenance button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={startMaintenance}
                disabled={!selectedItemSerial || isStartingMaintenance}
                className={`flex items-center px-4 py-2 rounded-md text-white ${
                  !selectedItemSerial || isStartingMaintenance
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isStartingMaintenance ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Memproses...
                  </>
                ) : (
                  <>
                    <WrenchIcon className="h-5 w-5 mr-2" />
                    Mulai Maintenance
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 