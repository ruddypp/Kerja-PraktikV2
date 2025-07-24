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

type Customer = {
  id: string;
  name: string;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
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

type CustomersResponse = {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Customer form data
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [debouncedCustomerSearchTerm, setDebouncedCustomerSearchTerm] = useState('');
  const [renterName, setRenterName] = useState('');
  const [renterPhone, setRenterPhone] = useState('');
  const [renterAddress, setRenterAddress] = useState('');
  const [initialCondition, setInitialCondition] = useState('');

  // Debounce search term to reduce API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Debounce customer search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerSearchTerm(customerSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearchTerm]);

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
  
  // Fetch current user
  const { data: currentUserData, error: currentUserError } = useSWR<{user: User}>(
    '/api/auth/me',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Dedupe requests within 60 seconds
    }
  );
  
  // Fetch customers list
  const customersApiUrl = `/api/customers?limit=100${
    debouncedCustomerSearchTerm ? `&search=${encodeURIComponent(debouncedCustomerSearchTerm)}` : ''
  }`;
  
  const { data: customersData, error: customersError } = useSWR<CustomersResponse>(
    customersApiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
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
    } else if (customersError) {
      setError('Error loading customers. Please try again later.');
      console.error('Error fetching customers:', customersError);
    } else if (currentUserError) {
      setError('Error loading your user information. Please try again later.');
      console.error('Error fetching current user:', currentUserError);
    } else {
      setError(null);
    }
  }, [swrError, usersError, customersError, currentUserError]);
  
  // Set current user when data is loaded
  useEffect(() => {
    if (currentUserData?.user) {
      setCurrentUser(currentUserData.user);
    }
  }, [currentUserData]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerSearchTerm(e.target.value);
  };

  const selectItem = (itemSerial: string) => {
    setSelectedItemSerial(itemSerial);
  };
  
  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setRenterName(customer.name);
    setRenterPhone(customer.contactPhone || '');
    setRenterAddress(customer.address || '');
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
    
    if (!renterName) {
      setError('Please enter the renter name');
      return;
    }
    
    if (!renterPhone) {
      setError('Please enter the renter phone number');
      return;
    }
    
    if (!renterAddress) {
      setError('Please enter the renter address');
      return;
    }
    
    if (!initialCondition) {
      setError('Please describe the initial condition of the item');
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
          customerId: selectedCustomerId || null, // Customer as renter
          renterName,
          renterPhone,
          renterAddress,
          initialCondition
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
  const customers = customersData?.items || [];

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
              <h2 className="text-lg font-medium text-gray-800">2. Penanggung Jawab</h2>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Penanggung Jawab Rental
                </h3>
                
                {currentUserError ? (
                  <div className="p-4 text-center text-red-500 rounded-lg bg-red-50 border border-red-100">
                    <p>Gagal memuat informasi pengguna. Silakan coba lagi nanti.</p>
                  </div>
                ) : !currentUserData ? (
                  <div className="flex items-center justify-center h-20 bg-gray-50 rounded-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-600"></div>
                    <span className="ml-3 text-sm text-gray-700">Memuat informasi pengguna...</span>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="flex items-start">
                      <div className="bg-green-100 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-800">{currentUserData.user.name}</p>
                        <p className="text-xs text-gray-500">{currentUserData.user.email}</p>
                        <p className="text-xs text-green-600 mt-1">Anda akan tercatat sebagai penanggung jawab rental ini</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white">
              <h2 className="text-lg font-medium text-gray-800">3. Pilih Customer</h2>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Pilih Customer <span className="text-gray-500 text-xs ml-1">(Peminjam)</span>
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="mb-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Cari customer..."
                        value={customerSearchTerm}
                        onChange={handleCustomerSearchChange}
                        className="block w-full pl-10 pr-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 transition-shadow duration-200"
                      />
                    </div>
                  </div>
                  
                  {customersError ? (
                    <div className="p-4 text-center text-red-500 rounded-lg bg-red-50 border border-red-100">
                      <p>Gagal memuat daftar customer. Silakan coba lagi nanti.</p>
                    </div>
                  ) : !customersData ? (
                    <div className="flex items-center justify-center h-20">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-600"></div>
                      <span className="ml-3 text-sm text-gray-700">Memuat daftar customer...</span>
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 rounded-lg bg-gray-50">
                      <p>Tidak ada customer yang ditemukan</p>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                      <ul className="divide-y divide-gray-200">
                        {customers.map((customer) => (
                          <li 
                            key={customer.id}
                            onClick={() => handleCustomerSelect(customer)}
                            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                              selectedCustomerId === customer.id ? 'bg-green-50 border-l-4 border-green-500' : ''
                            }`}
                          >
                            <div className="flex justify-between">
                              <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                              {selectedCustomerId === customer.id && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            {customer.contactName && (
                              <div className="text-xs text-gray-500">Contact: {customer.contactName}</div>
                            )}
                            {customer.contactPhone && (
                              <div className="text-xs text-gray-500">Phone: {customer.contactPhone}</div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Informasi Peminjam
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div>
                    <label htmlFor="renter-name" className="block text-sm font-medium text-gray-700 mb-1">Nama Peminjam <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="renter-name"
                        value={renterName}
                        onChange={(e) => setRenterName(e.target.value)}
                        placeholder="Masukkan nama peminjam"
                        className="block w-full pl-10 pr-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 transition-shadow duration-200"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="renter-phone" className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="renter-phone"
                        value={renterPhone}
                        onChange={(e) => setRenterPhone(e.target.value)}
                        placeholder="Masukkan nomor telepon"
                        className="block w-full pl-10 pr-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 transition-shadow duration-200"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Alamat Peminjam
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="relative">
                    <textarea
                      id="renter-address"
                      value={renterAddress}
                      onChange={(e) => setRenterAddress(e.target.value)}
                      placeholder="Masukkan alamat peminjam"
                      rows={3}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Kondisi Barang
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <label htmlFor="initial-condition" className="block text-sm font-medium text-gray-700 mb-1">Kondisi Barang Sebelum Dipinjam <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <textarea
                      id="initial-condition"
                      value={initialCondition}
                      onChange={(e) => setInitialCondition(e.target.value)}
                      placeholder="Deskripsikan kondisi barang saat ini sebelum dipinjam"
                      rows={4}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white">
              <h2 className="text-lg font-medium text-gray-800">4. Detail Rental</h2>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Periode Rental
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                  <input
                    type="date"
                    id="start-date"
                    min={getToday()}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 transition-shadow duration-200"
                    required
                  />
                    </div>
                </div>
                
                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                  <input
                    type="date"
                    id="end-date"
                    min={startDate || getToday()}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 transition-shadow duration-200"
                  />
                    </div>
                  <p className="mt-1 text-xs text-gray-500">Opsional. Jika tidak diisi, maka rental tidak memiliki batas waktu.</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Informasi Dokumen
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div>
                    <label htmlFor="po-number" className="block text-sm font-medium text-gray-700 mb-1">Nomor PO</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                    <input
                      type="text"
                      id="po-number"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="Masukkan nomor PO (opsional)"
                        className="block w-full pl-10 pr-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 transition-shadow duration-200"
                    />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="do-number" className="block text-sm font-medium text-gray-700 mb-1">Nomor DO</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                    <input
                      type="text"
                      id="do-number"
                      value={doNumber}
                      onChange={(e) => setDoNumber(e.target.value)}
                      placeholder="Masukkan nomor DO (opsional)"
                        className="block w-full pl-10 pr-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 transition-shadow duration-200"
                    />
                    </div>
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
} ``