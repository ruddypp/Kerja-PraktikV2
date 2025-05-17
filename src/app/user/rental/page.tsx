'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { RequestStatus } from '@prisma/client';

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

export default function UserRentalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const successParam = searchParams.get('success');
  
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

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
    const fetchRentals = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/user/rentals${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch rental data');
        }
        
        const data = await response.json();
        setRentals(data);
        setError(null);
      } catch (err) {
        setError('Error loading rental data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRentals();
  }, [statusFilter]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as RequestStatus | 'ALL');
  };

  const handleReturnRequest = async (rentalId: string) => {
    try {
      const response = await fetch(`/api/user/rentals/${rentalId}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: 'User initiated return' }),
      });

      if (!response.ok) {
        throw new Error('Failed to process return request');
      }

      // Update the local state to reflect the return request
      setRentals(prevRentals =>
        prevRentals.map(rental =>
          rental.id === rentalId ? { ...rental, returnDate: new Date().toISOString() } : rental
        )
      );

      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    } catch (err) {
      setError('Error processing return request');
      console.error(err);
    }
  };

  const getStatusBadgeColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case RequestStatus.APPROVED:
        return 'bg-blue-100 text-blue-800';
      case RequestStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
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

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">Rental Barang</h1>
          <Link
            href="/user/rentals/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajukan Rental Baru
          </Link>
        </div>

        {showSuccessMessage && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-green-700 mb-6">
            <p>Permintaan berhasil diproses!</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 mb-6">
            <p>{error}</p>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className="w-full sm:w-64">
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Filter Status</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={handleStatusChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
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
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
            <span className="ml-3 text-lg text-gray-700">Memuat data rental...</span>
          </div>
        ) : (
          <>
            {rentals.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada data rental</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {statusFilter === 'ALL' 
                    ? 'Anda belum pernah melakukan rental barang.' 
                    : `Tidak ada rental dengan status "${getStatusText(statusFilter)}".`}
                </p>
                <div className="mt-6">
                  <Link
                    href="/user/rentals/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Ajukan Rental Baru
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rentals.map((rental) => (
                  <div key={rental.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                    <div className="p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 h-12 w-12 bg-gray-200 rounded-md overflow-hidden flex items-center justify-center">
                          <svg className="h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{rental.item.name}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(rental.status)}`}>
                              {getStatusText(rental.status)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">SN: {rental.item.serialNumber}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Tanggal Mulai</p>
                            <p className="text-sm text-gray-900">{formatDate(rental.startDate)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Tanggal Selesai</p>
                            <p className="text-sm text-gray-900">{formatDate(rental.endDate)}</p>
                          </div>
                        </div>
                        
                        {rental.status === RequestStatus.APPROVED && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">Sisa Waktu</p>
                            <div className={`text-sm ${isOverdue(rental) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                              {rental.endDate ? (
                                isOverdue(rental) ? (
                                  <>
                                    <span>Terlambat {Math.abs(Number(getDaysLeft(rental)))} hari</span>
                                  </>
                                ) : (
                                  <>{getDaysLeft(rental)} hari lagi</>
                                )
                              ) : (
                                <>Tidak ada batas waktu</>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {rental.returnDate && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">Tanggal Pengembalian</p>
                            <p className="text-sm text-gray-900">{formatDate(rental.returnDate)}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        {rental.status === RequestStatus.APPROVED && !rental.returnDate && (
                          <button
                            onClick={() => handleReturnRequest(rental.id)}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Kembalikan Barang
                          </button>
                        )}
                        
                        {rental.status === RequestStatus.APPROVED && rental.returnDate && (
                          <div className="text-center text-sm text-gray-500">
                            Menunggu verifikasi pengembalian
                          </div>
                        )}
                        
                        {rental.status === RequestStatus.PENDING && (
                          <div className="text-center text-sm text-gray-500">
                            Menunggu persetujuan admin
                          </div>
                        )}
                        
                        {rental.status === RequestStatus.REJECTED && (
                          <div className="text-center text-sm text-red-500">
                            Permintaan ditolak
                          </div>
                        )}
                        
                        {rental.status === RequestStatus.COMPLETED && (
                          <div className="text-center text-sm text-green-500">
                            Rental selesai
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 