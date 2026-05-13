import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMyLeadQueue } from '@/hooks/ase-marketing/useASEMarketing';
import { LeadCard } from './LeadCard';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import type { LeadQueueItem } from '@/hooks/ase-marketing/useASEMarketing';

interface LeadQueueProps {
  onLeadSelect?: (lead: LeadQueueItem) => void;
  actions?: (lead: LeadQueueItem) => React.ReactNode;
  title?: string;
}

export function LeadQueue({ onLeadSelect, actions, title = 'Lead Queue' }: LeadQueueProps) {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);

  const { data, loading, error, refetch } = useMyLeadQueue({ ...filters, page });

  const handleFilterChange = (key: string, value: string) => {
    if (value === 'all') {
      const newFilters = { ...filters };
      delete newFilters[key];
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, [key]: value });
    }
    setPage(1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {title} {data?.count ? `(${data.count})` : ''}
          </CardTitle>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select onValueChange={(v) => handleFilterChange('status', v)} defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="nurturing">Nurturing</SelectItem>
                <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                <SelectItem value="negotiating">Negotiating</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(v) => handleFilterChange('priority', v)} defaultValue="all">
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
          </div>
        ) : !data?.results?.length ? (
          <p className="text-center text-muted-foreground py-12">No leads found</p>
        ) : (
          <div className="space-y-3">
            {data.results.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={onLeadSelect}
                actions={actions?.(lead)}
              />
            ))}

            {/* Pagination */}
            {data.total_pages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {data.page} of {data.total_pages} ({data.count} total)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.total_pages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
