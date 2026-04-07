import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { X, Phone, Mail, Calendar, TrendingUp, ThumbsDown, Clock, Bell, Flame } from 'lucide-react';
import { format } from 'date-fns';

interface CapitalLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  source: string;
  follow_up_date?: string;
  assigned_to_name?: string;
  created_at: string;
}

interface CapitalLeadStatusChartProps {
  leads: CapitalLead[];
  totalCount: number;
  title?: string;
}

const statusIcons: Record<string, React.ElementType> = {
  'new': Bell,
  'hot': Flame,
  'warm': TrendingUp,
  'cold': Clock,
  'not_interested': ThumbsDown,
  'reminder': Bell,
};

const statusLabels: Record<string, string> = {
  'new': 'New',
  'hot': 'Hot',
  'warm': 'Warm',
  'cold': 'Cold',
  'not_interested': 'Not Interested',
  'reminder': 'Reminder',
};

export default function CapitalLeadStatusChart({ leads, totalCount, title = "Eswari Capital — Leads by Status" }: CapitalLeadStatusChartProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const leadsByStatus = [
    { name: 'New', value: leads.filter(l => l.status === 'new').length, color: 'hsl(271, 81%, 56%)', gradient: 'from-purple-500 to-violet-600', status: 'new' },
    { name: 'Hot', value: leads.filter(l => l.status === 'hot').length, color: 'hsl(152, 69%, 31%)', gradient: 'from-emerald-500 to-teal-600', status: 'hot' },
    { name: 'Warm', value: leads.filter(l => l.status === 'warm').length, color: 'hsl(45, 93%, 47%)', gradient: 'from-amber-400 to-orange-500', status: 'warm' },
    { name: 'Cold', value: leads.filter(l => l.status === 'cold').length, color: 'hsl(217, 91%, 60%)', gradient: 'from-blue-500 to-indigo-600', status: 'cold' },
    { name: 'Not Interested', value: leads.filter(l => l.status === 'not_interested').length, color: 'hsl(220, 9%, 46%)', gradient: 'from-gray-500 to-slate-600', status: 'not_interested' },
    { name: 'Reminder', value: leads.filter(l => l.status === 'reminder').length, color: 'hsl(271, 81%, 56%)', gradient: 'from-purple-500 to-violet-600', status: 'reminder' },
  ].filter(item => item.value > 0);

  const filteredLeads = selectedStatus 
    ? leads.filter(l => l.status === selectedStatus.toLowerCase().replace(' ', '_'))
    : [];

  const handleClick = (data: any, index: number) => {
    if (selectedStatus === data.status) {
      setSelectedStatus(null);
      setActiveIndex(null);
    } else {
      setSelectedStatus(data.status);
      setActiveIndex(index);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const Icon = statusIcons[data.status];
      const percentage = totalCount > 0 ? ((data.value / totalCount) * 100).toFixed(1) : 0;
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
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{totalCount} total leads</p>
          </div>
        </div>
      </div>

      <div className="h-56 relative">
        {leadsByStatus.length === 0 ? (
          // No leads case
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No leads data available</p>
            </div>
          </div>
        ) : leadsByStatus.length === 1 ? (
          // Single status case - show a simple circle
          <div className="flex items-center justify-center h-full">
            <div className="relative">
              <div 
                className={`w-32 h-32 rounded-full bg-gradient-to-br ${leadsByStatus[0].gradient} flex items-center justify-center shadow-lg`}
              >
                <div className="text-center text-white">
                  <p className="text-2xl font-bold">{leadsByStatus[0].value}</p>
                  <p className="text-xs opacity-90">{leadsByStatus[0].name}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Multiple statuses - show pie chart
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
        )}
        
        {/* Center label - only show for pie chart */}
        {leadsByStatus.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend with icons */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {leadsByStatus.map((item) => {
          const Icon = statusIcons[item.status];
          const percentage = totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(0) : 0;
          return (
            <button
              key={item.name}
              onClick={() => {
                if (selectedStatus === item.status) {
                  setSelectedStatus(null);
                  setActiveIndex(null);
                } else {
                  setSelectedStatus(item.status);
                  setActiveIndex(leadsByStatus.findIndex(s => s.name === item.name));
                }
              }}
              className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
                selectedStatus === item.status 
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
              {statusLabels[selectedStatus] || selectedStatus} Leads ({filteredLeads.length})
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
                    {lead.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {lead.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-br ${leadsByStatus.find(s => s.status === lead.status)?.gradient} text-white font-medium`}>
                    {statusLabels[lead.status] || lead.status}
                  </span>
                  {lead.follow_up_date && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(lead.follow_up_date), 'MMM dd')}
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
