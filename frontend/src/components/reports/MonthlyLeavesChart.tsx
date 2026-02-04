import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leave } from '@/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from 'date-fns';
import { CalendarDays, Calendar } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: 'manager' | 'employee';
}

interface MonthlyLeavesChartProps {
  users: TeamMember[];
  leaves: Leave[];
  selectedMonth?: Date;
}

export default function MonthlyLeavesChart({ 
  users, 
  leaves,
  selectedMonth = new Date()
}: MonthlyLeavesChartProps) {
  // Filter only managers and employees
  const teamMembers = users.filter(u => u.role === 'manager' || u.role === 'employee');
  
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const totalWorkingDays = 22; // Approximate working days in a month

  // Calculate leave days for each team member
  const data = teamMembers.map((user) => {
    const userLeaves = leaves.filter(l => {
      const leaveUserId = (l as any).user_id || l.userId;
      const leaveStatus = l.status;
      const startDate = new Date((l as any).start_date || l.startDate);
      
      return leaveUserId === user.id && 
             leaveStatus === 'approved' &&
             isWithinInterval(startDate, { start: monthStart, end: monthEnd });
    });

    const totalLeaveDays = userLeaves.reduce((sum, leave) => {
      const start = new Date((leave as any).start_date || leave.startDate);
      const end = new Date((leave as any).end_date || leave.endDate);
      return sum + differenceInDays(end, start) + 1;
    }, 0);

    return {
      name: user.name,
      role: user.role,
      leaveDays: totalLeaveDays,
    };
  });

  const totalLeaveDays = data.reduce((sum, d) => sum + d.leaveDays, 0);
  const dataWithLeaves = data.filter(d => d.leaveDays > 0);
  const presentMembers = teamMembers.length - dataWithLeaves.length;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          Monthly Leaves - {format(selectedMonth, 'MMM yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {dataWithLeaves.length === 0 ? (
          <div className="text-center py-4">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Perfect attendance this month!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-primary">{totalLeaveDays}</p>
                <p className="text-xs text-muted-foreground">Total Days</p>
              </div>
              <div>
                <p className="text-lg font-bold text-orange-600">{dataWithLeaves.length}</p>
                <p className="text-xs text-muted-foreground">On Leave</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{presentMembers}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
            </div>

            {/* Leave Details - Compact List */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Leave Details</h4>
              {dataWithLeaves.slice(0, 5).map((item) => (
                <div 
                  key={item.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.role}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.leaveDays} day{item.leaveDays > 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
              
              {dataWithLeaves.length > 5 && (
                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    +{dataWithLeaves.length - 5} more members on leave
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
