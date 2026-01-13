import { useState, useMemo, useEffect, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useAuth } from '@/contexts/AuthContextDjango';
// import { supabase } from '@/integrations/supabase/client'; // Removed - using Django backend
import { formatDistanceToNow, format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ClipboardList, CheckSquare, Building, CalendarOff, Users, FileText, Search, Calendar, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  module: string;
  action: string;
  details: string;
  created_at: string;
}

interface Profile {
  id: string;
  name: string;
  user_id: string;
}

const moduleIcons: Record<string, React.ElementType> = {
  leads: ClipboardList,
  tasks: CheckSquare,
  projects: Building,
  leaves: CalendarOff,
  users: Users,
  reports: FileText,
};

const actionColors: Record<string, string> = {
  created: 'text-success',
  updated: 'text-info',
  converted: 'text-accent',
  approved: 'text-success',
  rejected: 'text-destructive',
  deleted: 'text-destructive',
};

export default function AdminActivity() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [staffAndManagers, setStaffAndManagers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { apiClient } = await import('@/lib/api');
        
        console.log('Fetching activity logs...');
        
        // Check if user is authenticated first
        if (!user) {
          console.log('No authenticated user, skipping activity fetch');
          setActivities([]);
          setStaffAndManagers([]);
          setError('Please log in to view activity logs.');
          return;
        }
        
        // Fetch activity logs
        const activityResponse = await apiClient.getActivityLogs();
        
        const activityData = Array.isArray(activityResponse) ? activityResponse : (activityResponse as any).results || [];
        
        // Transform Django response to match frontend interface
        const transformedActivities = activityData.map((activity: any) => ({
          id: activity.id.toString(),
          user_id: activity.user.toString(),
          user_name: activity.user_name,
          user_role: activity.user_role,
          module: activity.module,
          action: activity.action,
          details: activity.details,
          created_at: activity.created_at,
        }));
        
        console.log('Loaded activities:', transformedActivities.length);
        setActivities(transformedActivities);

        // Fetch users for filtering
        const usersResponse = await apiClient.getUsers();
        
        // Handle paginated response from Django
        const usersData = Array.isArray(usersResponse) ? usersResponse : (usersResponse as any).results || [];
        
        const transformedUsers = usersData.map((user: any) => ({
          id: user.id.toString(),
          name: `${user.first_name} ${user.last_name}`.trim() || user.username,
          user_id: user.id.toString(),
          role: user.role, // Include role for filtering
        }));
        
        // Include all users who have created activities (not just staff and managers)
        const usersWithActivities = transformedActivities.map(a => a.user_id);
        const uniqueUserIds = [...new Set(usersWithActivities)];
        const relevantUsers = transformedUsers.filter((u: any) => 
          uniqueUserIds.includes(u.id)
        );
        
        setStaffAndManagers(relevantUsers);
      } catch (error) {
        console.error('Error fetching data:', error);
        // Show user-friendly error message
        if (error instanceof Error) {
          if (error.message.includes('401')) {
            setError('Authentication required. Please log in as an admin to view activity logs.');
          } else if (error.message.includes('403')) {
            setError('Access denied. Only administrators can view activity logs.');
          } else {
            setError(`Failed to load activity data: ${error.message}`);
          }
        } else {
          setError('Failed to load activity data. Please try again.');
        }
        setActivities([]);
        setStaffAndManagers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]); // Add user as dependency

  // Add refresh function
  const refreshActivities = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Check if user is authenticated first
      if (!user) {
        console.log('No authenticated user, cannot refresh activities');
        setActivities([]);
        setStaffAndManagers([]);
        setError('Please log in to view activity logs.');
        return;
      }
      
      const { apiClient } = await import('@/lib/api');
      
      console.log('Refreshing activities...');
      const activityResponse = await apiClient.getActivityLogs();
      const activityData = Array.isArray(activityResponse) ? activityResponse : (activityResponse as any).results || [];
      
      const transformedActivities = activityData.map((activity: any) => ({
        id: activity.id.toString(),
        user_id: activity.user.toString(),
        user_name: activity.user_name,
        user_role: activity.user_role,
        module: activity.module,
        action: activity.action,
        details: activity.details,
        created_at: activity.created_at,
      }));
      
      console.log('Refreshed activities:', transformedActivities.length);
      setActivities(transformedActivities);
      setLastRefresh(new Date());
      
      // Clear any previous errors
      if (error) {
        setError(null);
      }
    } catch (error: any) {
      console.error('Error refreshing activities:', error);
      
      // Handle authentication errors
      if (error.message?.includes('401')) {
        setError('Session expired. Please refresh the page to log in again.');
      } else if (error.message?.includes('403')) {
        setError('Access denied. You may not have permission to view activities.');
      } else {
        setError('Failed to refresh activities. Please try again.');
      }
    } finally {
      setRefreshing(false);
    }
  }, [error]);

  // Auto-refresh every 30 seconds (disabled when no user)
  useEffect(() => {
    // Only set up auto-refresh if user is authenticated and no error
    if (!user || error) {
      console.log('Skipping auto-refresh: no user or error present');
      return;
    }
    
    const interval = setInterval(() => {
      console.log('Auto-refreshing activities...');
      refreshActivities();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshActivities, user, error]); // Add error as dependency

  // Listen for activity logged events
  useEffect(() => {
    const handleActivityLogged = () => {
      // Only refresh if user is authenticated and no error
      if (!user || error) {
        console.log('Skipping activity refresh: no user or error present');
        return;
      }
      console.log('Activity logged event received, refreshing...');
      setTimeout(refreshActivities, 1000); // Small delay to ensure backend is updated
    };

    window.addEventListener('activityLogged', handleActivityLogged);
    return () => window.removeEventListener('activityLogged', handleActivityLogged);
  }, [refreshActivities, user, error]); // Add error as dependency

  // Get unique actions from activities
  const uniqueActions = useMemo(() => {
    const actions = [...new Set(activities.map(a => a.action))];
    return actions;
  }, [activities]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Search filter
      const matchesSearch = !searchQuery || 
        activity.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.details.toLowerCase().includes(searchQuery.toLowerCase());
      
      // User filter
      const matchesUser = selectedUser === 'all' || activity.user_id === selectedUser;
      
      // Module filter
      const matchesModule = selectedModule === 'all' || activity.module === selectedModule;
      
      // Action filter
      const matchesAction = selectedAction === 'all' || activity.action === selectedAction;
      
      // Date filter
      let matchesDate = true;
      if (dateRange.from && dateRange.to) {
        try {
          matchesDate = isWithinInterval(new Date(activity.created_at), {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to),
          });
        } catch (error) {
          console.error('Date filter error:', error);
          matchesDate = true; // Default to showing the activity if date parsing fails
        }
      } else if (dateRange.from) {
        try {
          matchesDate = new Date(activity.created_at) >= startOfDay(dateRange.from);
        } catch (error) {
          console.error('Date filter error:', error);
          matchesDate = true;
        }
      }
      
      return matchesSearch && matchesUser && matchesModule && matchesAction && matchesDate;
    });
  }, [activities, searchQuery, selectedUser, selectedModule, selectedAction, dateRange]);

  // Group activities by module
  const leadActivities = filteredActivities.filter(a => a.module === 'leads');
  const taskActivities = filteredActivities.filter(a => a.module === 'tasks');
  const leaveActivities = filteredActivities.filter(a => a.module === 'leaves');
  const otherActivities = filteredActivities.filter(a => !['leads', 'tasks', 'leaves'].includes(a.module));

  console.log('Activity counts:', {
    total: activities.length,
    filtered: filteredActivities.length,
    leads: leadActivities.length,
    tasks: taskActivities.length,
    leaves: leaveActivities.length,
    other: otherActivities.length
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedUser('all');
    setSelectedModule('all');
    setSelectedAction('all');
    setDateRange({});
  };

  const renderActivityItem = (activity: ActivityLog, index: number) => {
    const Icon = moduleIcons[activity.module] || FileText;
    
    return (
      <div 
        key={activity.id} 
        className="flex gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors animate-slide-up border border-border/50"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            <span className="font-medium">{activity.user_name}</span>
            {' '}
            <span className={actionColors[activity.action] || 'text-muted-foreground'}>
              {activity.action}
            </span>
            {' '}
            {activity.details}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted capitalize">
              {activity.module}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderActivityList = (activityList: ActivityLog[]) => {
    if (activityList.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No activities found</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {activityList.map((activity, index) => renderActivityItem(activity, index))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar title="Activity Log" subtitle="Track all system activities by staff and managers" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading activity data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <TopBar title="Activity Log" subtitle="Track all system activities by staff and managers" />
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Load Activity Data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Activity Log" subtitle="Track all system activities by staff and managers" />
      <div className="p-4 md:p-6 space-y-6">
        {/* Filters */}
        <div className="glass-card rounded-2xl p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or details..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* User Filter */}
              <div className="min-w-[180px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Staff/Manager</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {staffAndManagers.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Module Filter */}
              <div className="min-w-[150px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Module</label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Modules" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                    <SelectItem value="leaves">Leaves</SelectItem>
                    <SelectItem value="projects">Projects</SelectItem>
                    <SelectItem value="users">Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Filter */}
              <div className="min-w-[150px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Action</label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map(action => (
                      <SelectItem key={action} value={action} className="capitalize">
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, yyyy")
                        )
                      ) : (
                        "Select dates"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Clear Filters */}
              <Button variant="outline" onClick={clearFilters} className="shrink-0">
                <Filter className="w-4 h-4 mr-2" />
                Clear
              </Button>

              {/* Refresh Button */}
              <Button 
                variant="outline" 
                onClick={refreshActivities} 
                disabled={refreshing}
                className="shrink-0"
              >
                <svg 
                  className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>

              {/* Refresh Page Button (for auth errors) */}
              {error?.includes('Session expired') && (
                <Button 
                  variant="destructive" 
                  onClick={() => window.location.reload()} 
                  className="shrink-0"
                >
                  Refresh Page
                </Button>
              )}
            </div>

            {/* Filter Summary */}
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Showing {filteredActivities.length} of {activities.length} activities</span>
              <div className="flex items-center gap-4">
                {error && (
                  <span className="text-destructive">{error}</span>
                )}
                {lastRefresh && (
                  <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 mb-6">
            <TabsTrigger value="all">All ({filteredActivities.length})</TabsTrigger>
            <TabsTrigger value="leads">Leads ({leadActivities.length})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({taskActivities.length})</TabsTrigger>
            <TabsTrigger value="leaves">Leaves ({leaveActivities.length})</TabsTrigger>
            <TabsTrigger value="other">Other ({otherActivities.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">All Activities</h3>
            {renderActivityList(filteredActivities)}
          </TabsContent>

          <TabsContent value="leads" className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Lead Activities</h3>
            {renderActivityList(leadActivities)}
          </TabsContent>

          <TabsContent value="tasks" className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Task Activities</h3>
            {renderActivityList(taskActivities)}
          </TabsContent>

          <TabsContent value="leaves" className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Leave Activities</h3>
            {renderActivityList(leaveActivities)}
          </TabsContent>

          <TabsContent value="other" className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Other Activities</h3>
            {renderActivityList(otherActivities)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
