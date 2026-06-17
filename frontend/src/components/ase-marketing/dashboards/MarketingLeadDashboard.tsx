import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardStats } from '@/hooks/ase-marketing/useASEMarketing';
import { Users, TrendingUp, DollarSign, Target, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import BREDashboard from './BREDashboard';
import BOELeads from './BOELeads';
import CREDashboard from './CREDashboard';
import { TaskList } from '@/components/ase-marketing/tasks/TaskList';
import { apiClient, API_BASE_URL } from '@/lib/api';

export default function MarketingLeadDashboard({ dashboardOnly = false }: { dashboardOnly?: boolean } = {}) {
  const { data: stats, loading: statsLoading } = useDashboardStats();

  // Fetch actual BRE stats
  const [breStats, setBreStats] = useState({ total: 0, new_count: 0, assigned_count: 0, today_added: 0, this_week_added: 0, this_month_added: 0 });
  const [boeLeadsCount, setBoeLeadsCount] = useState(0);
  const [creLeadsCount, setCreLeadsCount] = useState(0);
  const [creStats, setCreStats] = useState({ total: 0, cold: 0, warm: 0, hot: 0, completed: 0, rejected: 0 });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // BRE stats - use apiClient for automatic token refresh
        const breData = await apiClient.get('/ase-leads/bre-stats/');
        if (breData) setBreStats(breData);

        // BOE leads count
        const boeData = await apiClient.get('/ase-leads/boe-leads/?page_size=1');
        if (boeData) setBoeLeadsCount(boeData.count || 0);

        // CRE leads count + stats
        const creData = await apiClient.get('/ase-leads/cre-leads/?page_size=1');
        if (creData) {
          setCreLeadsCount(creData.count || 0);
          if (creData.stats) setCreStats(creData.stats);
        }
      } catch (err) {}
    };
    fetchAll();
    // Auto-poll every 10 seconds - DISABLED due to data refresh issues
    // const interval = setInterval(fetchAll, 10000);
    // return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className={dashboardOnly ? "" : "min-h-screen"}>
      {!dashboardOnly && <TopBar title="Marketing Team Lead" subtitle="Team Overview & Management" />}
      <div className={dashboardOnly ? "space-y-4" : "space-y-4 p-3 sm:p-4 md:p-6"}>

      {dashboardOnly ? (
        /* Dashboard-only mode: just show stats, no tabs */
        statsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Team Metrics - using real BRE pipeline data */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
                <Card>
                  <CardContent className="p-3 sm:pt-6 text-center">
                    <p className="text-lg sm:text-2xl font-bold">{breStats.total}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Records</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:pt-6 text-center">
                    <p className="text-lg sm:text-2xl font-bold">{breStats.new_count}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">New (Unassigned)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:pt-6 text-center">
                    <p className="text-lg sm:text-2xl font-bold">{breStats.assigned_count}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Assigned to BOE</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:pt-6 text-center">
                    <p className="text-lg sm:text-2xl font-bold">{breStats.today_added}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Today Added</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:pt-6 text-center">
                    <p className="text-lg sm:text-2xl font-bold text-blue-500">{breStats.this_week_added || 0}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">This Week</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:pt-6 text-center">
                    <p className="text-lg sm:text-2xl font-bold text-green-600">{breStats.this_month_added || 0}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">This Month</p>
                  </CardContent>
                </Card>
              </div>

              {/* Team Performance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <Card>
                  <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                      BRE Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Total Records</span>
                      <span className="font-medium text-sm">{breStats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">New (Unassigned)</span>
                      <span className="font-medium text-sm">{breStats.new_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Assigned to BOE</span>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 text-xs">{breStats.assigned_count}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                      BOE Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Assigned Data</span>
                      <span className="font-medium text-sm">{breStats.assigned_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Today Added</span>
                      <span className="font-medium text-sm">{breStats.today_added}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Assignment Rate</span>
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-500 text-xs">{breStats.total > 0 ? Math.round((breStats.assigned_count / breStats.total) * 100) : 0}%</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                      CRE Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Total Assigned</span>
                      <span className="font-medium text-sm">{creStats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Hot</span>
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 text-xs">{creStats.hot}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Completed</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 text-xs">{creStats.completed}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pipeline Flow */}
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    Pipeline Flow (BRE → BOE → CRE)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <div className="text-center p-2 sm:p-3 border rounded-lg border-blue-200 bg-blue-50/50">
                      <p className="text-base sm:text-xl font-bold text-blue-600">{breStats.total}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">BRE Records</p>
                    </div>
                    <div className="text-center p-2 sm:p-3 border rounded-lg border-purple-200 bg-purple-50/50">
                      <p className="text-base sm:text-xl font-bold text-purple-600">{breStats.assigned_count}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Assigned to BOE</p>
                    </div>
                    <div className="text-center p-2 sm:p-3 border rounded-lg border-green-200 bg-green-50/50">
                      <p className="text-base sm:text-xl font-bold text-green-600">{boeLeadsCount}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">BOE Leads</p>
                    </div>
                    <div className="text-center p-2 sm:p-3 border rounded-lg border-orange-200 bg-orange-50/50">
                      <p className="text-base sm:text-xl font-bold text-orange-600">{creLeadsCount}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">CRE Assigned</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
      ) : (
        /* Full mode with tabs */
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 gap-1">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Dashboard</TabsTrigger>
            <TabsTrigger value="research" className="text-xs sm:text-sm">Research Data</TabsTrigger>
            <TabsTrigger value="leads" className="text-xs sm:text-sm">BOE Leads</TabsTrigger>
            <TabsTrigger value="cre" className="text-xs sm:text-sm">CRE Leads</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs sm:text-sm">Tasks</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-4 sm:mt-6">
            {statsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              </div>
            ) : !stats ? (
              <p className="text-center text-muted-foreground py-12">Failed to load dashboard data</p>
            ) : (
              <MarketingLeadDashboard dashboardOnly={true} />
            )}
          </TabsContent>

          {/* Research Data Tab */}
          <TabsContent value="research" className="mt-4 sm:mt-6">
            <BREDashboard forceResearchView={true} />
          </TabsContent>

          {/* BOE Leads Tab */}
          <TabsContent value="leads" className="mt-4 sm:mt-6">
            <BOELeads />
          </TabsContent>

          {/* CRE Leads Tab */}
          <TabsContent value="cre" className="mt-4 sm:mt-6">
            <CREDashboard />
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-4 sm:mt-6">
            <TaskList title="All Tasks" showFilters={true} />
          </TabsContent>
        </Tabs>
      )}
      </div>
    </div>
  );
}
