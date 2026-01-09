import { Lead } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import LeadStatusChip from './LeadStatusChip';
import StaffProfileChip from '@/components/common/StaffProfileChip';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Home, 
  IndianRupee, 
  Calendar, 
  MessageSquare,
  Clock,
  FileText,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';

interface LeadDetailsModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  isManagerView?: boolean;
  onEdit?: () => void;
  canEdit?: boolean;
}

export default function LeadDetailsModal({ open, onClose, lead, isManagerView = false, onEdit, canEdit = true }: LeadDetailsModalProps) {
  if (!lead) return null;

  const formatBudget = (min: number, max: number) => {
    const formatValue = (val: number) => {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(0)} L`;
      if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
      return `₹${val}`;
    };
    return `${formatValue(min)} - ${formatValue(max)}`;
  };

  const sourceLabels: Record<string, string> = {
    call: 'Phone Call',
    walk_in: 'Walk In',
    website: 'Website',
    referral: 'Referral',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <span className="text-xl truncate block">{lead.name}</span>
                <div className="flex items-center gap-2 mt-1">
                  <LeadStatusChip status={lead.status} />
                  {lead.source && (
                    <Badge variant="outline" className="text-xs">
                      {sourceLabels[lead.source] || lead.source}
                    </Badge>
                  )}
                </div>
              </div>
            </DialogTitle>
            {canEdit && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0">
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!isManagerView ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Phone className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{lead.phone}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Contact details are hidden for managers.</p>
                  </div>
                )}
                {!isManagerView && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Mail className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{lead.email || '-'}</p>
                    </div>
                  </div>
                )}
                {!isManagerView && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-medium">{lead.address || '-'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!isManagerView && (
              <>
                <Separator />

                {/* Property Requirements */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Property Requirements
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Home className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Type</p>
                        <p className="font-medium capitalize">{lead.requirementType || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Home className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">BHK</p>
                        <p className="font-medium">{lead.bhkRequirement ? `${lead.bhkRequirement} BHK` : '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 col-span-2">
                      <IndianRupee className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="font-medium">
                          {lead.budgetMin && lead.budgetMax ? formatBudget(lead.budgetMin, lead.budgetMax) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {lead.preferredLocation && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 mt-4">
                      <MapPin className="w-4 h-4 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Preferred Location</p>
                        <p className="font-medium">{lead.preferredLocation}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Follow-up & Dates */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Timeline
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Follow-up Date</p>
                    <p className="font-medium">
                      {lead.followUpDate ? format(new Date(lead.followUpDate), 'MMM dd, yyyy') : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Clock className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">{format(new Date(lead.createdAt), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Clock className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{format(new Date(lead.updatedAt), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Created By */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Created By
              </h3>
              <div className="p-3 rounded-lg bg-muted/50">
                <StaffProfileChip userId={lead.createdBy} showDetails={!isManagerView} />
              </div>
            </div>
            {lead.description && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Description
                  </h3>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <FileText className="w-4 h-4 text-primary mt-0.5" />
                    <p className="text-sm">{lead.description}</p>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {lead.notes && lead.notes.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Notes ({lead.notes.length})
                  </h3>
                  <div className="space-y-3">
                    {lead.notes.map((note) => (
                      <div key={note.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <MessageSquare className="w-4 h-4 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(note.createdAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
