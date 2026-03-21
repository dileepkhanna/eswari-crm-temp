import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/dashboard/StatCard';
import LeadStatusChart from '@/components/dashboard/LeadStatusChart';
import TaskStatusChart from '@/components/dashboard/TaskStatusChart';
import ProjectStatusChart from '@/components/dashboard/ProjectStatusChart';
import ASELeadStatusChart from '@/components/dashboard/ASELeadStatusChart';
import RemindersWidget from '@/components/dashboard/RemindersWidget';
import CalendarView from '@/components/dashboard/CalendarView';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import BirthdayWidget from '@/components/birthdays/BirthdayWidget';
import { useData } from '@/contexts/DataContextDjango';
import { useASELead } from '@/contexts/ASELeadContext';
import { useASECustomers } from '@/contexts/ASECustomerContext';
import { apiClient } from '@/lib/api';
import { logger } from '@/lib/logger';
import { ActivityLog } from '@/types';
import { ASE_LEAD_STATUS_OPTIONS, ASE_LEAD_PRIORITY_OPTIONS } from '@/types/ase-customer';
import { ClipboardList, CheckSquare, Building, CalendarOff, Users, TrendingUp, Briefcase, PhoneCall } from 'lucide-react';

const LEAD_STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-purple-100 text-purple-700',
  qualified: 'bg-cyan-100 text-cyan-700',
  proposal_sent: 'bg-yellow-100 text-yellow-700',
  negotiating: 'bg-orange-100 text-orange-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  on_hold: 'bg-gray-100 text-gray-600',
  nurturing: 'bg-pink-100 text-pink-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const CALL_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  answered: 'bg-green-100 text-green-700',
  not_answered: 'bg-red-100 text-red-700',
  busy: 'bg-orange-100 text-orange-700',
  not_interested: 'bg-gray-100 text-gray-500',
  custom: 'bg-purple-100 text-purple-700',
};

