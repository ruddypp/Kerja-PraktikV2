'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { ItemStatus } from '@prisma/client';
import useSWR from 'swr';

type Item = {
  serialNumber: string;
  name: string;
  partNumber: string;
  sensor: string | null;
  description: string | null;
  status: ItemStatus;
};

type User = {
  id: string;
  name: string;
  email: string;
};

type PaginatedResponse = {
  data: Item[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
};

type UsersResponse = {
  data: User[];
};

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    error.message = await res.text();
    throw error;
  }
  return res.json();
};

export default function AdminNewRentalRequestPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Form data
  const [selectedItemSerial, setSelectedItemSerial] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [poNumber, setPoNumber] = useState('');
  const [doNumber, setDoNumber] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Debounce search term to reduce API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Build API URL with search and pagination
  const apiUrl = `/api/admin/rentals/available?page=${currentPage}&limit=12${
    debouncedSearchTerm ? `&search=${encodeURIComponent(debouncedSearchTerm)}` : ''
  }`;

  // Fetch available items with SWR
  const { data, error: swrError } = useSWR<PaginatedResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
    }
  );
  
  // Fetch users list for the dropdown
  const { data: usersData, error: usersError } = useSWR<UsersResponse>(
    '/api/admin/users?limit=100',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Dedupe requests within 60 seconds
    }
  );

  // Handle SWR errors
  useEffect(() => {
    if (swrError) {
      setError('Error loading available items. Please try again later.');
      console.error('Error fetching available items:', swrError);
    } else if (usersError) {
      setError('Error loading users. Please try again later.');
      console.error('Error fetching users:', usersError);
    } else {
      setError(null);
    }
  }, [swrError, usersError]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const selectItem = (itemSerial: string) => {
    setSelectedItemSerial(itemSerial);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItemSerial) {
      setError('Please select an item to rent');
      return;
    }
    
    if (!startDate) {
      setError('Please specify a start date');
      return;
    }
    
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/rentals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemSerial: selectedItemSerial,
          startDate,
          endDate: endDate || null,
          poNumber: poNumber || null,
          doNumber: doNumber || null,
          targetUserId: selectedUserId || null, // Add the selected user
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit rental request');
      }
      
      // Redirect to rental list page with success message
      router.push('/admin/rentals?success=true');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while submitting the rental request';
      setError(errorMessage);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Pagination controls
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    if (!data?.pagination) return null;
    
    const { page, totalPages } = data.pagination;
    
    if (totalPages <= 1) return null;
    
    const pages = [];
    const maxVisible = 5; // Max visible page buttons
    
    const startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    // Adjust startPage if we're near the end
    const adjustedStartPage = Math.max(1, endPage - maxVisible + 1);
    
    // Previous button
    pages.push(
      <button
        key="prev"
        onClick={() => handlePageChange(page - 1)}
        disabled={page === 1}
        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
      >
        &laquo; Prev
      </button>
    );
    
    // Page numbers
    for (let i = adjustedStartPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`relative inline-flex items-center px-4 py-2 border ${
            i === page ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          } text-sm font-medium`}
          type="button"
        >
          {i}
        </button>
      );
    }
    
    // Next button
    pages.push(
      <button
        key="next"
        onClick={() => handlePageChange(page + 1)}
        disabled={page === totalPages}
        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
      >
        Next &raquo;
      </button>
    );
    
    return (
      <div className="flex justify-center mt-6">
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
          {pages}
        </nav>
      </div>
    );
  };

  const getToday = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const isLoading = !data && !swrError;
  const items = data?.data || [];
  const noItemsFound = items.length === 0;
  const users = usersData?.data || [];

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">Ajukan Rental Baru</h1>
          <Link
            href="/admin/rentals"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
          >
            <svg className="-ml-1 mr-2 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 mb-6 flex items-center">
            <svg className="h-5 w-5 text-red-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white">
              <h2 className="text-lg font-medium text-gray-800">1. Pilih Barang</h2>
            </div>
            <div className="p-5">
              <div className="mb-5">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Cari Barang</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="search"
                    placeholder="Cari berdasarkan nama, nomor seri, atau deskripsi..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="block w-full pl-10 pr-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 transition-shadow duration-200"
                  />
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
                  <span className="ml-3 text-base text-gray-700">Memuat data barang...</span>
                </div>
              ) : noItemsFound ? (
                <div className="p-4 text-center text-gray-500 rounded-lg bg-gray-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada barang</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {debouncedSearchTerm 
                      ? `Tidak ditemukan barang dengan kata kunci "${debouncedSearchTerm}"` 
                      : 'Tidak ada barang yang tersedia untuk rental'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => (
                      <div 
                        key={item.serialNumber} 
                        className={`border rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                          selectedItemSerial === item.serialNumber 
                            ? 'border-green-500 ring-2 ring-green-200 shadow-md' 
                            : 'border-gray-200 hover:border-green-300 hover:shadow-md'
                        }`}
                        onClick={() => selectItem(item.serialNumber)}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              Available
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">SN: {item.serialNumber}</p>
                            {item.partNumber && (
                              <p className="text-xs text-gray-500">PN: {item.partNumber}</p>
                            )}
                            {item.description && (
                              <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                            )}
                          </div>
                          
                          {selectedItemSerial === item.serialNumber && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <div className="text-xs text-green-600 flex items-center">
                                <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Item dipilih
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {renderPagination()}
                </>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white">
              <h2 className="text-lg font-medium text-gray-800">2. Pilih Pengguna</h2>
            </div>
            <div className="p-5">
              <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-1">
                Pilih Pengguna
                <span className="ml-1 text-gray-500 text-xs">(Opsional, jika tidak dipilih maka admin yang mengajukan)</span>
              </label>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 transition-shadow duration-200"
              >
                <option value="">-- Pilih Pengguna --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {users.length === 0 && !usersError
                  ? 'Memuat daftar pengguna...'
                  : usersError
                  ? 'Gagal memuat daftar pengguna'
                  : 'Pilih pengguna yang akan mengajukan rental ini'}
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white">
              <h2 className="text-lg font-medium text-gray-800">3. Detail Rental</h2>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    id="start-date"
                    min={getToday()}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 transition-shadow duration-200"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    id="end-date"
                    min={startDate || getToday()}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 transition-shadow duration-200"
                  />
                  <p className="mt-1 text-xs text-gray-500">Opsional. Jika tidak diisi, maka rental tidak memiliki batas waktu.</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-sm font-medium text-gray-800 mb-3">Informasi Dokumen</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="po-number" className="block text-sm font-medium text-gray-700 mb-1">Nomor PO</label>
                    <input
                      type="text"
                      id="po-number"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="Masukkan nomor PO (opsional)"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 transition-shadow duration-200"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="do-number" className="block text-sm font-medium text-gray-700 mb-1">Nomor DO</label>
                    <input
                      type="text"
                      id="do-number"
                      value={doNumber}
                      onChange={(e) => setDoNumber(e.target.value)}
                      placeholder="Masukkan nomor DO (opsional)"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 transition-shadow duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !selectedItemSerial || !startDate}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Ajukan Rental
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 