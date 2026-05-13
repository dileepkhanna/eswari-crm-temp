import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LeadStatusBadge, EngagementIndicator, PriorityBadge } from '@/components/ase-marketing/shared';
import { useLeadTimeline } from '@/hooks/ase-marketing/useASEMarketing';
import { Phone, Mail, Building, User, Globe, Calendar, DollarSign, Clock, ArrowLeft } from 'lucide-react';
import type { LeadQueueItem } from '@/hooks/ase-marketing/useASEMarketing';

interface LeadDetailsProps {
  lead: LeadQueueItem;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export function LeadDetails({ lead, onBack, actions }: LeadDetailsProps) {
  const { data: timeline, loading: timelineLoading } = useLeadTimeline(lead.id);

  return (
    <div className="space-y-4">
      {/* Back button */}
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Queue
        </Button>
      )}

      {/* Lead Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{lead.company_name}</CardTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <LeadStatusBadge status={lead.status} />
                <PriorityBadge priority={lead.priority} />
                {lead.engagement_level && <EngagementIndicator level={lead.engagement_level} />}
                {lead.lead_score > 0 && (
                  <Badge variant="outline">Score: {lead.lead_score}/100</Badge>
                )}
              </div>
            </div>
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Info */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground uppercase">Contact</h4>
              <div className="space-y-1.5 text-sm">
                <p className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> {lead.contact_person}</p>
                {lead.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> {lead.phone}</p>}
                {lead.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> {lead.email}</p>}
                {lead.website && <p className="flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground" /> {lead.website}</p>}
              </div>
            </div>

            {/* Business Info */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground uppercase">Business</h4>
              <div className="space-y-1.5 text-sm">
                {lead.industry && <p className="flex items-center gap-2"><Building className="w-4 h-4 text-muted-foreground" /> {lead.industry}</p>}
                {lead.company_size && <p className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> {lead.company_size} employees</p>}
                {lead.estimated_project_value && (
                  <p className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    ₹{Number(lead.estimated_project_value).toLocaleString('en-IN')}
                  </p>
                )}
                {lead.created_at && (
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Created {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium text-sm text-muted-foreground uppercase mb-2">Notes</h4>
              <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timelineLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : !timeline?.results?.length ? (
            <p className="text-center text-muted-foreground py-6">No activities yet</p>
          ) : (
            <div className="space-y-3">
              {timeline.results.map((activity) => (
                <div key={activity.id} className="flex gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {activity.activity_type === 'call' && <Phone className="w-4 h-4 text-primary" />}
                    {activity.activity_type === 'email' && <Mail className="w-4 h-4 text-primary" />}
                    {activity.activity_type === 'meeting' && <Calendar className="w-4 h-4 text-primary" />}
                    {!['call', 'email', 'meeting'].includes(activity.activity_type) && <Clock className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <Badge variant="outline" className="text-xs">{activity.activity_type}</Badge>
                    </div>
                    {activity.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{activity.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
