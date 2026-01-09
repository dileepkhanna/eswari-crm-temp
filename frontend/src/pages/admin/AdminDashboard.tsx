import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/dashboard/StatCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import TaskStatusChart from '@/components/dashboard/TaskStatusChart';
import LeadStatusChart from '@/components/dashboard/LeadStatusChart';
import ProjectStatusChart from '@/components/dashboard/ProjectStatusChart';
import RemindersWidget from '@/components/dashboard/RemindersWidget';
import CalendarView from '@/components/dashboard/CalendarView';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import { useData } from '@/contexts/DataContextDjango';
import { useAuth } from '@/contexts/AuthContextDjango';
// import { supabase } from '@/integrations/supabase/client'; // Removed - using Django backend
import { ActivityLog } from '@/types';
import { ClipboardList, CheckSquare, Building, CalendarOff, Users, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const { leads, tasks, projects, announcements } = useData();
  const { user } = useAuth();
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      // TODO: Implement leaves and activity APIs in Django backend
      // Fetch pending leaves count
      // const { data: leavesData } = await supabase
      //   .from('leaves')
      //   .select('id')
      //   .eq('status', 'pending');
      
      setPendingLeaves(0); // Placeholder

      // Fetch team members count (staff + managers)
      // const { data: profilesData } = await supabase
      //   .from('profiles')
      //   .select('id');
      
      setTeamCount(3); // Placeholder - we have 3 test users

      // Fetch recent activities - exclude current admin user
      // const { data: activityData } = await supabase
      //   .from('activity_logs')
      //   .select('*')
      //   .order('created_at', { ascending: false })
      //   .limit(20);

      // Placeholder activities
      const activities: ActivityLog[] = [
        // Mock data for now
      ];
      setRecentActivities(activities);
    };

    fetchStats();
  }, []);

  const activeTasks = tasks.filter(t => t.status !== 'completed').length;
  const conversionRate = leads.length > 0 
    ? Math.round((tasks.filter(t => t.status === 'completed').length / leads.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen">
      <TopBar title="Admin Dashboard" subtitle="Welcome back! Here's your overview." />
      
      <div className="p-6 space-y-6">
        {/* Announcements */}
        <AnnouncementBanner userRole="admin" />
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Total Leads"
            value={leads.length}
            change={leads.length > 0 ? `${leads.length} total` : "No leads yet"}
            changeType="neutral"
            icon={ClipboardList}
            iconColor="gradient-primary"
            delay={0}
            href="/admin/leads"
          />
          <StatCard
            title="Active Tasks"
            value={activeTasks}
            change={activeTasks > 0 ? "In progress" : "No active tasks"}
            changeType="neutral"
            icon={CheckSquare}
            iconColor="bg-info"
            delay={50}
            href="/admin/tasks"
          />
          <StatCard
            title="Projects"
            value={projects.length}
            change={`${projects.filter(p => p.status === 'active').length} active`}
            changeType="neutral"
            icon={Building}
            iconColor="gradient-accent"
            delay={100}
            href="/admin/projects"
          />
          <StatCard
            title="Pending Leaves"
            value={pendingLeaves}
            change={pendingLeaves > 0 ? "Requires attention" : "No pending"}
            changeType={pendingLeaves > 0 ? 'negative' : 'neutral'}
            icon={CalendarOff}
            iconColor="bg-warning"
            delay={150}
            href="/admin/leaves"
          />
          <StatCard
            title="Team Members"
            value={teamCount}
            change="Managers + Staff"
            changeType="neutral"
            icon={Users}
            iconColor="bg-primary"
            delay={200}
            href="/admin/users"
          />
          <StatCard
            title="Conversion Rate"
            value={`${conversionRate}%`}
            change={leads.length > 0 ? "Based on completed tasks" : "No data"}
            changeType="neutral"
            icon={TrendingUp}
            iconColor="gradient-success"
            delay={250}
            href="/admin/activity"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leads by Status Chart - Interactive */}
          <LeadStatusChart leads={leads} />

          {/* Tasks by Status Chart - Interactive */}
          <TaskStatusChart tasks={tasks} />

          {/* Projects by Status Chart - Interactive */}
          <ProjectStatusChart projects={projects} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reminders Widget */}
          <RemindersWidget leads={leads} tasks={tasks} />

          {/* Activity Feed */}
          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <ActivityFeed activities={recentActivities} />
          </div>
        </div>

        {/* Calendar View */}
        <CalendarView leads={leads} tasks={tasks} title="All Events Calendar" />
      </div>
    </div>
  );
}
