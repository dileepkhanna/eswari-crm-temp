import { useState, useEffect, useCallback } from 'react';
import { Users, Phone, CheckCircle, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ASECustomerService } from '@/services/ase-customer.service';

type EmployeeStat = {
  employee_id: number;
  name: string;
  role: string;
  calls_today: number;
  answered_today: number;
  answered_rate: number;
  conversions_this_week: number;
  total_assigned: number;
  pending: number;
};

interface TeamPerformanceDashboardProps {
  companyId?: string | number;
}

export default function TeamPerformanceDashboard({ companyId }: TeamPerformanceDashboardProps) {
  const [data, setData] = useState<{ date: string; week_start: string; employees: EmployeeStat[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ASECustomerService.getTeamPerformance(companyId);
      setData(result);
    } catch {
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Team Performance</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Team Performance</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const employees = data?.employees ?? [];

  // Team totals
  const totals = employees.reduce(
    (acc, e) => ({
      calls: acc.calls + e.calls_today,
      answered: acc.answered + e.answered_today,
      conversions: acc.conversions + e.conversions_this_week,
    }),
    { calls: 0, answered: 0, conversions: 0 }
  );
  const teamAnsweredRate = totals.calls > 0 ? Math.round((totals.answered / totals.calls) * 100) : 0;

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Team Performance
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Today · Conversions since {data?.week_start ? new Date(data.week_start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'this week'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Team summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{totals.calls}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Calls Today</p>
        </div>
        <div className="rounded-xl bg-green-50 dark:bg-green-950/30 p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{teamAnsweredRate}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Answer Rate</p>
        </div>
        <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 p-3 text-center">
          <p className="text-2xl font-bold text-purple-600">{totals.conversions}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Conversions</p>
        </div>
      </div>

      {/* Per-employee table */}
      {employees.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No team members found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2 pr-3 font-medium">Employee</th>
                <th className="text-center py-2 px-2 font-medium">
                  <span className="flex items-center justify-center gap-1"><Phone className="w-3 h-3" />Calls</span>
                </th>
                <th className="text-center py-2 px-2 font-medium">
                  <span className="flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" />Answered</span>
                </th>
                <th className="text-center py-2 px-2 font-medium">Rate</th>
                <th className="text-center py-2 px-2 font-medium">
                  <span className="flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" />Conv.</span>
                </th>
                <th className="text-center py-2 pl-2 font-medium">Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {employees.map(emp => (
                <tr key={emp.employee_id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[120px]">{emp.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{emp.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-2.5 px-2">
                    <span className={`font-semibold ${emp.calls_today > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                      {emp.calls_today}
                    </span>
                  </td>
                  <td className="text-center py-2.5 px-2">
                    <span className={`font-semibold ${emp.answered_today > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {emp.answered_today}
                    </span>
                  </td>
                  <td className="text-center py-2.5 px-2">
                    <RateBar rate={emp.answered_rate} />
                  </td>
                  <td className="text-center py-2.5 px-2">
                    <span className={`font-semibold ${emp.conversions_this_week > 0 ? 'text-purple-600' : 'text-muted-foreground'}`}>
                      {emp.conversions_this_week}
                    </span>
                  </td>
                  <td className="text-center py-2.5 pl-2">
                    <span className="text-muted-foreground">{emp.total_assigned}</span>
                    {emp.pending > 0 && (
                      <span className="ml-1 text-[10px] text-yellow-600">({emp.pending} pending)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RateBar({ rate }: { rate: number }) {
  const color = rate >= 70 ? 'bg-green-500' : rate >= 40 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1.5 justify-center">
      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{rate}%</span>
    </div>
  );
}
