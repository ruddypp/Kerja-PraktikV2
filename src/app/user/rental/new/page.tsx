'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

type Item = {
  id: number;
  name: string;
  serialNumber: string | null;
  category: string;
  status: string;
  imageUrl: string | null;
};

export default function NewRentalRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Form data
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  // Get available items
  useEffect(() => {
    const fetchAvailableItems = async () => {
      try {
        const response = await fetch('/api/user/rental/available-items');
        
        if (!response.ok) {
          throw new Error('Gagal mengambil data barang');
        }
        
        const data = await response.json();
        setItems(data);
        setFilteredItems(data);
        
        // Extract unique categories with proper typing
        const uniqueCategories = Array.from(
          new Set(data.map((item: Item) => item.category))
        ) as string[];
        
        setCategories(uniqueCategories);
      } catch (err) {
        setError('Error memuat data barang');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableItems();
  }, []);

  // Filter items based on search and category
  useEffect(() => {
    let results = items;
    
    if (searchTerm) {
      results = results.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (selectedCategory !== 'all') {
      results = results.filter(item => item.category === selectedCategory);
    }
    
    setFilteredItems(results);
  }, [searchTerm, selectedCategory, items]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const selectItem = (itemId: number) => {
    setSelectedItemId(itemId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItemId) {
      setError('Silakan pilih barang yang ingin dirental');
      return;
    }
    
    if (!startDate || !endDate) {
      setError('Silakan tentukan tanggal mulai dan tanggal selesai rental');
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      setError('Tanggal mulai tidak boleh lebih besar dari tanggal selesai');
      return;
    }
    
    if (!purpose) {
      setError('Silakan tentukan tujuan rental');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/user/rental', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: selectedItemId,
          startDate,
          endDate,
          purpose,
          notes
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengajukan permintaan rental');
      }
      
      // Redirect to rental list page
      router.push('/user/rental?success=true');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mengajukan rental');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getToday = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">Ajukan Rental Baru</h1>
          <Link
            href="/user/rental"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 mb-6">
            <p>{error}</p>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">1. Pilih Barang</h2>
            
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
                <span className="ml-3 text-base text-gray-700">Memuat data barang...</span>
              </div>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                    <select
                      id="category-filter"
                      value={selectedCategory}
                      onChange={handleCategoryChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                    >
                      <option value="all">Semua Kategori</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
                    <input
                      type="text"
                      id="search"
                      placeholder="Cari berdasarkan nama atau nomor seri..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                    />
                  </div>
                </div>
                
                {filteredItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 rounded-lg bg-gray-50">
                    <p>Tidak ada barang yang tersedia untuk rental.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredItems.map((item) => (
                      <div 
                        key={item.id} 
                        className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                          selectedItemId === item.id 
                            ? 'border-green-500 ring-2 ring-green-200' 
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                        onClick={() => selectItem(item.id)}
                      >
                        <div className="h-36 bg-gray-100">
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full w-full bg-gray-200 text-gray-500">
                              <svg className="h-12 w-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 mb-1">
                            {item.category}
                          </span>
                          <h3 className="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
                          {item.serialNumber && (
                            <p className="text-xs text-gray-500 mt-1">SN: {item.serialNumber}</p>
                          )}
                          
                          {selectedItemId === item.id && (
                            <div className="mt-2 text-xs bg-green-50 text-green-800 p-1 rounded-md text-center">
                              ✓ Dipilih
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">2. Detail Rental</h2>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Mulai <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={getToday()}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                />
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Selesai <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || getToday()}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
                  Tujuan Rental <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Contoh: Pengujian di lokasi proyek"
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Informasi tambahan jika diperlukan"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                />
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-end">
              <button
                type="button"
                onClick={() => router.push('/user/rental')}
                className="mr-4 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedItemId}
                className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                  submitting || !selectedItemId 
                    ? 'bg-green-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                }`}
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
                  'Ajukan Permintaan'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
} 