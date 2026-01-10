import { useState } from 'react';
import { Holiday } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Search, MoreHorizontal, Edit, Trash2, Calendar, Repeat, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface HolidayListProps {
  holidays: Holiday[];
  loading: boolean;
  onEditHoliday?: (holiday: Holiday) => void;
  onDeleteHoliday?: (id: string) => void;
  canEdit: boolean;
}

export default function HolidayList({
  holidays,
  loading,
  onEditHoliday,
  onDeleteHoliday,
  canEdit,
}: HolidayListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteHoliday, setDeleteHoliday] = useState<Holiday | null>(null);

  const filteredHolidays = holidays.filter(holiday =>
    holiday.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    holiday.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getHolidayTypeColor = (type: string) => {
    switch (type) {
      case 'national': return 'bg-red-100 text-red-800 border-red-200';
      case 'religious': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'company': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'optional': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHolidayTypeLabel = (type: string) => {
    switch (type) {
      case 'national': return 'National';
      case 'religious': return 'Religious';
      case 'company': return 'Company';
      case 'optional': return 'Optional';
      default: return 'Company';
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteHoliday && onDeleteHoliday) {
      onDeleteHoliday(deleteHoliday.id);
      setDeleteHoliday(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search holidays..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 input-field h-9"
        />
      </div>

      {/* Holiday List */}
      <div className="grid gap-3 max-h-[600px] overflow-y-auto">
        {filteredHolidays.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No holidays found matching your search' : 'No holidays found'}
              </p>
            </div>
          </div>
        ) : (
          filteredHolidays.map((holiday, index) => (
            <Card key={holiday.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="truncate">{holiday.name}</span>
                      {holiday.is_recurring && (
                        <Repeat className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className={`text-xs ${getHolidayTypeColor(holiday.holiday_type)}`}>
                        {getHolidayTypeLabel(holiday.holiday_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {holiday.end_date && holiday.end_date !== holiday.start_date ? 
                          `${format(holiday.start_date || holiday.date, 'MMM d')} - ${format(holiday.end_date, 'MMM d, yyyy')}` :
                          format(holiday.start_date || holiday.date, 'MMM d, yyyy')
                        }
                      </span>
                      {holiday.end_date && holiday.end_date !== holiday.start_date && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {Math.ceil((holiday.end_date.getTime() - (holiday.start_date || holiday.date).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Holiday Image */}
                  {holiday.image && typeof holiday.image === 'string' && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img 
                        src={holiday.image} 
                        alt={holiday.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditHoliday?.(holiday)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Holiday
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteHoliday(holiday)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Holiday
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              
              {holiday.description && (
                <CardContent className="pt-0 pb-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">{holiday.description}</p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

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