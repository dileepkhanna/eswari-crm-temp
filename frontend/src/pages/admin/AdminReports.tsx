import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import StaffPerformanceChart from "@/components/reports/StaffPerformanceChart";
import DailyLeadsPercentageChart from "@/components/reports/DailyLeadsPercentageChart";
import MonthlyLeavesChart from "@/components/reports/MonthlyLeavesChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Users, ClipboardList, CheckSquare, CalendarOff, Filter, CalendarIcon, Check, ChevronsUpDown, X, FileText, Loader2, BarChart3, TrendingUp } from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay, subDays, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { useData } from "@/contexts/DataContextDjango";

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
  role: 'manager' | 'employee';
}

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export default function AdminReports() {
  const { leads, tasks } = useData();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { apiClient } = await import('@/lib/api');
        
        console.log('Fetching leaves data...');
        
        // Fetch leaves data
        const leavesResponse = await apiClient.getLeaves();
        console.log('Leaves response:', leavesResponse);
        
        const leavesData = Array.isArray(leavesResponse) ? leavesResponse : (leavesResponse as any).results || [];
        
        // Transform Django response to match frontend interface
        const transformedLeaves = leavesData.map((leave: any) => ({
          id: leave.id.toString(),
          user_id: leave.user.toString(),
          user_name: leave.user_name,
          user_role: leave.user_role,
          leave_type: leave.leave_type,
          start_date: leave.start_date,
          end_date: leave.end_date,
          reason: leave.reason,
          status: leave.status,
          document_url: leave.document_url,
          approved_by: leave.approved_by?.toString(),
          created_at: leave.created_at,
        }));
        
        console.log('Transformed leaves:', transformedLeaves.length);
        setLeaves(transformedLeaves);

        // Fetch users for team members
        console.log('Fetching users...');
        const usersResponse = await apiClient.getUsers();
        console.log('Users response:', usersResponse);
        
        // Handle paginated response from Django
        const usersData = Array.isArray(usersResponse) ? usersResponse : (usersResponse as any).results || [];
        console.log('Users data:', usersData.length);
        
        const transformedUsers = usersData.map((user: any) => ({
          id: user.id.toString(),
          name: `${user.first_name} ${user.last_name}`.trim() || user.username,
          email: user.email,
          role: user.role as 'manager' | 'employee',
        }));
        
        // Filter to only staff and managers
        const teamUsers = transformedUsers.filter((u: any) => 
          u.role === 'manager' || u.role === 'employee'
        );
        
        console.log('Team users:', teamUsers.length);
        setTeamMembers(teamUsers);
      } catch (error) {
        console.error("Error fetching data:", error);
        // Show user-friendly error message
        if (error instanceof Error) {
          if (error.message.includes('401')) {
            setError('Authentication required. Please log in to view reports.');
          } else if (error.message.includes('403')) {
            setError('Access denied. You may not have permission to view reports.');
          } else {
            setError(`Failed to load reports data: ${error.message}`);
          }
        } else {
          setError('Failed to load reports data. Please try again.');
        }
        setLeaves([]);
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const allTeamMembers = teamMembers;
  const filteredUsers = selectedUserId === "all" ? allTeamMembers : allTeamMembers.filter((u) => u.id === selectedUserId);

  const filteredLeads = useMemo(() => {
    let list = selectedUserId === "all" ? leads : leads.filter((l) => l.createdBy === selectedUserId);

    if (dateRange.from && dateRange.to) {
      list = list.filter((l) => {
        const createdAt = new Date(l.createdAt);
        return isWithinInterval(createdAt, { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) });
      });
    }

    return list;
  }, [selectedUserId, dateRange, leads]);

  const filteredTasks = useMemo(() => {
    let list = selectedUserId === "all" ? tasks : tasks.filter((t) => t.assignedTo === selectedUserId);

    if (dateRange.from && dateRange.to) {
      list = list.filter((t) => {
        const createdAt = new Date(t.createdAt);
        return isWithinInterval(createdAt, { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) });
      });
    }

    return list;
  }, [selectedUserId, dateRange, tasks]);

  const convertedLeaves = useMemo(() => {
    let filteredDbLeaves = leaves.filter((l) => selectedUserId === "all" || l.user_id === selectedUserId);

    if (dateRange.from && dateRange.to) {
      filteredDbLeaves = filteredDbLeaves.filter((l) => {
        const startDate = new Date(l.start_date);
        return isWithinInterval(startDate, { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) });
      });
    }

    return filteredDbLeaves.map((l) => ({
      id: l.id,
      userId: l.user_id,
      userName: l.user_name,
      userRole: l.user_role as "admin" | "manager" | "employee",
      type: l.leave_type as "sick" | "casual" | "annual" | "other",
      startDate: new Date(l.start_date),
      endDate: new Date(l.end_date),
      reason: l.reason,
      status: l.status as "pending" | "approved" | "rejected",
      approvedBy: l.approved_by || undefined,
      createdAt: new Date(l.created_at),
    }));
  }, [leaves, selectedUserId, dateRange]);

  const approvedLeaves = convertedLeaves.filter((l) => l.status === "approved").length;
  const selectedUser = allTeamMembers.find((u) => u.id === selectedUserId);

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
  const clearUserFilter = () => setSelectedUserId("all");

  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar title="Reports" subtitle="Team performance analytics and insights" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading reports data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <TopBar title="Reports" subtitle="Team performance analytics and insights" />
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Load Reports Data</h3>
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
      <TopBar title="🔴 ADMIN - Reports" subtitle="Team performance analytics and insights" />

      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

        {/* Filters Section */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team Member Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Team Member</label>
                <div className="flex items-center gap-2">
                  <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={userSearchOpen}
                        className="w-full justify-between bg-background"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {selectedUserId === "all" ? "All Team Members" : selectedUser?.name || "Select member..."}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-background border border-border z-50">
                      <Command>
                        <CommandInput placeholder="Search team members..." />
                        <CommandList>
                          <CommandEmpty>No member found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setSelectedUserId("all");
                                setUserSearchOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedUserId === "all" ? "opacity-100" : "opacity-0")} />
                              All Team Members
                            </CommandItem>
                            {allTeamMembers.map((u) => (
                              <CommandItem
                                key={u.id}
                                value={u.name}
                                onSelect={() => {
                                  setSelectedUserId(u.id);
                                  setUserSearchOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selectedUserId === u.id ? "opacity-100" : "opacity-0")} />
                                {u.name}
                                <span className="ml-auto text-xs text-muted-foreground capitalize">{u.role}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedUserId !== "all" && (
                    <Button variant="ghost" size="icon" onClick={clearUserFilter} className="h-10 w-10 shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Date Range</label>
                <div className="flex items-center gap-2">
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                            </>
                          ) : (
                            format(dateRange.from, "MMM d, yyyy")
                          )
                        ) : (
                          <span>Select date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background border border-border z-50" align="start">
                      <div className="p-3 border-b border-border">
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" onClick={() => { handleQuickDateFilter(7); setDatePickerOpen(false); }}>
                            Last 7 days
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { handleQuickDateFilter(30); setDatePickerOpen(false); }}>
                            Last 30 days
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { handleQuickMonthFilter(3); setDatePickerOpen(false); }}>
                            Last 3 months
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { handleQuickMonthFilter(6); setDatePickerOpen(false); }}>
                            Last 6 months
                          </Button>
                        </div>
                      </div>
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange}
                        onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                        numberOfMonths={1}
                        className="p-3"
                      />
                    </PopoverContent>
                  </Popover>
                  {dateRange.from && (
                    <Button variant="ghost" size="icon" onClick={clearDateFilter} className="h-10 w-10 shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {(selectedUserId !== "all" || dateRange.from) && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                <span className="text-sm font-medium text-muted-foreground">Active Filters:</span>
                {selectedUserId !== "all" && selectedUser && (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                    <Users className="w-3 h-3" />
                    {selectedUser.name}
                  </div>
                )}
                {dateRange.from && dateRange.to && (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                    <CalendarIcon className="w-3 h-3" />
                    {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                {selectedUserId === "all" ? "Team Members" : "Selected Member"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                <p className="text-3xl font-bold text-foreground">{filteredUsers.length}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedUserId === "all"
                    ? `${teamMembers.filter((u) => u.role === "manager").length} managers, ${teamMembers.filter((u) => u.role === "employee").length} employees`
                    : selectedUser?.role}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-green-500" />
                Total Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                <p className="text-3xl font-bold text-foreground">{filteredLeads.length}</p>
                <p className="text-xs text-muted-foreground">{dateRange.from ? "In selected period" : "All time"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-purple-500" />
                Total Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                <p className="text-3xl font-bold text-foreground">{filteredTasks.length}</p>
                <p className="text-xs text-muted-foreground">{filteredTasks.filter((t) => t.status === "completed").length} completed</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-orange-500" />
                Approved Leaves
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                <p className="text-3xl font-bold text-foreground">{approvedLeaves}</p>
                <p className="text-xs text-muted-foreground">{dateRange.from ? "In selected period" : "All time"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview Chart */}
        <div className="w-full">
          <StaffPerformanceChart users={filteredUsers} leads={filteredLeads} tasks={filteredTasks} />
        </div>

        {/* Secondary Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="w-full">
            <DailyLeadsPercentageChart users={filteredUsers} leads={filteredLeads} dailyTarget={100} />
          </div>
          <div className="w-full">
            <MonthlyLeavesChart users={filteredUsers} leaves={convertedLeaves} />
          </div>
        </div>
      </div>
    </div>
  );
}
