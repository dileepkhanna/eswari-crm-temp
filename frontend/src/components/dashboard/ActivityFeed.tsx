import { ActivityLog } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ClipboardList, CheckSquare, Building, CalendarOff, Users, FileText } from 'lucide-react';

interface ActivityFeedProps {
  activities: ActivityLog[];
}

const moduleIcons: Record<string, React.ElementType> = {
  leads: ClipboardList,
  tasks: CheckSquare,
  projects: Building,
  leaves: CalendarOff,
  users: Users,
  reports: FileText,
};

const actionColors: Record<string, string> = {
  created: 'text-success',
  updated: 'text-info',
  converted: 'text-accent',
  approved: 'text-success',
  rejected: 'text-destructive',
  deleted: 'text-destructive',
};

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
      
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No activities recorded yet.</p>
            <p className="text-sm mt-1">Activities will appear here when staff or managers perform actions.</p>
          </div>
        ) : (
          activities.map((activity, index) => {
            const Icon = moduleIcons[activity.module] || FileText;
            
            return (
              <div 
                key={activity.id} 
                className="flex gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{activity.userName}</span>
                    {' '}
                    <span className={actionColors[activity.action] || 'text-muted-foreground'}>
                      {activity.action}
                    </span>
                    {' '}
                    {activity.details}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
