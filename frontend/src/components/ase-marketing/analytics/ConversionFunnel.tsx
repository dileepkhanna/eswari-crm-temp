import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { Filter } from 'lucide-react';

export function ConversionFunnel() {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/ase-leads/analytics/conversion-rates/', { period });
      setData(response);
    } catch (err) {
      console.error('Failed to fetch conversion rates:', err);
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

  const stages = [
    { label: 'New → Qualified', rate: data.new_to_qualified, from: data.counts?.new, to: data.counts?.qualified },
    { label: 'Qualified → Contacted', rate: data.qualified_to_contacted, from: data.counts?.qualified, to: data.counts?.contacted },
    { label: 'Contacted → Proposal', rate: data.contacted_to_proposal, from: data.counts?.contacted, to: data.counts?.proposal },
    { label: 'Proposal → Won', rate: data.proposal_to_won, from: data.counts?.proposal, to: data.counts?.won },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Conversion Funnel
          </CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overall conversion */}
        <div className="text-center mb-6 p-4 bg-primary/5 rounded-lg">
          <p className="text-3xl font-bold text-primary">{data.overall_conversion}%</p>
          <p className="text-sm text-muted-foreground">Overall Conversion (New → Won)</p>
        </div>

        {/* Stage-by-stage */}
        <div className="space-y-4">
          {stages.map((stage, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{stage.label}</span>
                <span className="font-bold">{stage.rate}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full bg-primary transition-all"
                  style={{ width: `${Math.max(stage.rate, 2)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stage.from || 0} leads entered</span>
                <span>{stage.to || 0} converted</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
