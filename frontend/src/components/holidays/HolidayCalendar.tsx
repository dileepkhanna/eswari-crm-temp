import { useState } from 'react';
import { Holiday } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ChevronLeft, ChevronRight, Calendar, MoreHorizontal, Edit, Trash2, Repeat } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday } from 'date-fns';

interface HolidayCalendarProps {
  holidays: Holiday[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  onEditHoliday?: (holiday: Holiday) => void;
  onDeleteHoliday?: (id: string) => void;
  canEdit: boolean;
}

export default function HolidayCalendar({
  holidays,
  selectedYear,
  onYearChange,
  onEditHoliday,
  onDeleteHoliday,
  canEdit,
}: HolidayCalendarProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [deleteHoliday, setDeleteHoliday] = useState<Holiday | null>(null);

  const currentDate = new Date(selectedYear, selectedMonth, 1);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getHolidaysForDate = (date: Date) => {
    return holidays.filter(holiday => {
      const startDate = new Date(holiday.start_date || holiday.date);
      const endDate = holiday.end_date ? new Date(holiday.end_date) : startDate;
      
      // Compare dates without time
      const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const compareStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const compareEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      return compareDate >= compareStart && compareDate <= compareEnd;
    });
  };

  const getHolidayTypeColor = (type: string) => {
    switch (type) {
      case 'national': return 'bg-red-100 text-red-800 border-red-200';
      case 'religious': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'company': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'optional': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      onYearChange(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      onYearChange(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteHoliday && onDeleteHoliday) {
      onDeleteHoliday(deleteHoliday.id);
      setDeleteHoliday(null);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get the first day of the month and calculate padding days
  const firstDayOfMonth = monthStart.getDay();
  const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => null);

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4 text-primary" />
              Holiday Calendar
            </CardTitle>
            
            <div className="flex items-center gap-3">
              {/* Year Selector */}
              <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value))}>
                <SelectTrigger className="w-20 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Month Navigation */}
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePreviousMonth}>
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <span className="min-w-[100px] text-center font-medium text-sm">
                  {monthNames[selectedMonth]}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week Day Headers */}
            {weekDays.map(day => (
              <div key={day} className="p-1 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}

            {/* Padding Days */}
            {paddingDays.map((_, index) => (
              <div key={`padding-${index}`} className="p-1 h-16"></div>
            ))}

            {/* Month Days */}
            {monthDays.map(date => {
              const dayHolidays = getHolidaysForDate(date);
              const isCurrentDay = isToday(date);

              return (
                <div
                  key={date.toISOString()}
                  className={`p-1 h-16 border rounded-lg transition-colors ${
                    isCurrentDay ? 'bg-primary/10 border-primary' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${
                      isCurrentDay ? 'text-primary' : 'text-foreground'
                    }`}>
                      {format(date, 'd')}
                    </span>
                  </div>

                  {/* Holidays for this date */}
                  <div className="space-y-0.5">
                    {dayHolidays.slice(0, 1).map(holiday => (
                      <div key={holiday.id} className="group relative">
                        {canEdit ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <div className={`text-[10px] px-1 py-0.5 rounded cursor-pointer flex items-center gap-1 ${getHolidayTypeColor(holiday.holiday_type)}`}>
                                <span className="truncate flex-1">{holiday.name}</span>
                                {holiday.is_recurring && <Repeat className="w-2 h-2 flex-shrink-0" />}
                                <MoreHorizontal className="w-2 h-2 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEditHoliday?.(holiday)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteHoliday(holiday)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <div className={`text-[10px] px-1 py-0.5 rounded flex items-center gap-1 ${getHolidayTypeColor(holiday.holiday_type)}`}>
                            <span className="truncate flex-1">{holiday.name}</span>
                            {holiday.is_recurring && <Repeat className="w-2 h-2 flex-shrink-0" />}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {dayHolidays.length > 1 && (
                      <div className="text-[9px] text-muted-foreground px-1">
                        +{dayHolidays.length - 1} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Holiday Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Holiday Types</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">
              National
            </Badge>
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
              Religious
            </Badge>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
              Company
            </Badge>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs">
              Optional
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteHoliday} onOpenChange={() => setDeleteHoliday(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteHoliday?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}