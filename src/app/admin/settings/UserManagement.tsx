'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { MdPerson, MdAdd, MdEdit, MdDelete, MdSearch } from 'react-icons/md';
import { XIcon } from 'lucide-react';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { toast } from 'react-hot-toast';

// User schema for form validation
const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.nativeEnum(Role)
});

type UserFormData = z.infer<typeof userSchema>;

// Interface for User
interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export default function UserManagement() {
  // States
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: Role.USER
  });
  
  // Error state
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Cache settings
  const CACHE_DURATION = 60000; // 1 minute
  const CACHE_KEY = 'admin_users_data';
  const CACHE_TIMESTAMP_KEY = 'admin_users_last_fetch';

  // Cache invalidation function
  const invalidateCache = useCallback(() => {
    // Clear the main cache key
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    
    // Clear any search or role-specific cache entries
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(CACHE_KEY) || key.includes('_timestamp')) {
        sessionStorage.removeItem(key);
      }
    });
  }, []);
  
  // Clear form
  const clearForm = useCallback(() => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: Role.USER
    });
    setFormErrors({});
  }, []);
  
  // Open modal in create mode
  const openCreateModal = useCallback(() => {
    clearForm();
    setIsEditMode(false);
    setCurrentUser(null);
    setModalOpen(true);
  }, [clearForm]);
  
  // Open modal in edit mode
  const openEditModal = useCallback((user: User) => {
    setFormData({
      id: user.id,
      name: user.name,
      email: user.email,
      password: '', // Don't populate password in edit mode
      role: user.role
    });
    
    setCurrentUser(user);
    setIsEditMode(true);
    setModalOpen(true);
  }, []);
  
  // Open delete confirmation
  const openDeleteConfirm = useCallback((user: User) => {
    setCurrentUser(user);
    setConfirmDeleteOpen(true);
  }, []);

  // Fetch data
  const fetchData = useCallback(async (searchTerm = search, role = roleFilter) => {
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (role) queryParams.append('role', role);
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const cacheKey = `${CACHE_KEY}${searchTerm ? '_' + searchTerm : ''}${role ? '_role_' + role : ''}`;
      
      const cachedData = sessionStorage.getItem(cacheKey);
      const lastFetch = sessionStorage.getItem(`${cacheKey}_timestamp`);
      const now = Date.now();
      
      if (cachedData && lastFetch && now - parseInt(lastFetch) < CACHE_DURATION) {
        setUsers(JSON.parse(cachedData));
        setLoading(false);
        return;
      }
      
      const usersRes = await fetch(`/api/admin/users${queryString}`);
      
      if (!usersRes.ok) {
        console.error('Failed to fetch users:', usersRes.statusText);
        throw new Error('Failed to fetch users');
      }
      
      const usersData = await usersRes.json();
      const usersArray = usersData.data || [];
      setUsers(usersArray);
      
      sessionStorage.setItem(cacheKey, JSON.stringify(usersArray));
      sessionStorage.setItem(`${cacheKey}_timestamp`, now.toString());
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load users. Please try again.');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  // Debounced search handler
  const debouncedSearch = useCallback((term: string) => {
    setSearch(term);
    fetchData(term, roleFilter);
  }, [fetchData, roleFilter]);

  // Handle search input change with debounce
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      debouncedSearch(value);
    }, 500);
  };
  
  // Handle role filter change
  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setRoleFilter(value);
    fetchData(search, value);
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Handle form change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (formErrors[name as keyof UserFormData]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof UserFormData];
        return newErrors;
      });
    }
  };
  
  // Validate form
  const validateForm = (): boolean => {
    try {
      if (isEditMode) {
        const { password, ...restData } = formData;
        userSchema.omit({ password: true, id: true }).parse(restData);
        if (password && password.length > 0 && password.length < 6) {
          setFormErrors({ password: "Password must be at least 6 characters" });
          return false;
        }
      } else {
        userSchema.parse(formData);
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Partial<Record<keyof UserFormData, string>> = {};
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            const fieldName = err.path[0] as keyof UserFormData;
            errors[fieldName] = err.message;
          }
        });
        setFormErrors(errors);
      }
      return false;
    }
  };
  
  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setFormSubmitting(true);
      setError('');
      
      let apiUrl = '/api/admin/users';
      let method = 'POST';
      let successMessage = 'User created successfully';
      
      if (isEditMode && currentUser) {
        apiUrl = `/api/admin/users/${currentUser.id}`;
        method = 'PUT';
        successMessage = 'User updated successfully';
      }
      
      const requestBody: Partial<UserFormData> = { ...formData };
      
      if (isEditMode && (!requestBody.password || requestBody.password.trim() === '')) {
        delete requestBody.password;
      }
      
      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save user');
      }
      
      invalidateCache();
      fetchData();
      
      setSuccess(successMessage);
      toast.success(successMessage);
      
      setModalOpen(false);
      
    } catch (error: unknown) {
      console.error('Error submitting form:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      toast.error(error instanceof Error ? error.message : 'Failed to save user');
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Handle user deletion
  const handleDelete = async () => {
    if (!currentUser) return;
    
    try {
      setFormSubmitting(true);
      setError('');
      
      const response = await fetch(`/api/admin/users/${currentUser.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        let errorMessage = data.error || 'Failed to delete user';
        if (data.details) {
          console.error('Detailed error:', data.details);
          errorMessage += ' (Check console for details)';
        }
        throw new Error(errorMessage);
      }
      
      invalidateCache();
      
      setUsers(prevUsers => prevUsers.filter(user => user.id !== currentUser.id));
      
      setSuccess(data.message || 'User deleted successfully');
      toast.success(data.message || 'User deleted successfully');
      
      setConfirmDeleteOpen(false);
      
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Helper to get role badge color class
  const getRoleBadgeClass = (role: Role): string => {
    switch (role) {
      case Role.ADMIN:
        return 'bg-red-100 text-red-800';
      case Role.USER:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <MdPerson className="h-6 w-6 text-green-600" />
          Manajemen Pengguna
        </h2>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <MdAdd size={18} />
          Tambah Pengguna
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-100 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4 mb-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchInputChange}
              placeholder="Search users by name or email..."
              className="block w-full p-3 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setRoleFilter('');
                  fetchData('', '');
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                <XIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          
          <div className="w-full md:w-48">
            <select
              value={roleFilter}
              onChange={handleRoleFilterChange}
              className="block w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              aria-label="Filter by role"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="USER">User</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mb-3"></div>
            <p className="text-gray-900">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search ? `No results for "${search}"` : "Get started by creating a new user."}
            </p>
            {search && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setRoleFilter('');
                  fetchData('', '');
                }}
                className="mt-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Clear search
              </button>
            )}
            {!search && (
              <button
                onClick={openCreateModal}
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <FiPlus className="-ml-1 mr-2 h-5 w-5" />
                New User
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{user.name}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{user.email}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>{user.role}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => openEditModal(user)} className="text-blue-600 hover:text-blue-900" title="Edit user"><FiEdit2 className="h-5 w-5" /></button>
                          <button onClick={() => openDeleteConfirm(user)} className="text-red-600 hover:text-red-900" title="Delete user"><FiTrash2 className="h-5 w-5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="md:hidden space-y-4">
              {users.map(user => (
                <div key={user.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{user.name}</h3>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>{user.role}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 mb-3 text-xs">
                      <div>
                        <p className="text-gray-500 font-medium">Created On</p>
                        <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                      <button onClick={() => openEditModal(user)} className="inline-flex justify-center items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"><FiEdit2 className="h-4 w-4 mr-1" />Edit</button>
                      <button onClick={() => openDeleteConfirm(user)} className="inline-flex justify-center items-center px-3 py-2 border border-red-600 rounded-md shadow-sm text-xs font-medium text-white bg-red-600 hover:bg-red-700"><FiTrash2 className="h-4 w-4 mr-1" />Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-25 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto p-6">
            <h2 className="text-xl font-semibold mb-4">{isEditMode ? `Edit User: ${currentUser?.name}` : "Create New User"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                  <input type="text" id="name" name="name" value={formData.name} onChange={handleFormChange} className={`mt-1 block w-full px-3 py-2 border ${formErrors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500`} />
                  {formErrors.name && (<p className="mt-1 text-sm text-red-600">{formErrors.name}</p>)}
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} className={`mt-1 block w-full px-3 py-2 border ${formErrors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500`} />
                  {formErrors.email && (<p className="mt-1 text-sm text-red-600">{formErrors.email}</p>)}
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password {isEditMode && <span className="text-gray-500 font-normal">(leave blank to keep current)</span>}</label>
                  <input type="password" id="password" name="password" value={formData.password} onChange={handleFormChange} className={`mt-1 block w-full px-3 py-2 border ${formErrors.password ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500`} />
                  {formErrors.password && (<p className="mt-1 text-sm text-red-600">{formErrors.password}</p>)}
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                  <select id="role" name="role" value={formData.role} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
                    <option value={Role.USER}>User</option>
                    <option value={Role.ADMIN}>Admin</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end space-x-3">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">Cancel</button>
                <button type="submit" disabled={formSubmitting} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center">
                  {formSubmitting && (<span className="mr-2"><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></span>)}
                  {isEditMode ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteOpen && currentUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-25 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Confirm Deletion</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to delete user <span className="font-semibold">{currentUser.name}</span>? This action cannot be undone.</p>
            <div className="mt-5 sm:mt-4 flex justify-end space-x-3">
              <button type="button" onClick={() => setConfirmDeleteOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={formSubmitting} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center">
                {formSubmitting && (<span className="mr-2"><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></span>)}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 