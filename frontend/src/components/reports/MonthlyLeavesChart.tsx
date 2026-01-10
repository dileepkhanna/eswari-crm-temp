import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--info))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
];

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
  const data = teamMembers.map((user, index) => {
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

    const leavePercentage = (totalLeaveDays / totalWorkingDays) * 100;

    return {
      name: user.name,
      shortName: user.name.split(' ')[0],
      role: user.role,
      leaveDays: totalLeaveDays,
      workingDays: totalWorkingDays - totalLeaveDays,
      leavePercentage: Number(leavePercentage.toFixed(1)),
      color: COLORS[index % COLORS.length],
    };
  });

  const totalLeaveDays = data.reduce((sum, d) => sum + d.leaveDays, 0);
  const dataWithLeaves = data.filter(d => d.leaveDays > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="glass-card p-4 border border-border/50 shadow-lg">
          <p className="font-semibold text-foreground mb-1">{item.name}</p>
          <p className="text-xs text-muted-foreground capitalize mb-3">{item.role}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Leave Days:</span> 
              <span className="font-medium ml-2">{item.leaveDays}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Percentage:</span> 
              <span className="font-medium text-primary ml-2">{item.leavePercentage}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Monthly Leaves Distribution
            </CardTitle>
            <CardDescription>
              {format(selectedMonth, 'MMMM yyyy')} - Based on {totalWorkingDays} working days
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{totalLeaveDays}</p>
            <p className="text-xs text-muted-foreground">Total Leave Days</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {dataWithLeaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No approved leaves for this month</p>
            <p className="text-sm text-muted-foreground">All team members were present</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={dataWithLeaves}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={3}
                    dataKey="leaveDays"
                    nameKey="name"
                  >
                    {dataWithLeaves.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Stats List */}
            <div className="space-y-3">
              <h4 className="font-medium text-foreground mb-4">Leave Breakdown</h4>
              {data.map((item) => (
                <div 
                  key={item.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-background" 
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">{item.leavePercentage}%</p>
                    <p className="text-xs text-muted-foreground">{item.leaveDays} days</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {dataWithLeaves.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{dataWithLeaves.length}</p>
              <p className="text-sm text-muted-foreground">Members on Leave</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-success">{teamMembers.length - dataWithLeaves.length}</p>
              <p className="text-sm text-muted-foreground">Full Attendance</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-accent">{(totalLeaveDays / (teamMembers.length * totalWorkingDays) * 100).toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Overall Leave Rate</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
