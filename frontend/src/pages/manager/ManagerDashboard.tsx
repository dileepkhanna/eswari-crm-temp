import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/dashboard/StatCard';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import TaskStatusChart from '@/components/dashboard/TaskStatusChart';
import LeadStatusChart from '@/components/dashboard/LeadStatusChart';
import RemindersWidget from '@/components/dashboard/RemindersWidget';
import CalendarView from '@/components/dashboard/CalendarView';
import { useData } from '@/contexts/DataContextDjango';
import { useAuth } from '@/contexts/AuthContextDjango';
// import { supabase } from '@/integrations/supabase/client'; // Removed - using Django backend
import { Building, ClipboardList, CheckSquare, CalendarOff, BarChart3, Activity, Users } from 'lucide-react';

export default function ManagerDashboard() {
  const { leads, tasks, projects, announcements } = useData();
  const { user } = useAuth();
  const [pendingLeaves, setPendingLeaves] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // TODO: Implement leaves API in Django backend
        // For now, set mock data
        setPendingLeaves(0);
      } catch (error) {
        console.error('Manager Dashboard - Error fetching data:', error);
        setPendingLeaves(0);
      }
    };

    fetchData();
  }, []);

  const activeTasks = tasks.filter(t => t.status !== 'completed').length;
  const employeeNames = user?.employees_names || [];
  const employeeCount = user?.employees_count || 0;

  return (
    <div className="min-h-screen">
      <TopBar title="Manager Dashboard" subtitle="Monitor your team's performance" />
      
      <div className="p-6 space-y-6">
        {/* Announcements */}
        <AnnouncementBanner userRole="manager" />
        
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
