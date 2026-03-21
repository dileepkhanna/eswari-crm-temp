import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Loader2, Calendar, Plus, Pencil, Trash2, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { logger } from '@/lib/logger';
interface Holiday {
  id: number;
  name: string;
  date: string;
  description: string;
  is_optional: boolean;
  created_at: string;
}

export default function HRHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Create/Edit holiday dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    is_optional: false,
  });

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch holidays from API
  const fetchHolidays = async () => {
    try {
      setLoading(true);
      setError(null);
      
      logger.log('🔄 Fetching holidays from backend...');
      const response = await apiClient.getHolidays();
      
      // Handle both paginated and non-paginated responses
      let holidaysData: Holiday[];
      if (Array.isArray(response)) {
        holidaysData = response;
      } else if (response && typeof response === 'object' && 'results' in response) {
        holidaysData = (response as any).results;
      } else {
        holidaysData = [];
      }
      
      logger.log(`📊 Fetched ${holidaysData.length} holidays from backend`);
      setHolidays(holidaysData);
      
    } catch (error: any) {
      logger.error('❌ Error fetching holidays:', error);
      setError('Failed to load holidays. Please try again.');
      toast.error('Failed to fetch holidays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  // Reset form when dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      setFormData({
        name: '',
        date: '',
        description: '',
        is_optional: false,
      });
      setEditMode(false);
      setEditingHolidayId(null);
    }
  }, [dialogOpen]);

  // Open dialog for creating new holiday
  const handleCreateClick = () => {
    setEditMode(false);
    setEditingHolidayId(null);
    setFormData({
      name: '',
      date: '',
      description: '',
      is_optional: false,
    });
    setDialogOpen(true);
  };

  // Open dialog for editing existing holiday
  const handleEditClick = (holiday: Holiday) => {
    setEditMode(true);
    setEditingHolidayId(holiday.id);
    setFormData({
      name: holiday.name,
      date: holiday.date,
      description: holiday.description,
      is_optional: holiday.is_optional,
    });
    setDialogOpen(true);
  };

  // Handle create or update holiday
  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter a holiday name');
      return;
    }
    
    if (!formData.date) {
      toast.error('Please select a date');
      return;
    }

    setSubmitting(true);
    try {
      if (editMode && editingHolidayId) {
        logger.log('🔄 Updating holiday:', editingHolidayId, formData);
        await apiClient.updateHoliday(editingHolidayId, formData);
        toast.success('Holiday updated successfully');
      } else {
        logger.log('🔄 Creating holiday:', formData);
        await apiClient.createHoliday(formData);
        toast.success('Holiday created successfully');
      }
      
      setDialogOpen(false);
      
      // Refresh holidays list
      await fetchHolidays();
    } catch (error: any) {
      logger.error('❌ Error saving holiday:', error);
      toast.error(editMode ? 'Failed to update holiday' : 'Failed to create holiday');
    } finally {
      setSubmitting(false);
    }
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (holiday: Holiday) => {
    setHolidayToDelete(holiday);
    setDeleteDialogOpen(true);
  };

  // Handle delete holiday
  const handleDeleteConfirm = async () => {
    if (!holidayToDelete) return;

    setDeleting(true);
    try {
      logger.log('🔄 Deleting holiday:', holidayToDelete.id);
      await apiClient.deleteHoliday(holidayToDelete.id);
      toast.success('Holiday deleted successfully');
      
      setDeleteDialogOpen(false);
      setHolidayToDelete(null);
      
      // Refresh holidays list
      await fetchHolidays();
    } catch (error: any) {
      logger.error('❌ Error deleting holiday:', error);
      toast.error('Failed to delete holiday');
    } finally {
      setDeleting(false);
    }
  };

  // Filter holidays based on search query
  const filteredHolidays = holidays.filter(holiday => {
    const query = searchQuery.toLowerCase();
    
    return (
      holiday.name.toLowerCase().includes(query) ||
      holiday.description.toLowerCase().includes(query) ||
      format(new Date(holiday.date), 'MMM dd, yyyy').toLowerCase().includes(query)
    );
  });

  // Sort holidays by date (upcoming first)
  const sortedHolidays = [...filteredHolidays].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const isUpcoming = (date: string) => {
    const holidayDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidayDate >= today;
  };

  const isPast = (date: string) => {
    const holidayDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidayDate < today;
  };

  // Get holidays for a specific date
  const getHolidaysForDate = (date: Date) => {
    return holidays.filter(holiday => 
      isSameDay(new Date(holiday.date), date)
    );
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding days from previous month
    const startDay = start.getDay();
    const paddingDays = [];
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(start);
      date.setDate(date.getDate() - (i + 1));
      paddingDays.push(date);
    }
    
    return [...paddingDays, ...days];
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar title="Holiday Management" subtitle="Manage company holidays" />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <TopBar title="Holiday Management" subtitle="Manage company holidays" />
        <div className="p-6">
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchHolidays}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Holiday Management" subtitle="Manage company holidays" />
      <div className="p-6">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search holidays..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-field"
              />
            </div>
            
            <div className="flex gap-2">
              {/* View Toggle */}
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="flex items-center gap-2"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Table</span>
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Calendar</span>
                </Button>
              </div>

              <Button 
                onClick={handleCreateClick}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Holiday</span>
              </Button>
            </div>
          </div>

          {/* Holiday Table */}
          {viewMode === 'table' && (
            <div className="glass-card rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Holiday Name</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Description</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHolidays.map((holiday, index) => (
                    <TableRow 
                      key={holiday.id} 
                      className="table-row-hover animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white shrink-0">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {holiday.name}
                            </p>
                            <p className="text-xs text-muted-foreground lg:hidden">
                              {holiday.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">
                          {format(new Date(holiday.date), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(holiday.date), 'EEEE')}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm text-muted-foreground max-w-md truncate">
                          {holiday.description || '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            holiday.is_optional 
                              ? 'bg-blue-100 text-blue-700 border-blue-300' 
                              : 'bg-purple-100 text-purple-700 border-purple-300'
                          )}
                        >
                          {holiday.is_optional ? 'Optional' : 'Mandatory'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {isUpcoming(holiday.date) ? (
                          <Badge 
                            variant="outline" 
                            className="bg-green-100 text-green-700 border-green-300"
                          >
                            Upcoming
                          </Badge>
                        ) : isPast(holiday.date) ? (
                          <Badge 
                            variant="outline" 
                            className="bg-gray-100 text-gray-700 border-gray-300"
                          >
                            Past
                          </Badge>
                        ) : (
                          <Badge 
                            variant="outline" 
                            className="bg-yellow-100 text-yellow-700 border-yellow-300"
                          >
                            Today
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(holiday)}
                            className="flex items-center gap-2"
                          >
                            <Pencil className="w-4 h-4" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(holiday)}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {sortedHolidays.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? 'No holidays found matching your search' 
                      : 'No holidays found'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <div className="glass-card rounded-2xl p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="flex items-center gap-1"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Week day headers */}
                {weekDays.map(day => (
                  <div 
                    key={day} 
                    className="text-center text-sm font-semibold text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((day, index) => {
                  const dayHolidays = getHolidaysForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={index}
                      className={cn(
                        'min-h-[100px] p-2 rounded-lg border transition-colors',
                        isCurrentMonth 
                          ? 'bg-background border-border' 
                          : 'bg-muted/30 border-transparent',
                        isToday && 'ring-2 ring-primary',
                        dayHolidays.length > 0 && 'bg-gradient-to-br from-purple-50 to-blue-50'
                      )}
                    >
                      <div className={cn(
                        'text-sm font-medium mb-1',
                        isCurrentMonth ? 'text-foreground' : 'text-muted-foreground',
                        isToday && 'text-primary font-bold'
                      )}>
                        {format(day, 'd')}
                      </div>

                      {/* Holidays for this day */}
                      <div className="space-y-1">
                        {dayHolidays.map(holiday => (
                          <div
                            key={holiday.id}
                            className={cn(
                              'text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity',
                              holiday.is_optional
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            )}
                            onClick={() => handleEditClick(holiday)}
                            title={`${holiday.name}\n${holiday.description || ''}`}
                          >
                            <div className="font-medium truncate">
                              {holiday.name}
                            </div>
                            {holiday.description && (
                              <div className="text-[10px] opacity-75 truncate">
                                {holiday.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Calendar Legend */}
              <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-100 border border-purple-300"></div>
                  <span className="text-sm text-muted-foreground">Mandatory Holiday</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
                  <span className="text-sm text-muted-foreground">Optional Holiday</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">Today</span>
                </div>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {holidays.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card rounded-xl p-4">
                <p className="text-sm text-muted-foreground mb-1">Total Holidays</p>
                <p className="text-2xl font-bold text-foreground">{holidays.length}</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-sm text-muted-foreground mb-1">Upcoming</p>
                <p className="text-2xl font-bold text-green-600">
                  {holidays.filter(h => isUpcoming(h.date)).length}
                </p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-sm text-muted-foreground mb-1">Optional</p>
                <p className="text-2xl font-bold text-blue-600">
                  {holidays.filter(h => h.is_optional).length}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Holiday Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {editMode ? 'Edit Holiday' : 'Add New Holiday'}
            </DialogTitle>
            <DialogDescription>
              {editMode ? 'Update holiday details' : 'Create a new company holiday'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Holiday Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Holiday Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Christmas Day"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-field"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Christmas celebration"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
              />
            </div>

            {/* Optional Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_optional"
                checked={formData.is_optional}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_optional: checked as boolean })
                }
              />
              <Label 
                htmlFor="is_optional" 
                className="text-sm font-normal cursor-pointer"
              >
                This is an optional holiday
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {editMode ? (
                    <>
                      <Pencil className="w-4 h-4" />
                      Update Holiday
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Holiday
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Holiday
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the holiday "{holidayToDelete?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Holiday
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
