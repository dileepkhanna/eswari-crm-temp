import { Card, CardContent } from '@/components/ui/card';
import { LeadStatusBadge, EngagementIndicator, PriorityBadge } from '@/components/ase-marketing/shared';
import { Phone, Mail, Building, User } from 'lucide-react';
import type { LeadQueueItem } from '@/hooks/ase-marketing/useASEMarketing';

interface LeadCardProps {
  lead: LeadQueueItem;
  onClick?: (lead: LeadQueueItem) => void;
  actions?: React.ReactNode;
}

export function LeadCard({ lead, onClick, actions }: LeadCardProps) {
  return (
    <Card
      className={`hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={() => onClick?.(lead)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Lead Info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Company & Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-base truncate">{lead.company_name}</h4>
              <LeadStatusBadge status={lead.status} />
              <PriorityBadge priority={lead.priority} />
              {lead.engagement_level && lead.engagement_level !== 'cold' && (
                <EngagementIndicator level={lead.engagement_level} />
              )}
            </div>

            {/* Contact Details */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {lead.contact_person}
              </span>
              {lead.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {lead.phone}
                </span>
              )}
              {lead.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {lead.email}
                </span>
              )}
              {lead.industry && (
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  {lead.industry}
                </span>
              )}
            </div>

            {/* Score */}
            {lead.lead_score > 0 && (
              <div className="text-xs text-muted-foreground">
                Lead Score: <span className="font-medium text-foreground">{lead.lead_score}/100</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
