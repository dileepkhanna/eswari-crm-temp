import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lead, Task } from '@/types';
import { BarChart3, TrendingUp } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: 'manager' | 'employee';
}

interface StaffPerformanceChartProps {
  users: TeamMember[];
  leads: Lead[];
  tasks: Task[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--info))', 'hsl(var(--success))'];

export default function StaffPerformanceChart({ users, leads, tasks }: StaffPerformanceChartProps) {
  // Filter only managers and staff
  const teamMembers = users.filter(u => u.role === 'manager' || u.role === 'employee');

  const data = teamMembers.map((user, index) => {
    const userLeads = leads.filter(l => l.createdBy === user.id).length;
    const userTasks = tasks.filter(t => t.assignedTo === user.id).length;
    const completedTasks = tasks.filter(t => t.assignedTo === user.id && t.status === 'completed').length;
    
    // Daily leads percentage (assuming 100 leads/day is 100%)
    const dailyLeadsPercentage = Math.min((userLeads / 100) * 100, 100);
    
    return {
      name: user.name.length > 12 ? user.name.split(' ')[0] : user.name,
      fullName: user.name,
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
        <div className="glass-card p-4 border border-border/50 shadow-lg">
          <p className="font-semibold text-foreground mb-1">{userData?.fullName}</p>
          <p className="text-xs text-muted-foreground capitalize mb-3">{userData?.role}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">{entry.name}:</span>
                </div>
                <span className="font-medium text-sm">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (teamMembers.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Staff Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No team members found for the selected filters</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Staff Performance Overview
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Leads created, tasks assigned, and completion rates by team member
        </p>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={data} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
              />
              <Bar 
                dataKey="leads" 
                name="Leads Created" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
              <Bar 
                dataKey="tasks" 
                name="Tasks Assigned" 
                fill="hsl(var(--accent))" 
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
              <Bar 
                dataKey="completedTasks" 
                name="Completed Tasks" 
                fill="hsl(var(--success))" 
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{leads.length}</p>
            <p className="text-sm text-muted-foreground">Total Leads</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">{tasks.length}</p>
            <p className="text-sm text-muted-foreground">Total Tasks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{tasks.filter(t => t.status === 'completed').length}</p>
            <p className="text-sm text-muted-foreground">Completed Tasks</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
