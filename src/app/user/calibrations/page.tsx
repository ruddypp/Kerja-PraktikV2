'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { format } from 'date-fns';
import { FiPlus, FiFileText, FiDownload, FiX, FiTrash2 } from 'react-icons/fi';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';

// Define Types and Interfaces
enum RequestStatus {
  PENDING = 'PENDING', // Status di database - akan ditampilkan sebagai IN_CALIBRATION di UI
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

enum ItemStatus {
  AVAILABLE = 'AVAILABLE',
  IN_CALIBRATION = 'IN_CALIBRATION',
  RENTED = 'RENTED',
  IN_MAINTENANCE = 'IN_MAINTENANCE'
}

interface Item {
  serialNumber: string;
  name: string;
  partNumber: string;
  status: ItemStatus;
  sensor?: string;
}

interface customer {
  id: string;
  name: string;
  contactName?: string;
  contactPhone?: string;
}

interface StatusLog {
  id: string;
  status: RequestStatus;
  notes: string | null;
  createdAt: string;
  changedBy: {
    id: string;
  name: string;
  };
}

interface Calibration {
  id: string;
  itemSerial: string;
  userId: string;
  status: RequestStatus | string;
  calibrationDate: string;
  validUntil: string | null;
  
  // Informasi Sertifikat
  certificateNumber: string | null;
  certificateUrl: string | null;
  
  // Detail Gas Kalibrasi
  gasType: string | null;
  gasConcentration: string | null;
  gasBalance: string | null;
  gasBatchNumber: string | null;
  
  // Hasil Test
  testSensor: string | null;
  testSpan: string | null;
  testResult: string | null;
  
  // Detail Alat
  manufacturer: string | null;
  instrumentName: string | null;
  modelNumber: string | null;
  configuration: string | null;
  
  // Approval
  approvedBy: string | null;
  
