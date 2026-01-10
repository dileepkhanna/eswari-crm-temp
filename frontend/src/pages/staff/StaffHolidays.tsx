import { useState, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import { HolidayCalendar, HolidayList } from '@/components/holidays';
import { Calendar, List } from 'lucide-react';
import { Holiday } from '@/types';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

export default function StaffHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getHolidays({ year: selectedYear });
      const holidaysData = Array.isArray(response) ? response : response.results || [];
      
      const transformedHolidays: Holiday[] = holidaysData.map((holiday: any) => ({
        id: holiday.id.toString(),
        name: holiday.name,
        start_date: new Date(holiday.start_date),
        end_date: holiday.end_date ? new Date(holiday.end_date) : undefined,
        date: new Date(holiday.start_date), // Backward compatibility
        holiday_type: holiday.holiday_type,
        description: holiday.description || '',
        image: holiday.image,
        is_recurring: holiday.is_recurring,
        created_by: holiday.created_by.toString(),
        created_by_detail: holiday.created_by_detail,
        created_at: new Date(holiday.created_at),
        updated_at: new Date(holiday.updated_at),
      }));
      
      setHolidays(transformedHolidays);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast.error('Failed to fetch holidays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  return (
    <div className="min-h-screen">
      <TopBar 
        title="Holiday Calendar" 
        subtitle="View company holidays and events"
      />
      
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Company Holidays</h2>
          <p className="text-muted-foreground">View company holidays and events</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Calendar View */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Calendar View</h3>
            </div>
            <HolidayCalendar 
              holidays={holidays}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              canEdit={false}
            />
          </div>

          {/* List View */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <List className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">List View</h3>
            </div>
            <HolidayList 
              holidays={holidays}
              loading={loading}
              canEdit={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}