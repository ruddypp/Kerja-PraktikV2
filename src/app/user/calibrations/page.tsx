'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FiFileText, FiPlus, FiDownload } from 'react-icons/fi';
import jsPDF from 'jspdf';
// @ts-ignore jspdf-autotable doesn't have proper TypeScript types
import autoTable from 'jspdf-autotable';

interface Category {
  id: number;
  name: string;
}

interface Status {
  id: number;
  name: string;
  type: string;
}

interface Item {
  id: number;
  name: string;
  specification: string | null;
  serialNumber: string | null;
  category: Category;
  status: Status;
}

interface Request {
  id: number;
  userId: number;
  itemId: number;
  requestType: string;
  reason: string | null;
  requestDate: string;
  status: Status;
  item: Item;
}

interface Vendor {
  id: number;
  name: string;
  contactPerson: string | null;
}

interface Calibration {
  id: number;
  requestId: number;
  vendorId: number | null;
  calibrationDate: string;
  result: string | null;
  certificateUrl: string | null;
  status: Status;
  request: Request;
  vendor: Vendor | null;
}

export default function UserCalibrationPage() {
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedCalibration, setSelectedCalibration] = useState<Calibration | null>(null);
  
  // Form state
  const [requestForm, setRequestForm] = useState({
    itemId: '',
    reason: '',
    vendorId: ''
  });
  
  useEffect(() => {
    fetchCalibrations();
    fetchPendingRequests();
    fetchAvailableItems();
    fetchVendors();
  }, []);
  
  const fetchPendingRequests = async () => {
    try {
      setPendingLoading(true);
      // Use case-insensitive query for status name
      const res = await fetch('/api/user/requests?requestType=calibration&statusName=pending');
      
      if (!res.ok) {
        throw new Error(`Failed to fetch pending requests: ${res.statusText}`);
      }
      
      const data = await res.json();
      setPendingRequests(data);
      console.log('Fetched pending requests:', data.length);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    } finally {
      setPendingLoading(false);
    }
  };
  
  const fetchCalibrations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/calibrations');
      
      if (!res.ok) {
        throw new Error(`Failed to fetch calibrations: ${res.statusText}`);
      }
      
      const data = await res.json();
      setCalibrations(data);
    } catch (err) {
      console.error('Error fetching calibrations:', err);
      setError('Error loading calibrations. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAvailableItems = async () => {
    try {
      const res = await fetch('/api/admin/items?statusName=Available');
      
      if (!res.ok) {
        throw new Error('Failed to fetch available items');
      }
      
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Error fetching available items:', err);
    }
  };
  
  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/user/vendors');
      
      if (!res.ok) {
        throw new Error('Failed to fetch vendors');
      }
      
      const data = await res.json();
      setVendors(data);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    }
  };
  
  const handleRequestFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setRequestForm(prev => ({ ...prev, [name]: value }));
  };
  
  const openRequestModal = () => {
    setRequestForm({
      itemId: '',
      reason: '',
      vendorId: ''
    });
    setShowRequestModal(true);
  };
  
  const closeRequestModal = () => {
    setShowRequestModal(false);
  };
  
  const openCertificateModal = (calibration: Calibration) => {
    setSelectedCalibration(calibration);
    setShowCertificateModal(true);
  };
  
  const closeCertificateModal = () => {
    setShowCertificateModal(false);
    setSelectedCalibration(null);
  };
  
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submit button clicked, processing form submission');
    
    try {
      if (!requestForm.itemId) {
        throw new Error('Please select an item for calibration');
      }
      
      // Check if selected item is still available
      const selectedItem = items.find(item => item.id === parseInt(requestForm.itemId));
      
      if (!selectedItem) {
        throw new Error('Selected item not found. Please try again.');
      }
      
      // Check specifically for Available status using case-insensitive comparison
      const availableNames = ['Available', 'AVAILABLE', 'available'];
      if (!selectedItem.status || !availableNames.includes(selectedItem.status.name)) {
        throw new Error(`Item is not available for calibration. Current status: ${selectedItem.status?.name || 'Unknown'}`);
      }
      
      console.log('Submitting request data:', requestForm);
      const res = await fetch('/api/user/calibrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestForm)
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to submit calibration request');
      }
      
      // Success
      console.log('Request submitted successfully');
      setSuccess('Calibration request submitted successfully!');
      closeRequestModal();
      
      // Refresh all data
      await refreshData();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error('Error submitting request:', err);
      setError(err.message || 'Failed to submit calibration request');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  
  const refreshData = async () => {
    try {
      // Set loading states
      setLoading(true);
      setPendingLoading(true);
      
      console.log('Refreshing data...');
      
      // Fetch data in parallel
      const [calibrationsRes, pendingRequestsRes, itemsRes] = await Promise.all([
        fetch('/api/user/calibrations'),
        fetch('/api/user/requests?requestType=calibration&statusName=pending'),
        fetch('/api/admin/items?statusName=Available')
      ]);
      
      if (!calibrationsRes.ok) {
        throw new Error(`Failed to fetch calibrations: ${calibrationsRes.statusText}`);
      }
      
      if (!pendingRequestsRes.ok) {
        throw new Error(`Failed to fetch pending requests: ${pendingRequestsRes.statusText}`);
      }
      
      if (!itemsRes.ok) {
        throw new Error(`Failed to fetch available items: ${itemsRes.statusText}`);
      }
      
      const [calibrationsData, pendingRequestsData, itemsData] = await Promise.all([
        calibrationsRes.json(),
        pendingRequestsRes.json(),
        itemsRes.json()
      ]);
      
      setCalibrations(calibrationsData);
      setPendingRequests(pendingRequestsData);
      setItems(itemsData);
      
      console.log('Data refreshed successfully');
      console.log('Pending requests:', pendingRequestsData.length);
      console.log('Calibrations:', calibrationsData.length);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data. Please try again.');
    } finally {
      // Reset loading states
      setLoading(false);
      setPendingLoading(false);
    }
  };
  
  const downloadCertificate = async () => {
    if (!selectedCalibration) return;
    
    try {
      const res = await fetch(`/api/user/calibrations/${selectedCalibration.id}/certificate`);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to get certificate data');
      }
      
      const certificateData = await res.json();
      
      // Create PDF document with metadata
      const doc = new jsPDF();
      
      // Add document metadata
      doc.setProperties({
        title: `Calibration Certificate #${certificateData.certificateNumber}`,
        subject: `Calibration Certificate for ${certificateData.item.name}`,
        author: 'Paramata Calibration System',
        keywords: 'calibration, certificate, paramata',
        creator: 'Paramata System'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const centerX = pageWidth / 2;
      
      // Add company logo placeholder
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(centerX - 25, 10, 50, 15, 2, 2, 'FD');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('PARAMATA', centerX, 20, { align: 'center' });
      
      // Add title
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text('CALIBRATION CERTIFICATE', centerX, 35, { align: 'center' });
      
      // Add certificate number
      doc.setFontSize(12);
      doc.text(`Certificate No: ${certificateData.certificateNumber}`, centerX, 45, { align: 'center' });
      
      // Add horizontal line
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(20, 50, pageWidth - 20, 50);
      
      // Equipment Information section
      doc.setFontSize(14);
      doc.text('Equipment Information', 20, 60);
      
      autoTable(doc, {
        startY: 65,
        head: [['Property', 'Value']],
        body: [
          ['Item Name', certificateData.item.name],
          ['Serial Number', certificateData.item.serialNumber || 'N/A'],
          ['Category', certificateData.item.category],
          ['Specification', certificateData.item.specification || 'N/A']
        ],
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133], textColor: 255 },
        styles: { overflow: 'linebreak', cellWidth: 'wrap' },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 'auto' }
        }
      });
      
      // Calibration Information section
      let finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text('Calibration Information', 20, finalY);
      
      // Prepare calibration data rows
      const calibrationRows = [
        ['Calibration Date', new Date(certificateData.calibrationDate).toLocaleDateString()],
        ['Valid Until', new Date(certificateData.validUntil).toLocaleDateString()]
      ];
      
      // Add vendor information if available
      if (certificateData.vendor) {
        calibrationRows.push(['Calibrated By', certificateData.vendor.name]);
        if (certificateData.vendor.contactPerson) {
          calibrationRows.push(['Contact Person', certificateData.vendor.contactPerson]);
        }
        if (certificateData.vendor.contactEmail) {
          calibrationRows.push(['Contact Email', certificateData.vendor.contactEmail]);
        }
        if (certificateData.vendor.contactPhone) {
          calibrationRows.push(['Contact Phone', certificateData.vendor.contactPhone]);
        }
      }
      
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Property', 'Value']],
        body: calibrationRows,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133], textColor: 255 },
        styles: { overflow: 'linebreak', cellWidth: 'wrap' },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 'auto' }
        }
      });
      
      // Results section
      finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text('Calibration Results', 20, finalY);
      
      // Add result text in a box
      autoTable(doc, {
        startY: finalY + 5,
        body: [[certificateData.result || 'Calibration completed successfully with no issues.']],
        theme: 'plain',
        styles: { 
          overflow: 'linebreak', 
          cellWidth: 'auto',
          cellPadding: 5,
          minCellHeight: 10
        },
        tableWidth: pageWidth - 40,
        margin: { left: 20, right: 20 }
      });
      
      // Add signatures section
      finalY = (doc as any).lastAutoTable.finalY + 20;
      
      doc.line(40, finalY, 100, finalY);
      doc.line(pageWidth - 100, finalY, pageWidth - 40, finalY);
      
      doc.setFontSize(10);
      doc.text('Calibration Technician', 70, finalY + 5, { align: 'center' });
      doc.text('Quality Assurance', pageWidth - 70, finalY + 5, { align: 'center' });
      
      // Add certified stamp
      doc.setDrawColor(0, 128, 0);
      doc.setLineWidth(1);
      doc.setTextColor(0, 128, 0);
      doc.circle(pageWidth - 50, finalY - 30, 20, 'S');
      doc.setFontSize(12);
      doc.text('CERTIFIED', pageWidth - 50, finalY - 27, { align: 'center' });
      
      // Add footer with date and page info
      const footerDate = new Date().toLocaleDateString();
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on ${footerDate} | Paramata Calibration System`, centerX, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      
      // Save the PDF
      doc.save(`calibration-certificate-${selectedCalibration.id}.pdf`);
      
      setSuccess('Certificate downloaded successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error downloading certificate:', err);
      setError(err.message || 'Failed to download certificate');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const getStatusBadgeColor = (statusName: string) => {
    switch (statusName.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Helper function to check if a status name matches a target status
  const isStatusMatching = (statusName: string, targetStatus: string): boolean => {
    return statusName.toLowerCase() === targetStatus.toLowerCase();
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-title text-xl md:text-2xl">Calibration Management</h1>
          <button 
            onClick={openRequestModal}
            className="btn btn-primary flex items-center"
          >
            <FiPlus className="mr-2" /> New Calibration Request
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-medium">{success}</p>
          </div>
        )}
        
        {/* Pending Calibration Requests Section */}
        <div className="mb-8">
          <h2 className="text-subtitle text-lg mb-4">Pending Calibration Requests</h2>
          
          {pendingLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-2 text-sm text-subtitle">Loading pending requests...</p>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded shadow-sm">
              <p className="text-gray-600">No pending calibration requests.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{request.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{request.item.name}</div>
                          <div className="text-xs text-gray-500">{request.item.serialNumber || 'No S/N'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(request.requestDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(request.status.name)}`}>
                            {request.status.name.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {request.reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Calibration Records Section */}
        <div>
          <h2 className="text-subtitle text-lg mb-4">Calibration Records</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-4 text-subtitle">Loading calibrations...</p>
            </div>
          ) : calibrations.length === 0 ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
              <p className="text-yellow-700 font-medium">No calibration records found.</p>
              <p className="text-yellow-600 mt-2">
                Use the "New Calibration Request" button to request item calibration.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {calibrations.map((calibration) => (
                      <tr key={calibration.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{calibration.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{calibration.request.item.name}</div>
                          <div className="text-xs text-gray-500">{calibration.request.item.serialNumber || 'No S/N'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {calibration.vendor?.name || 'Not assigned yet'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(calibration.calibrationDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(calibration.status.name)}`}>
                            {calibration.status.name.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {isStatusMatching(calibration.status.name, 'completed') ? (
                            <button
                              onClick={() => openCertificateModal(calibration)}
                              className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                            >
                              <FiFileText className="mr-1" />
                              Certificate
                            </button>
                          ) : (
                            <span className="text-gray-400">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Request Modal */}
        {showRequestModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">New Calibration Request</h3>
                <button onClick={closeRequestModal} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form 
                onSubmit={(e) => {
                  console.log('Form submitted');
                  handleRequestSubmit(e);
                }}
              >
                <div className="mb-4">
                  <label htmlFor="itemId" className="form-label">Select Item <span className="text-red-500">*</span></label>
                  <select
                    id="itemId"
                    name="itemId"
                    value={requestForm.itemId}
                    onChange={handleRequestFormChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select an item</option>
                    {items.filter(item => {
                      // Only show items with Available status
                      const availableNames = ['Available', 'AVAILABLE', 'available'];
                      return item.status && availableNames.includes(item.status.name);
                    }).map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.serialNumber ? `(${item.serialNumber})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="vendorId" className="form-label">Preferred Vendor (Optional)</label>
                  <select
                    id="vendorId"
                    name="vendorId"
                    value={requestForm.vendorId}
                    onChange={handleRequestFormChange}
                    className="form-input"
                  >
                    <option value="">Select a vendor (optional)</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} {vendor.contactPerson ? `(${vendor.contactPerson})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="reason" className="form-label">Reason for Calibration</label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={requestForm.reason}
                    onChange={handleRequestFormChange}
                    rows={3}
                    className="form-input"
                    placeholder="Explain why this item needs calibration..."
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={closeRequestModal}
                    className="btn btn-secondary order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary order-1 sm:order-2"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Certificate Modal */}
        {showCertificateModal && selectedCalibration && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title text-lg">Calibration Certificate</h3>
                <button onClick={closeCertificateModal} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <div className="mb-4">
                  <div className="text-gray-600 text-sm mb-1">Item:</div>
                  <div className="font-medium">{selectedCalibration.request.item.name}</div>
                </div>
                
                <div className="mb-4">
                  <div className="text-gray-600 text-sm mb-1">Serial Number:</div>
                  <div>{selectedCalibration.request.item.serialNumber || '-'}</div>
                </div>
                
                <div className="mb-4">
                  <div className="text-gray-600 text-sm mb-1">Calibration Date:</div>
                  <div>{formatDate(selectedCalibration.calibrationDate)}</div>
                </div>
                
                <div className="mb-4">
                  <div className="text-gray-600 text-sm mb-1">Vendor:</div>
                  <div>{selectedCalibration.vendor?.name || 'Not specified'}</div>
                </div>
                
                <div className="mb-4">
                  <div className="text-gray-600 text-sm mb-1">Status:</div>
                  <div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(selectedCalibration.status.name)}`}>
                      {selectedCalibration.status.name.toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={downloadCertificate}
                  className="btn btn-primary flex items-center"
                >
                  <FiDownload className="mr-2" />
                  Download Certificate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}