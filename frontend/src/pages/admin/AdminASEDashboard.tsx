import { useEffect, useState, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/dashboard/StatCard';
import ASELeadStatusChart from '@/components/dashboard/ASELeadStatusChart';
import RemindersWidget from '@/components/dashboard/RemindersWidget';
import BirthdayWidget from '@/components/birthdays/BirthdayWidget';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import { useASELead } from '@/contexts/ASELeadContext';
import { useASECustomers } from '@/contexts/ASECustomerContext';
import { ASECustomerService } from '@/services/ase-customer.service';
import { apiClient } from '@/lib/api';
import { logger } from '@/lib/logger';
import { useASEWebSocket } from '@/hooks/useASEWebSocket';
import { useAuth } from '@/contexts/AuthContextDjango';
import { PhoneCall, CheckCircle, XCircle, Clock, Briefcase, Users, TrendingUp, AlertCircle, ListChecks, CalendarCheck, Target } from 'lucide-react';

export default function AdminASEDashboard() {
  const { user } = useAuth();
  const { leads, totalCount: leadsTotalCount, stats: leadsStats, refreshData: refreshLeads } = useASELead();
  const { customers, fetchCustomers } = useASECustomers();
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [teamPerformance, setTeamPerformance] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [todayFollowUps, setTodayFollowUps] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  const fetchCallStats = useCallback(async () => {
    try {
      const [stats, perf, overdueNum, followUps] = await Promise.allSettled([
        ASECustomerService.getStats(),
        ASECustomerService.getTeamPerformance(),
        ASECustomerService.getOverdueCount(),
        ASECustomerService.getFollowUps(),
      ]);
      if (stats.status === 'fulfilled') setCustomerStats(stats.value);
      if (perf.status === 'fulfilled') setTeamPerformance(perf.value);
      if (overdueNum.status === 'fulfilled') setOverdueCount(overdueNum.value);
      if (followUps.status === 'fulfilled') setTodayFollowUps((followUps.value as any)?.count ?? 0);
    } catch (error) {
      logger.error('Error fetching ASE dashboard stats:', error);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res: any = await apiClient.get('/ase-leads/tasks/my-tasks/?page=1&page_size=200');
      const list = Array.isArray(res) ? res : res?.results ?? [];
      setTasks(list);
    } catch (err) {
      logger.error('Error fetching ASE tasks:', err);
    }
  }, []);

  // Real-time WebSocket updates for the dashboard
  useASEWebSocket('calls', () => { fetchCallStats(); fetchCustomers(); });
  useASEWebSocket('leads', () => { refreshLeads(); });
  useASEWebSocket('tasks', () => { fetchTasks(); });

  // On mount: use the stable callbacks — no duplicate inline fetch
  useEffect(() => {
    fetchCallStats();
    fetchTasks();
  }, [fetchCallStats, fetchTasks]);

  // Calculate call stats — use flat stats (not by_status) since ASECustomerStats is flat
  const totalCalls = customerStats?.total ?? customers.length;
  const answeredCalls = customerStats?.answered ?? customers.filter(c => c.call_status === 'answered').length;
  const pendingCalls = customerStats?.pending ?? customers.filter(c => c.call_status === 'pending').length;
  const notAnsweredCalls = customerStats?.not_answered ?? customers.filter(c => c.call_status === 'not_answered').length;
  const busyCalls = customerStats?.busy ?? customers.filter(c => c.call_status === 'busy').length;
  const notInterestedCalls = customerStats?.not_interested ?? customers.filter(c => c.call_status === 'not_interested').length;
  const convertedCalls = customerStats?.converted ?? customers.filter(c => c.is_converted).length;

  // Calculate lead stats
  const newLeads = leadsStats?.by_status?.new?.count ?? leads.filter(l => l.status === 'new').length;
  const demoDoneLeads = leadsStats?.by_status?.demo_done?.count ?? leads.filter(l => l.status === 'demo_done').length;
  const presentationLeads = leadsStats?.by_status?.presentation?.count ?? leads.filter(l => l.status === 'presentation').length;

  // Tasks
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  // Conversion metrics
  const conversionRate = totalCalls > 0 ? Math.round((convertedCalls / totalCalls) * 100) : 0;
  const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;

  // Top performers from team performance data
  const employees: any[] = teamPerformance?.employees ?? [];

  return (
    <div className="min-h-screen bg-background">
      <TopBar 
        title="ASE Technologies Dashboard" 
        subtitle="Digital Marketing Operations Overview" 
      />

      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        <AnnouncementBanner userRole={(user?.role as any) || 'employee'} maxDisplay={2} />

        {/* Key Metrics — Calls */}
        <div>
          <h2 className="text-sm md:text-lg font-semibold mb-2 md:mb-3 text-foreground flex items-center gap-2">
            <PhoneCall className="w-4 h-4 md:w-5 md:h-5" />
            Call Activity
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatCard 
              title="Total Calls" 
              value={totalCalls}
              change={`${answerRate}% answer rate`}
              changeType={answerRate >= 70 ? 'positive' : answerRate >= 50 ? 'neutral' : 'negative'}
              icon={PhoneCall} 
              iconColor="bg-blue-600" 
              delay={0}
              href="/admin/ase-customers"
            />
            <StatCard 
              title="Answered" 
              value={answeredCalls}
              change={totalCalls > 0 ? `${Math.round((answeredCalls / totalCalls) * 100)}% of total` : 'No calls'}
              changeType="positive"
              icon={CheckCircle} 
              iconColor="bg-green-600" 
              delay={50}
              href="/admin/ase-customers?status=answered"
            />
            <StatCard 
              title="Pending" 
              value={pendingCalls}
              change={pendingCalls > 0 ? 'Requires action' : 'All handled'}
              changeType={pendingCalls > 0 ? 'neutral' : 'positive'}
              icon={Clock} 
              iconColor="bg-orange-500" 
              delay={100}
              href="/admin/ase-customers?status=pending"
            />
            <StatCard 
              title="Not Answered" 
              value={notAnsweredCalls + busyCalls}
              change={`${notAnsweredCalls} unanswered + ${busyCalls} busy`}
              changeType="neutral"
              icon={XCircle} 
              iconColor="bg-red-500" 
              delay={150}
              href="/admin/ase-customers?status=not_answered"
            />
          </div>
        </div>

        {/* Key Metrics — Leads */}
        <div>
          <h2 className="text-sm md:text-lg font-semibold mb-2 md:mb-3 text-foreground flex items-center gap-2">
            <Briefcase className="w-4 h-4 md:w-5 md:h-5" />
            Lead Pipeline
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatCard 
              title="Total Leads" 
              value={leadsTotalCount}
              change={`${conversionRate}% conversion from calls`}
              changeType={conversionRate >= 20 ? 'positive' : conversionRate >= 10 ? 'neutral' : 'negative'}
              icon={Briefcase} 
              iconColor="bg-indigo-600" 
              delay={200}
              href="/admin/ase-leads"
            />
            <StatCard 
              title="New Leads" 
              value={newLeads}
              change={leadsTotalCount > 0 ? `${Math.round((newLeads / leadsTotalCount) * 100)}% of total` : 'No leads'}
              changeType="neutral"
              icon={AlertCircle} 
              iconColor="bg-blue-500" 
              delay={250}
              href="/admin/ase-leads?status=new"
            />
            <StatCard 
              title="Demo Done" 
              value={demoDoneLeads}
              change={leadsTotalCount > 0 ? `${Math.round((demoDoneLeads / leadsTotalCount) * 100)}% of total` : 'No demos'}
              changeType="positive"
              icon={CheckCircle} 
              iconColor="bg-green-500" 
              delay={300}
              href="/admin/ase-leads?status=demo_done"
            />
            <StatCard 
              title="Presentation" 
              value={presentationLeads}
              change={leadsTotalCount > 0 ? `${Math.round((presentationLeads / leadsTotalCount) * 100)}% of total` : 'No presentations'}
              changeType="positive"
              icon={TrendingUp} 
              iconColor="bg-purple-500" 
              delay={350}
              href="/admin/ase-leads?status=presentation"
            />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Lead Status Breakdown */}
          <ASELeadStatusChart 
            leads={leads} 
            totalCount={leadsTotalCount} 
            stats={leadsStats} 
            title="Lead Status Distribution" 
          />

          {/* Call Status Breakdown */}
          <div className="glass-card rounded-2xl p-4 md:p-6 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shrink-0">
                <PhoneCall className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-foreground">Call Status Distribution</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{totalCalls} total calls</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Answered', count: answeredCalls, color: 'bg-green-500' },
                { label: 'Pending', count: pendingCalls, color: 'bg-orange-500' },
                { label: 'Not Answered', count: notAnsweredCalls, color: 'bg-red-500' },
                { label: 'Busy', count: busyCalls, color: 'bg-yellow-500' },
                { label: 'Not Interested', count: notInterestedCalls, color: 'bg-gray-500' },
              ].map(({ label, count, color }) => {
                const pct = totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
                        <span className="text-foreground font-medium text-xs md:text-sm">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-semibold text-sm">{count}</span>
                        <span className="text-muted-foreground text-xs w-9 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${color} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Additional Metrics — Tasks & Conversions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard 
            title="Total Tasks" 
            value={tasks.length}
            change={`${inProgressTasks} in progress`}
            changeType="neutral"
            icon={ListChecks} 
            iconColor="bg-blue-500" 
            delay={400}
            href="/admin/ase-tasks"
          />
          <StatCard 
            title="Pending Tasks" 
            value={pendingTasks}
            change={pendingTasks > 0 ? 'Requires attention' : 'All handled'}
            changeType={pendingTasks > 0 ? 'neutral' : 'positive'}
            icon={Clock} 
            iconColor="bg-orange-500" 
            delay={450}
            href="/admin/ase-tasks?status=pending"
          />
          <StatCard 
            title="Today's Follow-ups" 
            value={todayFollowUps}
            change={overdueCount > 0 ? `${overdueCount} overdue` : 'None overdue'}
            changeType={overdueCount > 0 ? 'negative' : 'positive'}
            icon={CalendarCheck} 
            iconColor="bg-purple-500" 
            delay={500}
            href="/admin/ase-customers?filter=followup"
          />
          <StatCard 
            title="Conversions" 
            value={convertedCalls}
            change={`${conversionRate}% conversion rate`}
            changeType={conversionRate >= 20 ? 'positive' : conversionRate >= 10 ? 'neutral' : 'negative'}
            icon={Target} 
            iconColor="bg-green-600" 
            delay={550}
            href="/admin/ase-customers?filter=converted"
          />
        </div>

        {/* Team Performance */}
        {employees.length > 0 && (
          <div className="glass-card rounded-2xl p-4 md:p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-foreground">Team Performance</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{employees.length} team members · Today</p>
              </div>
            </div>

            {/* Mobile: card list */}
            <div className="block md:hidden space-y-3">
              {employees.slice(0, 5).map((emp, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {emp.name?.charAt(0)?.toUpperCase() ?? 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.calls_today} calls · {emp.answered_today} answered</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      emp.answered_rate >= 70 ? 'bg-green-100 text-green-700' :
                      emp.answered_rate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {Math.round(emp.answered_rate)}%
                    </span>
                    <span className="text-xs font-semibold text-indigo-600">{emp.conversions_this_week}↗</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 font-medium">Name</th>
                    <th className="text-center py-2 font-medium">Calls Today</th>
                    <th className="text-center py-2 font-medium">Answered</th>
                    <th className="text-center py-2 font-medium">Answer Rate</th>
                    <th className="text-center py-2 font-medium">Conversions (Week)</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.slice(0, 5).map((emp, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 text-foreground font-medium">{emp.name}</td>
                      <td className="text-center py-2.5 text-foreground">{emp.calls_today}</td>
                      <td className="text-center py-2.5 text-green-600 font-semibold">{emp.answered_today}</td>
                      <td className="text-center py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          emp.answered_rate >= 70 ? 'bg-green-50 text-green-700' :
                          emp.answered_rate >= 50 ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {Math.round(emp.answered_rate)}%
                        </span>
                      </td>
                      <td className="text-center py-2.5 text-indigo-600 font-semibold">{emp.conversions_this_week}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reminders + Birthday Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <RemindersWidget />
          <BirthdayWidget showUpcoming={true} maxItems={5} />
        </div>
      </div>
    </div>
  );
}
