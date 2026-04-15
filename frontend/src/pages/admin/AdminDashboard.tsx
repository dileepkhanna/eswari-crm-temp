import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/dashboard/StatCard';
import LeadStatusChart from '@/components/dashboard/LeadStatusChart';
import TaskStatusChart from '@/components/dashboard/TaskStatusChart';
import ProjectStatusChart from '@/components/dashboard/ProjectStatusChart';
import ASELeadStatusChart from '@/components/dashboard/ASELeadStatusChart';
import CapitalLeadStatusChart from '@/components/dashboard/CapitalLeadStatusChart';
import RemindersWidget from '@/components/dashboard/RemindersWidget';
import CalendarView from '@/components/dashboard/CalendarView';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import BirthdayWidget from '@/components/birthdays/BirthdayWidget';
import { useData } from '@/contexts/DataContextDjango';
import { useASELead } from '@/contexts/ASELeadContext';
import { useASECustomers } from '@/contexts/ASECustomerContext';
import { apiClient } from '@/lib/api';
import { capitalLeadService, capitalTaskService, capitalLoanService, capitalServiceService } from '@/services/capital.service';
import { logger } from '@/lib/logger';
import { ClipboardList, CheckSquare, Building, CalendarOff, Users, TrendingUp, Briefcase, PhoneCall, DollarSign, FileText, Landmark } from 'lucide-react';