  // Misc
  createdAt: string;
  updatedAt: string;
  item: Item;
  customer: customer;
  statusLogs: StatusLog[];
  notes: string | null;
}

export default function UserCalibrationPage() {
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setcustomers] = useState<customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedCalibration, setSelectedCalibration] = useState<Calibration | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const itemSearchRef = useRef<HTMLDivElement>(null);
  const [customersearch, setcustomersearch] = useState('');
  const [filteredcustomers, setFilteredcustomers] = useState<customer[]>([]);
  const [showcustomersuggestions, setShowcustomersuggestions] = useState(false);
  const customersearchRef = useRef<HTMLDivElement>(null);
  
  // Add customer loading state
  const [customersLoading, setcustomersLoading] = useState(true);
  const [customersError, setcustomersError] = useState('');
  
  // Add pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 10;
  
  // Simplified form for direct calibration
  const [calibrationForm, setCalibrationForm] = useState({
    itemSerial: '',
    customerId: '',
    
    // Form fields tambahan sesuai alur - field address dan phone tetap ada
    // dalam state tetapi tidak ditampilkan di UI
    address: '',
    phone: '',
    fax: '',
    
    // Detail alat (dapat diisi otomatis dari item yang dipilih)
    manufacturer: '',
    instrumentName: '',
    modelNumber: '',
    configuration: '',
    
    // Tanggal kalibrasi
    calibrationDate: format(new Date(), 'yyyy-MM-dd'),
    
    notes: ''
  });
  
  // Complete calibration form
  const [completeForm, setCompleteForm] = useState({
    id: '',
    
    // Certificate Information - adding certificateNumber field
    certificateNumber: '',
    calibrationDate: format(new Date(), 'yyyy-MM-dd'),
    validUntil: format(new Date(Date.now() + 365*24*60*60*1000), 'yyyy-MM-dd'),
    approvedBy: '',
    
    // Detail Gas Kalibrasi - changed to arrays to support multiple entries
    gasEntries: [{
    gasType: '',
    gasConcentration: '',
    gasBalance: '',
      gasBatchNumber: ''
    }],
    
    // Hasil Test - changed to arrays to support multiple entries
    testEntries: [{
    testSensor: '',
    testSpan: '',
      testResult: 'Pass' as 'Pass' | 'Fail'
    }],
    
    // Detail Alat - auto-filled from item data
    instrumentName: '',
    modelNumber: '',
    configuration: '',
    
    // Notes
    notes: ''
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    item: '',
    dateFrom: '',
    dateTo: ''
  });
  
  // Konfigurasi SWR
  const SWR_CONFIG = {
    dedupingInterval: 300000, // 5 menit - menghindari request berulang dalam waktu dekat
    revalidateOnFocus: false, // tidak reload data saat tab mendapat fokus kembali
    revalidateIfStale: false, // tidak reload data secara otomatis jika data dianggap stale
  };
  
  // Fetcher function for SWR
  const fetcher = async (url: string) => {
    try {
      console.log(`Fetching: ${url}`);
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store'
    });
    
    if (!res.ok) {
        console.error(`Error fetching ${url}: ${res.status} ${res.statusText}`);
        const errorText = await res.text();
        console.error(`Error response: ${errorText}`);
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log(`Response from ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`Exception in fetcher for ${url}:`, error);
      throw error;
    }
  };
  
  useEffect(() => {
    fetchCalibrations();
    fetchAvailableItems();
    
    // Handler for clicking outside the suggestions to close them
    const handleClickOutside = (event: MouseEvent) => {
      if (itemSearchRef.current && !itemSearchRef.current.contains(event.target as Node)) {
        setShowItemSuggestions(false);
      }
      if (customersearchRef.current && !customersearchRef.current.contains(event.target as Node)) {
        setShowcustomersuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [currentPage]);
  
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setcustomersLoading(true);
        const res = await fetch(`/api/customers?limit=10000&timestamp=${Date.now()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          cache: 'no-store'
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch customers: ${res.status}`);
        }
        const data = await res.json();
        console.log('customers data received:', data); // Debug log
        if (data && Array.isArray(data.items)) {
          setcustomers(data.items);
        } else {
          setcustomers([]);
          console.error('Unexpected customers data format:', data);
        }
        setcustomersLoading(false);
      } catch (error) {
        console.error('Error fetching customers:', error);
        setcustomers([]);
        setcustomersLoading(false);
        setcustomersError('Failed to load customers. Please try again later.');
        toast.error('Failed to load customers. Please try again later.');
      }
    };

    fetchCustomers();
  }, []);
  
  // Filter items based on search term
  useEffect(() => {
    if (itemSearch.length < 2) {
      setFilteredItems([]);
      setShowItemSuggestions(false);
      return;
    }
    
    const filtered = items.filter(item => 
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
      item.serialNumber.toLowerCase().includes(itemSearch.toLowerCase())
    );
    
    setFilteredItems(filtered);
    setShowItemSuggestions(true);
  }, [itemSearch, items]);
  
  // Filter customers based on search term
  useEffect(() => {
    if (customersearch.length < 2) {
      setFilteredcustomers([]);
      setShowcustomersuggestions(false);
      return;
    }
    
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(customersearch.toLowerCase()) ||
      (customer.contactName && customer.contactName.toLowerCase().includes(customersearch.toLowerCase()))
    );
    
    setFilteredcustomers(filtered);
    setShowcustomersuggestions(true);
  }, [customersearch, customers]);
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    // Reset to first page when filter changes
    setCurrentPage(1);
  };
  
  const resetFilters = () => {
    setFilters({
      status: '',
      item: '',
      dateFrom: '',
      dateTo: ''
    });
    // Reset to first page when filters are reset
    setCurrentPage(1);
  };
  
  const fetchCalibrations = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (filters.status) {
        queryParams.append('status', filters.status);
      }
      if (filters.item) {
        queryParams.append('itemSerial', filters.item);
      }
      if (currentPage > 1) {
        queryParams.append('page', currentPage.toString());
      }
      queryParams.append('limit', PAGE_SIZE.toString());
      
      // Fetch calibrations from new API endpoint
      const response = await fetch(`/api/calibrations?${queryParams.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch calibrations');
      }
      
      const data = await response.json();
      
      // Update state with fetched data
      setCalibrations(data.items || []);
      setTotalItems(data.total || 0);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching calibrations:', err);
      setError('Failed to load calibration data. Please try again later.');
      setLoading(false);
    }
  };
  
  const fetchAvailableItems = async () => {
    try {
      // Add a timestamp and high limit to get all items, important for searching through 10,000+ items
      const res = await fetch('/api/user/items?status=AVAILABLE&limit=10000&timestamp=' + new Date().getTime(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        cache: 'no-store'
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch available items: ${res.status} ${res.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }
      
      const data = await res.json();
      
      if (data && Array.isArray(data.items)) {
        setItems(data.items);
      } else if (data && typeof data === 'object') {
        setItems(data.items || []);
      } else {
        setItems([]);
        console.error('Unexpected response format from items API:', data);
      }
    } catch (err) {
      console.error('Error fetching available items:', err);
      setItems([]); // Set empty array sebagai fallback
    }
  };
  
  const handleCalibrationFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setCalibrationForm(prev => ({ ...prev, [name]: value }));
    
    // We'll handle itemSerial selection in the handleItemSelect function instead
  };
  
  const openCalibrationModal = () => {
    // Always fetch fresh items when opening the modal
      fetchAvailableItems();
    
    // Set loading state for customers, but don't refetch if we already have data
    if (customers.length === 0) {
      setcustomersLoading(true);
      setcustomersError('');
      
      // Only fetch customers if we don't have any yet
      fetch(`/api/customers?limit=10000&timestamp=${Date.now()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store'
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch customers: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('customers loaded on modal open:', data);
        if (Array.isArray(data)) {
          setcustomers(data);
        } else if (data && typeof data === 'object') {
          setcustomers(data.items || []);
        }
        setcustomersLoading(false);
      })
      .catch(err => {
        console.error('Error fetching customers for modal:', err);
        setcustomersError('Failed to load customers. Please try again.');
        setcustomersLoading(false);
        toast.error('Failed to load customers. Please try again.');
      });
    } else {
      setcustomersLoading(false);
    }
    
    setCalibrationForm({
      itemSerial: '',
      customerId: '',
      address: '',
      phone: '',
      fax: '',
      manufacturer: '',
      instrumentName: '',
      modelNumber: '',
      configuration: '',
      calibrationDate: format(new Date(), 'yyyy-MM-dd'),
      notes: ''
    });
    
    setShowCalibrationModal(true);
  };
  
  const closeCalibrationModal = () => {
    setShowCalibrationModal(false);
  };
  
  const openCertificateModal = (calibration: Calibration) => {
    setSelectedCalibration(calibration);
    setShowCertificateModal(true);
    
    // Buka sertifikat dalam tab baru
    if (calibration.id) {
      window.open(`/api/calibrations/${calibration.id}/certificate`, '_blank');
    }
  };
  
  const closeCertificateModal = () => {
    setShowCertificateModal(false);
    setSelectedCalibration(null);
  };
  
  const handleCalibrationSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    try {
      // Validasi form
      if (!calibrationForm.itemSerial) {
        toast.error('Please select an item');
        return;
      }
      
      if (!calibrationForm.customerId) {
        toast.error('Please select a customer');
        return;
      }
      
      // Submit to new API endpoint
      const response = await fetch('/api/calibrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calibrationForm),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // Handle validation errors
        if (errorData.error && typeof errorData.error === 'object') {
          // Format error object into readable message
          const errorMessages = Object.entries(errorData.error)
            .filter(([key, value]) => key !== '_errors' && value)
            .map(([key, value]) => {
              const errors = (value as {_errors?: string[]})._errors;
              if (Array.isArray(errors) && errors.length > 0) {
                return `${key}: ${errors.join(', ')}`;
              }
              return null;
            })
            .filter(Boolean)
            .join('; ');
          
          if (errorMessages) {
            throw new Error(errorMessages);
          }
        }
        
        throw new Error(errorData.error || 'Failed to create calibration request');
      }
      
      const data = await response.json();
      
      // Show success message
      toast.success('Calibration request created successfully');
      
      // Close modal and reset form
      setShowCalibrationModal(false);
      setCalibrationForm({
        itemSerial: '',
        customerId: '',
        address: '',
        phone: '',
        fax: '',
        manufacturer: '',
        instrumentName: '',
        modelNumber: '',
        configuration: '',
        calibrationDate: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
      
      // Refresh calibration list
      fetchCalibrations();
      
    } catch (err) {
      console.error('Error creating calibration request:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create calibration request');
    }
  };
  
  const isStatusMatching = (status: RequestStatus | string, target: RequestStatus): boolean => {
    if (typeof status === 'string') {
      return status === target;
    }
    return status === target;
  };
  
  // Apply filters to calibrations
  const filteredCalibrations = Array.isArray(calibrations) 
    ? calibrations.filter(calibration => {
        // Item filter - client-side filtering for item name/serial since server doesn't support this
        if (filters.item && !calibration.item.name.toLowerCase().includes(filters.item.toLowerCase()) &&
            !calibration.item.serialNumber.toLowerCase().includes(filters.item.toLowerCase())) {
          return false;
        }
        
        // Date range filter - client-side filtering for date range since server doesn't support this
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          const calibrationDate = new Date(calibration.calibrationDate);
          if (calibrationDate < fromDate) {
            return false;
          }
        }
        
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59); // End of the day
          const calibrationDate = new Date(calibration.calibrationDate);
          if (calibrationDate > toDate) {
            return false;
          }
        }
        
        return true;
      })
    : [];
  
  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd MMM yyyy');
  };
  
  // Get display status for UI
  const getDisplayStatus = (status: RequestStatus | string | undefined): string => {
    if (!status) {
      return 'IN_CALIBRATION';
    }
    if (status === RequestStatus.PENDING) {
      return 'IN_CALIBRATION';
    }
    return status.toString();
  };
  
  // Get status badge style
  const getStatusBadgeStyle = (status: RequestStatus | string | undefined) => {
    if (!status) {
      return 'bg-purple-100 text-purple-800'; // Default style for undefined status
    }
    
    switch (status) {
      case RequestStatus.PENDING:
      case 'PENDING':
        return 'bg-purple-100 text-purple-800'; // PENDING ditampilkan dengan warna IN_CALIBRATION
      case RequestStatus.COMPLETED:
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case RequestStatus.CANCELLED:
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Function to open the complete calibration modal
  const openCompleteModal = (calibration: Calibration) => {
    if (!calibration) return;
    
    setSelectedCalibration(calibration);
    setCompleteForm({
      id: calibration.id,
      
      // Certificate Information
      certificateNumber: '',
      calibrationDate: format(new Date(), 'yyyy-MM-dd'),
      validUntil: calibration.validUntil ? 
        format(new Date(calibration.validUntil), 'yyyy-MM-dd') : 
        format(new Date(Date.now() + 365*24*60*60*1000), 'yyyy-MM-dd'),
      approvedBy: calibration.approvedBy || '',
      
      // Detail Gas Kalibrasi - changed to arrays to support multiple entries
      gasEntries: [{
      gasType: calibration.gasType || '',
      gasConcentration: calibration.gasConcentration || '',
      gasBalance: calibration.gasBalance || '',
        gasBatchNumber: calibration.gasBatchNumber || ''
      }],
      
      // Hasil Test - changed to arrays to support multiple entries
      testEntries: [{
      testSensor: calibration.testSensor || '',
      testSpan: calibration.testSpan || '',
        testResult: (calibration.testResult as 'Pass' | 'Fail') || 'Pass'
      }],
      
      // Detail Alat - auto-filled from item data
      instrumentName: calibration.instrumentName || calibration.item.name || calibration.item.partNumber || 'Gas Detector',
      modelNumber: calibration.modelNumber || calibration.item.partNumber || '',
      configuration: calibration.configuration || calibration.item.sensor || '',
      
      // Notes
      notes: calibration.notes || ''
    });
    
    setShowCompleteModal(true);
  };
  
  // Function to close the complete calibration modal
  const closeCompleteModal = () => {
    setShowCompleteModal(false);
    setSelectedCalibration(null);
  };
  
  // Handle changes in the complete form
  const handleCompleteFormChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>, 
    index?: number
  ) => {
    const { name, value } = e.target;
    
    // Handle gas entries fields
    if (name === 'gasType' && index !== undefined) {
      setCompleteForm(prev => {
        const updatedGasEntries = [...prev.gasEntries];
        updatedGasEntries[index] = { 
          ...updatedGasEntries[index], 
          gasType: value 
        };
        return { ...prev, gasEntries: updatedGasEntries };
      });
    } 
    else if (name === 'gasConcentration' && index !== undefined) {
      setCompleteForm(prev => {
        const updatedGasEntries = [...prev.gasEntries];
        updatedGasEntries[index] = { 
          ...updatedGasEntries[index], 
          gasConcentration: value 
        };
        return { ...prev, gasEntries: updatedGasEntries };
      });
    }
    else if (name === 'gasBalance' && index !== undefined) {
      setCompleteForm(prev => {
        const updatedGasEntries = [...prev.gasEntries];
        updatedGasEntries[index] = { 
          ...updatedGasEntries[index], 
          gasBalance: value 
        };
        return { ...prev, gasEntries: updatedGasEntries };
      });
    }
    else if (name === 'gasBatchNumber' && index !== undefined) {
      setCompleteForm(prev => {
        const updatedGasEntries = [...prev.gasEntries];
        updatedGasEntries[index] = { 
          ...updatedGasEntries[index], 
          gasBatchNumber: value 
        };
        return { ...prev, gasEntries: updatedGasEntries };
      });
    }
    // Handle test entries fields
    else if (name === 'testSensor' && index !== undefined) {
      setCompleteForm(prev => {
        const updatedTestEntries = [...prev.testEntries];
        updatedTestEntries[index] = { 
          ...updatedTestEntries[index], 
          testSensor: value 
        };
        return { ...prev, testEntries: updatedTestEntries };
      });
    }
    else if (name === 'testSpan' && index !== undefined) {
      setCompleteForm(prev => {
        const updatedTestEntries = [...prev.testEntries];
        updatedTestEntries[index] = { 
          ...updatedTestEntries[index], 
          testSpan: value 
        };
        return { ...prev, testEntries: updatedTestEntries };
      });
    }
    else if (name.startsWith('testResult-') && index !== undefined) {
      setCompleteForm(prev => {
        const updatedTestEntries = [...prev.testEntries];
        updatedTestEntries[index] = { 
          ...updatedTestEntries[index], 
          testResult: value as 'Pass' | 'Fail'
        };
        return { ...prev, testEntries: updatedTestEntries };
      });
    }
    // Handle other fields
    else {
      setCompleteForm(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Handle the submission of the complete calibration form
  const handleCompleteSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!selectedCalibration) {
      toast.error('No calibration selected');
      return;
    }
    
    try {
      // Extract the first entries for the API
      const firstGasEntry = completeForm.gasEntries[0] || { 
        gasType: '', 
        gasConcentration: '', 
        gasBalance: '', 
        gasBatchNumber: '' 
      };
      
      const firstTestEntry = completeForm.testEntries[0] || {
        testSensor: '',
        testSpan: '',
        testResult: 'Pass' as 'Pass' | 'Fail'
      };
      
      // Validation for required fields
      const validationErrors: string[] = [];
      if (!firstGasEntry.gasType) validationErrors.push('Gas type is required');
      if (!firstGasEntry.gasConcentration) validationErrors.push('Gas concentration is required');
      if (!firstGasEntry.gasBalance) validationErrors.push('Gas balance is required');
      if (!firstGasEntry.gasBatchNumber) validationErrors.push('Gas batch number is required');
      if (!firstTestEntry.testSensor) validationErrors.push('Test sensor is required');
      if (!firstTestEntry.testSpan) validationErrors.push('Test span is required');
      if (!completeForm.instrumentName) validationErrors.push('Instrument name is required');
      if (!completeForm.approvedBy) validationErrors.push('Approver name is required');
      
      // If there are validation errors, show them and don't submit
      if (validationErrors.length > 0) {
        setError(`Please fix the following errors: ${validationErrors.join(', ')}`);
        return;
      }
      
      // Format the data for the API
      const apiData = {
        id: completeForm.id,
        
        // Certificate Information
        calibrationDate: completeForm.calibrationDate,
        validUntil: completeForm.validUntil,
        
        // Use first gas entry for now (API needs to be updated to handle multiple entries)
        gasType: firstGasEntry.gasType,
        gasConcentration: firstGasEntry.gasConcentration,
        gasBalance: firstGasEntry.gasBalance,
        gasBatchNumber: firstGasEntry.gasBatchNumber,
        
        // Use first test entry for now
        testSensor: firstTestEntry.testSensor,
        testSpan: firstTestEntry.testSpan,
        testResult: firstTestEntry.testResult,
        
        // Other fields
        instrumentName: completeForm.instrumentName,
        modelNumber: completeForm.modelNumber,
        configuration: completeForm.configuration,
        approvedBy: completeForm.approvedBy,
        notes: completeForm.notes,
        
        // Include all entries as JSON strings for future API updates
        allGasEntries: JSON.stringify(completeForm.gasEntries),
        allTestEntries: JSON.stringify(completeForm.testEntries)
      };
      
      const response = await fetch(`/api/calibrations/${selectedCalibration.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
        credentials: 'include'
      });
      
      // Handle response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete calibration');
      }
      
      // Success
      toast.success('Calibration completed successfully');
      setShowCompleteModal(false);
      fetchCalibrations();
      
    } catch (err) {
      console.error('Error completing calibration:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to complete calibration');
    }
  };
  
  const handleItemSelect = (item: Item) => {
    setItemSearch(''); // Clear search
    setShowItemSuggestions(false);
    
    // Set the selected item in the form
    setCalibrationForm(prev => ({
      ...prev,
      itemSerial: item.serialNumber,
      manufacturer: item.name || '', // Nama produk sebagai manufacturer
      instrumentName: item.partNumber || '', // Part number sebagai instrument name
      modelNumber: '', // Dibiarkan kosong untuk diisi pengguna
      configuration: item.sensor ||'' //sensor sebagai configuration
    }));
  };
  
  const handlecustomerselect = (customer: customer) => {
    console.log('customer selected:', customer);
    
    if (!customer || !customer.id) {
      console.error('Invalid customer selected:', customer);
      setcustomersError('Invalid customer selected. Please try again.');
      toast.error('Invalid customer selected. Please try again.');
      return;
    }
    
    setcustomersearch(''); // Clear search
    setShowcustomersuggestions(false);
    
    // Set the selected customer in the form
    setCalibrationForm(prev => {
      const updated = {
      ...prev,
      customerId: customer.id,
      // Only set address and phone to empty, leave fax field as is
      address: '',
      phone: ''
      // Fax is not set here so it will keep whatever the user has entered manually
      };
      console.log('Updated calibration form with customer:', updated);
      return updated;
    });
    
    // Clear any customer error
    setcustomersError('');
  };
  
  // Function to handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h1 className="text-xl md:text-2xl font-bold">Calibration Management</h1>
          <button 
            onClick={openCalibrationModal}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md flex items-center justify-center text-sm"
            aria-label="Create new calibration"
          >
            <FiPlus className="mr-1 h-4 w-4" /> New Calibration
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 md:p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium text-sm md:text-base">{error}</p>
            <button 
              onClick={() => fetchCalibrations()}
              className="mt-2 text-xs md:text-sm text-red-700 hover:text-red-600 underline"
            >
              Retry
            </button>
          </div>
        )}
        

        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-3 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4">
            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
              >
                <option value="">All Statuses</option>
                {Object.values(RequestStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Item */}
            <div>
              <label htmlFor="item" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Item</label>
              <input
                type="text"
                id="item"
                name="item"
                placeholder="Search by name or serial"
                value={filters.item}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
              />
            </div>

            {/* From Date */}
            <div>
              <label htmlFor="dateFrom" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                id="dateFrom"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
              />
            </div>

            {/* To Date */}
            <div>
              <label htmlFor="dateTo" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                id="dateTo"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
              />
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 text-sm rounded-lg transition duration-150 ease-in-out"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
        
        
        {/* All Calibrations Section */}
        <div className="mb-8">
          <h2 className="text-lg md:text-xl font-semibold mb-4">My Calibrations</h2>
          
          {loading ? (
            <div className="bg-white p-6 rounded-lg shadow flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
            </div>
          ) : filteredCalibrations.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <p className="text-gray-500 text-sm">No calibrations found.</p>
            </div>
          ) : (
            <>
              {/* Card view untuk semua ukuran layar */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.isArray(filteredCalibrations) && filteredCalibrations.map((calibration) => (
                  <div key={calibration.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
                    <div className="p-4 flex-grow flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-md font-medium text-gray-900">{calibration.item.name}</h3>
                          <p className="text-sm text-gray-500">{calibration.item.serialNumber}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(calibration.status)}`}>
                          {getDisplayStatus(calibration.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4 text-sm flex-grow">
                        <div>
                          <p className="text-gray-500 font-medium">customer</p>
                          <p className="text-gray-800">{calibration.customer.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium">Date</p>
                          <p className="text-gray-800">{formatDate(calibration.calibrationDate)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium">Valid Until</p>
                          <p className="text-gray-800">{formatDate(calibration.validUntil) || "-"}</p>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-100 mt-auto">
                        {isStatusMatching(calibration.status, RequestStatus.COMPLETED) ? (
                          <button
                            onClick={() => openCertificateModal(calibration)}
                            className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                          >
                            <FiFileText className="mr-1" />
                            View Certificate
                          </button>
                        ) : isStatusMatching(calibration.status, RequestStatus.PENDING) ? (
                          <button
                            onClick={() => openCompleteModal(calibration)}
                            className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                          >
                            <FiFileText className="mr-1" />
                            Complete Calibration
                          </button>
                        ) : (
                          <span className="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-400 bg-gray-50">
                            No Action Available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {/* Pagination Controls */}
          {!loading && filteredCalibrations.length > 0 && (
            <div className="flex flex-col md:flex-row justify-between items-center mt-4 bg-white rounded-lg shadow py-2 px-3 md:px-4 text-xs md:text-sm">
              <div className="text-gray-700 mb-2 md:mb-0">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems} results
              </div>
              <div className="flex flex-wrap justify-center space-x-1">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`px-2 py-1 rounded ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.ceil(totalItems / PAGE_SIZE) }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === Math.ceil(totalItems / PAGE_SIZE) || (page >= currentPage - 1 && page <= currentPage + 1))
                  .map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-2 py-1 rounded ${currentPage === page ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      {page}
                    </button>
                  ))}
                
                <button
                  onClick={() => handlePageChange(Math.min(Math.ceil(totalItems / PAGE_SIZE), currentPage + 1))}
                  disabled={currentPage === Math.ceil(totalItems / PAGE_SIZE)}
                  className={`px-2 py-1 rounded ${currentPage === Math.ceil(totalItems / PAGE_SIZE) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        
{/* Calibration Modal */}
{showCalibrationModal && (
  <div className="fixed inset-0 flex items-center justify-center z-50 p-2 md:p-4">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center bg-green-600 text-white px-4 py-3 sticky top-0 z-10">
        <h2 className="text-lg font-semibold">New Calibration</h2>
        <button 
          onClick={closeCalibrationModal} 
          className="text-white hover:text-gray-200"
          aria-label="Close modal"
          title="Close calibration form"
        >
          <FiX size={20} />
        </button>
      </div>
              
      {/* Form */}
      <form onSubmit={handleCalibrationSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-56px)]">
        <div className="grid grid-cols-1 gap-4">
          {/* Item Details */}
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Item Details</h3>

            {/* Item Selection */}
            <div className="mb-3" ref={itemSearchRef}>
              <label className="block mb-1 text-sm font-medium text-gray-700" id="item-label">Item</label>
              <div className="relative">
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Search for item by name or serial number"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  aria-labelledby="item-label"
                  onFocus={() => itemSearch.length >= 2 && setShowItemSuggestions(true)}
                />
                
                {/* Show selected item if any */}
                {calibrationForm.itemSerial && (
                  <div className="mt-2 p-2 border border-green-200 bg-green-50 rounded-md">
                    <p className="font-medium text-sm">
                      {items.find(item => item.serialNumber === calibrationForm.itemSerial)?.name || "Selected Item"}
                    </p>
                    <p className="text-xs text-gray-600">
                      SN: {calibrationForm.itemSerial}
                    </p>
                  </div>
                )}
                
                {/* Suggestions dropdown */}
                {showItemSuggestions && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredItems.length > 0 ? (
                      <ul className="py-1">
                        {filteredItems.map((item) => (
                          <li 
                            key={item.serialNumber}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleItemSelect(item)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-gray-600">SN: {item.serialNumber}</div>
                              </div>
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800`}>
                                Available
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No matching items found
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!calibrationForm.itemSerial && (
                <p className="text-xs text-gray-500 mt-1">Search and select an item for calibration</p>
              )}
            </div>

            {/* Other Inputs */}
            <div className="mb-3">
              <label className="block mb-1 text-sm font-medium text-gray-700">Nama Produk</label>
                <input
                  type="text"
                name="manufacturer"
                value={calibrationForm.manufacturer}
                  onChange={handleCalibrationFormChange}
                placeholder="RAE Systems"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            
            <div className="mb-3">
              <label className="block mb-1 text-sm font-medium text-gray-700">Part Number</label>
              <input
                type="text"
                name="instrumentName"
                value={calibrationForm.instrumentName}
                onChange={handleCalibrationFormChange}
                placeholder="MeshGuard H2S"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <div className="mb-3">
              <label className="block mb-1 text-sm font-medium text-gray-700">Sensor</label>
              <input
                type="text"
                name="configuration"
                value={calibrationForm.configuration}
                onChange={handleCalibrationFormChange}
                placeholder="H2S, O2, CO, dll"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Date */}
            <div className="mb-3">
              <label className="block mb-1 text-sm font-medium text-gray-700" id="calibration-date-label">Calibration Date</label>
              <input
                type="date"
                name="calibrationDate"
                value={calibrationForm.calibrationDate}
                onChange={handleCalibrationFormChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                aria-labelledby="calibration-date-label"
                title="Select the calibration date"
              />
            </div>
          </div>

          {/* customer Details */}
          <div>
            <h3 className="font-medium text-gray-700 mb-3">customer Details</h3>

            {/* customer */}
            <div className="mb-3" ref={customersearchRef}>
              <label className="block mb-1 text-sm font-medium text-gray-700" id="customer-label">customer</label>
              <div className="relative">
                <input
                  type="text"
                  value={customersearch}
                  onChange={(e) => setcustomersearch(e.target.value)}
                  placeholder="Search for customer by name"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  aria-labelledby="customer-label"
                  onFocus={() => customersearch.length >= 2 && setShowcustomersuggestions(true)}
                  disabled={customersLoading}
                />
                
                {/* Show loading indicator */}
                {customersLoading && (
                  <div className="mt-2 p-2 border border-blue-200 bg-blue-50 rounded-md">
                    <p className="font-medium text-sm text-blue-600">
                      Loading customers...
                    </p>
                  </div>
                )}
                
                {/* Show error message if customers failed to load */}
                {customersError && (
                  <div className="mt-2 p-2 border border-red-200 bg-red-50 rounded-md">
                    <p className="font-medium text-sm text-red-600">
                      {customersError}
                    </p>
                  </div>
                )}
                
                {/* Show selected customer if any */}
                {calibrationForm.customerId && !customersLoading && !customersError && (
                  <div className="mt-2 p-2 border border-green-200 bg-green-50 rounded-md">
                    <p className="font-medium text-sm">
                      {customers.find(customer => customer.id === calibrationForm.customerId)?.name || "Selected customer"}
                    </p>
                    {customers.find(customer => customer.id === calibrationForm.customerId)?.contactName && (
                      <p className="text-xs text-gray-600">
                        Contact: {customers.find(customer => customer.id === calibrationForm.customerId)?.contactName}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Suggestions dropdown */}
                {showcustomersuggestions && !customersLoading && !customersError && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredcustomers.length > 0 ? (
                      <ul className="py-1">
                        {filteredcustomers.map((customer) => (
                          <li 
                            key={customer.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handlecustomerselect(customer)}
                          >
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              {customer.contactName && (
                                <div className="text-sm text-gray-600">Contact: {customer.contactName}</div>
                              )}
                              {customer.contactPhone && (
                                <div className="text-xs text-gray-500">Phone: {customer.contactPhone}</div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No matching customers found
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!calibrationForm.customerId && !customersLoading && !customersError && (
                <p className="text-xs text-gray-500 mt-1">Search and select a customer for calibration</p>
              )}
              {!customersLoading && !customersError && customers.length === 0 && (
                <p className="text-xs text-red-500 mt-1">No customers available. Please contact an administrator.</p>
              )}
            </div>

            {/* Fax */}
            <div className="mb-3">
              <label className="block mb-1 text-sm font-medium text-gray-700">Fax</label>
              <input
                type="text"
                name="fax"
                value={calibrationForm.fax}
                onChange={handleCalibrationFormChange}
                placeholder="Fax number (optional)"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Notes</label>
              <textarea
                name="notes"
                value={calibrationForm.notes}
                onChange={handleCalibrationFormChange}
                placeholder="Additional notes"
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-2">
                  <button 
                    type="button" 
            onClick={closeCalibrationModal}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                  >
            Start Calibration
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Certificate Modal */}
        {showCertificateModal && selectedCalibration && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center bg-green-600 text-white px-4 py-3 sticky top-0 z-10">
                <h3 className="text-lg font-semibold">Calibration Certificate</h3>
                <button onClick={closeCertificateModal} className="text-white hover:text-gray-200" aria-label="Close">
                  <FiX size={20} />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto max-h-[calc(90vh-56px)]">
                <div className="mb-4 p-3 border border-gray-200 rounded-md bg-gray-50">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                      <p className="text-xs text-gray-500">Item Name</p>
                      <p className="font-medium text-sm">{selectedCalibration.item.name}</p>
                </div>
                  <div>
                      <p className="text-xs text-gray-500">Serial Number</p>
                      <p className="font-medium text-sm">{selectedCalibration.item.serialNumber}</p>
                </div>
                  <div>
                      <p className="text-xs text-gray-500">Calibration Date</p>
                      <p className="font-medium text-sm">{formatDate(selectedCalibration.calibrationDate)}</p>
                </div>
                  <div>
                      <p className="text-xs text-gray-500">Valid Until</p>
                      <p className="font-medium text-sm">{formatDate(selectedCalibration.validUntil)}</p>
                </div>
                  <div>
                      <p className="text-xs text-gray-500">customer</p>
                      <p className="font-medium text-sm">{selectedCalibration.customer.name}</p>
                  </div>
                  {selectedCalibration.certificateNumber && (
                    <div>
                        <p className="text-xs text-gray-500">Certificate Number</p>
                        <p className="font-medium text-sm">{selectedCalibration.certificateNumber}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2">
                  {/* View certificate button */}
                  <a
                    href={`/api/user/calibrations/${selectedCalibration.id}/certificate`}
                    target="_blank"
                    rel="noopener noreferrer"
                      className="flex justify-center items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm"
                  >
                    <FiFileText className="mr-2" /> View Certificate
                  </a>
                  
                  {/* Download button */}
                  <a
                    href={`/api/user/calibrations/${selectedCalibration.id}/certificate`}
                    download={`Calibration_Certificate_${selectedCalibration.item.serialNumber}.pdf`}
                      className="flex justify-center items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm"
                  >
                    <FiDownload className="mr-2" /> Download Certificate
                  </a>
                </div>
                </div>
                
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeCertificateModal}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm"
                >
                  Close
                </button>
                </div>
                </div>
            </div>
          </div>
        )}
        
{/* Complete Modal */}
{showCompleteModal && selectedCalibration && (
  <div className="fixed inset-0 flex items-center justify-center z-50 p-2 md:p-4">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
      <div className="flex justify-between items-center bg-green-600 text-white px-4 py-3 sticky top-0 z-10">
        <h2 className="text-lg font-semibold">Complete Calibration</h2>
        <button 
          onClick={closeCompleteModal} 
          className="text-white hover:text-gray-200"
          aria-label="Close modal"
          title="Close complete calibration form"
        >
          <FiX size={20} />
        </button>
      </div>
      
      <div className="overflow-y-auto flex-grow p-4 max-h-[calc(90vh-56px)]">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded-md">
            <p className="font-medium text-sm">{error}</p>
            <button 
              onClick={() => setError('')} 
              className="text-xs text-red-600 underline mt-1 hover:text-red-800"
            >
              Clear
            </button>
          </div>
        )}
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          {/* Certificate Information */}
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Certificate Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="certificateNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate Number
                </label>
                <input
                  type="text"
                  name="certificateNumber"
                  value={completeForm.certificateNumber || "Auto-generated on submit"}
                  readOnly
                  className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm focus:outline-none"
                  placeholder="Auto-generated on submit"
                />
                <p className="text-xs text-gray-500 mt-1">Certificate number will be auto-generated in format: 1/CAL-PBI/V/2025</p>
              </div>
              
              <div>
                <label htmlFor="calibrationDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Calibration Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="calibrationDate"
                  name="calibrationDate"
                  value={completeForm.calibrationDate}
                  onChange={(e) => handleCompleteFormChange(e)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Until <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="validUntil"
                  name="validUntil"
                  value={completeForm.validUntil}
                  onChange={(e) => handleCompleteFormChange(e)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="approvedBy" className="block text-sm font-medium text-gray-700 mb-1">
                  Approved By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="approvedBy"
                  name="approvedBy"
                  value={completeForm.approvedBy}
                  onChange={(e) => handleCompleteFormChange(e)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter approver name"
                  required
                />
              </div>
            </div>
          </div>
          
          {/* Instrument Details Section */}
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Instrument Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Instrument <span className="text-red-500">*</span>
                </label>
                  <input
                    type="text"
                  name="instrumentName"
                  value={completeForm.instrumentName}
                  onChange={(e) => handleCompleteFormChange(e)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter instrument name"
                  required
                  />
                </div>
                
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Manufacturer</label>
                <div className="bg-gray-100 border border-gray-300 text-gray-700 text-sm rounded-md p-2">
                  {selectedCalibration?.item.name || 'Not specified'}
                </div>
                </div>
                
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="modelNumber"
                  value={completeForm.modelNumber}
                  onChange={(e) => handleCompleteFormChange(e)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter model number"
                  required
                />
                </div>
                
                  <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Sensor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="configuration"
                  value={completeForm.configuration}
                  onChange={(e) => handleCompleteFormChange(e)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter sensor configuration"
                  required
                />
              </div>
                  </div>
                </div>
              
          {/* Calibration Gases Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-gray-700">Calibration Gases</h3>
              <button
                type="button"
                onClick={() => {
                  setCompleteForm(prev => ({
                    ...prev,
                    gasEntries: [
                      ...prev.gasEntries,
                      { gasType: '', gasConcentration: '', gasBalance: '', gasBatchNumber: '' }
                    ]
                  }));
                }}
                className="flex items-center text-blue-600 hover:text-blue-800 text-xs"
                aria-label="Add new gas entry"
                title="Add gas entry"
              >
                <FiPlus className="mr-1" size={14} /> Add Gas
              </button>
            </div>
            
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">No</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Gas Type <span className="text-red-500">*</span></th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Concentration <span className="text-red-500">*</span></th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Balance <span className="text-red-500">*</span></th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Batch No. <span className="text-red-500">*</span></th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completeForm.gasEntries.map((gasEntry, index) => (
                    <tr key={`gas-${index}`}>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">{index + 1}</td>
                      <td className="px-2 py-1">
                  <input
                    type="text"
                          name="gasType"
                          value={gasEntry.gasType}
                          onChange={(e) => handleCompleteFormChange(e, index)}
                    required
                          className="w-full p-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                          placeholder="H2S"
                        />
                      </td>
                      <td className="px-2 py-1">
                  <input
                    type="text"
                          name="gasConcentration"
                          value={gasEntry.gasConcentration}
                          onChange={(e) => handleCompleteFormChange(e, index)}
                    required
                          className="w-full p-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                          placeholder="25 ppm"
                        />
                      </td>
                      <td className="px-2 py-1">
                  <input
                    type="text"
                          name="gasBalance"
                          value={gasEntry.gasBalance}
                          onChange={(e) => handleCompleteFormChange(e, index)}
                    required
                          className="w-full p-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                          placeholder="Nitrogen"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          name="gasBatchNumber"
                          value={gasEntry.gasBatchNumber}
                          onChange={(e) => handleCompleteFormChange(e, index)}
                          required
                          className="w-full p-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                          placeholder="WO261451"
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        {completeForm.gasEntries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setCompleteForm(prev => {
                                const updatedEntries = [...prev.gasEntries];
                                updatedEntries.splice(index, 1);
                                return { ...prev, gasEntries: updatedEntries };
                              });
                            }}
                            className="text-red-500 hover:text-red-700"
                            aria-label="Remove gas entry"
                            title="Remove"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
            
          {/* Test Results Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-gray-700">Test Results</h3>
              <button
                type="button"
                onClick={() => {
                  setCompleteForm(prev => ({
                    ...prev,
                    testEntries: [
                      ...prev.testEntries,
                      { testSensor: '', testSpan: '', testResult: 'Pass' }
                    ]
                  }));
                }}
                className="flex items-center text-blue-600 hover:text-blue-800 text-xs"
                aria-label="Add new test result"
                title="Add test result"
              >
                <FiPlus className="mr-1" size={14} /> Add Test Result
              </button>
            </div>
            
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">No</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Sensor <span className="text-red-500">*</span></th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Span <span className="text-red-500">*</span></th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Result <span className="text-red-500">*</span></th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completeForm.testEntries.map((testEntry, index) => (
                    <tr key={`test-${index}`}>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">{index + 1}</td>
                      <td className="px-2 py-1">
                  <input
                    type="text"
                    name="testSensor"
                          value={testEntry.testSensor}
                          onChange={(e) => handleCompleteFormChange(e, index)}
                    required
                          className="w-full p-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                          placeholder="H2S"
                        />
                      </td>
                      <td className="px-2 py-1">
                  <input
                    type="text"
                    name="testSpan"
                          value={testEntry.testSpan}
                          onChange={(e) => handleCompleteFormChange(e, index)}
                    required
                          className="w-full p-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                          placeholder="25 ppm"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center space-x-2">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                              name={`testResult-${index}`}
                        value="Pass"
                              checked={testEntry.testResult === 'Pass'}
                              onChange={(e) => handleCompleteFormChange(e, index)}
                              className="form-radio h-3 w-3 text-green-600"
                            />
                            <span className="ml-1 text-xs">Pass</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                              name={`testResult-${index}`}
                        value="Fail"
                              checked={testEntry.testResult === 'Fail'}
                              onChange={(e) => handleCompleteFormChange(e, index)}
                              className="form-radio h-3 w-3 text-red-600"
                            />
                            <span className="ml-1 text-xs">Fail</span>
                    </label>
                  </div>
                      </td>
                      <td className="px-2 py-1 text-right">
                        {completeForm.testEntries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setCompleteForm(prev => {
                                const updatedEntries = [...prev.testEntries];
                                updatedEntries.splice(index, 1);
                                return { ...prev, testEntries: updatedEntries };
                              });
                            }}
                            className="text-red-500 hover:text-red-700"
                            aria-label="Remove test entry"
                            title="Remove"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                </div>
              </div>
            
          {/* Notes Section */}
              <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
              id="notes"
                  name="notes"
                  value={completeForm.notes}
                  onChange={(e) => handleCompleteFormChange(e)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              rows={3}
              placeholder="Enter any additional notes"
                ></textarea>
              </div>
              
          <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-xs">
            <p className="text-yellow-700">
                  <strong>Note:</strong> Once you complete this calibration, a certificate will be generated automatically. 
                  You will be able to download it after completion.
                </p>
          </div>
          
          <div className="flex justify-end space-x-2">
                <button
              type="button"
              onClick={closeCompleteModal}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm"
            >
              Complete & Generate Certificate
                </button>
          </div>
        </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}