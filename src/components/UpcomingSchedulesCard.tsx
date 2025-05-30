import { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiRefreshCw } from 'react-icons/fi';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Schedule {
  id: string;
  name: string | null;
  scheduledDate: string;
  isRecurring: boolean;
  recurrenceType: string | null;
  nextDate: string | null;
}

interface UpcomingSchedulesCardProps {
  title?: string;
  apiUrl: string;
  viewAllLink: string;
}

export default function UpcomingSchedulesCard({
  title = 'Upcoming Schedules',
  apiUrl,
  viewAllLink
}: UpcomingSchedulesCardProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiUrl);

      if (!res.ok) {
        throw new Error('Failed to fetch schedules');
      }

      const data = await res.json();
      
      // Sort by scheduled date
      const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(a.nextDate || a.scheduledDate);
        const dateB = new Date(b.nextDate || b.scheduledDate);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Only show upcoming schedules (filter out completed ones)
      const upcomingSchedules = sortedData.filter(schedule => !schedule.completedDate);
      
      // Take first 5 for the card
      setSchedules(upcomingSchedules.slice(0, 5));
      
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Failed to load schedules');
      toast.error('Failed to load upcoming schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [apiUrl]);

  const handleRefresh = () => {
    fetchSchedules();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-md font-medium text-gray-800 flex items-center">
          <FiCalendar className="mr-2 text-green-600" />
          {title}
        </h3>
        <button
          onClick={handleRefresh}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Refresh"
          title="Refresh"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} size={16} />
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <FiRefreshCw className="animate-spin mx-auto mb-2" size={24} />
            <p>Loading schedules...</p>
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-center text-red-500">
            <p>{error}</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500">
            <p>No upcoming schedules found</p>
          </div>
        ) : (
          schedules.map((schedule) => {
            const scheduleDate = new Date(schedule.nextDate || schedule.scheduledDate);
            const isToday = new Date().toDateString() === scheduleDate.toDateString();
            const isPast = scheduleDate < new Date();
            
            // Calculate days difference
            const daysDiff = Math.ceil(
              (scheduleDate.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
            );
            
            // Set badge styling
            let badgeClass = "bg-blue-100 text-blue-800"; // Default
            if (isToday) {
              badgeClass = "bg-yellow-100 text-yellow-800"; // Today
            } else if (isPast) {
              badgeClass = "bg-red-100 text-red-800"; // Past due
            } else if (daysDiff <= 7) {
              badgeClass = "bg-orange-100 text-orange-800"; // This week
            }
            
            return (
              <div key={schedule.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <Link 
                      href={`${viewAllLink}/${schedule.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-green-600"
                    >
                      {schedule.name || 'Unnamed Schedule'}
                    </Link>
                    <p className="text-xs text-gray-500 flex items-center mt-1">
                      <FiClock className="mr-1" size={12} />
                      {scheduleDate.toLocaleDateString()}
                      {schedule.isRecurring && (
                        <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-50 text-green-700">
                          {schedule.recurrenceType === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${badgeClass}`}>
                    {isToday 
                      ? 'Today' 
                      : isPast 
                        ? 'Overdue' 
                        : daysDiff === 1 
                          ? 'Tomorrow' 
                          : daysDiff <= 7 
                            ? `${daysDiff} days` 
                            : scheduleDate.toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <Link 
          href={viewAllLink}
          className="text-sm text-green-600 hover:text-green-800 font-medium"
        >
          View all schedules
        </Link>
      </div>
    </div>
  );
} 