'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

// Tipe data untuk status rental
type RentalStatus = 'PENDING' | 'APPROVED' | 'ACTIVE' | 'RETURNED' | 'REJECTED';

type RentalRequest = {
  id: number;
  item: {
    id: number;
    name: string;
    serialNumber: string | null;
    imageUrl: string | null;
  };
  status: RentalStatus;
  requestDate: Date;
  startDate: Date;
  endDate: Date;
  actualReturnDate: Date | null;
  fineAmount: number | null;
  notes: string | null;
  rejectionReason: string | null;
};

export default function UserRentalPage() {
  const [rentals, setRentals] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RentalStatus | 'all'>('all');

  useEffect(() => {
    const fetchRentals = async () => {
      try {
        const response = await fetch('/api/user/rental');
        
        if (!response.ok) {
          throw new Error('Gagal mengambil data rental');
        }
        
        const data = await response.json();
        setRentals(data);
      } catch (err) {
        setError('Error memuat data rental');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRentals();
  }, []);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as RentalStatus | 'all');
  };

  const filteredRentals = statusFilter === 'all'
    ? rentals
    : rentals.filter(rental => rental.status === statusFilter);

  const getStatusBadgeColor = (status: RentalStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800';
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'RETURNED':
        return 'bg-gray-100 text-gray-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status: RentalStatus) => {
    switch (status) {
      case 'PENDING':
        return 'Menunggu Persetujuan';
      case 'APPROVED':
        return 'Disetujui';
      case 'ACTIVE':
        return 'Aktif';
      case 'RETURNED':
        return 'Dikembalikan';
      case 'REJECTED':
        return 'Ditolak';
      default:
        return status;
    }
  };

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const isOverdue = (rental: RentalRequest) => {
    if (rental.status !== 'ACTIVE') return false;
    const today = new Date();
    const endDate = new Date(rental.endDate);
    return today > endDate;
  };

  const getDaysLeft = (rental: RentalRequest) => {
    if (rental.status !== 'ACTIVE') return null;
    
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
            href="/user/rental/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajukan Rental Baru
          </Link>
        </div>

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
                <option value="all">Semua Status</option>
                <option value="PENDING">Menunggu Persetujuan</option>
                <option value="APPROVED">Disetujui</option>
                <option value="ACTIVE">Aktif</option>
                <option value="RETURNED">Dikembalikan</option>
                <option value="REJECTED">Ditolak</option>
              </select>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
            <span className="ml-3 text-lg text-gray-700">Memuat data rental...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {filteredRentals.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada data rental</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {statusFilter === 'all' 
                    ? 'Anda belum pernah melakukan rental barang.' 
                    : `Tidak ada rental dengan status "${getStatusText(statusFilter)}".`}
                </p>
                <div className="mt-6">
                  <Link
                    href="/user/rental/new"
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
                {filteredRentals.map((rental) => (
                  <div key={rental.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                    <div className="p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 h-12 w-12 bg-gray-200 rounded-md overflow-hidden">
                          {rental.item.imageUrl ? (
                            <img 
                              src={rental.item.imageUrl} 
                              alt={rental.item.name} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full w-full bg-gray-200 text-gray-500">
                              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{rental.item.name}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(rental.status)}`}>
                              {getStatusText(rental.status)}
                            </span>
                          </div>
                          {rental.item.serialNumber && (
                            <p className="text-xs text-gray-500">SN: {rental.item.serialNumber}</p>
                          )}
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
                        
                        {rental.status === 'ACTIVE' && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Status Rental:</span>
                              {isOverdue(rental) ? (
                                <span className="text-xs font-medium text-red-600">
                                  Telat {Math.abs(Number(getDaysLeft(rental)))} hari
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-green-600">
                                  {getDaysLeft(rental)} hari tersisa
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className={`h-2 rounded-full ${
                                  isOverdue(rental) ? 'bg-red-500' : 'bg-green-500'
                                }`}
                                style={{ 
                                  width: isOverdue(rental) 
                                    ? '100%' 
                                    : `${(1 - Number(getDaysLeft(rental)) / 
                                        ((new Date(rental.endDate).getTime() - new Date(rental.startDate).getTime()) / 
                                        (1000 * 60 * 60 * 24))) * 100}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                        
                        {rental.status === 'RETURNED' && rental.actualReturnDate && (
                          <div className="mt-3 border-t border-gray-200 pt-3">
                            <p className="text-xs text-gray-500">Dikembalikan pada:</p>
                            <p className="text-sm text-gray-900">{formatDate(rental.actualReturnDate)}</p>
                            {rental.fineAmount && rental.fineAmount > 0 && (
                              <p className="text-xs font-medium text-red-600 mt-1">
                                Denda: Rp {rental.fineAmount.toLocaleString('id-ID')}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {rental.status === 'REJECTED' && rental.rejectionReason && (
                          <div className="mt-3 border-t border-gray-200 pt-3">
                            <p className="text-xs text-gray-500">Alasan Penolakan:</p>
                            <p className="text-sm text-red-600">{rental.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4">
                        <Link
                          href={`/user/rental/${rental.id}`}
                          className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Lihat Detail
                        </Link>
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