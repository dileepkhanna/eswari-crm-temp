import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lead, Task } from '@/types';

interface TeamMember {
  id: string;
  name: string;
  role: 'manager' | 'staff';
}

interface StaffPerformanceChartProps {
  users: TeamMember[];
  leads: Lead[];
  tasks: Task[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--info))', 'hsl(var(--success))'];

export default function StaffPerformanceChart({ users, leads, tasks }: StaffPerformanceChartProps) {
  // Filter only managers and staff
  const teamMembers = users.filter(u => u.role === 'manager' || u.role === 'staff');

  const data = teamMembers.map((user, index) => {
    const userLeads = leads.filter(l => l.createdBy === user.id).length;
    const userTasks = tasks.filter(t => t.assignedTo === user.id).length;
    const completedTasks = tasks.filter(t => t.assignedTo === user.id && t.status === 'completed').length;
    
    // Daily leads percentage (assuming 100 leads/day is 100%)
    const dailyLeadsPercentage = Math.min((userLeads / 100) * 100, 100);
    
    return {
      name: user.name,
      role: user.role,
      leads: userLeads,
      tasks: userTasks,
      completedTasks,
      dailyLeadsPercentage: Number(dailyLeadsPercentage.toFixed(1)),
      color: COLORS[index % COLORS.length],
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const userData = data.find(d => d.name === label);
      return (
        <div className="glass-card p-3 border border-border/50">
          <p className="font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground capitalize mb-2">{userData?.role}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Staff Performance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="leads" name="Leads Created" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tasks" name="Tasks Assigned" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completedTasks" name="Completed Tasks" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
