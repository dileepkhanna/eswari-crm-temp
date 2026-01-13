import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContextDjango';
import { useAuth } from '@/contexts/AuthContextDjango';
import { format, isToday, isTomorrow, isWithinInterval, addDays } from 'date-fns';
import { Bell, Calendar, Phone, Mail, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Lead } from '@/types';
import { Link } from 'react-router-dom';

interface ReminderItem {
  id: string;
  lead: Lead;
  date: Date;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
}

export default function RemindersWidget() {
  const { leads } = useData();
  const { user } = useAuth();

  // Get all reminders from leads with reminder status and follow-up dates
  const reminders = useMemo((): ReminderItem[] => {
    const today = new Date();
    
    return leads
      .filter(lead => lead.status === 'reminder' && lead.followUpDate)
      .map(lead => ({
        id: lead.id,
        lead,
        date: lead.followUpDate!,
        isOverdue: lead.followUpDate! < today,
        isToday: isToday(lead.followUpDate!),
        isTomorrow: isTomorrow(lead.followUpDate!),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [leads]);

  // Get today's reminders
  const todayReminders = reminders.filter(r => r.isToday);
  
  // Get overdue reminders
  const overdueReminders = reminders.filter(r => r.isOverdue);
  
  // Get upcoming reminders (next 7 days, excluding today)
  const upcomingReminders = reminders.filter(r => {
    const nextWeek = addDays(new Date(), 7);
    return !r.isOverdue && !r.isToday && r.date <= nextWeek;
  });

  const getDateLabel = (reminder: ReminderItem) => {
    if (reminder.isOverdue) return 'Overdue';
    if (reminder.isToday) return 'Today';
    if (reminder.isTomorrow) return 'Tomorrow';
    return format(reminder.date, 'MMM d');
  };

  const getDateColor = (reminder: ReminderItem) => {
    if (reminder.isOverdue) return 'text-red-600 bg-red-50 border-red-200';
    if (reminder.isToday) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (reminder.isTomorrow) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const ReminderCard = ({ reminder }: { reminder: ReminderItem }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className={`text-center min-w-[60px] px-2 py-1 rounded-md text-xs font-medium border ${getDateColor(reminder)}`}>
        {getDateLabel(reminder)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium truncate">{reminder.lead.name}</h4>
          <Badge variant="outline" className="text-xs">
            {reminder.lead.status}
          </Badge>
        </div>
        
        <div className="space-y-1 text-xs text-muted-foreground">
          {reminder.lead.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span>{reminder.lead.phone}</span>
            </div>
          )}
          {reminder.lead.email && (
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <span className="truncate">{reminder.lead.email}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{format(reminder.date, 'h:mm a')}</span>
        </div>
      </div>
    </div>
  );

  if (reminders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Reminders
          </CardTitle>
          <CardDescription>Your lead follow-up reminders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No reminders set</p>
            <p className="text-sm">Set reminder status on leads to see them here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Map Django roles to frontend routes
  const roleRouteMap: Record<string, string> = {
    'admin': '/admin',
    'manager': '/manager',
    'employee': '/staff'
  };
  
  const basePath = roleRouteMap[user?.role || 'employee'] || '/login';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Reminders
              {(overdueReminders.length > 0 || todayReminders.length > 0) && (
                <Badge variant="destructive" className="ml-2">
                  {overdueReminders.length + todayReminders.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Your lead follow-up reminders</CardDescription>
          </div>
          <Link to={`${basePath}/calendar`}>
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overdue Reminders */}
          {overdueReminders.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Overdue ({overdueReminders.length})
              </h4>
              <div className="space-y-2">
                {overdueReminders.slice(0, 3).map(reminder => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
                {overdueReminders.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{overdueReminders.length - 3} more overdue reminders
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Today's Reminders */}
          {todayReminders.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-orange-600 mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Today ({todayReminders.length})
              </h4>
              <div className="space-y-2">
                {todayReminders.slice(0, 3).map(reminder => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
                {todayReminders.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{todayReminders.length - 3} more today
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Upcoming Reminders */}
          {upcomingReminders.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Upcoming ({upcomingReminders.length})
              </h4>
              <div className="space-y-2">
                {upcomingReminders.slice(0, 2).map(reminder => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
                {upcomingReminders.length > 2 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{upcomingReminders.length - 2} more upcoming
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}