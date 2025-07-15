import { useState, useEffect, useCallback } from 'react';
import { FiCalendar, FiClock, FiArrowRight, FiLoader } from 'react-icons/fi';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Schedule {
  id: string;
  name: string;
  nextDate?: string;
  scheduledDate: string;
  isRecurring?: boolean;
  recurrenceType?: string;
}

interface UpcomingSchedulesCardProps {
  title: string;
  apiUrl: string;
  viewAllLink: string;
}

export default function UpcomingSchedulesCard({ title, apiUrl, viewAllLink }: UpcomingSchedulesCardProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Wrap fetchSchedules with useCallback
  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(apiUrl);
      
      if (!res.ok) {
        throw new Error('Failed to fetch schedules');
      }
      
      const data = await res.json();
      
      // Sort by date and take only the first 5
      const sortedSchedules = [...data]
        .sort((a, b) => {
          const dateA = new Date(a.nextDate || a.scheduledDate);
          const dateB = new Date(b.nextDate || b.scheduledDate);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(0, 5);
      
      setSchedules(sortedSchedules);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Failed to load schedules');
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  // Fetch schedules on component mount
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const formatScheduleDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const isScheduleSoon = (dateString: string | null) => {
    if (!dateString) return false;
    const scheduleDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if schedule date is within 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    return scheduleDate <= threeDaysFromNow && scheduleDate >= today;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-md font-medium text-gray-700">{title}</h3>
        <Link 
          href={viewAllLink} 
          className="text-sm text-green-600 hover:text-green-800 flex items-center"
        >
          View All
          <FiArrowRight className="ml-1" size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <FiLoader className="animate-spin text-gray-400" size={24} />
        </div>
      ) : error ? (
        <div className="bg-red-50 p-3 rounded-md text-sm text-red-600">
          {error}
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-gray-50 p-4 rounded-md text-center">
          <p className="text-gray-500 text-sm">No upcoming schedules</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {schedules.map((schedule) => {
            const scheduleDate = new Date(schedule.nextDate || schedule.scheduledDate);
            const isToday = new Date().toDateString() === scheduleDate.toDateString();
            
            return (
              <li key={schedule.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-800">{schedule.name}</h4>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <FiCalendar className="mr-1" size={12} />
                      <span>
                        {scheduleDate.toLocaleDateString()} 
                        {isToday && <span className="text-green-600 ml-1">(Today)</span>}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    isScheduleSoon(schedule.nextDate || schedule.scheduledDate) 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {isScheduleSoon(schedule.nextDate || schedule.scheduledDate) ? 'Soon' : 'Upcoming'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
} 