export default function AdminDashboard() {
  const { leads, tasks, projects, leaves, leadsTotalCount } = useData();
  const { leads: aseLeads, totalCount: aseTotalCount, stats: aseStats } = useASELead();
  const { customers: aseCustomers } = useASECustomers();
  const [teamCount, setTeamCount] = useState(0);
  const [capitalLeads, setCapitalLeads] = useState<any[]>([]);
  const [capitalLeadsCount, setCapitalLeadsCount] = useState(0);
  const [capitalTasks, setCapitalTasks] = useState<any[]>([]);
  const [capitalLoans, setCapitalLoans] = useState<any[]>([]);
  const [capitalServices, setCapitalServices] = useState<any[]>([]);
  const [hotLeadsCount, setHotLeadsCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.getUsers();
        const usersData = Array.isArray(response) ? response : (response as any).results || [];
        setTeamCount(usersData.filter((u: any) => u.role === 'manager' || u.role === 'employee').length);
      } catch (error) {
        logger.error('Error fetching users:', error);
        setTeamCount(0);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchAllPages = async (service: { list: (p?: any) => Promise<any> }) => {
      const all: any[] = [];
      let page = 1;
      while (true) {
        const res = await service.list({ page, page_size: 200 });
        const results = Array.isArray(res) ? res : (res as any).results || [];
        all.push(...results);
        if (Array.isArray(res) || !(res as any).next) break;
        page++;
      }
      return all;
    };

    const fetchCapitalData = async () => {
      try {
        const [leadsRes, tasksRes, loansRes, servicesRes] = await Promise.allSettled([
          fetchAllPages(capitalLeadService),
          fetchAllPages(capitalTaskService),
          fetchAllPages(capitalLoanService),
          fetchAllPages(capitalServiceService),
        ]);
        const leadsData   = leadsRes.status    === 'fulfilled' ? leadsRes.value    : [];
        const tasksData   = tasksRes.status    === 'fulfilled' ? tasksRes.value    : [];
        const loansData   = loansRes.status    === 'fulfilled' ? loansRes.value    : [];
        const servicesData = servicesRes.status === 'fulfilled' ? servicesRes.value : [];
        setCapitalLeads(leadsData);
        setCapitalLeadsCount(leadsData.length);
        setCapitalTasks(tasksData);
        setCapitalLoans(loansData);
        setCapitalServices(servicesData);
      } catch (error) {
        logger.error('Error fetching capital data:', error);
      }
    };
    fetchCapitalData();
  }, []);

  useEffect(() => {
    const fetchHotLeadsCount = async () => {
      try {
        const response = await apiClient.getLeads({ status: 'hot', page: 1, page_size: 1 });
        const count = response.count || 0;
        setHotLeadsCount(count);
      } catch (error) {
        logger.error('Error fetching hot leads count:', error);
        setHotLeadsCount(0);
      }
    };
    fetchHotLeadsCount();
  }, []);

  const activeTasks = tasks.filter(t => t.status !== 'completed').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const conversionRate = leadsTotalCount > 0
    ? Math.round((tasks.filter(t => t.status === 'completed').length / leadsTotalCount) * 100)
    : 0;

  return (
    <div className="min-h-screen">
      <TopBar title="Admin Dashboard" subtitle="Welcome back! Here's your overview." />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <AnnouncementBanner userRole="admin" maxDisplay={2} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <StatCard title="Eswari Group Leads" value={leadsTotalCount}
            change={hotLeadsCount > 0 ? `${hotLeadsCount} hot leads` : 'No hot leads'}
            changeType="neutral" icon={ClipboardList} iconColor="gradient-primary" delay={0} href="/admin/leads" />
          <StatCard title="Eswari Group Tasks" value={tasks.length}
            change={activeTasks > 0 ? `${activeTasks} in progress` : 'No active tasks'}
            changeType="neutral" icon={CheckSquare} iconColor="bg-info" delay={50} href="/admin/tasks" />
          <StatCard title="Total Projects" value={projects.length}
            change="All projects"
            changeType="neutral" icon={Building} iconColor="gradient-accent" delay={100} href="/admin/projects" />
          <StatCard title="Pending Leaves" value={pendingLeaves}
            change={pendingLeaves > 0 ? 'Requires attention' : 'No pending'}
            changeType={pendingLeaves > 0 ? 'negative' : 'neutral'} icon={CalendarOff} iconColor="bg-warning" delay={150} href="/admin/leaves" />
          <StatCard title="Team Members" value={teamCount}
            change="Managers + Staff" changeType="neutral" icon={Users} iconColor="bg-primary" delay={200} href="/admin/users" />
          <StatCard title="Conversion Rate" value={`${conversionRate}%`}
            change={leadsTotalCount > 0 ? 'Based on tasks' : 'No data'}
            changeType="neutral" icon={TrendingUp} iconColor="gradient-success" delay={250} href="/admin/activity" />
          <StatCard title="ASE Leads" value={aseTotalCount}
            change={(aseStats?.by_status?.new?.count ?? 0) > 0 ? `${aseStats?.by_status?.new?.count} new` : 'No new leads'}
            changeType="neutral" icon={Briefcase} iconColor="bg-violet-500" delay={300} href="/admin/ase-leads" />
          <StatCard title="ASE Calls" value={aseCustomers.length}
            change={aseCustomers.filter(c => c.call_status === 'pending').length > 0 ? `${aseCustomers.filter(c => c.call_status === 'pending').length} pending` : 'All handled'}
            changeType="neutral" icon={PhoneCall} iconColor="bg-teal-500" delay={350} href="/admin/ase-customers" />
          <StatCard title="Capital Tasks" value={capitalTasks.length}
            change={capitalTasks.filter((t: any) => t.status === 'in_progress').length > 0 ? `${capitalTasks.filter((t: any) => t.status === 'in_progress').length} in progress` : 'No active tasks'}
            changeType="neutral" icon={DollarSign} iconColor="bg-indigo-500" delay={400} href="/admin/capital-tasks" />
          <StatCard title="Capital Loans" value={capitalLoans.length}
            change={capitalLoans.filter((l: any) => l.status === 'inquiry').length > 0 ? `${capitalLoans.filter((l: any) => l.status === 'inquiry').length} inquiries` : 'No new inquiries'}
            changeType="neutral" icon={Landmark} iconColor="bg-indigo-400" delay={420} href="/admin/capital-loans" />
          <StatCard title="Capital Services" value={capitalServices.length}
            change={capitalServices.filter((s: any) => s.status === 'pending').length > 0 ? `${capitalServices.filter((s: any) => s.status === 'pending').length} pending` : 'No pending'}
            changeType="neutral" icon={FileText} iconColor="bg-indigo-300" delay={440} href="/admin/capital-services" />
        </div>

        {/* Charts Row — Eswari Group */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <LeadStatusChart leads={leads} title="Eswari Group — Leads by Status" />
          <TaskStatusChart tasks={tasks} />
          <ProjectStatusChart projects={projects} />
        </div>

        {/* ASE Technologies & Eswari Capital — Leads Pie Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <ASELeadStatusChart leads={aseLeads} totalCount={aseTotalCount} stats={aseStats} title="ASE Technologies — Leads by Status" />
          {/* Eswari Capital Overview — Tasks, Loans, Services */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Eswari Capital — Overview</h3>
                <p className="text-xs text-muted-foreground">{capitalTasks.length + capitalLoans.length + capitalServices.length} total records</p>
              </div>
            </div>

            {/* Tasks */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium">Tasks ({capitalTasks.length})</span>
              </div>
              <div className="space-y-1">
                {[
                  { label: 'In Progress', key: 'in_progress', color: 'bg-blue-500' },
                  { label: 'Follow Up', key: 'follow_up', color: 'bg-yellow-500' },
                  { label: 'Processing', key: 'processing', color: 'bg-purple-500' },
                  { label: 'Completed', key: 'completed', color: 'bg-green-500' },
                  { label: 'Rejected', key: 'rejected', color: 'bg-red-500' },
                ].map(({ label, key, color }) => {
                  const count = capitalTasks.filter((t: any) => t.status === key).length;
                  if (count === 0) return null;
                  const pct = capitalTasks.length > 0 ? Math.round((count / capitalTasks.length) * 100) : 0;
                  return (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                      <span className="flex-1 text-muted-foreground">{label}</span>
                      <span className="font-medium">{count}</span>
                      <span className="text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
                {capitalTasks.length === 0 && <p className="text-xs text-muted-foreground">No tasks</p>}
              </div>
            </div>

            {/* Loans */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Landmark className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium">Loans ({capitalLoans.length})</span>
              </div>
              <div className="space-y-1">
                {[
                  { label: 'Inquiry', key: 'inquiry', color: 'bg-blue-400' },
                  { label: 'Under Review', key: 'under_review', color: 'bg-yellow-500' },
                  { label: 'Approved', key: 'approved', color: 'bg-green-500' },
                  { label: 'Disbursed', key: 'disbursed', color: 'bg-emerald-600' },
                  { label: 'Rejected', key: 'rejected', color: 'bg-red-500' },
                ].map(({ label, key, color }) => {
                  const count = capitalLoans.filter((l: any) => l.status === key).length;
                  if (count === 0) return null;
                  const pct = capitalLoans.length > 0 ? Math.round((count / capitalLoans.length) * 100) : 0;
                  return (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                      <span className="flex-1 text-muted-foreground">{label}</span>
                      <span className="font-medium">{count}</span>
                      <span className="text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
                {capitalLoans.length === 0 && <p className="text-xs text-muted-foreground">No loans</p>}
              </div>
            </div>

            {/* Services */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium">Services ({capitalServices.length})</span>
              </div>
              <div className="space-y-1">
                {[
                  { label: 'Pending', key: 'pending', color: 'bg-yellow-500' },
                  { label: 'In Progress', key: 'in_progress', color: 'bg-blue-500' },
                  { label: 'Completed', key: 'completed', color: 'bg-green-500' },
                  { label: 'Rejected', key: 'rejected', color: 'bg-red-500' },
                ].map(({ label, key, color }) => {
                  const count = capitalServices.filter((s: any) => s.status === key).length;
                  if (count === 0) return null;
                  const pct = capitalServices.length > 0 ? Math.round((count / capitalServices.length) * 100) : 0;
                  return (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                      <span className="flex-1 text-muted-foreground">{label}</span>
                      <span className="font-medium">{count}</span>
                      <span className="text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
                {capitalServices.length === 0 && <p className="text-xs text-muted-foreground">No services</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Reminders + Birthday Widget */}        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <RemindersWidget />
          <BirthdayWidget showUpcoming={true} maxItems={5} />
        </div>

        {/* Calendar */}
        <CalendarView leads={leads} tasks={tasks} title="All Events Calendar" />
      </div>
    </div>
  );
}
