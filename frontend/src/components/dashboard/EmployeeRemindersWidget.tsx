import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContextDjango';
import { useAuth } from '@/contexts/AuthContextDjango';
import { format, isToday, isTomorrow, addDays, isPast } from 'date-fns';
import { Bell, Calendar, Phone, Mail, Clock, ArrowRight, AlertCircle, Plus } from 'lucide-react';
import { Lead } from '@/types';
import { Link } from 'react-router-dom';

interface ReminderItem {
  id: string;
  lead: Lead;
  date: Date;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  urgency: 'overdue' | 'today' | 'tomorrow' | 'upcoming';
}

export default function EmployeeRemindersWidget() {
  const { leads } = useData();
  const { user } = useAuth();

  // Get all reminders from leads with reminder status and follow-up dates
  const reminders = useMemo((): ReminderItem[] => {
    const today = new Date();
    
    const reminderLeads = leads.filter(lead => lead.status === 'reminder' && lead.followUpDate);
    
    return reminderLeads
      .map(lead => {
        const isOverdue = isPast(lead.followUpDate!) && !isToday(lead.followUpDate!);
        const todayCheck = isToday(lead.followUpDate!);
        const tomorrowCheck = isTomorrow(lead.followUpDate!);
        
        let urgency: 'overdue' | 'today' | 'tomorrow' | 'upcoming' = 'upcoming';
        if (isOverdue) urgency = 'overdue';
        else if (todayCheck) urgency = 'today';
        else if (tomorrowCheck) urgency = 'tomorrow';
        
        return {
          id: lead.id,
          lead,
          date: lead.followUpDate!,
          isOverdue,
          isToday: todayCheck,
          isTomorrow: tomorrowCheck,
          urgency,
        };
      })
      .sort((a, b) => {
        // Sort by urgency first, then by date
        const urgencyOrder = { overdue: 0, today: 1, tomorrow: 2, upcoming: 3 };
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        return a.date.getTime() - b.date.getTime();
      });
  }, [leads]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return 'bg-red-100 text-red-800 border-red-300';
      case 'today': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'tomorrow': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'today': return <Clock className="w-4 h-4 text-orange-600" />;
      case 'tomorrow': return <Calendar className="w-4 h-4 text-blue-600" />;
      default: return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  const getDateLabel = (reminder: ReminderItem) => {
    if (reminder.isOverdue) return 'OVERDUE';
    if (reminder.isToday) return 'TODAY';
    if (reminder.isTomorrow) return 'TOMORROW';
    return format(reminder.date, 'MMM d');
  };

  const ReminderCard = ({ reminder }: { reminder: ReminderItem }) => (
    <div className={`p-3 md:p-4 rounded-lg border-2 transition-all hover:shadow-md ${
      reminder.urgency === 'overdue' ? 'border-red-200 bg-red-50' :
      reminder.urgency === 'today' ? 'border-orange-200 bg-orange-50' :
      reminder.urgency === 'tomorrow' ? 'border-blue-200 bg-blue-50' :
      'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex flex-col sm:flex-row items-start gap-3">
        <div className="flex-shrink-0 self-start sm:self-center">
          {getUrgencyIcon(reminder.urgency)}
        </div>
        
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <h4 className="font-semibold text-lg truncate">{reminder.lead.name}</h4>
            <Badge className={`text-xs font-medium self-start sm:self-center ${getUrgencyColor(reminder.urgency)}`}>
              {getDateLabel(reminder)}
            </Badge>
          </div>
          
          <div className="space-y-1 mb-3">
            {reminder.lead.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{reminder.lead.phone}</span>
              </div>
            )}
            {reminder.lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{reminder.lead.email}</span>
              </div>
            )}
          </div>
          
          {reminder.lead.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {reminder.lead.description}
            </p>
          )}
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0" />
              <span className="truncate">{format(reminder.date, 'MMM d, yyyy • h:mm a')}</span>
            </div>
            
            <Link to="/staff/leads" className="self-start sm:self-center">
              <Button size="sm" variant="outline" className="w-full sm:w-auto">
                View Lead
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  // Count by urgency
  const overdueCount = reminders.filter(r => r.urgency === 'overdue').length;
  const todayCount = reminders.filter(r => r.urgency === 'today').length;
  const tomorrowCount = reminders.filter(r => r.urgency === 'tomorrow').length;
  const upcomingCount = reminders.filter(r => r.urgency === 'upcoming').length;

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="w-full sm:w-auto">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Bell className="w-6 h-6" />
              My Reminders
              {reminders.length > 0 && (
                <Badge variant={overdueCount > 0 || todayCount > 0 ? "destructive" : "secondary"} className="ml-2">
                  {reminders.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-base">
              Your lead follow-up reminders and tasks
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Link to="/staff/leads" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-1" />
                Add Lead
              </Button>
            </Link>
            <Link to="/staff/calendar" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <span className="hidden sm:inline">View Calendar</span>
                <span className="sm:hidden">Calendar</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Quick Stats */}
        {reminders.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {overdueCount > 0 && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">{overdueCount} Overdue</span>
              </div>
            )}
            {todayCount > 0 && (
              <div className="flex items-center gap-1 text-sm text-orange-600">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{todayCount} Today</span>
              </div>
            )}
            {tomorrowCount > 0 && (
              <div className="flex items-center gap-1 text-sm text-blue-600">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">{tomorrowCount} Tomorrow</span>
              </div>
            )}
            {upcomingCount > 0 && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">{upcomingCount} Upcoming</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {reminders.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <Bell className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Reminders Set</h3>
            <p className="text-muted-foreground mb-6 px-4">
              Set reminder status on your leads to keep track of follow-ups
            </p>
            <Link to="/staff/leads" className="inline-block">
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Create Lead with Reminder
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {reminders.slice(0, 5).map(reminder => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
            
            {reminders.length > 5 && (
              <div className="text-center pt-4 border-t">
                <Link to="/staff/calendar" className="inline-block w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto">
                    View All {reminders.length} Reminders
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}