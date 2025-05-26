'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { RequestStatus } from '@prisma/client';
import useSWR from 'swr';

type Rental = {
  id: string;
  itemSerial: string;
  userId: string;
  status: RequestStatus;
  startDate: string;
  endDate: string | null;
  returnDate: string | null;
  poNumber: string | null;
  doNumber: string | null;
  renterName: string | null;
  renterPhone: string | null;
  renterAddress: string | null;
  initialCondition: string | null;
  returnCondition: string | null;
  createdAt: string;
  updatedAt: string;
  item: {
    serialNumber: string;
    name: string;
    partNumber: string;
    sensor: string | null;
    description: string | null;
    status: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
};

type PaginatedResponse = {
  data: Rental[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
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

export default function UserRentalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const successParam = searchParams.get('success');
  
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [returnCondition, setReturnCondition] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build the API URL with query parameters
  const apiUrl = `/api/user/rentals?page=${currentPage}&limit=6${statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''}`;
  
  // Fetch rentals with SWR for caching
  const { data, error: swrError, mutate } = useSWR<PaginatedResponse>(
    apiUrl, 
    fetcher,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
    }
  );

  useEffect(() => {
    if (successParam === 'true') {
      setShowSuccessMessage(true);
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successParam]);

  useEffect(() => {
    if (swrError) {
      setError('Error loading rental data. Please try again later.');
      console.error('Error fetching user rentals:', swrError);
    } else {
      setError(null);
    }
  }, [swrError]);

  // Reset page number when changing filters
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as RequestStatus | 'ALL');
  };

  const openReturnModal = (rental: Rental) => {
    setSelectedRental(rental);
    setReturnCondition('');
    setShowReturnModal(true);
  };

  const handleReturnRequest = async (rentalId: string) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/user/rentals/${rentalId}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          notes: 'User initiated return',
          returnCondition: returnCondition
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Unauthorized. Please log in again.');
          return;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process return request');
      }

      // Close modal
      setShowReturnModal(false);

      // Update the local state via SWR mutation
      mutate();

      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error processing return request';
      setError(errorMessage);
      console.error('Return request error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case RequestStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case RequestStatus.COMPLETED:
        return 'bg-green-200 text-green-900';
      case RequestStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      case RequestStatus.CANCELLED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.PENDING:
        return 'Menunggu Persetujuan';
      case RequestStatus.APPROVED:
        return 'Disetujui';
      case RequestStatus.COMPLETED:
        return 'Selesai';
      case RequestStatus.REJECTED:
        return 'Ditolak';
      case RequestStatus.CANCELLED:
        return 'Dibatalkan';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const isOverdue = (rental: Rental) => {
    if (rental.status !== RequestStatus.APPROVED || !rental.endDate) return false;
    const today = new Date();
    const endDate = new Date(rental.endDate);
    return today > endDate;
  };

  const getDaysLeft = (rental: Rental) => {
    if (rental.status !== RequestStatus.APPROVED || !rental.endDate) return null;
    
    const today = new Date();
    const endDate = new Date(rental.endDate);
    
    if (today > endDate) {
      const diffTime = Math.abs(today.getTime() - endDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `-${diffDays}`;
    } else {
      const diffTime = Math.abs(endDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
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

  const isLoading = !data && !swrError;
  const rentals = data?.data || [];

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Rental Barang</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => mutate()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
            >
              <svg className="-ml-1 mr-2 h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <Link
              href="/user/rentals/new"
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Ajukan Rental Baru
            </Link>
          </div>
        </div>

        {showSuccessMessage && (
          <div className="bg-green-50 p-3 md:p-4 rounded-lg border border-green-200 text-green-700 mb-6 flex items-center">
            <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">Permintaan berhasil diproses!</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 p-3 md:p-4 rounded-lg border border-red-200 text-red-700 mb-6 flex items-center">
            <svg className="h-5 w-5 text-red-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-200">
          <h2 className="text-base md:text-lg font-medium text-gray-800 mb-3">Filter Data</h2>
          <div className="flex flex-col">
            <div className="w-full">
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={handleStatusChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 transition-shadow duration-200 text-sm"
              >
                <option value="ALL">Semua Status</option>
                <option value={RequestStatus.PENDING}>Menunggu Persetujuan</option>
                <option value={RequestStatus.APPROVED}>Disetujui</option>
                <option value={RequestStatus.COMPLETED}>Selesai</option>
                <option value={RequestStatus.REJECTED}>Ditolak</option>
                <option value={RequestStatus.CANCELLED}>Dibatalkan</option>
              </select>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-40 bg-white rounded-lg shadow-md border border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
            <span className="ml-3 text-sm text-gray-700">Memuat data rental...</span>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-base md:text-lg font-medium text-gray-800">Daftar Rental</h2>
              {data?.pagination && (
                <p className="text-xs md:text-sm text-gray-600 mt-1">
                  Menampilkan {rentals.length} dari {data.pagination.totalCount} data
                </p>
              )}
            </div>
          
            {rentals.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada data rental</h3>
                <p className="mt-1 text-xs md:text-sm text-gray-500">
                  {statusFilter === 'ALL' 
                    ? 'Anda belum pernah melakukan rental barang.' 
                    : `Tidak ada rental dengan status "${getStatusText(statusFilter)}".`}
                </p>
                <div className="mt-4">
                  <Link
                    href="/user/rentals/new"
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Ajukan Rental Baru
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Table view for desktop - hidden on mobile */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Barang
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Periode
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rentals.map((rental) => (
                        <tr key={rental.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{rental.item.name}</div>
                              <div className="text-xs text-gray-500">SN: {rental.item.serialNumber}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(rental.status)}`}>
                              {getStatusText(rental.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">Mulai: {formatDate(rental.startDate)}</div>
                            <div className="text-sm text-gray-500">Selesai: {formatDate(rental.endDate)}</div>
                            {rental.returnDate && (
                              <div className="text-sm text-gray-500">
                                Dikembalikan: {formatDate(rental.returnDate)}
                              </div>
                            )}
                            {rental.status === RequestStatus.APPROVED && (
                              <div className={`text-xs mt-1 ${isOverdue(rental) ? 'text-red-600 font-medium' : 'text-green-600'}`}>
                                {rental.endDate ? (
                                  isOverdue(rental) ? (
                                    <>Terlambat {Math.abs(Number(getDaysLeft(rental)))} hari</>
                                  ) : (
                                    <>{getDaysLeft(rental)} hari lagi</>
                                  )
                                ) : (
                                  <>Tidak ada batas waktu</>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {rental.status === RequestStatus.APPROVED && !rental.returnDate && (
                              <button
                                onClick={() => openReturnModal(rental)}
                                className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                              >
                                Kembalikan Barang
                              </button>
                            )}
                            
                            {rental.status === RequestStatus.APPROVED && rental.returnDate && (
                              <div className="text-xs text-green-600">
                                Menunggu verifikasi pengembalian
                              </div>
                            )}
                            
                            {rental.status === RequestStatus.PENDING && (
                              <div className="text-xs text-yellow-600">
                                Menunggu persetujuan admin
                              </div>
                            )}
                            
                            {rental.status === RequestStatus.REJECTED && (
                              <div className="text-xs text-red-600">
                                Permintaan ditolak
                              </div>
                            )}
                            
                            {rental.status === RequestStatus.COMPLETED && (
                              <div className="text-xs text-green-600">
                                Rental selesai
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Card view for mobile */}
                <div className="md:hidden p-4 space-y-4">
                  {rentals.map((rental) => (
                    <div key={rental.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{rental.item.name}</h3>
                            <p className="text-xs text-gray-500">SN: {rental.item.serialNumber}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(rental.status)}`}>
                            {getStatusText(rental.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                            <div>
                            <p className="text-gray-500 font-medium">Tanggal Mulai</p>
                            <p>{formatDate(rental.startDate)}</p>
                            </div>
                            <div>
                            <p className="text-gray-500 font-medium">Tanggal Selesai</p>
                            <p>{formatDate(rental.endDate)}</p>
                          </div>
                          
                          {rental.returnDate && (
                            <div className="col-span-2">
                              <p className="text-gray-500 font-medium">Tanggal Pengembalian</p>
                              <p>{formatDate(rental.returnDate)}</p>
                            </div>
                          )}
                          
                          {rental.status === RequestStatus.APPROVED && (
                            <div className="col-span-2">
                              <p className="text-gray-500 font-medium">Sisa Waktu</p>
                              <p className={isOverdue(rental) ? 'text-red-600 font-medium' : 'text-green-600'}>
                                {rental.endDate ? (
                                  isOverdue(rental) ? (
                                    <>Terlambat {Math.abs(Number(getDaysLeft(rental)))} hari</>
                                  ) : (
                                    <>{getDaysLeft(rental)} hari lagi</>
                                  )
                                ) : (
                                  <>Tidak ada batas waktu</>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="pt-3 border-t border-gray-100">
                          {rental.status === RequestStatus.APPROVED && !rental.returnDate && (
                                                          <button
                              onClick={() => openReturnModal(rental)}
                              className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                            >
                              <svg className="mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                              Kembalikan Barang
                            </button>
                          )}
                          
                          {rental.status === RequestStatus.APPROVED && rental.returnDate && (
                            <div className="flex items-center justify-center text-xs text-green-600">
                              <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Menunggu verifikasi pengembalian
                            </div>
                          )}
                          
                          {rental.status === RequestStatus.PENDING && (
                            <div className="flex items-center justify-center text-xs text-yellow-600">
                              <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Menunggu persetujuan admin
                            </div>
                          )}
                          
                          {rental.status === RequestStatus.REJECTED && (
                            <div className="flex items-center justify-center text-xs text-red-600">
                              <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Permintaan ditolak
                            </div>
                          )}
                          
                          {rental.status === RequestStatus.COMPLETED && (
                            <div className="flex items-center justify-center text-xs text-green-600">
                              <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Rental selesai
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination controls - same for both layouts */}
                <div className="px-4 py-4">
                {renderPagination()}
              </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Return Modal */}
      {showReturnModal && selectedRental && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="relative bg-white rounded-lg max-w-xl w-full p-6 shadow-xl">
            <button 
              onClick={() => setShowReturnModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold text-gray-800 mb-4">Pengembalian Barang</h2>
            
            <div className="mb-5">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-600">Nama Barang:</span>
                  <div className="text-sm text-gray-800">{selectedRental.item.name}</div>
                </div>
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-600">Serial Number:</span>
                  <div className="text-sm text-gray-800">{selectedRental.item.serialNumber}</div>
                </div>
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-600">Tanggal Peminjaman:</span>
                  <div className="text-sm text-gray-800">{formatDate(selectedRental.startDate)}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Nama Peminjam:</span>
                  <div className="text-sm text-gray-800">{selectedRental.renterName || selectedRental.user.name}</div>
                </div>
              </div>
              
              {selectedRental.initialCondition && (
                <div className="mb-4">
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Kondisi Awal Barang:</h4>
                    <div className="p-3 bg-white rounded-md border border-yellow-100 text-sm text-gray-800 whitespace-pre-line">
                      {selectedRental.initialCondition}
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Kondisi Saat Pengembalian <span className="text-red-500">*</span></h4>
                  <p className="text-xs text-green-700 mb-3">Deskripsikan kondisi barang saat ini dengan detail untuk memudahkan proses verifikasi pengembalian</p>
                  <textarea
                    id="return-condition"
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                    placeholder="Contoh: Barang dalam kondisi baik, tidak ada kerusakan, semua fungsi berjalan normal, dll."
                    rows={4}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                onClick={() => handleReturnRequest(selectedRental.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
                disabled={isSubmitting || !returnCondition}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                  </>
                ) : (
                  'Ajukan Pengembalian'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 