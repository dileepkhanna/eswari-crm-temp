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
import { capitalLeadService } from '@/services/capital.service';
import { logger } from '@/lib/logger';
import { ClipboardList, CheckSquare, Building, CalendarOff, Users, TrendingUp, Briefcase, PhoneCall, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const { leads, tasks, projects, leaves, leadsTotalCount } = useData();
  const { leads: aseLeads, totalCount: aseTotalCount, stats: aseStats } = useASELead();
  const { customers: aseCustomers } = useASECustomers();
  const [teamCount, setTeamCount] = useState(0);
  const [capitalLeads, setCapitalLeads] = useState<any[]>([]);
  const [capitalLeadsCount, setCapitalLeadsCount] = useState(0);
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
    const fetchCapitalLeads = async () => {
      try {
        const response = await capitalLeadService.list();
        const leadsData = Array.isArray(response) ? response : (response as any).results || [];
        setCapitalLeads(leadsData);
        setCapitalLeadsCount(leadsData.length);
      } catch (error) {
        logger.error('Error fetching capital leads:', error);
        setCapitalLeads([]);
        setCapitalLeadsCount(0);
      }
    };
    fetchCapitalLeads();
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
          <StatCard title="Capital Leads" value={capitalLeadsCount}
            change={capitalLeads.filter(l => l.status === 'new').length > 0 ? `${capitalLeads.filter(l => l.status === 'new').length} new` : 'No new leads'}
            changeType="neutral" icon={DollarSign} iconColor="bg-indigo-500" delay={400} href="/admin/capital-leads" />
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
          <CapitalLeadStatusChart leads={capitalLeads} totalCount={capitalLeadsCount} title="Eswari Capital — Leads by Status" />
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
