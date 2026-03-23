import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/dashboard/StatCard';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import TaskStatusChart from '@/components/dashboard/TaskStatusChart';
import LeadStatusChart from '@/components/dashboard/LeadStatusChart';
import RemindersWidget from '@/components/dashboard/RemindersWidget';
import CalendarView from '@/components/dashboard/CalendarView';
import TeamPerformanceDashboard from '@/components/ase-customers/TeamPerformanceDashboard';
import { useData } from '@/contexts/DataContextDjango';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useCompany } from '@/contexts/CompanyContext';
import { useASELead } from '@/contexts/ASELeadContext';
import { useASECustomers } from '@/contexts/ASECustomerContext';
import { logger } from '@/lib/logger';
import { Building, ClipboardList, CheckSquare, CalendarOff, BarChart3, Activity, Users, Briefcase, PhoneCall } from 'lucide-react';

export default function ManagerDashboard() {
  const { leads, tasks, projects, announcements } = useData();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { leads: aseLeads } = useASELead();
  const { customers: aseCustomers } = useASECustomers();
  const [pendingLeaves, setPendingLeaves] = useState(0);

  const userCompanyCode = user?.company?.code || '';
  const isASE = userCompanyCode === 'ASE_TECH' || userCompanyCode === 'ASE';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // TODO: Implement leaves API in Django backend
        // For now, set mock data
        setPendingLeaves(0);
      } catch (error) {
        logger.error('Manager Dashboard - Error fetching data:', error);
        setPendingLeaves(0);
      }
    };

    fetchData();
  }, []);

  const activeTasks = tasks.filter(t => t.status !== 'completed').length;
  const employeeNames = user?.employees_names || [];
  const employeeCount = user?.employees_count || 0;

  if (isASE) {
    return (
      <div className="min-h-screen">
        <TopBar title="Manager Dashboard" subtitle="Monitor your team's performance" />
        <div className="p-6 space-y-6">
          <AnnouncementBanner userRole="manager" maxDisplay={2} />
          {employeeCount > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                My Team ({employeeCount} {employeeCount === 1 ? 'Employee' : 'Employees'})
              </h3>
              <div className="flex flex-wrap gap-2">
                {employeeNames.map((name, index) => (
                  <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">{name}</span>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="ASE Leads" value={aseLeads.length}
              change={aseLeads.filter(l => l.status === 'new').length > 0 ? `${aseLeads.filter(l => l.status === 'new').length} new` : 'No new leads'}
              changeType="neutral" icon={Briefcase} iconColor="bg-violet-500" delay={0} href="/manager/ase-leads" />
            <StatCard title="ASE Customers" value={aseCustomers.length}
              change={aseCustomers.filter(c => c.call_status === 'pending').length > 0 ? `${aseCustomers.filter(c => c.call_status === 'pending').length} pending` : 'All handled'}
              changeType="neutral" icon={PhoneCall} iconColor="bg-teal-500" delay={50} href="/manager/ase-customers" />
            <StatCard title="Reports" value="View" change="Performance insights" changeType="neutral"
              icon={BarChart3} iconColor="bg-success" delay={100} href="/manager/reports" />
            <StatCard title="Activity" value="Monitor" change="Recent actions" changeType="neutral"
              icon={Activity} iconColor="bg-purple-500" delay={150} href="/manager/activity" />
          </div>
          <TeamPerformanceDashboard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Manager Dashboard" subtitle="Monitor your team's performance" />
      
      <div className="p-6 space-y-6">
        {/* Announcements */}
        <AnnouncementBanner userRole="manager" maxDisplay={2} />
        
        {/* Assigned Employees Section */}
        {employeeCount > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              My Team ({employeeCount} {employeeCount === 1 ? 'Employee' : 'Employees'})
            </h3>
            <div className="flex flex-wrap gap-2">
              {employeeNames.map((name, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Projects"
            value={projects.length}
            change={`${projects.filter(p => p.status === 'active').length} active`}
            changeType="neutral"
            icon={Building}
            iconColor="gradient-primary"
            delay={0}
            href="/manager/projects"
          />
          <StatCard
            title="Total Leads"
            value={leads.length}
            change="Created by team"
            changeType="neutral"
            icon={ClipboardList}
            iconColor="bg-info"
            delay={50}
            href="/manager/leads"
          />
          <StatCard
            title="Active Tasks"
            value={activeTasks}
            change="In progress"
            changeType="neutral"
            icon={CheckSquare}
            iconColor="gradient-accent"
            delay={100}
            href="/manager/tasks"
          />
          <StatCard
            title="Pending Leaves"
            value={pendingLeaves}
            change="Awaiting approval"
            changeType={pendingLeaves > 0 ? 'negative' : 'neutral'}
            icon={CalendarOff}
            iconColor="bg-warning"
            delay={150}
            href="/manager/leaves"
          />
          <StatCard
            title="Employee Reports"
            value="View"
            change="Performance insights"
            changeType="neutral"
            icon={BarChart3}
            iconColor="bg-success"
            delay={200}
            href="/manager/reports"
          />
          <StatCard
            title="Employee Activity"
            value="Monitor"
            change="Recent actions"
            changeType="neutral"
            icon={Activity}
            iconColor="bg-purple-500"
            delay={250}
            href="/manager/activity"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads by Status Chart - Interactive */}
          <LeadStatusChart leads={leads} title="Team Leads by Status" />

          {/* Tasks by Status Chart - Interactive */}
          <TaskStatusChart tasks={tasks} title="Team Tasks by Status" />
        </div>

        {/* Team Performance Dashboard */}
        <TeamPerformanceDashboard />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reminders Widget */}
          <RemindersWidget />

          {/* Calendar View */}
          <CalendarView leads={leads} tasks={tasks} title="Team Calendar" />
        </div>
      </div>
    </div>
  );
}
