"use client";

import { useState, useEffect } from "react";
import { RequestStatus, ItemStatus } from "@prisma/client";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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

export default function RentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "ALL">("ALL");
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [newStatus, setNewStatus] = useState<RequestStatus | "">("");
  const [statusNotes, setStatusNotes] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    fetchRentals();
  }, [statusFilter, dateFilter]);

  async function fetchRentals() {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") {
        params.append("status", statusFilter);
      }
      if (dateFilter.startDate) {
        params.append("startDate", dateFilter.startDate);
      }
      if (dateFilter.endDate) {
        params.append("endDate", dateFilter.endDate);
      }
      
      const response = await fetch(`/api/admin/rentals?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch rental requests');
      }
      
      const data = await response.json();
      setRentals(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.PENDING:
        return "bg-yellow-100 text-yellow-800";
      case RequestStatus.APPROVED:
        return "bg-blue-100 text-blue-800";
      case RequestStatus.COMPLETED:
        return "bg-green-100 text-green-800";
      case RequestStatus.REJECTED:
        return "bg-red-100 text-red-800";
      case RequestStatus.CANCELLED:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd MMMM yyyy", { locale: id });
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
      
      // Refresh rentals list
      fetchRentals();
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

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Manajemen Rental</h1>
        
        {error && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 mb-6">
            <p>{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RequestStatus | "ALL")}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
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
                onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
              <input
                type="date"
                id="end-date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Rentals Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-lg text-gray-700">Memuat data rental...</span>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            {rentals.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>Tidak ada data rental yang sesuai dengan filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                            {rental.status}
                          </span>
                          {rental.returnDate && rental.status === RequestStatus.APPROVED && (
                            <div className="text-xs text-blue-600 mt-1">
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
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => handleReject(rental)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                              >
                                Tolak
                              </button>
                            </div>
                          )}
                          {rental.status === RequestStatus.APPROVED && rental.returnDate && (
                            <button
                              onClick={() => handleComplete(rental)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                            >
                              Verifikasi Pengembalian
                            </button>
                          )}
                          {rental.status === RequestStatus.APPROVED && !rental.returnDate && (
                            <span className="text-blue-600">Sedang Dipinjam</span>
                          )}
                          {(rental.status === RequestStatus.COMPLETED || 
                            rental.status === RequestStatus.REJECTED ||
                            rental.status === RequestStatus.CANCELLED) && (
                            <button
                              onClick={() => openStatusModal(rental)}
                              className="text-gray-600 hover:text-gray-900"
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
            )}
          </div>
        )}
      </div>

      {/* Status Change Modal */}
      {showStatusModal && selectedRental && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ubah Status Rental</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Barang: {selectedRental.item.name}</p>
              <p className="text-sm text-gray-600 mb-1">Peminjam: {selectedRental.user.name}</p>
              <p className="text-sm text-gray-600">Status Saat Ini: <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedRental.status)}`}>
                {selectedRental.status}
              </span></p>
            </div>
            
            <div className="mb-4">
              <label htmlFor="new-status" className="block text-sm font-medium text-gray-700 mb-1">Status Baru</label>
              <select
                id="new-status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as RequestStatus)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                <option value="">Pilih Status</option>
                <option value={RequestStatus.PENDING}>Menunggu Persetujuan</option>
                <option value={RequestStatus.APPROVED}>Disetujui</option>
                <option value={RequestStatus.COMPLETED}>Selesai</option>
                <option value={RequestStatus.REJECTED}>Ditolak</option>
                <option value={RequestStatus.CANCELLED}>Dibatalkan</option>
              </select>
            </div>
            
            <div className="mb-6">
              <label htmlFor="status-notes" className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
              <textarea
                id="status-notes"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                rows={3}
                placeholder="Tambahkan catatan (opsional)"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                disabled={processingAction}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleStatusChange}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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