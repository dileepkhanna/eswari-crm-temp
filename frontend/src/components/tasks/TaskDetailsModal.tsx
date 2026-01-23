import { Task } from '@/types';
import { useAuth } from '@/contexts/AuthContextDjango';
import { canViewCustomerPhone } from '@/lib/permissions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import TaskStatusChip from './TaskStatusChip';
import StaffProfileChip from '@/components/common/StaffProfileChip';
import { 
  User, 
  Phone, 
  Mail, 
  Home, 
  IndianRupee, 
  Calendar, 
  MessageSquare,
  Clock,
  Building,
  Edit,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';

interface TaskDetailsModalProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit?: () => void;
  canEdit?: boolean;
  getProjectName: (projectId?: string) => string;
}

export default function TaskDetailsModal({ 
  open, 
  onClose, 
  task, 
  onEdit, 
  canEdit = true,
  getProjectName 
}: TaskDetailsModalProps) {
  const { user } = useAuth();
  
  if (!task) return null;
  
  const canViewPhone = user ? canViewCustomerPhone(user.role, user.id, task.lead?.createdBy) : false;

  const formatBudget = (min: number, max: number) => {
    const formatValue = (val: number) => {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(0)} L`;
      if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
      return `₹${val}`;
    };
    return `${formatValue(min)} - ${formatValue(max)}`;
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
                <span className="text-xl truncate block">{task.lead?.name || 'Unknown Lead'}</span>
                <div className="flex items-center gap-2 mt-1">
                  <TaskStatusChip status={task.status} />
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
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium">{task.lead?.name || 'Unknown Lead'}</p>
                  </div>
                </div>
                {canViewPhone ? (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium">{task.lead?.phone || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{task.lead?.email || 'Not provided'}</p>
                      </div>
                    </div>
                    {task.lead?.source && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-xs text-muted-foreground">Lead Source</p>
                          <p className="font-medium capitalize">{task.lead.source}</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/50 sm:col-span-1">
                    <p className="text-sm text-muted-foreground">Contact details are hidden for managers.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Contact Information */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer Contact Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium">{task.lead?.name || 'Unknown Lead'}</p>
                  </div>
                </div>
                {canViewPhone && (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Phone className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Phone Number</p>
                        <p className="font-medium text-lg">{task.lead?.phone || '-'}</p>
                      </div>
                      {task.lead?.phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`tel:${task.lead.phone}`, '_self')}
                          className="shrink-0"
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Mail className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Email Address</p>
                        <p className="font-medium">{task.lead?.email || 'Not provided'}</p>
                      </div>
                      {task.lead?.email && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`mailto:${task.lead.email}`, '_self')}
                          className="shrink-0"
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Email
                        </Button>
                      )}
                    </div>
                    {task.lead?.source && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <MapPin className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Lead Source</p>
                          <p className="font-medium capitalize">{task.lead.source}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {!canViewPhone && (
                  <div className="p-3 rounded-lg bg-muted/50 sm:col-span-1">
                    <p className="text-sm text-muted-foreground">Contact details are hidden for managers.</p>
                  </div>
                )}
              </div>
            </div>

            {canViewPhone && (
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
                        <p className="font-medium capitalize">{task.lead?.requirementType || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Home className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">BHK</p>
                        <p className="font-medium">{task.lead?.bhkRequirement ? `${task.lead.bhkRequirement} BHK` : '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 col-span-2">
                      <IndianRupee className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="font-medium">
                          {task.lead?.budgetMin && task.lead?.budgetMax ? formatBudget(task.lead.budgetMin, task.lead.budgetMax) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Task Details */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Task Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Building className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Project</p>
                    <p className="font-medium">{getProjectName(task.assignedProject)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Next Action Date</p>
                    <p className="font-medium">
                      {task.nextActionDate ? format(new Date(task.nextActionDate), 'MMM dd, yyyy') : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Timeline
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Clock className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">{format(new Date(task.createdAt), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Clock className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{format(new Date(task.updatedAt), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Assigned To */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Assigned To
              </h3>
              <div className="p-3 rounded-lg bg-muted/50">
                <StaffProfileChip userId={task.assignedTo} showDetails={canViewPhone} />
              </div>
            </div>

            {/* Notes */}
            {task.notes && task.notes.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Notes ({task.notes.length})
                  </h3>
                  <div className="space-y-3">
                    {task.notes.map((note) => (
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