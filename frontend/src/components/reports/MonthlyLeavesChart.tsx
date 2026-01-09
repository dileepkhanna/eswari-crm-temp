import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leave } from '@/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from 'date-fns';
import { CalendarDays } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: 'manager' | 'staff';
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
  // Filter only managers and staff
  const teamMembers = users.filter(u => u.role === 'manager' || u.role === 'staff');
  
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="glass-card p-3 border border-border/50">
          <p className="font-semibold text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground capitalize mb-2">{item.role}</p>
          <p className="text-sm">
            Leave Days: <span className="font-medium">{item.leaveDays}</span>
          </p>
          <p className="text-sm">
            Percentage: <span className="font-medium text-primary">{item.leavePercentage}%</span>
          </p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.filter(d => d.leaveDays > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="leaveDays"
                  nameKey="name"
                >
                  {data.filter(d => d.leaveDays > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Stats List */}
          <div className="space-y-3">
            {data.map((item) => (
              <div 
                key={item.name}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
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

            {data.every(d => d.leaveDays === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No approved leaves for this month
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
