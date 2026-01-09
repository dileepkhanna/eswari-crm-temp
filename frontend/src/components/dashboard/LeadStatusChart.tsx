import { useState } from 'react';
import { Lead, LeadStatus } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { X, Phone, Mail, Calendar, ThumbsUp, ThumbsDown, Clock, Bell, TrendingUp } from 'lucide-react';
import LeadStatusChip from '@/components/leads/LeadStatusChip';
import { format } from 'date-fns';

interface LeadStatusChartProps {
  leads: Lead[];
  title?: string;
}

const statusMap: Record<string, LeadStatus> = {
  'New': 'new',
  'Contacted': 'contacted',
  'Qualified': 'qualified',
  'Converted': 'converted',
  'Lost': 'lost',
};

const statusIcons: Record<string, React.ElementType> = {
  'New': Bell,
  'Contacted': Phone,
  'Qualified': ThumbsUp,
  'Converted': TrendingUp,
  'Lost': ThumbsDown,
};

export default function LeadStatusChart({ leads, title = "Leads by Status" }: LeadStatusChartProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const leadsByStatus = [
    { name: 'New', value: leads.filter(l => l.status === 'new').length, color: 'hsl(217, 91%, 60%)', gradient: 'from-blue-500 to-indigo-600', status: 'new' },
    { name: 'Contacted', value: leads.filter(l => l.status === 'contacted').length, color: 'hsl(45, 93%, 47%)', gradient: 'from-amber-400 to-orange-500', status: 'contacted' },
    { name: 'Qualified', value: leads.filter(l => l.status === 'qualified').length, color: 'hsl(152, 69%, 31%)', gradient: 'from-emerald-500 to-teal-600', status: 'qualified' },
    { name: 'Converted', value: leads.filter(l => l.status === 'converted').length, color: 'hsl(120, 100%, 25%)', gradient: 'from-green-500 to-emerald-600', status: 'converted' },
    { name: 'Lost', value: leads.filter(l => l.status === 'lost').length, color: 'hsl(0, 84%, 60%)', gradient: 'from-red-500 to-rose-600', status: 'lost' },
  ].filter(item => item.value > 0);

  const filteredLeads = selectedStatus 
    ? leads.filter(l => l.status === statusMap[selectedStatus])
    : [];

  const totalLeads = leads.length;

  const handleClick = (data: any, index: number) => {
    if (selectedStatus === data.name) {
      setSelectedStatus(null);
      setActiveIndex(null);
    } else {
      setSelectedStatus(data.name);
      setActiveIndex(index);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const Icon = statusIcons[data.name];
      const percentage = ((data.value / totalLeads) * 100).toFixed(1);
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-xl">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${data.gradient} flex items-center justify-center`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{data.name}</p>
              <p className="text-sm text-muted-foreground">{data.value} leads ({percentage}%)</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card rounded-2xl p-6 animate-slide-up relative overflow-hidden" style={{ animationDelay: '100ms' }}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{totalLeads} total leads</p>
          </div>
        </div>
      </div>

      <div className="h-56 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={leadsByStatus}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              onClick={handleClick}
              className="cursor-pointer focus:outline-none"
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {leadsByStatus.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  className="cursor-pointer transition-all duration-300 hover:opacity-80"
                  style={{
                    filter: activeIndex === index ? 'drop-shadow(0 0 8px ' + entry.color + ')' : 'none',
                    transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                  }}
                />
              ))}
            </Pie>
            <Tooltip 
              content={<CustomTooltip />} 
              wrapperStyle={{ zIndex: 100 }}
              position={{ x: 0, y: 0 }}
              offset={20}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </div>

      {/* Legend with icons */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {leadsByStatus.map((item) => {
          const Icon = statusIcons[item.name];
          const percentage = ((item.value / totalLeads) * 100).toFixed(0);
          return (
            <button
              key={item.name}
              onClick={() => {
                if (selectedStatus === item.name) {
                  setSelectedStatus(null);
                  setActiveIndex(null);
                } else {
                  setSelectedStatus(item.name);
                  setActiveIndex(leadsByStatus.findIndex(s => s.name === item.name));
                }
              }}
              className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
                selectedStatus === item.name 
                  ? 'bg-muted ring-2 ring-primary shadow-lg' 
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.value} ({percentage}%)</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtered Details */}
      {selectedStatus && filteredLeads.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-foreground">
              {selectedStatus} Leads ({filteredLeads.length})
            </h4>
            <button
              onClick={() => { setSelectedStatus(null); setActiveIndex(null); }}
              className="p-1 hover:bg-muted rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{lead.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {lead.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {lead.email}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <LeadStatusChip status={lead.status} />
                  {lead.followUpDate && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(lead.followUpDate, 'MMM dd')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
