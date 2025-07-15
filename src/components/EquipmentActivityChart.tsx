'use client';

import { useEffect, useState, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { FiRefreshCw } from 'react-icons/fi';
import { useUser } from '@/app/context/UserContext';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Type for monthly data
export interface MonthlyActivityData {
  month: number;
  rentals: number;
  calibrations: number;
  maintenance: number;
}

// Type for the complete response
export interface EquipmentActivityResponse {
  year: number;
  monthlyData: MonthlyActivityData[];
}

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface EquipmentActivityChartProps {
  title?: string;
}

export default function EquipmentActivityChart({ title = "Equipment Activity" }: EquipmentActivityChartProps) {
  const [activityData, setActivityData] = useState<EquipmentActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const { user } = useUser();
  
  // Determine API endpoint based on user role
  const apiEndpoint = user?.role === 'ADMIN' 
    ? '/api/admin/equipment-activity' 
    : '/api/user/equipment-activity';

  // Cache keys
  const CACHE_KEY = `equipment_activity_data_${year}_${user?.role || ''}`;
  const CACHE_TIMESTAMP_KEY = `equipment_activity_timestamp_${year}_${user?.role || ''}`;
  const CACHE_DURATION = 60000; // 1 minute

  const fetchActivityData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Check cache first unless force refresh is requested
      if (!forceRefresh) {
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        const lastFetch = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
        const now = Date.now();
        
        if (cachedData && lastFetch && now - parseInt(lastFetch) < CACHE_DURATION) {
          try {
            const parsedData = JSON.parse(cachedData);
            setActivityData(parsedData);
            setLoading(false);
            return;
          } catch (e) {
            console.error('Error parsing cached activity data:', e);
            // Continue with fetching fresh data
          }
        }
      }
      
      const res = await fetch(`${apiEndpoint}?year=${year}`, {
        cache: forceRefresh ? 'no-store' : 'default',
        headers: forceRefresh ? { 'Cache-Control': 'no-cache' } : {}
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch equipment activity data');
      }
      
      const data = await res.json();
      
      // Cache the results
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      setActivityData(data);
      setError(null);
    } catch (err) {
      setError('Gagal memuat data aktivitas. Silakan coba lagi nanti.');
      console.error(err);
      
      // Try to use cached data even if it's expired
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          setActivityData(parsedData);
        } catch (e) {
          console.error('Error parsing fallback cached data:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [year, CACHE_KEY, CACHE_TIMESTAMP_KEY, apiEndpoint]);

  // Fetch data when component mounts or year changes
  useEffect(() => {
    fetchActivityData();
  }, [fetchActivityData, year]);

  // Prepare chart data
  const chartData = {
    labels: months,
    datasets: [
      {
        label: 'Peminjaman',
        data: activityData?.monthlyData.map(m => m.rentals) || Array(12).fill(0),
        backgroundColor: 'rgba(255, 206, 86, 0.6)',
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 1,
      },
      {
        label: 'Kalibrasi',
        data: activityData?.monthlyData.map(m => m.calibrations) || Array(12).fill(0),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
      {
        label: 'Maintenance',
        data: activityData?.monthlyData.map(m => m.maintenance) || Array(12).fill(0),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Jumlah Barang'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Bulan'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${title} ${year}`,
      },
    },
  };

  // Handle year change
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(parseInt(e.target.value));
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchActivityData(true);
  };

  // Generate year options for the selector (from 2020 to current year + 5)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 2020 + 6 }, (_, i) => 2020 + i);

  return (
    <div className="bg-white rounded-lg p-4 h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        <div className="flex items-center space-x-2">
          <select
            value={year}
            onChange={handleYearChange}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
            aria-label="Pilih tahun"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            className="bg-green-100 hover:bg-green-200 text-green-700 p-1 rounded-md"
            aria-label="Perbarui data"
            title="Perbarui data"
          >
            <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}
      
      <div className="h-64 md:h-80">
        {loading && !activityData ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <Bar data={chartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
} 