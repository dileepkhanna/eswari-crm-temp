import { useState, useMemo } from 'react';
import { Lead, Task } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContextDjango';
import { canViewCustomerPhone, maskPhoneNumber } from '@/lib/permissions';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Phone,
  Mail,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Bell
} from 'lucide-react';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns';
import LeadStatusChip from '@/components/leads/LeadStatusChip';
import TaskStatusChip from '@/components/tasks/TaskStatusChip';

interface CalendarViewProps {
  leads: Lead[];
  tasks: Task[];
  title?: string;
}

interface CalendarEvent {
  id: string;
  type: 'lead' | 'task';
  title: string;
  date: Date;
  data: Lead | Task;
}

const leadStatusIcons: Record<string, React.ElementType> = {
  'new': Bell,
  'contacted': Phone,
  'qualified': ThumbsUp,
  'converted': CheckCircle,
  'lost': ThumbsDown,
};

const taskStatusIcons: Record<string, React.ElementType> = {
  'visit': MapPin,
  'family_visit': Users,
  'pending': Clock,
  'completed': CheckCircle,
  'rejected': XCircle,
};

export default function CalendarView({ leads, tasks, title = "Calendar" }: CalendarViewProps) {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Get all events (lead reminders and task deadlines)
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];
    
    // Add lead reminders (only leads with reminder status)
    leads.forEach(lead => {
      if (lead.status === 'reminder' && lead.followUpDate) {
        allEvents.push({
          id: `reminder-${lead.id}`,
          type: 'lead',
          title: lead.name,
          date: new Date(lead.followUpDate),
          data: lead,
        });
      }
    });

    // Add task deadlines
    tasks.forEach(task => {
      if (task.nextActionDate) {
        allEvents.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.lead?.name || 'Unknown Lead',
          date: new Date(task.nextActionDate),
          data: task,
        });
      }
    });

    return allEvents;
  }, [leads, tasks]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(event => isSameDay(event.date, selectedDate));
  }, [events, selectedDate]);

  // Get dates with events for highlighting
  const datesWithEvents = useMemo(() => {
    const dates: Date[] = [];
    events.forEach(event => {
      if (!dates.some(d => isSameDay(d, event.date))) {
        dates.push(event.date);
      }
    });
    return dates;
  }, [events]);

  // Count events per date
  const eventCountByDate = useMemo(() => {
    const counts = new Map<string, { leads: number; tasks: number }>();
    events.forEach(event => {
      const dateKey = format(event.date, 'yyyy-MM-dd');
      const current = counts.get(dateKey) || { leads: 0, tasks: 0 };
      if (event.type === 'lead') {
        current.leads++;
      } else {
        current.tasks++;
      }
      counts.set(dateKey, current);
    });
    return counts;
  }, [events]);

  const handlePreviousMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Custom day content renderer
  const renderDayContent = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const counts = eventCountByDate.get(dateKey);
    
    if (!counts) return null;

    return (
      <div className="absolute bottom-0.5 left-0 right-0 flex justify-center gap-0.5">
        {counts.leads > 0 && (
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" title={`${counts.leads} reminders`} />
        )}
        {counts.tasks > 0 && (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title={`${counts.tasks} task deadlines`} />
        )}
      </div>
    );
  };

  return (
    <div className="glass-card rounded-2xl p-4 md:p-6 animate-slide-up relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">
              {events.length} upcoming events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleToday} className="flex-1 sm:flex-none">
            Today
          </Button>
          <div className="flex items-center gap-1 flex-1 sm:flex-none justify-center">
            <button 
              onClick={handlePreviousMonth} 
              className="shrink-0 h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center cursor-pointer z-10 relative"
              type="button"
              style={{ pointerEvents: 'auto' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium min-w-[120px] text-center px-2">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button 
              onClick={handleNextMonth} 
              className="shrink-0 h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center cursor-pointer z-10 relative"
              type="button"
              style={{ pointerEvents: 'auto' }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-xs text-muted-foreground">Reminders</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-muted-foreground">Task Deadlines</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        {/* Calendar */}
        <div className="flex justify-center">
          <div className="calendar-container">
            <Calendar
              key={format(currentMonth, 'yyyy-MM')}
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-xl border border-border bg-card p-2 md:p-3 pointer-events-auto w-full max-w-md"
              modifiers={{
                hasEvents: datesWithEvents,
              }}
              modifiersStyles={{
                hasEvents: {
                  fontWeight: 'bold',
                },
              }}
              components={{
                DayContent: ({ date }) => (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <span>{date.getDate()}</span>
                    {renderDayContent(date)}
                  </div>
                ),
              }}
              showOutsideDays={false}
              fixedWeeks
            />
          </div>
        </div>

        {/* Selected Date Events */}
        <div>
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {selectedDate ? (
                  <>
                    <CalendarIcon className="w-4 h-4" />
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    {isToday(selectedDate) && (
                      <Badge variant="secondary" className="ml-2">Today</Badge>
                    )}
                  </>
                ) : (
                  <>
                    <CalendarIcon className="w-4 h-4" />
                    Select a date
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                selectedDateEvents.length > 0 ? (
                  <ScrollArea className="h-[250px] md:h-[280px] pr-4">
                    <div className="space-y-3">
                      {selectedDateEvents.map((event) => (
                        <div
                          key={event.id}
                          className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                            event.type === 'lead'
                              ? 'border-purple-500/30 bg-purple-500/5'
                              : 'border-blue-500/30 bg-blue-500/5'
                          }`}
                        >
                          {event.type === 'lead' ? (
                            <LeadEventCard lead={event.data as Lead} />
                          ) : (
                            <TaskEventCard task={event.data as Task} />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-[250px] md:h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                    <CalendarIcon className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No events scheduled</p>
                    <p className="text-xs">for this date</p>
                  </div>
                )
              ) : (
                <div className="h-[250px] md:h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">Click on a date</p>
                  <p className="text-xs">to view scheduled events</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LeadEventCard({ lead }: { lead: Lead }) {
  const { user } = useAuth();
  const canViewPhone = user ? canViewCustomerPhone(user.role, user.id, lead.createdBy) : false;
  
  // For reminder leads, show urgency
  const isOverdue = lead.followUpDate && new Date(lead.followUpDate) < new Date() && !isToday(new Date(lead.followUpDate));
  const isTodayReminder = lead.followUpDate && isToday(new Date(lead.followUpDate));
  
  const getUrgencyColor = () => {
    if (isOverdue) return 'text-red-600 bg-red-50 border-red-200';
    if (isTodayReminder) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-purple-600 bg-purple-50 border-purple-200';
  };
  
  const getUrgencyLabel = () => {
    if (isOverdue) return 'OVERDUE';
    if (isTodayReminder) return 'TODAY';
    return 'REMINDER';
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-base text-foreground">{lead.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`text-xs font-medium ${getUrgencyColor()}`}>
                {getUrgencyLabel()}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {lead.followUpDate && format(new Date(lead.followUpDate), 'h:mm a')}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-2 text-sm">
        {lead.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">
              {canViewPhone ? lead.phone : maskPhoneNumber(lead.phone)}
            </span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.address && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="truncate">{lead.address}</span>
          </div>
        )}
      </div>
      
      {lead.description && (
        <div className="p-3 bg-muted/50 rounded-md">
          <p className="text-sm text-muted-foreground">{lead.description}</p>
        </div>
      )}
      
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-xs text-muted-foreground">
          {lead.requirementType} • {lead.bhkRequirement} BHK
        </div>
        <LeadStatusChip status={lead.status} />
      </div>
    </div>
  );
}

function TaskEventCard({ task }: { task: Task }) {
  const { user } = useAuth();
  const canViewPhone = user ? canViewCustomerPhone(user.role, user.id, task.lead?.createdBy) : false;
  const Icon = taskStatusIcons[task.status] || Clock;
  
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-base text-foreground">{task.lead?.name || 'Unknown Lead'}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                TASK DEADLINE
              </Badge>
              <span className="text-xs text-muted-foreground">
                {task.nextActionDate && format(new Date(task.nextActionDate), 'h:mm a')}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-2 text-sm">
        {task.lead?.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">
              {canViewPhone ? task.lead?.phone : maskPhoneNumber(task.lead?.phone || '')}
            </span>
          </div>
        )}
        {task.lead?.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="truncate">{task.lead?.email || '-'}</span>
          </div>
        )}
      </div>
      
      {task.lead?.description && (
        <div className="p-3 bg-muted/50 rounded-md">
          <p className="text-sm text-muted-foreground">{task.lead?.description || '-'}</p>
        </div>
      )}
      
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-xs text-muted-foreground">
          {task.lead?.requirementType || '-'} • {task.lead?.bhkRequirement || '-'} BHK
        </div>
        <TaskStatusChip status={task.status} />
      </div>
    </div>
  );
}
