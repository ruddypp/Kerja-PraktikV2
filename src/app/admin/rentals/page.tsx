"use client";

import { useState, useEffect } from "react";
import { RequestStatus, ItemStatus } from "@prisma/client";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import useSWR from "swr";
import Link from "next/link";
import { FiTrash2 } from "react-icons/fi";
import { toast } from 'react-hot-toast';

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

export default function RentalsPage() {
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "ALL">("ALL");
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [newStatus, setNewStatus] = useState<RequestStatus | "">("");
  const [statusNotes, setStatusNotes] = useState("");
  const [processingAction, setProcessingAction] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [returnCondition, setReturnCondition] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [rentalToDelete, setRentalToDelete] = useState<Rental | null>(null);

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
        const response = await fetch(`/api/admin/rentals/${selectedRental.id}/return`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            verificationNotes: statusNotes || 'Return verified by admin'
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to verify rental return');
        }
        
        // Show success toast for verification
        toast.success('Return rental berhasil diverifikasi');
      } else {
        // Regular status update
        const response = await fetch('/api/admin/rentals', {
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
      
      // Show success toast notification
      toast.success('Status rental berhasil diperbarui');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui status rental');
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
  };

  const handleReject = (rental: Rental) => {
    viewRentalDetails(rental);
    setNewStatus(RequestStatus.REJECTED);
  };

  const handleComplete = (rental: Rental) => {
    viewRentalDetails(rental);
    setNewStatus(RequestStatus.COMPLETED);
  };

  const handleDelete = (rental: Rental) => {
    setRentalToDelete(rental);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!rentalToDelete) return;
    
    try {
      setProcessingAction(true);
      
      const response = await fetch(`/api/admin/rentals/${rentalToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete rental');
      }

      const result = await response.json();
      
      // Close modal and reset
      setDeleteModalOpen(false);
      setRentalToDelete(null);
      
      // Refresh rentals list using SWR to remove deleted item from UI
      mutate();
      
      // Show success toast notification
      toast.success('Rental berhasil dihapus secara permanen');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred while deleting rental');
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus rental');
    } finally {
      setProcessingAction(false);
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
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Rental Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage all equipment rental requests</p>
            </div>
            <div className="flex gap-2">
            <Link
              href="/admin/rentals/new"
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
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            {/* Desktop view - Table */}
            <div className="hidden md:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renter</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penanggung Jawab</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rentals.map((rental) => (
                        <tr key={rental.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{rental.item.name}</div>
                            <div className="text-xs text-gray-500">{rental.item.serialNumber}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{rental.renterName || '-'}</div>
                        <div className="text-xs text-gray-500">{rental.renterPhone || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{rental.user.name}</div>
                        <div className="text-xs text-gray-500">{rental.user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">Start: {formatDate(rental.startDate)}</div>
                        <div className="text-sm text-gray-500">End: {formatDate(rental.endDate)}</div>
                        {rental.returnDate && (
                          <div className="text-xs text-green-600">Returned: {formatDate(rental.returnDate)}</div>
                        )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(rental.status)}`}>
                              {getRentalStatusText(rental)}
                            </span>
                          </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button
                            onClick={() => viewRentalDetails(rental)}
                            className="text-green-600 hover:text-green-900 focus:outline-none focus:underline"
                                >
                            Details
                                </button>
                          {rental.status === RequestStatus.PENDING && (
                            <>
                                <button
                                onClick={() => handleApprove(rental)}
                                className="text-green-600 hover:text-green-900 focus:outline-none focus:underline"
                                >
                                Approve
                                </button>
                              <button
                                onClick={() => handleReject(rental)}
                                className="text-red-600 hover:text-red-900 focus:outline-none focus:underline"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {rental.status === RequestStatus.APPROVED && (
                              <button
                              onClick={() => handleComplete(rental)}
                              className="text-blue-600 hover:text-blue-900 focus:outline-none focus:underline"
                              >
                              Complete
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(rental)}
                              className="text-red-600 hover:text-red-900 focus:outline-none focus:underline"
                              title="Delete Rental"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                        </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

            {/* Mobile/Tablet view - Cards */}
            <div className="block md:hidden">
              <div className="divide-y divide-gray-200">
                  {rentals.map((rental) => (
                  <div key={rental.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{rental.item.name}</h3>
                            <p className="text-xs text-gray-500">SN: {rental.item.serialNumber}</p>
                          </div>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(rental.status)}`}>
                            {getRentalStatusText(rental)}
                          </span>
                        </div>
                        
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Renter:</p>
                        <p className="font-medium">{rental.renterName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Phone:</p>
                        <p className="font-medium">{rental.renterPhone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Penanggung Jawab:</p>
                        <p className="font-medium">{rental.user.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Email PJ:</p>
                        <p className="font-medium">{rental.user.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Start Date:</p>
                        <p className="font-medium">{formatDate(rental.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">End Date:</p>
                        <p className="font-medium">{formatDate(rental.endDate)}</p>
                      </div>
                          {rental.returnDate && (
                            <div className="col-span-2">
                          <p className="text-gray-500">Return Date:</p>
                          <p className="font-medium text-green-600">{formatDate(rental.returnDate)}</p>
                            </div>
                          )}
                        </div>
                        
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => viewRentalDetails(rental)}
                        className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-md hover:bg-green-100"
                      >
                        Details
                      </button>
                          {rental.status === RequestStatus.PENDING && (
                        <>
                              <button
                                onClick={() => handleApprove(rental)}
                            className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-md hover:bg-green-100"
                              >
                            Approve
                              </button>
                              <button
                                onClick={() => handleReject(rental)}
                            className="px-3 py-1 bg-red-50 text-red-700 text-xs rounded-md hover:bg-red-100"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {rental.status === RequestStatus.APPROVED && (
                        <button
                          onClick={() => handleComplete(rental)}
                          className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-md hover:bg-blue-100"
                        >
                          Complete
                              </button>
                      )}
                      <button
                        onClick={() => handleDelete(rental)}
                        className="px-3 py-1 bg-red-50 text-red-700 text-xs rounded-md hover:bg-red-100 flex items-center gap-1"
                        title="Delete Rental"
                      >
                        <FiTrash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
                            </div>
                          )}
                          
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

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && rentalToDelete && (
          <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center" onClick={() => setDeleteModalOpen(false)}>
            <div className="fixed inset-0 backdrop-blur-sm bg-transparent"></div>
            <div 
              className="bg-white rounded-lg shadow-xl overflow-hidden w-full max-w-md mx-4 z-10 relative" 
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-red-600 px-6 py-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white">Confirm Delete</h3>
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    className="text-white hover:text-gray-200 focus:outline-none"
                    title="Close"
                  >
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <FiTrash2 className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900">Delete Rental</h4>
                    <p className="text-sm text-gray-500">This action will cancel the rental and cannot be undone.</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-md p-4 mb-4">
                  <div className="text-sm">
                    <p><span className="font-medium">Item:</span> {rentalToDelete.item.name}</p>
                    <p><span className="font-medium">Serial:</span> {rentalToDelete.item.serialNumber}</p>
                    <p><span className="font-medium">Renter:</span> {rentalToDelete.renterName || '-'}</p>
                    <p><span className="font-medium">Status:</span> {getRentalStatusText(rentalToDelete)}</p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    disabled={processingAction}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={processingAction}
                  >
                    {processingAction ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </span>
                    ) : (
                      'Delete Rental'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
                          
        {/* Rental Detail Modal */}
        {detailModalOpen && selectedRental && (
          <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center" onClick={() => setDetailModalOpen(false)}>
            <div className="fixed inset-0 backdrop-blur-sm"></div>
            <div 
              className="bg-white rounded-lg shadow-xl overflow-hidden w-full max-w-xl mx-4 z-10 relative" 
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-green-600 px-6 py-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white">Rental Details</h3>
                            <button
                    onClick={() => setDetailModalOpen(false)}
                    className="text-white hover:text-gray-200 focus:outline-none"
                    title="Close"
                            >
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                        </div>
                      </div>
              
              <div className="p-5 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Item Information</h4>
                    <p className="text-base font-medium text-gray-900">{selectedRental.item.name}</p>
                    <p className="text-sm text-gray-600">Serial: {selectedRental.item.serialNumber}</p>
                    <p className="text-sm text-gray-600">Part Number: {selectedRental.item.partNumber}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Renter Information</h4>
                    <p className="text-base font-medium text-gray-900">{selectedRental.renterName || '-'}</p>
                    <p className="text-sm text-gray-600">
                      {selectedRental.renterPhone && `Phone: ${selectedRental.renterPhone}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedRental.renterAddress && `Address: ${selectedRental.renterAddress}`}
                    </p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Penanggung Jawab</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-base font-medium text-gray-900">{selectedRental.user.name}</p>
                    <p className="text-sm text-gray-600">Email: {selectedRental.user.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Start Date</h4>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedRental.startDate)}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">End Date</h4>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedRental.endDate)}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedRental.status)}`}>
                      {getRentalStatusText(selectedRental)}
                    </span>
                  </div>
                </div>
                
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
                
                {selectedRental.statusLogs && selectedRental.statusLogs.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Status History</h4>
                    <div className="bg-gray-50 rounded-md p-3">
                      <ul className="space-y-3">
                        {selectedRental.statusLogs.map((log) => (
                          <li key={log.id} className="flex space-x-2 text-sm">
                            <div className="flex-shrink-0 pt-0.5">
                              <div className="h-2 w-2 rounded-full bg-green-600"></div>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                Status changed to {getStatusText(log.status)}
                              </p>
                              <p className="text-gray-500">
                                By {log.changedBy.name} on {format(new Date(log.createdAt), "dd MMM yyyy HH:mm")}
                              </p>
                              {log.notes && <p className="text-gray-600 mt-1">{log.notes}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
      </div>
                )}

                {/* Status Change Form */}
                {selectedRental.status !== RequestStatus.COMPLETED && 
                 selectedRental.status !== RequestStatus.CANCELLED && 
                 !isReturnRequested(selectedRental) && (
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Update Status</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="newStatus" className="block text-sm font-medium text-gray-700 mb-1">
                          New Status
                        </label>
              <select
                          id="newStatus"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as RequestStatus)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                          <option value="">Select a status</option>
                          {selectedRental.status === RequestStatus.PENDING && (
                            <>
                              <option value={RequestStatus.APPROVED}>Approve</option>
                              <option value={RequestStatus.REJECTED}>Reject</option>
                            </>
                          )}
                          {selectedRental.status === RequestStatus.APPROVED && (
                            <option value={RequestStatus.COMPLETED}>Complete</option>
                          )}
              </select>
            </div>
            
                      <div>
                        <label htmlFor="statusNotes" className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
              <textarea
                          id="statusNotes"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                          placeholder="Add notes about this status change"
              ></textarea>
            </div>
            
                      {newStatus === RequestStatus.COMPLETED && (
                        <div>
                          <label htmlFor="returnCondition" className="block text-sm font-medium text-gray-700 mb-1">
                            Return Condition
                          </label>
                          <textarea
                            id="returnCondition"
                            value={returnCondition}
                            onChange={(e) => setReturnCondition(e.target.value)}
                            rows={3}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                            placeholder="Describe the condition of the item upon return"
                          ></textarea>
                        </div>
                      )}
                      
                      <div className="flex justify-end">
              <button
                type="button"
                          onClick={() => setDetailModalOpen(false)}
                          className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                          Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusChange}
                disabled={!newStatus || processingAction}
                          className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                            !newStatus || processingAction
                              ? 'bg-green-300 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
              >
                          {processingAction ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            'Update Status'
                          )}
              </button>
            </div>
          </div>
        </div>
      )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}