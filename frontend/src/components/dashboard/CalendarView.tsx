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
  const canViewPhone = user ? canViewCustomerPhone(user.role) : false;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Get all events (lead follow-ups and task deadlines)
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];
    
    // Add lead follow-ups
    leads.forEach(lead => {
      if (lead.followUpDate) {
        allEvents.push({
          id: `lead-${lead.id}`,
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
          title: task.lead.name,
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

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
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
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={`${counts.leads} lead follow-ups`} />
        )}
        {counts.tasks > 0 && (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title={`${counts.tasks} task deadlines`} />
        )}
      </div>
    );
  };

  return (
    <div className="glass-card rounded-2xl p-6 animate-slide-up relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Lead Follow-ups</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-muted-foreground">Task Deadlines</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="rounded-xl border border-border bg-card p-3 pointer-events-auto"
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
          />
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
                  <ScrollArea className="h-[280px] pr-4">
                    <div className="space-y-3">
                      {selectedDateEvents.map((event) => (
                        <div
                          key={event.id}
                          className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                            event.type === 'lead'
                              ? 'border-emerald-500/30 bg-emerald-500/5'
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
                  <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                    <CalendarIcon className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No events scheduled</p>
                    <p className="text-xs">for this date</p>
                  </div>
                )
              ) : (
                <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
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
  const Icon = leadStatusIcons[lead.status] || Bell;
  const latestNote = lead.notes.length > 0 ? lead.notes[lead.notes.length - 1] : null;
  
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">{lead.name}</p>
            <p className="text-xs text-muted-foreground">Lead Follow-up</p>
          </div>
        </div>
        <LeadStatusChip status={lead.status} />
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Phone className="w-3 h-3" />
          {lead.phone}
        </span>
        <span className="flex items-center gap-1">
          <Mail className="w-3 h-3" />
          {lead.email}
        </span>
      </div>
      {latestNote && (
        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
          {latestNote.content}
        </p>
      )}
    </div>
  );
}

function TaskEventCard({ task }: { task: Task }) {
  const Icon = taskStatusIcons[task.status] || Clock;
  const latestNote = task.notes.length > 0 ? task.notes[task.notes.length - 1] : null;
  
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">{task.lead.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{task.status.replace('_', ' ')} Task</p>
          </div>
        </div>
        <TaskStatusChip status={task.status} />
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Phone className="w-3 h-3" />
          {canViewPhone ? task.lead.phone : maskPhoneNumber(task.lead.phone)}
        </span>
        <span className="capitalize">
          {task.lead.requirementType} • {task.lead.bhkRequirement} BHK
        </span>
      </div>
      {latestNote && (
        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
          {latestNote.content}
        </p>
      )}
    </div>
  );
}
