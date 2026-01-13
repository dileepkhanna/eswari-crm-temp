import { useState, useMemo } from 'react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContextDjango';
import { useAuth } from '@/contexts/AuthContextDjango';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { CalendarIcon, Clock, Phone, Mail, MapPin } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { Lead } from '@/types';

interface CalendarReminder {
  id: string;
  date: Date;
  lead: Lead;
  type: 'follow_up';
}

export default function Calendar() {
  const { leads } = useData();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');

  // Get all reminders from leads with reminder status and follow-up dates
  const reminders = useMemo((): CalendarReminder[] => {
    return leads
      .filter(lead => lead.status === 'reminder' && lead.followUpDate)
      .map(lead => ({
        id: lead.id,
        date: lead.followUpDate!,
        lead,
        type: 'follow_up' as const,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [leads]);

  // Get reminders for selected date
  const selectedDateReminders = useMemo(() => {
    return reminders.filter(reminder => 
      isSameDay(reminder.date, selectedDate)
    );
  }, [reminders, selectedDate]);

  // Get dates that have reminders for calendar highlighting
  const reminderDates = useMemo(() => {
    return reminders.map(reminder => reminder.date);
  }, [reminders]);

  // Get upcoming reminders (next 7 days)
  const upcomingReminders = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    return reminders.filter(reminder => 
      reminder.date >= today && reminder.date <= nextWeek
    );
  }, [reminders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hot': return 'bg-red-100 text-red-800 border-red-200';
      case 'warm': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cold': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'not_interested': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const ReminderCard = ({ reminder }: { reminder: CalendarReminder }) => (
    <Card className="mb-3 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(reminder.date, 'h:mm a')}
            </span>
          </div>
          <Badge className={getStatusColor(reminder.lead.status)}>
            {reminder.lead.status}
          </Badge>
        </div>
        
        <h4 className="font-semibold text-lg mb-2">{reminder.lead.name}</h4>
        
        <div className="space-y-1 text-sm text-muted-foreground">
          {reminder.lead.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3 h-3" />
              <span>{reminder.lead.phone}</span>
            </div>
          )}
          {reminder.lead.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3 h-3" />
              <span>{reminder.lead.email}</span>
            </div>
          )}
          {reminder.lead.address && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              <span>{reminder.lead.address}</span>
            </div>
          )}
        </div>
        
        {reminder.lead.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {reminder.lead.description}
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <TopBar 
        title="Calendar & Reminders" 
        subtitle="View and manage your lead follow-up reminders"
      />
      
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5" />
                      Calendar
                    </CardTitle>
                    <CardDescription>
                      Click on a date to view reminders
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'month' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('month')}
                    >
                      Month
                    </Button>
                    <Button
                      variant={viewMode === 'day' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('day')}
                    >
                      Day
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border w-full"
                  modifiers={{
                    hasReminder: reminderDates,
                  }}
                  modifiersStyles={{
                    hasReminder: {
                      backgroundColor: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                      fontWeight: 'bold',
                    },
                  }}
                />
                
                <div className="mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-primary"></div>
                    <span>Dates with reminders</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Date Reminders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </CardTitle>
                <CardDescription>
                  {selectedDateReminders.length} reminder{selectedDateReminders.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDateReminders.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateReminders.map(reminder => (
                      <ReminderCard key={reminder.id} reminder={reminder} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No reminders for this date</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Reminders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Reminders</CardTitle>
                <CardDescription>Next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingReminders.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingReminders.slice(0, 5).map(reminder => (
                      <div key={reminder.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <div className="text-center min-w-[60px]">
                          <div className="text-xs text-muted-foreground">
                            {format(reminder.date, 'MMM')}
                          </div>
                          <div className="text-lg font-semibold">
                            {format(reminder.date, 'd')}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{reminder.lead.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(reminder.date, 'h:mm a')}
                          </p>
                        </div>
                        <Badge className={getStatusColor(reminder.lead.status)} variant="outline">
                          {reminder.lead.status}
                        </Badge>
                      </div>
                    ))}
                    {upcomingReminders.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center pt-2">
                        +{upcomingReminders.length - 5} more reminders
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No upcoming reminders</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Reminders</span>
                    <span className="font-semibold">{reminders.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">This Week</span>
                    <span className="font-semibold">{upcomingReminders.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Today</span>
                    <span className="font-semibold">
                      {reminders.filter(r => isSameDay(r.date, new Date())).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}