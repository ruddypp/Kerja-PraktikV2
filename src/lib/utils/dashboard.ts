// Dashboard utility types
export interface DashboardStats {
  totalItems: number;
  availableItems: number;
  inUseItems: number;
  inCalibrationItems: number;
  inRentalItems: number;
  inMaintenanceItems: number;
  pendingRequests: number;
  pendingCalibrations: number;
  pendingRentals: number;
  upcomingCalibrations: number;
  overdueRentals: number;
  totalVendors: number;
  totalUsers: number;
}

// Format number with thousands separator
export function formatNumber(num: number): string {
  return num.toLocaleString('id-ID');
}

// Calculate percentage
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

// Format date for display
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(dateObj);
}

// Get status badge color based on status
export function getStatusBadgeColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'AVAILABLE':
      return 'bg-green-100 text-green-800';
    case 'IN_CALIBRATION':
      return 'bg-purple-100 text-purple-800';
    case 'RENTED':
      return 'bg-yellow-100 text-yellow-800';
    case 'IN_MAINTENANCE':
      return 'bg-red-100 text-red-800';
    case 'PENDING':
      return 'bg-orange-100 text-orange-800';
    case 'APPROVED':
      return 'bg-blue-100 text-blue-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
} 