import { useState, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import { HolidayCalendar, HolidayList, HolidayFormModal } from '@/components/holidays';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, List } from 'lucide-react';
import { Holiday } from '@/types';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
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

  const handleCreateHoliday = async (holidayData: Omit<Holiday, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    try {
      const formData = new FormData();
      formData.append('name', holidayData.name);
      formData.append('start_date', holidayData.start_date?.toISOString().split('T')[0] || holidayData.date.toISOString().split('T')[0]);
      if (holidayData.end_date) {
        formData.append('end_date', holidayData.end_date.toISOString().split('T')[0]);
      }
      formData.append('holiday_type', holidayData.holiday_type);
      formData.append('description', holidayData.description);
      formData.append('is_recurring', holidayData.is_recurring.toString());
      
      if (holidayData.image && typeof holidayData.image === 'object' && (holidayData.image as any) instanceof File) {
        formData.append('image', holidayData.image as File);
      }

      const newHoliday = await apiClient.createHoliday(formData);
      
      await fetchHolidays(); // Refresh the list
      toast.success('Holiday created successfully');
      setIsFormOpen(false);
    } catch (error: any) {
      console.error('Error creating holiday:', error);
      toast.error('Failed to create holiday');
    }
  };

  const handleUpdateHoliday = async (id: string, holidayData: Partial<Holiday>) => {
    try {
      const formData = new FormData();
      if (holidayData.name) formData.append('name', holidayData.name);
      if (holidayData.start_date) {
        formData.append('start_date', holidayData.start_date.toISOString().split('T')[0]);
      } else if (holidayData.date) {
        formData.append('start_date', holidayData.date.toISOString().split('T')[0]);
      }
      if (holidayData.end_date) {
        formData.append('end_date', holidayData.end_date.toISOString().split('T')[0]);
      }
      if (holidayData.holiday_type) formData.append('holiday_type', holidayData.holiday_type);
      if (holidayData.description !== undefined) formData.append('description', holidayData.description);
      if (holidayData.is_recurring !== undefined) formData.append('is_recurring', holidayData.is_recurring.toString());
      
      if (holidayData.image && typeof holidayData.image === 'object' && (holidayData.image as any) instanceof File) {
        formData.append('image', holidayData.image as File);
      }

      await apiClient.updateHoliday(parseInt(id), formData);
      
      await fetchHolidays(); // Refresh the list
      toast.success('Holiday updated successfully');
      setEditingHoliday(null);
    } catch (error: any) {
      console.error('Error updating holiday:', error);
      toast.error('Failed to update holiday');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      await apiClient.deleteHoliday(parseInt(id));
      await fetchHolidays(); // Refresh the list
      toast.success('Holiday deleted successfully');
    } catch (error: any) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to delete holiday');
    }
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingHoliday(null);
  };

  return (
    <div className="min-h-screen">
      <TopBar 
        title="Holiday Calendar" 
        subtitle="Manage company holidays and events"
      />
      
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Holiday Management</h2>
            <p className="text-muted-foreground">Create and manage company holidays</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="btn-accent">
            <Plus className="w-4 h-4 mr-2" />
            Add Holiday
          </Button>
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
              onEditHoliday={handleEditHoliday}
              onDeleteHoliday={handleDeleteHoliday}
              canEdit={true}
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
              onEditHoliday={handleEditHoliday}
              onDeleteHoliday={handleDeleteHoliday}
              canEdit={true}
            />
          </div>
        </div>

        <HolidayFormModal
          open={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={editingHoliday ? 
            (data) => handleUpdateHoliday(editingHoliday.id, data) : 
            handleCreateHoliday
          }
          holiday={editingHoliday}
        />
      </div>
    </div>
  );
}