import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/dashboard/StatCard';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import TaskStatusChart from '@/components/dashboard/TaskStatusChart';
import LeadStatusChart from '@/components/dashboard/LeadStatusChart';
import RemindersWidget from '@/components/dashboard/RemindersWidget';
import CalendarView from '@/components/dashboard/CalendarView';
import { useData } from '@/contexts/DataContextDjango';
// import { supabase } from '@/integrations/supabase/client'; // Removed - using Django backend
import { Building, ClipboardList, CheckSquare, CalendarOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface StaffMember {
  id: string;
  name: string;
  email: string | null;
}

export default function ManagerDashboard() {
  const { leads, tasks, projects, announcements } = useData();
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch pending leaves for staff
      const { data: leavesData } = await supabase
        .from('leaves')
        .select('id')
        .eq('status', 'pending')
        .eq('user_role', 'staff');
      
      setPendingLeaves(leavesData?.length || 0);

      // TODO: Implement staff members API in Django backend
      // const { data: profilesData } = await supabase
      //   .from('profiles')
      //   .select('id, name, email');
      
      // if (profilesData) {
      //   // Filter for staff members (non-admin, non-manager)
      //   const staffList: StaffMember[] = [];
      //   for (const profile of profilesData) {
      //     const { data: roleData } = await supabase.rpc('get_user_role', {
      //       _user_id: profile.id
      //     });
      //     if (roleData === 'staff') {
      //       staffList.push(profile);
      //     }
      //   }
      //   setStaffMembers(staffList);
      // }
      
      // Mock data for now
      setStaffMembers([]);
    };

    fetchData();
  }, []);

  const activeTasks = tasks.filter(t => t.status !== 'completed').length;

  const staffPerformance = staffMembers.map(staff => ({
    name: staff.name.split(' ')[0],
    leads: leads.filter(l => l.createdBy === staff.id).length,
    tasks: tasks.filter(t => t.assignedTo === staff.id).length,
  }));

  return (
    <div className="min-h-screen">
      <TopBar title="Manager Dashboard" subtitle="Monitor your team's performance" />
      
      <div className="p-6 space-y-6">
        {/* Announcements */}
        <AnnouncementBanner userRole="manager" />
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Staff Performance Chart */}
          <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Staff Performance</h3>
            <div className="h-72">
              {staffPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffPerformance}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="leads" fill="hsl(215, 80%, 35%)" name="Leads" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tasks" fill="hsl(38, 95%, 55%)" name="Tasks" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No staff data available
                </div>
              )}
            </div>
          </div>

          {/* Leads by Status Chart - Interactive */}
          <LeadStatusChart leads={leads} title="Team Leads by Status" />

          {/* Tasks by Status Chart - Interactive */}
          <TaskStatusChart tasks={tasks} title="Team Tasks by Status" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reminders Widget */}
          <RemindersWidget leads={leads} tasks={tasks} />

          {/* Team Overview */}
          <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Team Overview</h3>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {staffMembers.length > 0 ? staffMembers.map((staff, index) => {
                const staffLeads = leads.filter(l => l.createdBy === staff.id).length;
                const staffTasks = tasks.filter(t => t.assignedTo === staff.id).length;
                
                return (
                  <div 
                    key={staff.id} 
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-semibold">
                      {staff.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{staff.name}</p>
                      <p className="text-sm text-muted-foreground">{staff.email || 'No email'}</p>
                    </div>
                    <div className="flex gap-6 text-center">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{staffLeads}</p>
                        <p className="text-xs text-muted-foreground">Leads</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{staffTasks}</p>
                        <p className="text-xs text-muted-foreground">Tasks</p>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-muted-foreground">
                  No staff members found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <CalendarView leads={leads} tasks={tasks} title="Team Calendar" />
      </div>
    </div>
  );
}
