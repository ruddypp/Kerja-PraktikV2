'use client';



import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

type DocumentType = {
  id: number;
  name: string;
};

type Document = {
  id: number;
  fileName: string;
  fileUrl: string;
  typeId: number;
  version: number;
  status: string;
  uploadedAt: Date;
  uploadedBy: {
    name: string;
  };
  documentType: {
    name: string;
  };
  project: {
    name: string;
  } | null;
};

export default function UserDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch documents and document types in parallel
        const [documentsRes, typesRes] = await Promise.all([
          fetch('/api/user/dokumen'),
          fetch('/api/user/dokumen/types')
        ]);

        if (!documentsRes.ok) {
          throw new Error('Gagal mengambil data dokumen');
        }
        
        if (!typesRes.ok) {
          throw new Error('Gagal mengambil data jenis dokumen');
        }
        
        const documentsData = await documentsRes.json();
        const typesData = await typesRes.json();
        
        setDocuments(documentsData);
        setDocumentTypes(typesData);
      } catch (err) {
        setError('Error memuat data dokumen');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTypeFilter(value === 'all' ? 'all' : parseInt(value));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredDocuments = documents.filter(doc => {
    // Apply type filter
    if (typeFilter !== 'all' && doc.typeId !== typeFilter) {
      return false;
    }
    
    // Apply search term
    if (searchTerm && !doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">Dokumen</h1>
        </div>
        
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">Filter Jenis Dokumen</label>
              <select
                id="type-filter"
                value={typeFilter === 'all' ? 'all' : typeFilter.toString()}
                onChange={handleTypeChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
              >
                <option value="all">Semua Jenis</option>
                {documentTypes.map((type) => (
                  <option key={type.id} value={type.id.toString()}>{type.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
              <input
                type="text"
                id="search"
                placeholder="Cari berdasarkan nama..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
              />
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
            <span className="ml-3 text-lg text-gray-700">Memuat dokumen...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
            <p>{error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {filteredDocuments.length === 0 ? (
              <div className="p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada dokumen</h3>
                <p className="mt-1 text-sm text-gray-500">Tidak ada dokumen yang ditemukan sesuai dengan filter yang dipilih.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 mb-2">
                            {doc.documentType.name}
                          </span>
                          {doc.project && (
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 mb-2 ml-1">
                              {doc.project.name}
                            </span>
                          )}
                          <h3 className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Versi {doc.version} • Diupload: {formatDate(doc.uploadedAt)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          Oleh: {doc.uploadedBy.name}
                        </div>
                        <div className="flex space-x-2">
                          <Link
                            href={doc.fileUrl}
                            target="_blank"
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <svg className="-ml-0.5 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Unduh
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 