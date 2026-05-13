import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { Trophy, Users } from 'lucide-react';

export function TeamLeaderboard() {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/ase-leads/analytics/team-performance/', { period });
      setData(response);
    } catch (err) {
      console.error('Failed to fetch team performance:', err);
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

  const teams = [
    {
      name: 'BRE Team',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      members: data.bre?.member_count || 0,
      topPerformer: data.bre?.top_performer,
      keyMetric: `${data.bre?.metrics?.leads_qualified || 0} qualified`,
      rate: `${data.bre?.metrics?.qualification_rate || 0}%`,
    },
    {
      name: 'BOE Team',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      members: data.boe?.member_count || 0,
      topPerformer: data.boe?.top_performer,
      keyMetric: `${data.boe?.metrics?.leads_contacted || 0} contacted`,
      rate: `${data.boe?.metrics?.contact_rate || 0}%`,
    },
    {
      name: 'CRE Team',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      members: data.cre?.member_count || 0,
      topPerformer: data.cre?.top_performer,
      keyMetric: `${data.cre?.metrics?.deals_won || 0} won`,
      rate: `${data.cre?.metrics?.win_rate || 0}%`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Team Leaderboard
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
        <div className="space-y-4">
          {teams.map((team, i) => (
            <div key={team.name} className="flex items-center gap-4 p-4 border rounded-lg">
              {/* Rank */}
              <div className={`w-10 h-10 rounded-full ${team.bgColor} flex items-center justify-center shrink-0`}>
                <span className={`font-bold ${team.color}`}>{i + 1}</span>
              </div>

              {/* Team Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{team.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    {team.members}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {team.keyMetric} • Rate: {team.rate}
                </p>
                {team.topPerformer && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ⭐ Top: {team.topPerformer}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
