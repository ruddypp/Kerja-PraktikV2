"use client";

import { useState, useEffect } from "react";
import { RequestStatus, ItemStatus } from "@prisma/client";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import useSWR from "swr";
import Link from "next/link";

// Define Rental type
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
    status: ItemStatus;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
  statusLogs: {
    id: string;
    status: RequestStatus;
    notes: string | null;
    createdAt: string;
    changedBy: {
      id: string;
      name: string;
    };
  }[];
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

export default function ManagerRentalsPage() {
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "ALL">("ALL");
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [newStatus, setNewStatus] = useState<RequestStatus | "">("");
  const [statusNotes, setStatusNotes] = useState("");
  const [processingAction, setProcessingAction] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [returnCondition, setReturnCondition] = useState('');

  // Build the API URL with query parameters
  const buildApiUrl = () => {
    const params = new URLSearchParams();
    params.append("page", currentPage.toString());
    params.append("limit", "10");
    
    if (statusFilter !== "ALL") {
      params.append("status", statusFilter);
    }
    
    if (dateFilter.startDate) {
      params.append("startDate", dateFilter.startDate);
    }
    
    if (dateFilter.endDate) {
      params.append("endDate", dateFilter.endDate);
    }
    
    return `/api/manager/rentals?${params.toString()}`;
  };

  const apiUrl = buildApiUrl();
  
  // Fetch rentals with SWR for caching
  const { data, error: swrError, mutate } = useSWR<PaginatedResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
    }
  );
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateFilter]);
  
  // Handle SWR errors
  useEffect(() => {
    if (swrError) {
      setError(swrError instanceof Error ? swrError.message : 'Failed to load rental data. Please try again later.');
      console.error('Error fetching rentals:', swrError);
    } else {
      setError(null);
    }
  }, [swrError]);

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.PENDING:
        return "bg-yellow-100 text-yellow-800";
      case RequestStatus.APPROVED:
        return "bg-green-100 text-green-800";
      case RequestStatus.COMPLETED:
        return "bg-green-200 text-green-900";
      case RequestStatus.REJECTED:
        return "bg-red-100 text-red-800";
      case RequestStatus.CANCELLED:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
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

  // Helper to determine if a rental is in return request state
  const isReturnRequested = (rental: Rental) => {
    return rental.status === RequestStatus.PENDING && rental.returnDate !== null;
  };

  // Helper to get appropriate status text based on rental state
  const getRentalStatusText = (rental: Rental) => {
    if (isReturnRequested(rental)) {
      return 'Menunggu Verifikasi Pengembalian';
    }
    return getStatusText(rental.status);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd MMMM yyyy");
  };

  const handleStatusChange = async () => {
    if (!selectedRental || !newStatus) return;
    
    try {
      setProcessingAction(true);
      
      // For return verification (when a user has requested a return)
      if (isReturnRequested(selectedRental) && newStatus === RequestStatus.COMPLETED) {
        const response = await fetch(`/api/manager/rentals/${selectedRental.id}/return`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            verificationNotes: statusNotes || 'Return verified by manager'
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to verify rental return');
        }
      } else {
        // Regular status update
        const response = await fetch('/api/manager/rentals', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: selectedRental.id,
            status: newStatus,
            notes: statusNotes,
            returnCondition: newStatus === RequestStatus.COMPLETED ? returnCondition : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update rental status');
        }
      }

      // Close modal and reset form
      setDetailModalOpen(false);
      setSelectedRental(null);
      setNewStatus("");
      setStatusNotes("");
      setReturnCondition("");
      
      // Refresh rentals list using SWR
      mutate();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setProcessingAction(false);
    }
  };

  const viewRentalDetails = (rental: Rental) => {
    setSelectedRental(rental);
    setDetailModalOpen(true);
    setNewStatus("");
    setStatusNotes("");
    setReturnCondition(rental.returnCondition || '');
  };

  const handleApprove = (rental: Rental) => {
    viewRentalDetails(rental);
    setNewStatus(RequestStatus.APPROVED);
  };

  const handleReject = (rental: Rental) => {
    viewRentalDetails(rental);
    setNewStatus(RequestStatus.REJECTED);
  };

  const handleComplete = (rental: Rental) => {
    viewRentalDetails(rental);
    setNewStatus(RequestStatus.COMPLETED);
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
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Rental Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage equipment rental requests</p>
            </div>
            <div className="flex gap-2">
            <Link
              href="/manager/rentals/new"
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RequestStatus | "ALL")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                <option value="ALL">All Statuses</option>
                <option value={RequestStatus.PENDING}>Pending</option>
                <option value={RequestStatus.APPROVED}>Approved</option>
                <option value={RequestStatus.COMPLETED}>Completed</option>
                <option value={RequestStatus.REJECTED}>Rejected</option>
                <option value={RequestStatus.CANCELLED}>Cancelled</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <div className="flex-1">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setDateFilter({ startDate: "", endDate: "" })}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Clear Filters
              </button>
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

        {/* Loading State */}
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
                  Tidak ada data rental yang sesuai dengan filter yang dipilih.
                </p>
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
                          Peminjam
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
                            <div>
                              <div className="text-sm font-medium text-gray-900">{rental.renterName || rental.user.name}</div>
                              <div className="text-xs text-gray-500">{rental.user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(rental.status)}`}>
                              {getRentalStatusText(rental)}
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
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => viewRentalDetails(rental)}
                              className="text-green-600 hover:text-green-900 mr-3"
                            >
                              Detail
                            </button>
                            
                            {rental.status === RequestStatus.PENDING && (
                              <>
                                <button
                                  onClick={() => handleApprove(rental)}
                                  className="text-green-600 hover:text-green-900 mr-3"
                                >
                                  Setujui
                                </button>
                                <button
                                  onClick={() => handleReject(rental)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Tolak
                                </button>
                              </>
                            )}
                            
                            {rental.status === RequestStatus.APPROVED && rental.returnDate && (
                              <button
                                onClick={() => handleComplete(rental)}
                                className="text-yellow-600 hover:text-yellow-900"
                              >
                                Verifikasi Pengembalian
                              </button>
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
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rental.status)}`}>
                            {getRentalStatusText(rental)}
                          </span>
                        </div>
                        
                        <div className="border-t border-gray-100 -mx-4 px-4 py-2 mb-2 bg-gray-50">
                          <p className="text-xs text-gray-700">
                            <span className="font-medium">Peminjam:</span> {rental.renterName || rental.user.name}
                          </p>
                          <p className="text-xs text-gray-500">{rental.user.email}</p>
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
                        </div>
                        
                        <div className="pt-3 border-t border-gray-100">
                          {rental.status === RequestStatus.PENDING && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(rental)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs transition-colors duration-200 shadow-sm flex items-center justify-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Setujui
                              </button>
                              <button
                                onClick={() => handleReject(rental)}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs transition-colors duration-200 shadow-sm flex items-center justify-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Tolak
                              </button>
                            </div>
                          )}
                          
                          {rental.status === RequestStatus.APPROVED && rental.returnDate && (
                            <button
                              onClick={() => handleComplete(rental)}
                              className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs transition-colors duration-200 shadow-sm flex items-center justify-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Verifikasi Pengembalian
                            </button>
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

      {/* Rental Detail Modal */}
      {detailModalOpen && selectedRental && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="relative bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <button 
              onClick={() => setDetailModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold text-gray-800 mb-4">Detail Rental</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-2">Informasi Barang</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-600">Nama Barang:</span>
                    <div className="text-sm text-gray-800">{selectedRental.item.name}</div>
                  </div>
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-600">Serial Number:</span>
                    <div className="text-sm text-gray-800">{selectedRental.item.serialNumber}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Part Number:</span>
                    <div className="text-sm text-gray-800">{selectedRental.item.partNumber || '-'}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-2">Periode Rental</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-600">Tanggal Mulai:</span>
                    <div className="text-sm text-gray-800">{formatDate(selectedRental.startDate)}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Tanggal Selesai:</span>
                    <div className="text-sm text-gray-800">{formatDate(selectedRental.endDate) || 'Tidak ditentukan'}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-2">Informasi Peminjam</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-600">Nama Peminjam:</span>
                    <div className="text-sm text-gray-800">{selectedRental.renterName || selectedRental.user.name}</div>
                  </div>
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-600">Telepon:</span>
                    <div className="text-sm text-gray-800">{selectedRental.renterPhone || '-'}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Alamat:</span>
                    <div className="text-sm text-gray-800">{selectedRental.renterAddress || '-'}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-2">Informasi Dokumen</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-600">Nomor PO:</span>
                    <div className="text-sm text-gray-800">{selectedRental.poNumber || '-'}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Nomor DO:</span>
                    <div className="text-sm text-gray-800">{selectedRental.doNumber || '-'}</div>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <h3 className="text-md font-medium text-gray-800 mb-2">Kondisi Barang</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {selectedRental.initialCondition && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Kondisi Awal</h4>
                      <div className="mt-1 bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-600 whitespace-pre-line">{selectedRental.initialCondition}</p>
                      </div>
                    </div>
                  )}

                  {selectedRental.returnCondition && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Kondisi Saat Pengembalian</h4>
                      <div className="mt-1 bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-600 whitespace-pre-line">{selectedRental.returnCondition}</p>
                      </div>
                    </div>
                  )}

                  {/* Return verification form */}
                  {isReturnRequested(selectedRental) && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Verifikasi Pengembalian</h4>
                      <div className="mt-1">
                        <textarea
                          value={statusNotes}
                          onChange={(e) => setStatusNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                          rows={3}
                          placeholder="Masukkan catatan verifikasi pengembalian..."
                        ></textarea>
                        <div className="mt-3 flex space-x-2">
                          <button
                            onClick={() => {
                              setNewStatus(RequestStatus.COMPLETED);
                              handleStatusChange();
                            }}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            disabled={processingAction}
                          >
                            {processingAction ? 'Memproses...' : 'Setujui Pengembalian'}
                          </button>
                          <button
                            onClick={() => {
                              setNewStatus(RequestStatus.REJECTED);
                              handleStatusChange();
                            }}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            disabled={processingAction}
                          >
                            {processingAction ? 'Memproses...' : 'Tolak Pengembalian'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Section */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-md font-medium text-gray-800 mb-3">Aksi</h3>
              
              {/* Status information */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Status Saat Ini:</span> 
                  <span className={`ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedRental.status)}`}>
                    {getRentalStatusText(selectedRental)}
                  </span>
                </p>
              </div>
              
              {/* Action form */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                {selectedRental.status === RequestStatus.PENDING && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Verifikasi Pengajuan Rental</h4>
                    <p className="text-xs text-yellow-700 mb-3">Silakan periksa detail pengajuan rental di atas sebelum menyetujui atau menolak</p>
                  </div>
                )}
                
                {selectedRental.status === RequestStatus.APPROVED && selectedRental.returnDate && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Verifikasi Pengembalian Rental</h4>
                    <p className="text-xs text-yellow-700 mb-2">Kondisi barang saat dikembalikan oleh pengguna:</p>
                    <div className="p-2 bg-white rounded border border-yellow-200 text-xs">
                      {selectedRental.returnCondition || 'Tidak ada informasi kondisi'}
                    </div>
                  </div>
                )}
                
                {/* Update Status */}
            <div className="mb-4">
              <label htmlFor="new-status" className="block text-sm font-medium text-gray-700 mb-1">Status Baru</label>
              <select
                id="new-status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as RequestStatus)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 text-sm"
              >
                <option value="">Pilih Status</option>
                <option value={RequestStatus.PENDING}>Menunggu Persetujuan</option>
                <option value={RequestStatus.APPROVED}>Disetujui</option>
                <option value={RequestStatus.COMPLETED}>Selesai</option>
                <option value={RequestStatus.REJECTED}>Ditolak</option>
                <option value={RequestStatus.CANCELLED}>Dibatalkan</option>
              </select>
            </div>
            
                {/* Return Condition - Show only when completing a return */}
                {newStatus === RequestStatus.COMPLETED && selectedRental.returnDate && (
                  <div className="mb-4">
                    <label htmlFor="returnCondition" className="block text-sm font-medium text-gray-700 mb-1">Catatan Verifikasi Pengembalian:</label>
                    <textarea
                      id="returnCondition"
                      value={returnCondition}
                      onChange={(e) => setReturnCondition(e.target.value)}
                      placeholder="Deskripsikan kondisi barang saat verifikasi pengembalian"
                      rows={3}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                    />
                  </div>
                )}
                
                {/* Notes */}
                <div className="mb-4">
                  <label htmlFor="statusNotes" className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional):</label>
              <textarea
                    id="statusNotes"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Tambahkan catatan untuk perubahan status"
                rows={3}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                  />
            </div>
            
                {/* Action buttons */}
            <div className="flex justify-end space-x-3">
              <button
                    onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                disabled={processingAction}
              >
                    Tutup
                  </button>
                  
                  {selectedRental.status === RequestStatus.PENDING && (
                    <>
                      <button
                        onClick={() => {
                          setNewStatus(RequestStatus.REJECTED);
                          handleStatusChange();
                        }}
                        className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        disabled={processingAction}
                      >
                        Tolak
              </button>
              <button
                        onClick={() => {
                          setNewStatus(RequestStatus.APPROVED);
                          handleStatusChange();
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        disabled={processingAction}
                      >
                        Setujui
                      </button>
                    </>
                  )}
                  
                  {selectedRental.status === RequestStatus.APPROVED && selectedRental.returnDate && (
                    <button
                      onClick={() => {
                        setNewStatus(RequestStatus.COMPLETED);
                        handleStatusChange();
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      disabled={processingAction}
                    >
                      Verifikasi Pengembalian
                    </button>
                  )}
                  
                  {newStatus && newStatus !== selectedRental.status && !(
                    (selectedRental.status === RequestStatus.PENDING && (newStatus === RequestStatus.APPROVED || newStatus === RequestStatus.REJECTED)) ||
                    (selectedRental.status === RequestStatus.APPROVED && selectedRental.returnDate && newStatus === RequestStatus.COMPLETED)
                  ) && (
                    <button
                onClick={handleStatusChange}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      disabled={processingAction}
              >
                      {processingAction ? 'Memproses...' : 'Simpan Perubahan'}
              </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 