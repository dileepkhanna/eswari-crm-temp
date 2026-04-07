import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/dashboard/StatCard';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import TaskStatusChart from '@/components/dashboard/TaskStatusChart';
import LeadStatusChart from '@/components/dashboard/LeadStatusChart';
import EmployeeRemindersWidget from '@/components/dashboard/EmployeeRemindersWidget';
import CalendarView from '@/components/dashboard/CalendarView';
import LeaveStatsWidget from '@/components/dashboard/LeaveStatsWidget';
import QuickSettingsWidget from '@/components/staff/QuickSettingsWidget';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useData } from '@/contexts/DataContextDjango';
import { useASELead } from '@/contexts/ASELeadContext';
import { useASECustomers } from '@/contexts/ASECustomerContext';
import { useCapital } from '@/contexts/CapitalCustomerContext';
import { ClipboardList, CheckSquare, CalendarOff, Bell, Target, UserCheck, Briefcase, PhoneCall, DollarSign, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import LeadStatusChip from '@/components/leads/LeadStatusChip';
import TaskStatusChip from '@/components/tasks/TaskStatusChip';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { leads, tasks, announcements, leadsTotalCount } = useData();
  const { leads: aseLeads, loading: aseLeadsLoading, totalCount: aseTotalCount } = useASELead();
  const { customers: aseCustomers } = useASECustomers();
  const { customers: capitalCustomers, loans: capitalLoans } = useCapital();

  const userCompanyCode = user?.company?.code || '';
  const isASE = userCompanyCode === 'ASE_TECH' || userCompanyCode === 'ASE';
  const isCapital = userCompanyCode === 'CAPITAL' || userCompanyCode === 'ESWARI_CAPITAL';

  // Filter data for current user (Eswari Group)
  const myLeads = leads.filter(lead => lead.assignedTo === user?.id || lead.createdBy === user?.id);
  const myTasks = tasks.filter(task => task.assignedTo === user?.id);
  
  // Calculate stats
  const activeTasks = myTasks.filter(t => t.status !== 'completed').length;
  const reminders = myLeads.filter(l => l.status === 'new' && l.followUpDate && new Date(l.followUpDate) <= new Date()).length;
  const pendingLeaves = 0;

  // ASE stats
  const myASELeads = aseLeads;
  const myASECustomers = aseCustomers;
  const pendingASECustomers = myASECustomers.filter(c => c.call_status === 'pending').length;

  if (isCapital) {
    const activeLoans = capitalLoans.filter(l => ['inquiry', 'documents_pending', 'under_review', 'approved'].includes(l.status)).length;
    const pendingCapitalCustomers = capitalCustomers.filter(c => c.call_status === 'pending').length;
    
    return (
      <div className="min-h-screen">
        <TopBar title="Staff Dashboard" subtitle={`Welcome back, ${user?.name || 'User'}!`} />
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <AnnouncementBanner userRole="employee" maxDisplay={2} />
          {user?.manager_name && (
            <div className="glass-card rounded-2xl p-4 md:p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Reporting Manager
              </h3>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {user.manager_name}
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="My Capital Customers" value={capitalCustomers.length}
              change={pendingCapitalCustomers > 0 ? `${pendingCapitalCustomers} pending` : 'All handled'}
              changeType="neutral" icon={DollarSign} iconColor="bg-indigo-500" delay={0} href="/staff/capital-customers" />
            <StatCard title="Capital Loans" value={capitalLoans.length}
              change={activeLoans > 0 ? `${activeLoans} active` : 'No active loans'}
              changeType="neutral" icon={Landmark} iconColor="bg-green-500" delay={50} href="/staff/capital-loans" />
            <StatCard title="Reminders" value={pendingCapitalCustomers}
              change={pendingCapitalCustomers > 0 ? 'Follow-ups pending' : 'No reminders'}
              changeType="neutral" icon={Bell} iconColor="bg-info" delay={100} href="/staff/capital-customers" />
            <StatCard title="Leave Status" value="All Clear"
              change="No pending requests" changeType="neutral" icon={CalendarOff} iconColor="bg-warning" delay={150} href="/staff/leaves" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <LeaveStatsWidget />
            <QuickSettingsWidget />
          </div>
        </div>
      </div>
    );
  }

  if (isASE) {
    return (
      <div className="min-h-screen">
        <TopBar title="Staff Dashboard" subtitle={`Welcome back, ${user?.name || 'User'}!`} />
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <AnnouncementBanner userRole="employee" maxDisplay={2} />
          {user?.manager_name && (
            <div className="glass-card rounded-2xl p-4 md:p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Reporting Manager
              </h3>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {user.manager_name}
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="My ASE Leads" value={aseTotalCount}
              change={aseLeads.filter(l => l.status === 'new').length > 0 ? `${aseLeads.filter(l => l.status === 'new').length} new` : 'No new leads'}
              changeType="neutral" icon={Briefcase} iconColor="bg-violet-500" delay={0} href="/staff/ase-leads" />
            <StatCard title="ASE Customers" value={myASECustomers.length}
              change={pendingASECustomers > 0 ? `${pendingASECustomers} pending` : 'All handled'}
              changeType="neutral" icon={PhoneCall} iconColor="bg-teal-500" delay={50} href="/staff/ase-customers" />
            <StatCard title="Reminders" value={pendingASECustomers}
              change={pendingASECustomers > 0 ? 'Follow-ups pending' : 'No reminders'}
              changeType="neutral" icon={Bell} iconColor="bg-info" delay={100} href="/staff/ase-customers" />
            <StatCard title="Leave Status" value="All Clear"
              change="No pending requests" changeType="neutral" icon={CalendarOff} iconColor="bg-warning" delay={150} href="/staff/leaves" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <LeaveStatsWidget />
            <QuickSettingsWidget />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Staff Dashboard" subtitle={`Welcome back, ${user?.name || 'User'}!`} />
      
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Announcements */}
        <AnnouncementBanner userRole="employee" maxDisplay={2} />
        
        {/* Manager Information */}
        {user?.manager_name && (
          <div className="glass-card rounded-2xl p-4 md:p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Reporting Manager
            </h3>
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              {user.manager_name}
            </span>
          </div>
        )}
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="My Leads"
            value={leadsTotalCount}
            change={myLeads.length > 0 ? `${myLeads.filter(l => l.status === 'converted').length} converted` : "No leads yet"}
            changeType="neutral"
            icon={ClipboardList}
            iconColor="gradient-primary"
            delay={0}
            href="/staff/leads"
          />
          <StatCard
            title="Active Tasks"
            value={activeTasks}
            change={activeTasks > 0 ? "In progress" : "No active tasks"}
            changeType="neutral"
            icon={CheckSquare}
            iconColor="gradient-accent"
            delay={50}
            href="/staff/tasks"
          />
          <StatCard
            title="Reminders"
            value={reminders}
            change={reminders > 0 ? "Follow-ups pending" : "No reminders"}
            changeType="neutral"
            icon={Bell}
            iconColor="bg-info"
            delay={100}
            href="/staff/leads"
          />
          <StatCard
            title="Leave Status"
            value={pendingLeaves > 0 ? `${pendingLeaves} Pending` : 'All Clear'}
            change={pendingLeaves > 0 ? 'Awaiting approval' : 'No pending requests'}
            changeType="neutral"
            icon={CalendarOff}
            iconColor="bg-warning"
            delay={150}
            href="/staff/leaves"
          />
        </div>

        {/* Reminders Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <EmployeeRemindersWidget />
          <LeaveStatsWidget />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <LeadStatusChart leads={myLeads} title="My Leads by Status" />
          <TaskStatusChart tasks={myTasks} title="My Tasks by Status" />
        </div>

        {/* Calendar View */}
        <CalendarView leads={myLeads} tasks={myTasks} title="My Calendar" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Recent Tasks */}
          <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              Recent Tasks
            </h3>
            
            {myTasks.length > 0 ? (
              <div className="space-y-3">
                {myTasks.slice(0, 5).map((task, index) => (
                  <div 
                    key={task.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-semibold">
                      {task.lead?.name?.charAt(0) || 'T'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{task.lead?.name || 'Unknown Lead'}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {task.lead?.requirementType || '-'} • {task.lead?.bhkRequirement || '-'} BHK
                      </p>
                    </div>
                    <TaskStatusChip status={task.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No tasks assigned yet
              </div>
            )}
          </div>

          {/* Recent Leads */}
          <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              My Recent Leads
            </h3>
            
            {myLeads.length > 0 ? (
              <div className="space-y-3">
                {myLeads.slice(0, 5).map((lead, index) => (
                  <div 
                    key={lead.id}
                    className="flex items-center gap-4 p-3 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{lead.name}</p>
                        <LeadStatusChip status={lead.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">{lead.phone}</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground shrink-0">
                      <p className="capitalize">{lead.requirementType}</p>
                      <p className="text-xs">{format(lead.createdAt, 'MMM dd')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No leads created yet
              </div>
            )}
          </div>

          {/* Quick Settings Widget */}
          <QuickSettingsWidget />
        </div>
      </div>
    </div>
  );
}