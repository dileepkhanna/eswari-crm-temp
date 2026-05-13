import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLeadTimeline } from '@/hooks/ase-marketing/useASEMarketing';
import { Phone, Mail, Calendar, FileText, Clock, MessageSquare, ArrowRightLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
  status_change: ArrowRightLeft,
  assignment: FileText,
};

const ACTIVITY_COLORS: Record<string, string> = {
  call: 'bg-blue-500/10 text-blue-500',
  email: 'bg-purple-500/10 text-purple-500',
  meeting: 'bg-green-500/10 text-green-500',
  note: 'bg-gray-500/10 text-gray-500',
  status_change: 'bg-orange-500/10 text-orange-500',
  assignment: 'bg-indigo-500/10 text-indigo-500',
};

interface ActivityTimelineProps {
  leadId: number;
  title?: string;
}

export function ActivityTimeline({ leadId, title = 'Activity Timeline' }: ActivityTimelineProps) {
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useLeadTimeline(leadId, { page });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {title} {data?.count ? `(${data.count})` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-red-500 text-sm mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
          </div>
        ) : !data?.results?.length ? (
          <p className="text-center text-muted-foreground py-8">No activities recorded yet</p>
        ) : (
          <>
            {/* Timeline */}
            <div className="relative space-y-4">
              {/* Vertical line */}
              <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

              {data.results.map((activity) => {
                const Icon = ACTIVITY_ICONS[activity.activity_type] || Clock;
                const colorClass = ACTIVITY_COLORS[activity.activity_type] || 'bg-gray-500/10 text-gray-500';

                return (
                  <div key={activity.id} className="relative flex gap-4 pl-1">
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{activity.title}</p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {activity.activity_type.replace('_', ' ')}
                        </Badge>
                      </div>

                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                      )}

                      {/* Type-specific details */}
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                        {activity.call_duration_minutes && (
                          <span>Duration: {activity.call_duration_minutes} min</span>
                        )}
                        {activity.call_outcome && (
                          <span>Outcome: {activity.call_outcome}</span>
                        )}
                        {activity.email_subject && (
                          <span>Subject: {activity.email_subject}</span>
                        )}
                        {activity.meeting_date && (
                          <span>Meeting: {new Date(activity.meeting_date).toLocaleString()}</span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mt-1.5">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {data.total_pages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <p className="text-xs text-muted-foreground">
                  Page {data.page} of {data.total_pages}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
