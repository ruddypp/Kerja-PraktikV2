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
        {/* Success message */}
        {showSuccessMessage && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Rental request successfully submitted.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">My Rentals</h1>
              <p className="text-sm text-gray-500 mt-1">View and manage your equipment rentals</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/user/rentals/new"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
                New Rental
              </Link>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={handleStatusChange}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                <option value="ALL">All Statuses</option>
                <option value={RequestStatus.PENDING}>Pending</option>
                <option value={RequestStatus.APPROVED}>Approved</option>
                <option value={RequestStatus.COMPLETED}>Completed</option>
                <option value={RequestStatus.REJECTED}>Rejected</option>
                <option value={RequestStatus.CANCELLED}>Cancelled</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                              </div>
                              </div>
                              </div>
                            )}
                            
        {/* Loading state */}
        {!data && !error && (
          <div className="bg-white rounded-lg shadow-sm p-10 mb-6">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
                              </div>
                              </div>
                            )}
                            
        {/* Rentals Grid */}
        {data && data.data.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {data.data.map((rental) => (
              <div 
                key={rental.id} 
                className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-medium text-gray-900 truncate">{rental.item.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(rental.status)}`}>
                            {getStatusText(rental.status)}
                          </span>
                        </div>
                        
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-700">
                        {formatDate(rental.startDate)} {rental.endDate ? ` - ${formatDate(rental.endDate)}` : ''}
                      </span>
                          </div>
                          
                    <div className="flex items-start text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <div>
                        <p className="text-gray-700">{rental.item.serialNumber}</p>
                        {rental.item.sensor && (
                          <p className="text-gray-500 text-xs">Sensor: {rental.item.sensor}</p>
                        )}
                      </div>
                            </div>
                          
                          {rental.status === RequestStatus.APPROVED && (
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {isOverdue(rental) ? (
                          <span className="text-red-600 text-sm font-medium">
                            Overdue by {getDaysLeft(rental)?.toString().replace('-', '')} days
                          </span>
                                  ) : (
                          <span className="text-green-600 text-sm font-medium">
                            {getDaysLeft(rental)} days remaining
                          </span>
                                )}
                            </div>
                          )}
                  </div>
                        </div>
                        
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                          {rental.status === RequestStatus.APPROVED && !rental.returnDate && (
                                                          <button
                      onClick={() => openReturnModal(rental)}
                      className="w-full py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors"
                            >
                      Request Return
                            </button>
                          )}
                          
                  {(rental.status === RequestStatus.PENDING || 
                    rental.status === RequestStatus.REJECTED || 
                    rental.status === RequestStatus.COMPLETED ||
                    rental.status === RequestStatus.CANCELLED ||
                    (rental.status === RequestStatus.APPROVED && rental.returnDate)) && (
                    <div className="text-center text-sm text-gray-500">
                      {rental.status === RequestStatus.PENDING && "Waiting for approval"}
                      {rental.status === RequestStatus.REJECTED && "Rental request rejected"}
                      {rental.status === RequestStatus.COMPLETED && "Rental completed"}
                      {rental.status === RequestStatus.CANCELLED && "Rental cancelled"}
                      {rental.status === RequestStatus.APPROVED && rental.returnDate && "Return requested"}
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
        ) : data && data.data.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center mb-6">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No rentals found</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have any rentals that match your current filter.
            </p>
            <div className="mt-6">
              <Link
                href="/user/rentals/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg
                  className="-ml-1 mr-2 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Create a new rental
              </Link>
            </div>
          </div>
        ) : null}
        
        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
            <div className="hidden sm:block">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{((data.pagination.page - 1) * data.pagination.limit) + 1}</span> to{' '}
                <span className="font-medium">{Math.min(data.pagination.page * data.pagination.limit, data.pagination.totalCount)}</span> of{' '}
                <span className="font-medium">{data.pagination.totalCount}</span> rentals
              </p>
            </div>
            <div className="flex flex-1 justify-between sm:justify-end space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <div className="hidden md:flex">
                {renderPagination()}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === data.pagination.totalPages}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === data.pagination.totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
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