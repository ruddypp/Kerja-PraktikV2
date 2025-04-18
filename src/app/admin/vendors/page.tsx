'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FiPlus, FiEdit, FiTrash2, FiSearch } from 'react-icons/fi';

interface Vendor {
  id: number;
  name: string;
  address: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  services: string | null;
  rating: number | null;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  
  // Form state
  const [vendorForm, setVendorForm] = useState({
    name: '',
    address: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    services: '',
    rating: ''
  });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    fetchVendors();
  }, []);
  
  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/vendors', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        cache: 'no-store'
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch vendors: ${res.status} ${res.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }
      
      const data = await res.json();
      setVendors(data);
      setError('');
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('Failed to load vendors. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setVendorForm(prev => ({ ...prev, [name]: value }));
  };
  
  const openAddModal = () => {
    setVendorForm({
      name: '',
      address: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      services: '',
      rating: ''
    });
    setShowAddModal(true);
  };
  
  const closeAddModal = () => {
    setShowAddModal(false);
  };
  
  const openEditModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorForm({
      name: vendor.name,
      address: vendor.address || '',
      contactPerson: vendor.contactPerson || '',
      contactEmail: vendor.contactEmail || '',
      contactPhone: vendor.contactPhone || '',
      services: vendor.services || '',
      rating: vendor.rating ? vendor.rating.toString() : ''
    });
    setShowEditModal(true);
  };
  
  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedVendor(null);
  };
  
  const openDeleteModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowDeleteModal(true);
  };
  
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedVendor(null);
  };
  
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(vendorForm)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add vendor');
      }
      
      // Success
      setSuccess('Vendor added successfully!');
      closeAddModal();
      fetchVendors();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add vendor');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVendor) return;
    
    try {
      const res = await fetch(`/api/admin/vendors/${selectedVendor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(vendorForm)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update vendor');
      }
      
      // Success
      setSuccess('Vendor updated successfully!');
      closeEditModal();
      fetchVendors();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update vendor');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  
  const handleDeleteSubmit = async () => {
    if (!selectedVendor) return;
    
    try {
      const res = await fetch(`/api/admin/vendors/${selectedVendor.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete vendor');
      }
      
      // Success
      setSuccess('Vendor deleted successfully!');
      closeDeleteModal();
      fetchVendors();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete vendor');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVendors();
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-title text-xl md:text-2xl">Vendor Management</h1>
          <button 
            onClick={openAddModal}
            className="btn btn-primary flex items-center"
          >
            <FiPlus className="mr-2" /> Add Vendor
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{error}</p>
            <button 
              onClick={() => fetchVendors()}
              className="mt-2 text-sm text-red-700 hover:text-red-600 underline"
            >
              Retry
            </button>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{success}</p>
          </div>
        )}
        
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex items-center">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                className="form-input pl-10 w-full"
                placeholder="Search vendors by name or services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary ml-2">
              Search
            </button>
            {searchQuery && (
              <button 
                type="button" 
                className="btn btn-outlined ml-2"
                onClick={() => {
                  setSearchQuery('');
                  fetchVendors();
                }}
              >
                Clear
              </button>
            )}
          </form>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-subtitle">Loading vendors...</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
            <p className="text-yellow-700 font-medium">No vendors found.</p>
            <p className="text-yellow-600 mt-2">
              {searchQuery 
                ? "Try a different search query or clear the filter." 
                : "Use the 'Add Vendor' button to create your first vendor entry."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Services</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                        <div className="text-xs text-gray-500">{vendor.address || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vendor.contactPerson || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{vendor.contactEmail || '-'}</div>
                        <div className="text-xs text-gray-500">{vendor.contactPhone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate">{vendor.services || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                        {vendor.rating ? `${vendor.rating}/5` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditModal(vendor)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          <FiEdit className="inline" /> Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(vendor)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiTrash2 className="inline" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Add Vendor Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Add New Vendor</h3>
                <button onClick={closeAddModal} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleAddSubmit}>
                <div className="mb-4">
                  <label htmlFor="name" className="form-label">Vendor Name <span className="text-red-500">*</span></label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={vendorForm.name}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Enter vendor name"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="address" className="form-label">Address</label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={vendorForm.address}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Enter vendor address"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="contactPerson" className="form-label">Contact Person</label>
                  <input
                    id="contactPerson"
                    name="contactPerson"
                    type="text"
                    value={vendorForm.contactPerson}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Enter contact person name"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="contactEmail" className="form-label">Contact Email</label>
                  <input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={vendorForm.contactEmail}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Enter contact email"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="contactPhone" className="form-label">Contact Phone</label>
                  <input
                    id="contactPhone"
                    name="contactPhone"
                    type="text"
                    value={vendorForm.contactPhone}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Enter contact phone"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="services" className="form-label">Services</label>
                  <textarea
                    id="services"
                    name="services"
                    value={vendorForm.services}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Describe services offered by this vendor"
                    rows={3}
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="rating" className="form-label">Rating (1-5)</label>
                  <input
                    id="rating"
                    name="rating"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={vendorForm.rating}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Enter rating (1-5)"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={closeAddModal}
                    className="btn btn-secondary order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary order-1 sm:order-2"
                  >
                    Add Vendor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Edit Vendor Modal */}
        {showEditModal && selectedVendor && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Edit Vendor</h3>
                <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleEditSubmit}>
                <div className="mb-4">
                  <label htmlFor="edit-name" className="form-label">Vendor Name <span className="text-red-500">*</span></label>
                  <input
                    id="edit-name"
                    name="name"
                    type="text"
                    value={vendorForm.name}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Enter vendor name"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="edit-address" className="form-label">Address</label>
                  <input
                    id="edit-address"
                    name="address"
                    type="text"
                    value={vendorForm.address}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Enter vendor address"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="edit-contactPerson" className="form-label">Contact Person</label>
                  <input
                    id="edit-contactPerson"
                    name="contactPerson"
                    type="text"
                    value={vendorForm.contactPerson}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Enter contact person name"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="edit-contactEmail" className="form-label">Contact Email</label>
                  <input
                    id="edit-contactEmail"
                    name="contactEmail"
                    type="email"
                    value={vendorForm.contactEmail}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Enter contact email"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="edit-contactPhone" className="form-label">Contact Phone</label>
                  <input
                    id="edit-contactPhone"
                    name="contactPhone"
                    type="text"
                    value={vendorForm.contactPhone}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Enter contact phone"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="edit-services" className="form-label">Services</label>
                  <textarea
                    id="edit-services"
                    name="services"
                    value={vendorForm.services}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Describe services offered by this vendor"
                    rows={3}
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="edit-rating" className="form-label">Rating (1-5)</label>
                  <input
                    id="edit-rating"
                    name="rating"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={vendorForm.rating}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="Enter rating (1-5)"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={closeEditModal}
                    className="btn btn-secondary order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary order-1 sm:order-2"
                  >
                    Update Vendor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Delete Vendor Modal */}
        {showDeleteModal && selectedVendor && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Delete Vendor</h3>
                <button onClick={closeDeleteModal} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete vendor <span className="font-semibold">{selectedVendor.name}</span>?
                </p>
                <p className="text-sm text-red-600 mb-4">
                  This action cannot be undone. Vendors associated with calibrations cannot be deleted.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <button 
                  type="button" 
                  onClick={closeDeleteModal}
                  className="btn btn-secondary order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleDeleteSubmit}
                  className="btn btn-danger order-1 sm:order-2"
                >
                  Delete Vendor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 