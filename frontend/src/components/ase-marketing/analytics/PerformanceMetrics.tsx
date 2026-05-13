import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { BarChart, TrendingUp, Target } from 'lucide-react';

export function PerformanceMetrics() {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/ase-leads/analytics/my-performance/', { period });
      setData(response);
    } catch (err) {
      console.error('Failed to fetch performance:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const renderMetrics = () => {
    switch (data.role) {
      case 'bre':
        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard label="Researched" value={data.leads_researched} />
            <MetricCard label="Qualified" value={data.qualified} />
            <MetricCard label="Disqualified" value={data.disqualified} />
            <MetricCard label="Qualification Rate" value={`${data.qualification_rate}%`} />
            <MetricCard label="Avg Lead Score" value={data.avg_lead_score} />
          </div>
        );
      case 'boe':
        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard label="Calls Made" value={data.calls_made} />
            <MetricCard label="Emails Sent" value={data.emails_sent} />
            <MetricCard label="Contacted" value={data.leads_contacted} />
            <MetricCard label="Contact Rate" value={`${data.contact_rate}%`} />
            <MetricCard label="Avg Response" value={`${data.avg_response_time}h`} />
          </div>
        );
      case 'cre':
        return (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <MetricCard label="Proposals" value={data.proposals_sent} />
            <MetricCard label="Meetings" value={data.meetings_held} />
            <MetricCard label="Deals Won" value={data.deals_won} />
            <MetricCard label="Win Rate" value={`${data.win_rate}%`} />
            <MetricCard label="Avg Deal" value={`₹${(data.avg_deal_size / 1000).toFixed(0)}K`} />
            <MetricCard label="Revenue" value={`₹${(data.revenue / 100000).toFixed(1)}L`} />
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total Leads" value={data.total_leads} />
            <MetricCard label="Deals Won" value={data.deals_won} />
            <MetricCard label="Revenue" value={`₹${(data.revenue / 100000).toFixed(1)}L`} />
            <MetricCard label="Conversion" value={`${data.overall_conversion}%`} />
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            My Performance
          </CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {renderMetrics()}
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-3 border rounded-lg">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
