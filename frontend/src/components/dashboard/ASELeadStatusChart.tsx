import { useState } from 'react';
import { ASELead, ASELeadStats } from '@/types/ase-customer';
import { ASE_LEAD_STATUS_OPTIONS } from '@/types/ase-customer';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Briefcase, X } from 'lucide-react';

interface ASELeadStatusChartProps {
  leads: ASELead[];
  totalCount?: number;
  stats?: ASELeadStats | null;
  title?: string;
}

const STATUS_CONFIG: Record<string, { color: string; gradient: string }> = {
  new:           { color: '#6366f1', gradient: 'from-indigo-500 to-violet-600' },
  contacted:     { color: '#8b5cf6', gradient: 'from-violet-500 to-purple-600' },
  qualified:     { color: '#06b6d4', gradient: 'from-cyan-500 to-sky-600' },
  proposal_sent: { color: '#f59e0b', gradient: 'from-amber-400 to-orange-500' },
  negotiating:   { color: '#f97316', gradient: 'from-orange-500 to-red-500' },
  won:           { color: '#10b981', gradient: 'from-emerald-500 to-teal-600' },
  lost:          { color: '#ef4444', gradient: 'from-red-500 to-rose-600' },
  on_hold:       { color: '#6b7280', gradient: 'from-gray-400 to-slate-500' },
  nurturing:     { color: '#ec4899', gradient: 'from-pink-500 to-rose-500' },
};

export default function ASELeadStatusChart({ leads, totalCount, stats, title = 'ASE Leads by Status' }: ASELeadStatusChartProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = ASE_LEAD_STATUS_OPTIONS
    .map(opt => ({
      name: opt.label,
      // Use stats from backend if available, otherwise count from loaded leads
      value: stats ? (stats.by_status?.[opt.value]?.count ?? 0) : leads.filter(l => l.status === opt.value).length,
      status: opt.value,
      color: STATUS_CONFIG[opt.value]?.color ?? '#6b7280',
      gradient: STATUS_CONFIG[opt.value]?.gradient ?? 'from-gray-400 to-slate-500',
    }))
    .filter(d => d.value > 0);

  const total = stats?.total ?? totalCount ?? leads.length;

  const filteredLeads = selectedStatus
    ? leads.filter(l => {
        const opt = ASE_LEAD_STATUS_OPTIONS.find(o => o.label === selectedStatus);
        return opt ? l.status === opt.value : false;
      })
    : [];

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
      const d = payload[0].payload;
      const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-xl">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full`} style={{ background: d.color }} />
            <p className="font-semibold text-foreground text-sm">{d.name}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{d.value} leads ({pct}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card rounded-2xl p-6 animate-slide-up relative overflow-hidden" style={{ animationDelay: '150ms' }}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl" />

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{total} total leads</p>
        </div>
      </div>

      <div className="h-56 relative">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No ASE leads data</p>
            </div>
          </div>
        ) : chartData.length === 1 ? (
          <div className="flex items-center justify-center h-full">
            <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${chartData[0].gradient} flex items-center justify-center shadow-lg`}>
              <div className="text-center text-white">
                <p className="text-2xl font-bold">{chartData[0].value}</p>
                <p className="text-xs opacity-90">{chartData[0].name}</p>
              </div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                onClick={handleClick}
                className="cursor-pointer"
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    style={{
                      filter: activeIndex === index ? `drop-shadow(0 0 8px ${entry.color})` : 'none',
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 100 }} />
            </PieChart>
          </ResponsiveContainer>
        )}

        {chartData.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {chartData.map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
          return (
            <button
              key={item.name}
              onClick={() => {
                if (selectedStatus === item.name) { setSelectedStatus(null); setActiveIndex(null); }
                else { setSelectedStatus(item.name); setActiveIndex(i); }
              }}
              className={`flex items-center gap-2 p-2 rounded-xl transition-all text-left ${
                selectedStatus === item.name ? 'bg-muted ring-2 ring-primary shadow-lg' : 'hover:bg-muted/50'
              }`}
            >
              <div className={`w-3 h-3 rounded-full shrink-0`} style={{ background: item.color }} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.value} ({pct}%)</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Drill-down list */}
      {selectedStatus && filteredLeads.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-foreground">{selectedStatus} ({filteredLeads.length})</h4>
            <button onClick={() => { setSelectedStatus(null); setActiveIndex(null); }} className="p-1 hover:bg-muted rounded-md">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filteredLeads.map(lead => (
              <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{lead.company_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{lead.contact_person} · {lead.phone}</p>
                </div>
                <span className="text-xs text-muted-foreground capitalize shrink-0 ml-2">{lead.priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
