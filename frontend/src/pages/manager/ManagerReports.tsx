import { useState, useEffect, useMemo } from 'react';
import TopBar from '@/components/layout/TopBar';
import StaffPerformanceChart from '@/components/reports/StaffPerformanceChart';
import DailyLeadsPercentageChart from '@/components/reports/DailyLeadsPercentageChart';
import MonthlyLeavesChart from '@/components/reports/MonthlyLeavesChart';
// import { supabase } from '@/integrations/supabase/client'; // Removed - using Django backend
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Users, ClipboardList, CheckSquare, CalendarOff, Filter, CalendarIcon, Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useData } from '@/contexts/DataContextDjango';

interface LeaveRecord {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  document_url?: string | null;
  approved_by?: string | null;
  created_at: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string | null;
  role: 'manager' | 'staff';
}

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export default function ManagerReports() {
  const { user } = useAuth();
  const { leads, tasks } = useData();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // TODO: Implement leaves API in Django backend
        // const { data: leavesData, error: leavesError } = await supabase
        //   .from('leaves')
        //   .select('*')
        //   .order('created_at', { ascending: false });

        // if (leavesError) throw leavesError;
        // setLeaves(leavesData || []);

        // TODO: Implement staff members API in Django backend
        // const { data: profilesData } = await supabase
        //   .from('profiles')
        //   .select('id, name, email');
        
        // if (profilesData) {
        //   const members: TeamMember[] = [];
        //   for (const profile of profilesData) {
        //     const { data: roleData } = await supabase.rpc('get_user_role', {
        //       _user_id: profile.id
        //     });
        //     if (roleData === 'staff') {
        //       members.push({
        //         ...profile,
        //         role: roleData as 'staff'
        //       });
        //     }
        //   }
        //   setTeamMembers(members);
        // }
        
        // Mock data for now
        setLeaves([]);
        setTeamMembers([]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Include the current manager in the team for reports
  const allTeamMembers = useMemo(() => {
    if (user) {
      return [
        { id: user.id, name: user.name, email: user.email || null, role: 'manager' as const },
        ...teamMembers
      ];
    }
    return teamMembers;
  }, [user, teamMembers]);

  // Filter based on user selection
  const filteredUsers = selectedUserId === 'all' 
    ? allTeamMembers 
    : allTeamMembers.filter(u => u.id === selectedUserId);

  // Filter leads by user and date range
  const filteredLeads = useMemo(() => {
    let filteredList = leads.filter(l => 
      filteredUsers.some(m => m.id === l.createdBy)
    );

    if (dateRange.from && dateRange.to) {
      filteredList = filteredList.filter(l => {
        const createdAt = new Date(l.createdAt);
        return isWithinInterval(createdAt, { 
          start: startOfDay(dateRange.from!), 
          end: endOfDay(dateRange.to!) 
        });
      });
    }

    return filteredList;
  }, [leads, filteredUsers, dateRange]);

  // Filter tasks by user and date range
  const filteredTasks = useMemo(() => {
    let filteredList = tasks.filter(t => 
      filteredUsers.some(m => m.id === t.assignedTo)
    );

    if (dateRange.from && dateRange.to) {
      filteredList = filteredList.filter(t => {
        const createdAt = new Date(t.createdAt);
        return isWithinInterval(createdAt, { 
          start: startOfDay(dateRange.from!), 
          end: endOfDay(dateRange.to!) 
        });
      });
    }

    return filteredList;
  }, [tasks, filteredUsers, dateRange]);

  // Convert database leaves to match the Leave type for the chart
  const convertedLeaves = useMemo(() => {
    let filteredDbLeaves = leaves.filter(l => filteredUsers.some(m => m.id === l.user_id));

    if (dateRange.from && dateRange.to) {
      filteredDbLeaves = filteredDbLeaves.filter(l => {
        const startDate = new Date(l.start_date);
        return isWithinInterval(startDate, { 
          start: startOfDay(dateRange.from!), 
          end: endOfDay(dateRange.to!) 
        });
      });
    }

    return filteredDbLeaves.map(l => ({
      id: l.id,
      userId: l.user_id,
      userName: l.user_name,
      userRole: l.user_role as 'admin' | 'manager' | 'staff',
      type: l.leave_type as 'sick' | 'casual' | 'annual' | 'other',
      startDate: new Date(l.start_date),
      endDate: new Date(l.end_date),
      reason: l.reason,
      status: l.status as 'pending' | 'approved' | 'rejected',
      approvedBy: l.approved_by || undefined,
      createdAt: new Date(l.created_at),
    }));
  }, [leaves, filteredUsers, dateRange]);

  const approvedLeaves = convertedLeaves.filter(l => l.status === 'approved').length;
  const selectedUser = allTeamMembers.find(u => u.id === selectedUserId);

  const handleQuickDateFilter = (days: number) => {
    const to = new Date();
    const from = subDays(to, days);
    setDateRange({ from, to });
  };

  const handleQuickMonthFilter = (months: number) => {
    const to = new Date();
    const from = subMonths(to, months);
    setDateRange({ from, to });
  };

  const clearDateFilter = () => setDateRange({ from: undefined, to: undefined });
  const clearUserFilter = () => setSelectedUserId('all');

  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar title="Team Reports" subtitle="Monitor your team's performance" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Team Reports" subtitle="Monitor your team's performance" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* User Filter */}
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <Filter className="w-5 h-5 text-muted-foreground shrink-0" />
                <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={userSearchOpen}
                      className="w-full sm:w-[250px] justify-between bg-background"
                    >
                      {selectedUserId === 'all' 
                        ? 'All Team Members' 
                        : selectedUser?.name || 'Select member...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(92vw,250px)] p-0 bg-background border border-border z-50">
                    <Command>
                      <CommandInput placeholder="Search team members..." />
                      <CommandList>
                        <CommandEmpty>No team member found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setSelectedUserId('all');
                              setUserSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUserId === 'all' ? "opacity-100" : "opacity-0"
                              )}
                            />
                            All Team Members
                          </CommandItem>
                          {allTeamMembers.map((member) => (
                            <CommandItem
                              key={member.id}
                              value={member.name}
                              onSelect={() => {
                                setSelectedUserId(member.id);
                                setUserSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedUserId === member.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{member.name}</span>
                                <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedUserId !== 'all' && (
                  <Button variant="ghost" size="icon" onClick={clearUserFilter}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Date Range Filter */}
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <CalendarIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full sm:w-[250px] justify-start text-left font-normal bg-background"
                    >
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
                          </>
                        ) : (
                          format(dateRange.from, 'MMM dd, yyyy')
                        )
                      ) : (
                        <span className="text-muted-foreground">Select date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border border-border z-50" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                      numberOfMonths={1}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {dateRange.from && (
                  <Button variant="ghost" size="icon" onClick={clearDateFilter}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Quick Date Filters */}
              <div className="flex flex-wrap gap-2 lg:ml-auto">
                <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(7)}>
                  Last 7 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(30)}>
                  Last 30 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickMonthFilter(3)}>
                  Last 3 Months
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                {selectedUserId === 'all' ? 'Team Members' : 'Selected Member'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{filteredUsers.length}</p>
              <p className="text-xs text-muted-foreground">
                {selectedUserId === 'all' 
                  ? `1 manager, ${teamMembers.length} staff`
                  : selectedUser?.role}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Total Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{filteredLeads.length}</p>
              <p className="text-xs text-muted-foreground">
                {dateRange.from ? 'In selected period' : 'All time'}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Total Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{filteredTasks.length}</p>
              <p className="text-xs text-muted-foreground">
                {filteredTasks.filter(t => t.status === 'completed').length} completed
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarOff className="w-4 h-4" />
                Approved Leaves
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{approvedLeaves}</p>
              <p className="text-xs text-muted-foreground">
                {dateRange.from ? 'In selected period' : 'All time'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Staff Performance Chart */}
        <StaffPerformanceChart 
          users={filteredUsers} 
          leads={filteredLeads} 
          tasks={filteredTasks} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Leads Percentage */}
          <DailyLeadsPercentageChart 
            users={filteredUsers} 
            leads={filteredLeads}
            dailyTarget={100}
          />

          {/* Monthly Leaves Distribution */}
          <MonthlyLeavesChart 
            users={filteredUsers}
            leaves={convertedLeaves}
          />
        </div>
      </div>
    </div>
  );
}