export default function AdminDashboard() {
  const { leads, tasks, projects, leaves } = useData();
  const { leads: aseLeads, loading: aseLeadsLoading } = useASELead();
  const { customers: aseCustomers, loading: aseCustomersLoading } = useASECustomers();
  const [teamCount, setTeamCount] = useState(0);

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

  const activeTasks = tasks.filter(t => t.status !== 'completed').length;
  const pendingLeads = leads.filter(l => l.status !== 'not_interested').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const conversionRate = leads.length > 0
    ? Math.round((tasks.filter(t => t.status === 'completed').length / leads.length) * 100)
    : 0;

  return (
    <div className="min-h-screen">
      <TopBar title="Admin Dashboard" subtitle="Welcome back! Here's your overview." />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <AnnouncementBanner userRole="admin" maxDisplay={2} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <StatCard title="Total Leads" value={leads.length}
            change={leads.length > 0 ? `${pendingLeads} active` : 'No leads yet'}
            changeType="neutral" icon={ClipboardList} iconColor="gradient-primary" delay={0} href="/admin/leads" />
          <StatCard title="Active Tasks" value={activeTasks}
            change={activeTasks > 0 ? 'In progress' : 'No active tasks'}
            changeType="neutral" icon={CheckSquare} iconColor="bg-info" delay={50} href="/admin/tasks" />
          <StatCard title="Projects" value={projects.length}
            change={`${projects.filter(p => p.status === 'ready_to_go').length} ready`}
            changeType="neutral" icon={Building} iconColor="gradient-accent" delay={100} href="/admin/projects" />
          <StatCard title="Pending Leaves" value={pendingLeaves}
            change={pendingLeaves > 0 ? 'Requires attention' : 'No pending'}
            changeType={pendingLeaves > 0 ? 'negative' : 'neutral'} icon={CalendarOff} iconColor="bg-warning" delay={150} href="/admin/leaves" />
          <StatCard title="Team Members" value={teamCount}
            change="Managers + Staff" changeType="neutral" icon={Users} iconColor="bg-primary" delay={200} href="/admin/users" />
          <StatCard title="Conversion Rate" value={`${conversionRate}%`}
            change={leads.length > 0 ? 'Based on tasks' : 'No data'}
            changeType="neutral" icon={TrendingUp} iconColor="gradient-success" delay={250} href="/admin/activity" />
          <StatCard title="ASE Leads" value={aseLeads.length}
            change={aseLeads.filter(l => l.status === 'new').length > 0 ? `${aseLeads.filter(l => l.status === 'new').length} new` : 'No new leads'}
            changeType="neutral" icon={Briefcase} iconColor="bg-violet-500" delay={300} href="/admin/ase-leads" />
          <StatCard title="ASE Customers" value={aseCustomers.length}
            change={aseCustomers.filter(c => c.call_status === 'pending').length > 0 ? `${aseCustomers.filter(c => c.call_status === 'pending').length} pending` : 'All handled'}
            changeType="neutral" icon={PhoneCall} iconColor="bg-teal-500" delay={350} href="/admin/ase-customers" />
        </div>

        {/* Charts Row — Eswari Group */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <LeadStatusChart leads={leads} title="Eswari Group — Leads by Status" />
          <TaskStatusChart tasks={tasks} />
          <ProjectStatusChart projects={projects} />
        </div>

        {/* ASE Technologies Leads Pie Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <ASELeadStatusChart leads={aseLeads} title="ASE Technologies — Leads by Status" />
        </div>

        {/* Reminders + Birthday Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <RemindersWidget />
          <BirthdayWidget showUpcoming={true} maxItems={5} />
        </div>

        {/* Calendar */}
        <CalendarView leads={leads} tasks={tasks} title="All Events Calendar" />

        {/* ASE Technologies — Leads & Customers tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

          {/* ASE Leads table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-violet-500" />
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">ASE Technologies — Leads</h2>
                <span className="text-xs bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">{aseLeads.length}</span>
              </div>
              <a href="/admin/ase-leads" className="text-xs text-violet-600 hover:underline">View all</a>
            </div>
            {aseLeadsLoading ? (
              <div className="p-6 text-center text-sm text-gray-400">Loading...</div>
            ) : aseLeads.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No ASE leads found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {aseLeads.slice(0, 8).map(lead => {
                      const statusLabel = ASE_LEAD_STATUS_OPTIONS.find(s => s.value === lead.status)?.label ?? lead.status;
                      const priorityLabel = ASE_LEAD_PRIORITY_OPTIONS.find(p => p.value === lead.priority)?.label ?? lead.priority;
                      return (
                        <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[120px]">{lead.company_name}</div>
                            <div className="text-xs text-gray-400 capitalize">{lead.industry?.replace(/_/g, ' ')}</div>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 truncate max-w-[100px]">{lead.contact_person}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[lead.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                              {priorityLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {aseLeads.length > 8 && (
                  <div className="px-4 py-2.5 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700">
                    Showing 8 of {aseLeads.length}. <a href="/admin/ase-leads" className="text-violet-600 hover:underline">View all</a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ASE Customers table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-teal-500" />
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">ASE Technologies — Customers</h2>
                <span className="text-xs bg-teal-100 text-teal-700 rounded-full px-2 py-0.5">{aseCustomers.length}</span>
              </div>
              <a href="/admin/ase-customers" className="text-xs text-teal-600 hover:underline">View all</a>
            </div>
            {aseCustomersLoading ? (
              <div className="p-6 text-center text-sm text-gray-400">Loading...</div>
            ) : aseCustomers.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No ASE customers found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Call Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {aseCustomers.slice(0, 8).map(customer => (
                      <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[120px]">
                            {customer.company_name_display || customer.company_name || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 truncate max-w-[100px]">{customer.name || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{customer.phone}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CALL_STATUS_COLORS[customer.call_status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {customer.call_status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {aseCustomers.length > 8 && (
                  <div className="px-4 py-2.5 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700">
                    Showing 8 of {aseCustomers.length}. <a href="/admin/ase-customers" className="text-teal-600 hover:underline">View all</a>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
