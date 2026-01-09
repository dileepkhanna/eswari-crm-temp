import { Lead, Task } from '@/types';
import { format, isAfter, isBefore, addDays, isToday } from 'date-fns';
import { Bell, Calendar, Phone, ClipboardList, CheckSquare, AlertTriangle, Volume2 } from 'lucide-react';
import LeadStatusChip from '@/components/leads/LeadStatusChip';
import TaskStatusChip from '@/components/tasks/TaskStatusChip';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface RemindersWidgetProps {
  leads: Lead[];
  tasks: Task[];
}

export default function RemindersWidget({ leads, tasks }: RemindersWidgetProps) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const today = new Date();
  const nextWeek = addDays(today, 7);

  // Get leads with follow-up dates that need attention
  const upcomingLeadReminders = leads.filter(l => 
    (l.status === 'new' || l.status === 'contacted') && 
    l.followUpDate && 
    isAfter(l.followUpDate, today) &&
    isBefore(l.followUpDate, nextWeek)
  ).sort((a, b) => a.followUpDate!.getTime() - b.followUpDate!.getTime());

  // Overdue leads
  const overdueLeadReminders = leads.filter(l => 
    (l.status === 'new' || l.status === 'contacted') && 
    l.followUpDate && 
    isBefore(l.followUpDate, today) &&
    !isToday(l.followUpDate)
  ).sort((a, b) => a.followUpDate!.getTime() - b.followUpDate!.getTime());

  // Get tasks with upcoming action dates
  const upcomingTaskReminders = tasks.filter(t => 
    t.nextActionDate && 
    isAfter(t.nextActionDate, today) &&
    isBefore(t.nextActionDate, nextWeek) &&
    t.status !== 'completed'
  ).sort((a, b) => a.nextActionDate!.getTime() - b.nextActionDate!.getTime());

  // Overdue tasks
  const overdueTaskReminders = tasks.filter(t => 
    t.nextActionDate && 
    isBefore(t.nextActionDate, today) &&
    !isToday(t.nextActionDate) &&
    t.status !== 'completed'
  ).sort((a, b) => a.nextActionDate!.getTime() - b.nextActionDate!.getTime());

  const totalReminders = upcomingLeadReminders.length + upcomingTaskReminders.length;
  const totalOverdue = overdueLeadReminders.length + overdueTaskReminders.length;

  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log('Audio notification not supported');
    }
  }, []);

  useEffect(() => {
    if (soundEnabled && (totalReminders > 0 || totalOverdue > 0)) {
      playNotificationSound();
    }
  }, [soundEnabled, totalReminders, totalOverdue, playNotificationSound]);

  return (
    <div className="glass-card rounded-2xl p-6 animate-slide-up relative overflow-hidden" style={{ animationDelay: '200ms' }}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-warning/10 to-transparent rounded-full blur-3xl" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning to-orange-600 flex items-center justify-center relative">
            <Bell className="w-5 h-5 text-white" />
            {(totalReminders + totalOverdue) > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                {(totalReminders + totalOverdue) > 9 ? '9+' : totalReminders + totalOverdue}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Reminders</h3>
            <p className="text-sm text-muted-foreground">
              {totalReminders} upcoming, {totalOverdue} overdue
            </p>
          </div>
        </div>
        <Button
          variant={soundEnabled ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            if (!soundEnabled) playNotificationSound();
          }}
          className="gap-2"
        >
          <Volume2 className={`w-4 h-4 ${soundEnabled ? 'animate-pulse' : ''}`} />
          {soundEnabled ? 'On' : 'Off'}
        </Button>
      </div>

      {totalReminders === 0 && totalOverdue === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
          No upcoming reminders
        </div>
      ) : (
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {/* Overdue Section */}
          {totalOverdue > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="w-4 h-4" />
                Overdue ({totalOverdue})
              </div>
              {overdueLeadReminders.map((lead, index) => (
                <div 
                  key={lead.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center text-destructive shrink-0">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{lead.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span className="truncate">{lead.phone}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-sm text-destructive mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(lead.followUpDate!, 'MMM dd')}
                    </div>
                    <LeadStatusChip status={lead.status} />
                  </div>
                </div>
              ))}
              {overdueTaskReminders.map((task, index) => (
                <div 
                  key={task.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center text-destructive shrink-0">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{task.lead.name}</p>
                    <p className="text-sm text-muted-foreground capitalize truncate">
                      {task.lead.requirementType} • {task.lead.bhkRequirement} BHK
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-sm text-destructive mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(task.nextActionDate!, 'MMM dd')}
                    </div>
                    <TaskStatusChip status={task.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lead Reminders */}
          {upcomingLeadReminders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ClipboardList className="w-4 h-4" />
                Lead Follow-ups ({upcomingLeadReminders.length})
              </div>
              {upcomingLeadReminders.map((lead, index) => (
                <div 
                  key={lead.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-info/5 border border-info/20 animate-fade-in hover:bg-info/10 transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{lead.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span className="truncate">{lead.phone}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-sm text-info mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(lead.followUpDate!, 'MMM dd')}
                    </div>
                    <LeadStatusChip status={lead.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Task Reminders */}
          {upcomingTaskReminders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CheckSquare className="w-4 h-4" />
                Task Actions ({upcomingTaskReminders.length})
              </div>
              {upcomingTaskReminders.map((task, index) => (
                <div 
                  key={task.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-accent/5 border border-accent/20 animate-fade-in hover:bg-accent/10 transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white shrink-0">
                    {task.lead.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{task.lead.name}</p>
                    <p className="text-sm text-muted-foreground capitalize truncate">
                      {task.lead.requirementType} • {task.lead.bhkRequirement} BHK
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-sm text-accent mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(task.nextActionDate!, 'MMM dd')}
                    </div>
                    <TaskStatusChip status={task.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
