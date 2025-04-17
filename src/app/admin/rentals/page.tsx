"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RentalStatus } from "@prisma/client";

// Define RentalRequest type
type RentalRequest = {
  id: string;
  userId: string;
  itemId: string;
  startDate: Date;
  endDate: Date;
  requestDate: Date;
  status: RentalStatus;
  user: {
    name: string;
  };
  item: {
    name: string;
  };
};

export default function RentalsPage() {
  const [rentals, setRentals] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RentalStatus | "ALL">("ALL");

  useEffect(() => {
    async function fetchRentals() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/rentals');
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

    fetchRentals();
  }, []);

  const getStatusColor = (status: RentalStatus) => {
    switch (status) {
      case RentalStatus.PENDING:
        return "bg-yellow-100 text-yellow-800";
      case RentalStatus.APPROVED:
        return "bg-green-100 text-green-800";
      case RentalStatus.REJECTED:
        return "bg-red-100 text-red-800";
      case RentalStatus.RETURNED:
        return "bg-blue-100 text-blue-800";
      case RentalStatus.ACTIVE:
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredRentals = statusFilter === "ALL" 
    ? rentals 
    : rentals.filter(rental => rental.status === statusFilter);

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch('/api/admin/rentals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status: RentalStatus.APPROVED,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve rental request');
      }

      // Update the local state
      setRentals(prevRentals =>
        prevRentals.map(rental =>
          rental.id === id ? { ...rental, status: RentalStatus.APPROVED } : rental
        )
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const response = await fetch('/api/admin/rentals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status: RentalStatus.REJECTED,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject rental request');
      }

      // Update the local state
      setRentals(prevRentals =>
        prevRentals.map(rental =>
          rental.id === id ? { ...rental, status: RentalStatus.REJECTED } : rental
        )
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleMarkReturned = async (id: string) => {
    try {
      const response = await fetch('/api/admin/rentals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status: RentalStatus.RETURNED,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark rental as returned');
      }

      // Update the local state
      setRentals(prevRentals =>
        prevRentals.map(rental =>
          rental.id === id ? { ...rental, status: RentalStatus.RETURNED } : rental
        )
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Rental Requests</h1>
          <div className="flex items-center space-x-2">
            <label htmlFor="status-filter" className="font-medium">
              Filter by status:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RentalStatus | "ALL")}
              className="border rounded p-2"
            >
              <option value="ALL">All</option>
              {Object.values(RentalStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center p-4">Loading rental requests...</div>
        ) : error ? (
          <div className="text-red-500 p-4">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left">ID</th>
                  <th className="py-2 px-4 text-left">Requestor</th>
                  <th className="py-2 px-4 text-left">Item</th>
                  <th className="py-2 px-4 text-left">Status</th>
                  <th className="py-2 px-4 text-left">Rental Period</th>
                  <th className="py-2 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRentals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 px-4 text-center">
                      No rental requests found.
                    </td>
                  </tr>
                ) : (
                  filteredRentals.map((rental) => (
                    <tr key={rental.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{rental.id.slice(0, 8)}</td>
                      <td className="py-2 px-4">{rental.user.name}</td>
                      <td className="py-2 px-4">{rental.item.name}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rental.status)}`}>
                          {rental.status}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        {new Date(rental.startDate).toLocaleDateString()} - {new Date(rental.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-4">
                        {rental.status === RentalStatus.PENDING && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApprove(rental.id)}
                              className="bg-green-500 text-white px-2 py-1 rounded text-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(rental.id)}
                              className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {rental.status === RentalStatus.APPROVED && (
                          <button
                            onClick={() => handleMarkReturned(rental.id)}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                          >
                            Mark as Returned
                          </button>
                        )}
                        {rental.status === RentalStatus.RETURNED && (
                          <span className="text-gray-500 text-sm">Completed</span>
                        )}
                        {rental.status === RentalStatus.REJECTED && (
                          <span className="text-gray-500 text-sm">Rejected</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 