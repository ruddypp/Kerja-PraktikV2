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

export default function RentalsPage() {
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
    
    return `/api/admin/rentals?${params.toString()}`;
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd MMMM yyyy");
  };

  const handleStatusChange = async () => {
    if (!selectedRental || !newStatus) return;
    
    try {
      setProcessingAction(true);
      
      const response = await fetch('/api/admin/rentals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedRental.id,
          status: newStatus,
          notes: statusNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update rental status');
      }

      // Close modal and reset form
      setShowStatusModal(false);
      setSelectedRental(null);
      setNewStatus("");
      setStatusNotes("");
      
      // Refresh rentals list using SWR
      mutate();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setProcessingAction(false);
    }
  };

  const openStatusModal = (rental: Rental, defaultStatus?: RequestStatus) => {
    setSelectedRental(rental);
    setNewStatus(defaultStatus || "");
    setStatusNotes("");
    setShowStatusModal(true);
  };

  const handleApprove = (rental: Rental) => {
    openStatusModal(rental, RequestStatus.APPROVED);
  };

  const handleReject = (rental: Rental) => {
    openStatusModal(rental, RequestStatus.REJECTED);
  };

  const handleComplete = (rental: Rental) => {
    openStatusModal(rental, RequestStatus.COMPLETED);
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
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Daftar Rental Barang</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => mutate()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <Link
              href="/admin/rentals/new"
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Tambah Rental
            </Link>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 p-3 md:p-4 rounded-lg border border-red-200 text-red-700 mb-6 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Filter Section */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-200">
          <h2 className="text-base md:text-lg font-medium text-gray-800 mb-3">Filter Rental</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RequestStatus | "ALL")}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 text-sm"
              >
                <option value="ALL">Semua Status</option>
                <option value={RequestStatus.PENDING}>Menunggu Persetujuan</option>
                <option value={RequestStatus.APPROVED}>Disetujui</option>
                <option value={RequestStatus.COMPLETED}>Selesai</option>
                <option value={RequestStatus.REJECTED}>Ditolak</option>
                <option value={RequestStatus.CANCELLED}>Dibatalkan</option>
              </select>
            </div>
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                id="start-date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 text-sm"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
              <input
                type="date"
                id="end-date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 text-sm"
              />
            </div>
          </div>
        </div>

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
                          Dokumen
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
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{rental.item.name}</div>
                                <div className="text-sm text-gray-500">SN: {rental.item.serialNumber}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{rental.user.name}</div>
                            <div className="text-sm text-gray-500">{rental.user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(rental.status)}`}>
                              {getStatusText(rental.status)}
                            </span>
                            {rental.returnDate && rental.status === RequestStatus.APPROVED && (
                              <div className="text-xs text-green-600 mt-1">
                                Pengembalian diajukan
                              </div>
                            )}
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {rental.poNumber && <div>PO: {rental.poNumber}</div>}
                              {rental.doNumber && <div>DO: {rental.doNumber}</div>}
                              {!rental.poNumber && !rental.doNumber && "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {rental.status === RequestStatus.PENDING && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleApprove(rental)}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors duration-200 shadow-sm"
                                >
                                  Setujui
                                </button>
                                <button
                                  onClick={() => handleReject(rental)}
                                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors duration-200 shadow-sm"
                                >
                                  Tolak
                                </button>
                              </div>
                            )}
                            {rental.status === RequestStatus.APPROVED && rental.returnDate && (
                              <button
                                onClick={() => handleComplete(rental)}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors duration-200 shadow-sm"
                              >
                                Verifikasi Pengembalian
                              </button>
                            )}
                            {rental.status === RequestStatus.APPROVED && !rental.returnDate && (
                              <span className="text-green-600">Sedang Dipinjam</span>
                            )}
                            {(rental.status === RequestStatus.COMPLETED || 
                              rental.status === RequestStatus.REJECTED ||
                              rental.status === RequestStatus.CANCELLED) && (
                              <button
                                onClick={() => openStatusModal(rental)}
                                className="text-gray-600 hover:text-gray-900 underline"
                              >
                                Ubah Status
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
                            {getStatusText(rental.status)}
                          </span>
                        </div>
                        
                        <div className="border-t border-gray-100 -mx-4 px-4 py-2 mb-2 bg-gray-50">
                          <p className="text-xs text-gray-700">
                            <span className="font-medium">Peminjam:</span> {rental.user.name}
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
                          
                          {(rental.poNumber || rental.doNumber) && (
                            <div className="col-span-2">
                              <p className="text-gray-500 font-medium">Dokumen</p>
                              <div>
                                {rental.poNumber && <span className="mr-3">PO: {rental.poNumber}</span>}
                                {rental.doNumber && <span>DO: {rental.doNumber}</span>}
                              </div>
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
                          
                          {rental.status === RequestStatus.APPROVED && !rental.returnDate && (
                            <div className="flex items-center justify-center text-xs text-green-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Sedang Dipinjam
                            </div>
                          )}
                          
                          {(rental.status === RequestStatus.COMPLETED || 
                            rental.status === RequestStatus.REJECTED ||
                            rental.status === RequestStatus.CANCELLED) && (
                            <button
                              onClick={() => openStatusModal(rental)}
                              className="w-full text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-3 py-2 text-xs flex items-center justify-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Ubah Status
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

      {/* Status Change Modal */}
      {showStatusModal && selectedRental && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">Ubah Status Rental</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Barang:</span> {selectedRental.item.name}</p>
              <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Peminjam:</span> {selectedRental.user.name}</p>
              <p className="text-sm text-gray-600 mb-3"><span className="font-medium">Status Saat Ini:</span> <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedRental.status)}`}>
                {getStatusText(selectedRental.status)}
              </span></p>
            </div>
            
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
            
            <div className="mb-5">
              <label htmlFor="status-notes" className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
              <textarea
                id="status-notes"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 text-sm"
                rows={3}
                placeholder="Tambahkan catatan (opsional)"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                disabled={processingAction}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleStatusChange}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                disabled={!newStatus || processingAction}
              >
                {processingAction ? 'Memproses...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 