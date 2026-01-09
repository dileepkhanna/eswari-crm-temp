import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lead } from '@/types';
import { Target } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: 'manager' | 'staff';
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
  // Filter only managers and staff
  const teamMembers = users.filter(u => u.role === 'manager' || u.role === 'staff');

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
        <div className="glass-card p-3 border border-border/50">
          <p className="font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground capitalize mb-2">{userData?.role}</p>
          <p className="text-sm text-primary">
            Leads: {userData?.leads} / {dailyTarget}
          </p>
          <p className="text-sm font-medium text-success">
            Achievement: {userData?.percentage}%
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
              <Target className="w-5 h-5 text-primary" />
              Daily Leads Target
            </CardTitle>
            <CardDescription>
              Percentage based on {dailyTarget} leads/day target
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={data} 
            layout="vertical"
            margin={{ top: 20, right: 50, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
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
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="percentage" 
              name="Achievement" 
              radius={[0, 4, 4, 0]}
              barSize={24}
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
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-muted-foreground">
                {item.shortName} ({item.leads} leads)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
