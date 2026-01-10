import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lead } from '@/types';
import { Target, TrendingUp } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: 'manager' | 'employee';
}

interface DailyLeadsPercentageChartProps {
  users: TeamMember[];
  leads: Lead[];
  dailyTarget?: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--info))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
];

export default function DailyLeadsPercentageChart({ 
  users, 
  leads, 
  dailyTarget = 100 
}: DailyLeadsPercentageChartProps) {
  // Filter only managers and employees
  const teamMembers = users.filter(u => u.role === 'manager' || u.role === 'employee');

  const data = teamMembers.map((user, index) => {
    const userLeads = leads.filter(l => l.createdBy === user.id).length;
    
    // Calculate percentage based on daily target (default 100)
    const percentage = Math.min((userLeads / dailyTarget) * 100, 100);
    
    return {
      name: user.name,
      shortName: user.name.split(' ')[0],
      role: user.role,
      leads: userLeads,
      percentage: Number(percentage.toFixed(1)),
      color: COLORS[index % COLORS.length],
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const userData = data.find(d => d.name === label);
      return (
        <div className="glass-card p-4 border border-border/50 shadow-lg">
          <p className="font-semibold text-foreground mb-1">{label}</p>
          <p className="text-xs text-muted-foreground capitalize mb-3">{userData?.role}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Leads:</span> 
              <span className="font-medium ml-2">{userData?.leads} / {dailyTarget}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Achievement:</span> 
              <span className="font-medium text-primary ml-2">{userData?.percentage}%</span>
            </p>
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
            <Target className="w-5 h-5 text-primary" />
            Daily Leads Target
          </CardTitle>
          <CardDescription>
            Percentage based on {dailyTarget} leads/day target
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No team members found for the selected filters</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const averageAchievement = data.reduce((sum, d) => sum + d.percentage, 0) / data.length;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Daily Leads Target
            </CardTitle>
            <CardDescription>
              Achievement percentage based on {dailyTarget} leads/day target
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{averageAchievement.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Average Achievement</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart 
              data={data} 
              layout="vertical"
              margin={{ top: 20, right: 60, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} opacity={0.3} />
              <XAxis 
                type="number"
                domain={[0, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis 
                type="category"
                dataKey="name"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="percentage" 
                name="Achievement" 
                radius={[0, 4, 4, 0]}
                barSize={32}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList 
                  dataKey="percentage" 
                  position="right" 
                  formatter={(value: number) => `${value}%`}
                  fill="hsl(var(--foreground))"
                  fontSize={12}
                  offset={8}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Summary */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-lg font-bold text-success">{data.filter(d => d.percentage >= 100).length}</p>
            <p className="text-sm text-muted-foreground">Target Achieved</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-warning">{data.filter(d => d.percentage >= 75 && d.percentage < 100).length}</p>
            <p className="text-sm text-muted-foreground">Near Target (75%+)</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-destructive">{data.filter(d => d.percentage < 75).length}</p>
            <p className="text-sm text-muted-foreground">Below Target</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
