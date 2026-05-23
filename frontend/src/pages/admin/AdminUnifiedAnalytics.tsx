import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, TrendingUp, Users, Building, DollarSign, ArrowUpRight,
  ArrowDownRight, Clock, Target, Briefcase, FileText, Loader2,
  Calendar, Mail, PieChart
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList
} from 'recharts';
import { analyticsService } from '@/services/analytics.service';
import { logger } from '@/lib/logger';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function AdminUnifiedAnalytics() {
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [scorecards, setScorecards] = useState<any>(null);
  const [revenueTrend, setRevenueTrend] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, [period]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, funnelData, scorecardsData, trendData] = await Promise.allSettled([
        analyticsService.getOverview(period),
        analyticsService.getConversionFunnel(period),
        analyticsService.getEmployeeScorecards(period),
        analyticsService.getRevenueTrend(period, period === 'year' ? 'monthly' : period === 'quarter' ? 'weekly' : 'daily'),
      ]);

      if (overviewData.status === 'fulfilled') setOverview(overviewData.value);
      if (funnelData.status === 'fulfilled') setFunnel(funnelData.value);
      if (scorecardsData.status === 'fulfilled') setScorecards(scorecardsData.value);
      if (trendData.status === 'fulfilled') setRevenueTrend(trendData.value);
    } catch (err: any) {
      logger.error('Analytics fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <TopBar title="Unified Analytics" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-500">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <TopBar title="Unified Analytics" />

      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cross-Company Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Unified view across Eswari Group, ASE Technologies & Eswari Capital</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600 text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchAllData}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="scorecards">Employee Scorecards</TabsTrigger>
          <TabsTrigger value="reports">Scheduled Reports</TabsTrigger>
        </TabsList>

        {/* ═══════════ OVERVIEW TAB ═══════════ */}
        <TabsContent value="overview" className="space-y-6">
          <OverviewTab overview={overview} revenueTrend={revenueTrend} />
        </TabsContent>

        {/* ═══════════ FUNNEL TAB ═══════════ */}
        <TabsContent value="funnel" className="space-y-6">
          <FunnelTab funnel={funnel} />
        </TabsContent>

        {/* ═══════════ SCORECARDS TAB ═══════════ */}
        <TabsContent value="scorecards" className="space-y-6">
          <ScorecardsTab scorecards={scorecards} />
        </TabsContent>

        {/* ═══════════ REPORTS TAB ═══════════ */}
        <TabsContent value="reports" className="space-y-6">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// Overview Tab Component
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab({ overview, revenueTrend }: { overview: any; revenueTrend: any }) {
  if (!overview) return <p className="text-gray-500">No data available.</p>;

  const { eswari_group, ase_technologies, eswari_capital, team } = overview;

  return (
    <div className="space-y-6">
      {/* Top-level KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="ASE Revenue"
          value={`₹${formatCurrency(ase_technologies?.revenue || 0)}`}
          subtitle={`${ase_technologies?.deals_won || 0} deals won`}
          icon={<DollarSign className="h-5 w-5" />}
          color="green"
        />
        <KPICard
          title="Capital Loans Disbursed"
          value={`₹${formatCurrency(eswari_capital?.loan_value_disbursed || 0)}`}
          subtitle={`${eswari_capital?.loans_disbursed || 0} loans`}
          icon={<Briefcase className="h-5 w-5" />}
          color="blue"
        />
        <KPICard
          title="Pipeline Value"
          value={`₹${formatCurrency(ase_technologies?.pipeline_value || 0)}`}
          subtitle="Proposals + Negotiating"
          icon={<TrendingUp className="h-5 w-5" />}
          color="purple"
        />
        <KPICard
          title="Total Employees"
          value={team?.total_employees || 0}
          subtitle={`${team?.pending_leaves || 0} pending leaves`}
          icon={<Users className="h-5 w-5" />}
          color="orange"
        />
      </div>

      {/* Company-wise breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Eswari Group */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              Eswari Group (Real Estate)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <MetricRow label="Total Leads" value={eswari_group?.leads_total} />
            <MetricRow label="New This Period" value={eswari_group?.leads_period} highlight />
            <MetricRow label="Hot Leads" value={eswari_group?.leads_hot} color="red" />
            <MetricRow label="Total Customers" value={eswari_group?.customers_total} />
            <MetricRow label="New Customers" value={eswari_group?.customers_period} highlight />
          </CardContent>
        </Card>

        {/* ASE Technologies */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              ASE Technologies (Marketing)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <MetricRow label="Total Leads" value={ase_technologies?.leads_total} />
            <MetricRow label="New This Period" value={ase_technologies?.leads_period} highlight />
            <MetricRow label="Deals Won" value={ase_technologies?.deals_won} color="green" />
            <MetricRow label="Revenue" value={`₹${formatCurrency(ase_technologies?.revenue || 0)}`} color="green" />
            <MetricRow label="Pipeline" value={`₹${formatCurrency(ase_technologies?.pipeline_value || 0)}`} />
          </CardContent>
        </Card>

        {/* Eswari Capital */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              Eswari Capital (Finance)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <MetricRow label="Total Customers" value={eswari_capital?.customers_total} />
            <MetricRow label="New This Period" value={eswari_capital?.customers_period} highlight />
            <MetricRow label="Total Loans" value={eswari_capital?.loans_total} />
            <MetricRow label="Disbursed" value={eswari_capital?.loans_disbursed} color="green" />
            <MetricRow label="Services Completed" value={eswari_capital?.services_completed} color="blue" />
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      {revenueTrend && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue & Activity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend.eswari_lead_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="count" name="Eswari Leads" stroke="#3b82f6" fill="#3b82f680" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {revenueTrend.ase_revenue_trend?.length > 0 && (
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueTrend.ase_revenue_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => `₹${formatCurrency(value)}`} />
                    <Legend />
                    <Bar dataKey="revenue" name="ASE Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="deals" name="Deals Won" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Funnel Tab Component
// ═══════════════════════════════════════════════════════════════════════════

function FunnelTab({ funnel }: { funnel: any }) {
  if (!funnel) return <p className="text-gray-500">No funnel data available.</p>;

  const aseFunnel = funnel.ase_technologies;
  const eswariCapital = funnel.eswari_capital;

  // Prepare ASE funnel chart data
  const aseFunnelData = aseFunnel ? [
    { name: 'New', value: aseFunnel.funnel?.new?.count || 0, fill: '#3b82f6' },
    { name: 'Qualified', value: aseFunnel.funnel?.qualified?.count || 0, fill: '#10b981' },
    { name: 'Contacted', value: aseFunnel.funnel?.contacted?.count || 0, fill: '#f59e0b' },
    { name: 'Proposal', value: aseFunnel.funnel?.proposal_sent?.count || 0, fill: '#8b5cf6' },
    { name: 'Negotiating', value: aseFunnel.funnel?.negotiating?.count || 0, fill: '#ec4899' },
    { name: 'Won', value: aseFunnel.funnel?.won?.count || 0, fill: '#06b6d4' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* ASE Technologies Funnel */}
      {aseFunnel && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                ASE Technologies — Lead Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aseFunnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                      {aseFunnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rates */}
          {aseFunnel.conversion_rates && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Stage-to-Stage Conversion Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <ConversionRateCard
                    label="New → Qualified"
                    rate={aseFunnel.conversion_rates.new_to_qualified}
                  />
                  <ConversionRateCard
                    label="Qualified → Contacted"
                    rate={aseFunnel.conversion_rates.qualified_to_contacted}
                  />
                  <ConversionRateCard
                    label="Contacted → Proposal"
                    rate={aseFunnel.conversion_rates.contacted_to_proposal}
                  />
                  <ConversionRateCard
                    label="Proposal → Won"
                    rate={aseFunnel.conversion_rates.proposal_to_won}
                  />
                  <ConversionRateCard
                    label="Overall"
                    rate={aseFunnel.conversion_rates.overall}
                    highlight
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Time-in-Stage */}
          {aseFunnel.time_in_stage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Average Time in Each Stage (Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <TimeStageCard label="New → Qualified" days={aseFunnel.time_in_stage.new_to_qualified_days} />
                  <TimeStageCard label="Qualified → Contacted" days={aseFunnel.time_in_stage.qualified_to_contacted_days} />
                  <TimeStageCard label="Contacted → Proposal" days={aseFunnel.time_in_stage.contacted_to_proposal_days} />
                  <TimeStageCard label="Proposal → Won" days={aseFunnel.time_in_stage.proposal_to_won_days} />
                  <TimeStageCard label="Total Sales Cycle" days={aseFunnel.time_in_stage.total_sales_cycle_days} highlight />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Capital Loan Funnel */}
      {eswariCapital && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              Eswari Capital — Loan Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {eswariCapital.loan_funnel && Object.entries(eswariCapital.loan_funnel).map(([stage, data]: [string, any]) => (
                <div key={stage} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 capitalize">{stage.replace('_', ' ')}</p>
                  <p className="text-lg font-bold">{data.count}</p>
                  {data.total_value > 0 && (
                    <p className="text-xs text-green-600">₹{formatCurrency(data.total_value)}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Eswari Group */}
      {funnel.eswari_group && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              Eswari Group — Lead Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 flex-1">
                {funnel.eswari_group.funnel && Object.entries(funnel.eswari_group.funnel).map(([stage, data]: [string, any]) => (
                  <div key={stage} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 capitalize">{stage.replace('_', ' ')}</p>
                    <p className="text-lg font-bold">{data.count}</p>
                  </div>
                ))}
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold text-green-600">{funnel.eswari_group.conversion_rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Scorecards Tab Component
// ═══════════════════════════════════════════════════════════════════════════

function ScorecardsTab({ scorecards }: { scorecards: any }) {
  if (!scorecards || !scorecards.scorecards?.length) {
    return <p className="text-gray-500">No employee data available for this period.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing top {scorecards.scorecards.length} employees by activity score
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 dark:bg-gray-800">
              <th className="text-left p-3 font-medium">#</th>
              <th className="text-left p-3 font-medium">Employee</th>
              <th className="text-left p-3 font-medium">Company</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-center p-3 font-medium">Leads Created</th>
              <th className="text-center p-3 font-medium">Deals Won</th>
              <th className="text-center p-3 font-medium">Revenue</th>
              <th className="text-center p-3 font-medium">Calls</th>
              <th className="text-center p-3 font-medium">Tasks Done</th>
              <th className="text-center p-3 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {scorecards.scorecards.map((sc: any, idx: number) => (
              <tr key={sc.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="p-3 text-gray-500">{idx + 1}</td>
                <td className="p-3">
                  <div>
                    <p className="font-medium">{sc.name}</p>
                    {sc.designation && <p className="text-xs text-gray-400">{sc.designation}</p>}
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="text-xs">
                    {sc.company_code || sc.company}
                  </Badge>
                </td>
                <td className="p-3 capitalize">{sc.role}</td>
                <td className="p-3 text-center">
                  {(sc.eswari_leads_created || 0) + (sc.ase_leads_created || 0) + (sc.capital_customers_created || 0)}
                </td>
                <td className="p-3 text-center">
                  <span className={sc.ase_deals_won > 0 ? 'text-green-600 font-medium' : ''}>
                    {sc.ase_deals_won || 0}
                  </span>
                </td>
                <td className="p-3 text-center">
                  {sc.ase_revenue > 0 ? (
                    <span className="text-green-600 font-medium">₹{formatCurrency(sc.ase_revenue)}</span>
                  ) : '-'}
                </td>
                <td className="p-3 text-center">{sc.ase_calls_made || 0}</td>
                <td className="p-3 text-center">{sc.tasks_completed || 0}</td>
                <td className="p-3 text-center">
                  <Badge className={sc.total_score > 10 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {sc.total_score}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Reports Tab Component
// ═══════════════════════════════════════════════════════════════════════════

function ReportsTab() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    frequency: 'weekly',
    report_type: 'overview',
    recipients: '',
  });

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const data = await analyticsService.getReportSchedules();
      setSchedules(data);
    } catch (err) {
      logger.error('Failed to load report schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await analyticsService.createReportSchedule({
        name: formData.name,
        frequency: formData.frequency,
        report_type: formData.report_type,
        recipients: formData.recipients.split(',').map(e => e.trim()).filter(Boolean),
        is_active: true,
      });
      setShowForm(false);
      setFormData({ name: '', frequency: 'weekly', report_type: 'overview', recipients: '' });
      loadSchedules();
    } catch (err) {
      logger.error('Failed to create schedule:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Automated Report Schedules</h3>
          <p className="text-sm text-gray-500">Configure reports to be emailed to managers automatically</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Mail className="h-4 w-4 mr-1" />
          New Schedule
        </Button>
      </div>

      {showForm && (
        <Card className="border-blue-200">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Report Name</label>
                <input
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  placeholder="Weekly Overview Report"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Recipients (comma-separated emails)</label>
                <input
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  placeholder="manager@eswari.com, admin@eswari.com"
                  value={formData.recipients}
                  onChange={e => setFormData({ ...formData, recipients: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Frequency</label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  value={formData.frequency}
                  onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly (Monday)</option>
                  <option value="monthly">Monthly (1st)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Report Type</label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  value={formData.report_type}
                  onChange={e => setFormData({ ...formData, report_type: e.target.value })}
                >
                  <option value="overview">Cross-Company Overview</option>
                  <option value="funnel">Conversion Funnel</option>
                  <option value="scorecards">Employee Scorecards</option>
                  <option value="revenue">Revenue Summary</option>
                  <option value="capital">Capital Services Report</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate}>Create Schedule</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading schedules...
        </div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Calendar className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>No report schedules configured yet.</p>
            <p className="text-xs mt-1">Create a schedule to receive automated reports via email.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {schedules.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-gray-500">
                    {s.frequency} • {s.report_type} • {s.recipients?.length || 0} recipients
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.is_active ? 'default' : 'secondary'}>
                    {s.is_active ? 'Active' : 'Paused'}
                  </Badge>
                  {s.last_sent_at && (
                    <span className="text-xs text-gray-400">
                      Last: {new Date(s.last_sent_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared Helper Components
// ═══════════════════════════════════════════════════════════════════════════

function KPICard({ title, value, subtitle, icon, color }: {
  title: string; value: string | number; subtitle: string; icon: React.ReactNode; color: string;
}) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-full ${colorMap[color] || colorMap.blue}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value, highlight, color }: {
  label: string; value: any; highlight?: boolean; color?: string;
}) {
  const colorClass = color === 'red' ? 'text-red-600' : color === 'green' ? 'text-green-600' : color === 'blue' ? 'text-blue-600' : '';
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${colorClass} ${highlight ? 'text-blue-600' : ''}`}>
        {value ?? 0}
      </span>
    </div>
  );
}

function ConversionRateCard({ label, rate, highlight }: { label: string; rate: number; highlight?: boolean }) {
  return (
    <div className={`text-center p-3 rounded-lg ${highlight ? 'bg-green-50 dark:bg-green-900/20 border border-green-200' : 'bg-gray-50 dark:bg-gray-800'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${highlight ? 'text-green-600' : rate > 50 ? 'text-green-600' : rate > 25 ? 'text-yellow-600' : 'text-red-600'}`}>
        {rate}%
      </p>
    </div>
  );
}

function TimeStageCard({ label, days, highlight }: { label: string; days: number | null; highlight?: boolean }) {
  return (
    <div className={`text-center p-3 rounded-lg ${highlight ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200' : 'bg-gray-50 dark:bg-gray-800'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${highlight ? 'text-blue-600' : ''}`}>
        {days !== null ? `${days}d` : 'N/A'}
      </p>
    </div>
  );
}

function formatCurrency(value: number): string {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}
