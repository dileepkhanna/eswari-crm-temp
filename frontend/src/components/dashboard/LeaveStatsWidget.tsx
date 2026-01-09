import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarOff, CheckCircle, XCircle, Clock } from 'lucide-react';
// import { supabase } from '@/integrations/supabase/client'; // Removed - using Django backend
import { useAuth } from '@/contexts/AuthContextDjango';
import { format, differenceInDays } from 'date-fns';
import LeaveStatusChip from '@/components/leaves/LeaveStatusChip';

interface LeaveRecord {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
}

export default function LeaveStatsWidget() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaves = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { apiClient } = await import('@/lib/api');
        const response = await apiClient.getLeaves();
        
        // Handle paginated response from Django REST framework
        const leavesData = Array.isArray(response) ? response : (response as any).results || [];
        
        // Transform Django leave data to match frontend interface
        const transformedLeaves = leavesData.map((leave: any) => ({
          id: leave.id.toString(),
          leave_type: leave.leave_type,
          start_date: leave.start_date,
          end_date: leave.end_date,
          reason: leave.reason,
          status: leave.status,
          created_at: leave.created_at,
        }));
        
        setLeaves(transformedLeaves);
      } catch (error) {
        console.error('Error fetching leaves:', error);
        setLeaves([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, [user]);

  const pending = leaves.filter((l) => l.status === 'pending').length;
  const approved = leaves.filter((l) => l.status === 'approved').length;
  const rejected = leaves.filter((l) => l.status === 'rejected').length;

  const totalDays = leaves
    .filter((l) => l.status === 'approved')
    .reduce((acc, l) => {
      return acc + differenceInDays(new Date(l.end_date), new Date(l.start_date)) + 1;
    }, 0);

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      casual: 'Casual Leave',
      sick: 'Sick Leave',
      annual: 'Annual Leave',
      maternity: 'Maternity Leave',
      paternity: 'Paternity Leave',
      unpaid: 'Unpaid Leave',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardHeader>
          <CardTitle className="text-lg">Leave Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted/50 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card animate-slide-up">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarOff className="w-5 h-5 text-primary" />
          Leave Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{leaves.length}</div>
            <div className="text-xs text-muted-foreground">Total Requests</div>
          </div>
          <div className="bg-warning/10 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-2xl font-bold text-warning">{pending}</span>
            </div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="bg-success/10 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-2xl font-bold text-success">{approved}</span>
            </div>
            <div className="text-xs text-muted-foreground">Approved</div>
          </div>
          <div className="bg-destructive/10 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{rejected}</span>
            </div>
            <div className="text-xs text-muted-foreground">Rejected</div>
          </div>
        </div>

        {/* Total Days Used */}
        <div className="bg-primary/10 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-primary">{totalDays}</div>
          <div className="text-sm text-muted-foreground">Total Days Used (Approved)</div>
        </div>

        {/* Recent Leave History */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Recent Requests</h4>
          {leaves.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No leave requests yet
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {leaves.slice(0, 5).map((leave, index) => (
                <div
                  key={leave.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">
                        {getLeaveTypeLabel(leave.leave_type)}
                      </span>
                      <LeaveStatusChip status={leave.status as any} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(leave.start_date), 'MMM dd')} -{' '}
                      {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {differenceInDays(new Date(leave.end_date), new Date(leave.start_date)) + 1} day(s)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
