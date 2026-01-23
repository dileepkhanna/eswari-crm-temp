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
import { apiClient } from '@/lib/api';
// import { supabase } from '@/integrations/supabase/client'; // Removed - using Django backend
import { ActivityLog } from '@/types';
import { ClipboardList, CheckSquare, Building, CalendarOff, Users, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const { leads, tasks, projects, announcements, leaves } = useData();
  const { user } = useAuth();
  const [teamCount, setTeamCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch team members count (staff + managers)
        const response = await apiClient.getUsers();
        
        // Handle paginated response from Django REST framework
        const usersData = Array.isArray(response) ? response : (response as any).results || [];
        
        // Filter out admin users to get only team members (managers + employees)
        // Note: Backend uses 'employee' role, not 'staff'
        const teamMembers = usersData.filter((user: any) => 
          user.role === 'manager' || user.role === 'employee'
        );
        
        setTeamCount(teamMembers.length);
      } catch (error) {
        console.error('Error fetching users:', error);
        setTeamCount(0); // Set to 0 if there's an error
      }

      // TODO: Implement activity logs API
      const activities: ActivityLog[] = [];
      setRecentActivities(activities);
    };

    fetchStats();
  }, []);

  const activeTasks = tasks.filter(t => t.status !== 'completed').length;
  const pendingLeads = leads.filter(l => l.status !== 'not_interested').length; // Hot, warm, cold leads need follow-up
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length; // Get real pending leaves count
  const conversionRate = leads.length > 0 
    ? Math.round((tasks.filter(t => t.status === 'completed').length / leads.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen">
      <TopBar title="Admin Dashboard" subtitle="Welcome back! Here's your overview." />
      
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Announcements */}
        <AnnouncementBanner userRole="admin" />
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Leads by Status Chart - Interactive */}
          <LeadStatusChart leads={leads} />

          {/* Tasks by Status Chart - Interactive */}
          <TaskStatusChart tasks={tasks} />

          {/* Projects by Status Chart - Interactive */}
          <ProjectStatusChart projects={projects} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Reminders Widget */}
          <RemindersWidget />

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
