'use client';

import { useState, useEffect, useCallback } from 'react';
import { Role } from '@prisma/client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { FiSearch, FiCalendar } from 'react-icons/fi';
import { XIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

interface ActivityMetrics {
  totalActivities: number;
  maintenancesCompleted: number;
  rentalsProcessed: number;
  calibrationsHandled: number;
  monthlyActivity: {
    month: string;
    count: number;
  }[];
  yearlyActivity: {
    year: string;
    count: number;
  }[];
}

export default function UsersPerformancePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userPerformance, setUserPerformance] = useState<ActivityMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [performanceLoading, setPerformanceLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const currentYear = new Date().getFullYear();
    return Math.max(currentYear, 2025);
  });

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/users');
        
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        setUsers(data.data);
        setFilteredUsers(data.data);
        
        if (data.data.length > 0) {
          setSelectedUser(data.data[0].id);
        }
      } catch (err) {
        setError('Error loading users data');
        console.error(err);
        toast.error('Failed to load users data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  // Fetch user performance
  const fetchUserPerformance = useCallback(async (userId: string) => {
    setPerformanceLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users-performance/${userId}?year=${selectedYear}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }
      
      const data = await response.json();
      
      if (!data.metrics) {
        throw new Error('Invalid data format received from API');
      }
      
      console.log('Performance data received:', data.metrics);
      setUserPerformance(data.metrics);
    } catch (err) {
      console.error('Error loading performance data:', err);
      setError('Error loading performance data');
      toast.error('Failed to load performance data');
    } finally {
      setPerformanceLoading(false);
    }
  }, [selectedYear]);

  // Fetch performance data when selected user or year changes
  useEffect(() => {
    if (selectedUser) {
      fetchUserPerformance(selectedUser);
    }
  }, [selectedUser, selectedYear, fetchUserPerformance]);

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
  };

  // Handle year selection
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  // Prepare monthly chart data
  const getMonthlyChartData = () => {
    if (!userPerformance) return null;
    
    return {
      labels: userPerformance.monthlyActivity.map(item => item.month),
      datasets: [
        {
          label: 'Aktivitas Bulanan',
          data: userPerformance.monthlyActivity.map(item => item.count),
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1
        }
      ]
    };
  };

  // Selected user info
  const selectedUserInfo = selectedUser ? users.find(user => user.id === selectedUser) : null;

  // Chart options with max scale of 100
  const monthlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Aktivitas Bulanan',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 10
        }
      }
    }
  };

  // Generate current year and past years for year selector, starting from 2025
  const yearOptions = () => {
    const startYear = 2025;
    const currentYear = new Date().getFullYear();
    // Make sure we include at least startYear through currentYear + 1
    const endYear = Math.max(currentYear + 1, startYear + 3);
    return Array.from(
      { length: endYear - startYear + 1 }, 
      (_, i) => startYear + i
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Performa Pengguna</h1>
        <div className="flex items-center mt-4 md:mt-0">
          <div className="relative">
            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              aria-label="Pilih tahun"
              title="Pilih tahun untuk melihat data performa"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
            >
              {yearOptions().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* User List */}
        <div className="bg-white rounded-lg shadow-sm lg:col-span-1 border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-800">Daftar Pengguna</h2>
            <div className="mt-2 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari pengguna..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  aria-label="Hapus pencarian"
                  title="Hapus pencarian"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchQuery('')}
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="p-4 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-36"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-48"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Tidak ada pengguna yang ditemukan.</p>
              </div>
            ) : (
              filteredUsers.map(user => (
                <div 
                  key={user.id}
                  className={`p-4 cursor-pointer border-b border-gray-100 transition-colors ${selectedUser === user.id ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                  onClick={() => handleUserSelect(user.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <div className="flex items-center mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${user.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {user.role}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {new Date(user.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Performance Data */}
        <div className="bg-white rounded-lg shadow-sm lg:col-span-3 border border-gray-100">
          {!selectedUserInfo ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Pilih pengguna untuk melihat data performa.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-xl mr-3">
                      {selectedUserInfo.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-medium text-gray-900 text-lg">{selectedUserInfo.name}</h2>
                      <p className="text-sm text-gray-500">{selectedUserInfo.email}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full ${selectedUserInfo.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {selectedUserInfo.role}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Metrik Aktivitas {selectedYear}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {performanceLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </div>
                    ))
                  ) : userPerformance ? (
                    <>
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="text-sm text-green-800">Maintenance</h4>
                        <p className="text-2xl font-bold text-green-900">{userPerformance.maintenancesCompleted}</p>
                        <p className="text-xs text-green-700 mt-1">Selesai</p>
                      </div>
                      
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="text-sm text-blue-800">Rental</h4>
                        <p className="text-2xl font-bold text-blue-900">{userPerformance.rentalsProcessed}</p>
                        <p className="text-xs text-blue-700 mt-1">Diproses</p>
                      </div>
                      
                      <div className="bg-amber-50 rounded-lg p-4">
                        <h4 className="text-sm text-amber-800">Kalibrasi</h4>
                        <p className="text-2xl font-bold text-amber-900">{userPerformance.calibrationsHandled}</p>
                        <p className="text-xs text-amber-700 mt-1">Ditangani</p>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-3 p-8 text-center">
                      <p className="text-gray-500">Tidak ada data performa yang tersedia.</p>
                    </div>
                  )}
                </div>
                
                {/* Monthly Activity Chart */}
                <div className="mt-8">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                    Grafik Aktivitas Bulanan ({selectedYear})
                  </h3>
                  
                  <div className="bg-white border border-gray-100 rounded-lg p-4 h-80">
                    {performanceLoading ? (
                      <div className="h-full w-full bg-gray-50 animate-pulse flex items-center justify-center">
                        <div className="text-gray-400">Memuat data...</div>
                      </div>
                    ) : (
                      userPerformance && getMonthlyChartData() ? (
                        <Bar data={getMonthlyChartData()!} options={monthlyChartOptions} />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-500">Data tidak tersedia</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
                
                {/* Yearly Summary Chart */}
                {userPerformance && !performanceLoading && (
                  <div className="mt-8">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Ringkasan Tahunan</h3>
                    <div className="bg-white border border-gray-100 rounded-lg p-4 h-64">
                      <Line 
                        data={{
                          labels: userPerformance.yearlyActivity.map(item => item.year),
                          datasets: [
                            {
                              label: 'Total Aktivitas per Tahun',
                              data: userPerformance.yearlyActivity.map(item => item.count),
                              backgroundColor: 'rgba(168, 85, 247, 0.6)',
                              borderColor: 'rgb(168, 85, 247)',
                              borderWidth: 2,
                              fill: true,
                              tension: 0.4
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top' as const,
                            },
                            title: {
                              display: true,
                              text: 'Tren Aktivitas Tahunan',
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 100,
                              ticks: {
                                stepSize: 20
                              }
                            }
                          }
                        }}
                      />
                    </div>
                    <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Total <span className="font-medium">{userPerformance.totalActivities}</span> aktivitas tercatat di tahun {selectedYear}.
                        {userPerformance.totalActivities > 0 ? (
                          <span> Performa tertinggi di area {
                            [
                              { name: 'maintenance', value: userPerformance.maintenancesCompleted },
                              { name: 'rental', value: userPerformance.rentalsProcessed },
                              { name: 'kalibrasi', value: userPerformance.calibrationsHandled }
                            ].sort((a, b) => b.value - a.value)[0].name
                          }.</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}