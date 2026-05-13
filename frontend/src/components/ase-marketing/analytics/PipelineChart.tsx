import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { TrendingUp } from 'lucide-react';

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-gray-400',
  qualified: 'bg-blue-400',
  contacted: 'bg-yellow-400',
  nurturing: 'bg-orange-400',
  proposal_sent: 'bg-purple-400',
  negotiating: 'bg-indigo-400',
  won: 'bg-green-400',
  lost: 'bg-red-400',
};

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  qualified: 'Qualified',
  contacted: 'Contacted',
  nurturing: 'Nurturing',
  proposal_sent: 'Proposal Sent',
  negotiating: 'Negotiating',
  won: 'Won',
  lost: 'Lost',
};

export function PipelineChart() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/ase-leads/analytics/pipeline/');
      setData(response);
    } catch (err) {
      console.error('Failed to fetch pipeline:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (!data?.pipeline) return null;

  const pipeline = data.pipeline;
  const maxCount = Math.max(...Object.values(pipeline).map((s: any) => s.count), 1);

  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Pipeline Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(pipeline).map(([stage, info]: [string, any]) => (
            <div key={stage} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{STAGE_LABELS[stage] || stage}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{info.count} leads</span>
                  {info.total_value > 0 && (
                    <span className="text-xs text-green-600 font-medium">{formatCurrency(info.total_value)}</span>
                  )}
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${STAGE_COLORS[stage] || 'bg-gray-400'}`}
                  style={{ width: `${Math.max((info.count / maxCount) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
