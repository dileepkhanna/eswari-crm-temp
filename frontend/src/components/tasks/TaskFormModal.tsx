import { useState, useEffect } from 'react';
import { Task, TaskStatus, Lead, Project } from '@/types';
import { useAuth } from '@/contexts/AuthContextDjango';
import { canViewCustomerPhone, maskPhoneNumber } from '@/lib/permissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  task?: Task | null;
  isCreating?: boolean;
  availableLeads?: Lead[];
  projects: Project[];
}

export default function TaskFormModal({
  open,
  onClose,
  onSave,
  task,
  isCreating = false,
  availableLeads = [],
  projects,
}: TaskFormModalProps) {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    status: 'in_progress' as TaskStatus,
    assignedProject: 'none' as string,
    nextActionDate: null as Date | null,
    notes: '' as string,
    selectedLeadId: '' as string,
    // Auto-generated lead fields
    leadName: '' as string,
    leadPhone: '' as string,
    leadEmail: '' as string,
  });

  const canViewPhone = task ? canViewCustomerPhone(user?.role, user?.id, task.lead?.createdBy) : false;
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        status: task.status,
        assignedProject: task.assignedProject || 'none',
        nextActionDate: task.nextActionDate || null,
        notes: task.notes.length > 0 ? task.notes[task.notes.length - 1].content : '',
        selectedLeadId: '',
        leadName: '',
        leadPhone: '',
        leadEmail: '',
      });
    } else {
      setFormData({
        status: 'in_progress',
        assignedProject: 'none',
        nextActionDate: null,
        notes: '',
        selectedLeadId: '',
        leadName: '',
        leadPhone: '',
        leadEmail: '',
      });
    }
  }, [task, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const assignedProject = formData.assignedProject === 'none' ? undefined : formData.assignedProject;

    if (isCreating) {
      // Auto-generate lead if creating new task
      let leadToUse = null;
      
      if (formData.selectedLeadId) {
        // Use existing selected lead
        leadToUse = availableLeads.find(l => l.id === formData.selectedLeadId);
      } else if (formData.leadName && formData.leadPhone) {
        // Create new lead automatically
        leadToUse = {
          id: `lead_${Date.now()}`, // Auto-generated ID
          name: formData.leadName,
          phone: formData.leadPhone,
          email: formData.leadEmail || '',
          address: '',
          requirementType: 'apartment' as const,
          bhkRequirement: '2' as const,
          budgetMin: 0,
          budgetMax: 0,
          description: '',
          status: 'hot' as const,
          notes: [],
          createdBy: user?.id || 'unknown',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      
      if (!leadToUse) {
        // Show error message if no lead data provided
        return;
      }

      onSave({
        lead: leadToUse,
        status: formData.status,
        assignedProject,
        nextActionDate: formData.nextActionDate || undefined,
        notes: formData.notes ? [{
          id: String(Date.now()),
          content: formData.notes,
          createdBy: 'unknown',
          createdAt: new Date()
        }] : [],
        attachments: [],
      });
    } else {
      onSave({
        ...task,
        status: formData.status,
        assignedProject,
        nextActionDate: formData.nextActionDate || undefined,
        updatedAt: new Date(),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {task ? 'Edit Task' : 'Create Task'}
          </DialogTitle>
          <DialogDescription>
            {task ? 'Update task details and status' : 'Create a new task with customer information'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {task && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Lead</p>
              <p className="font-medium">{task.lead?.name || 'Unknown Lead'}</p>
              {canViewPhone && (
                <p className="text-sm text-muted-foreground">{task.lead?.phone || '-'}</p>
              )}
            </div>
          )}

          {isCreating && !task && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Customer Information</Label>
                <span className="text-xs text-muted-foreground">Required</span>
              </div>
              
              {/* Option to select existing lead */}
              {availableLeads.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Existing Customer (Optional)</Label>
                  <Select
                    value={formData.selectedLeadId}
                    onValueChange={(value) => {
                      setFormData({ 
                        ...formData, 
                        selectedLeadId: value,
                        // Clear manual fields when selecting existing lead
                        leadName: '',
                        leadPhone: '',
                        leadEmail: ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose existing customer or create new below" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Create New Customer</SelectItem>
                      {availableLeads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {canViewPhone ? `${lead.name} - ${lead.phone}` : lead.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Manual lead creation fields - only show if no existing lead selected */}
              {!formData.selectedLeadId && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                  <Label className="text-sm font-medium">Create New Customer</Label>
                  
                  <div className="space-y-2">
                    <Label>Customer Name <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.leadName}
                      onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
                      placeholder="Enter customer name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone Number <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.leadPhone}
                      onChange={(e) => setFormData({ ...formData, leadPhone: e.target.value })}
                      placeholder="Enter phone number"
                      type="tel"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Address (Optional)</Label>
                    <Input
                      value={formData.leadEmail}
                      onChange={(e) => setFormData({ ...formData, leadEmail: e.target.value })}
                      placeholder="Enter email address"
                      type="email"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Assigned Project</Label>
            <Select
              value={formData.assignedProject}
              onValueChange={(value) => setFormData({ ...formData, assignedProject: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} - {project.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: TaskStatus) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="site_visit">Site Visit</SelectItem>
                <SelectItem value="family_visit">Family Visit</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Next Action Date</Label>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.nextActionDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.nextActionDate ? format(formData.nextActionDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.nextActionDate || undefined}
                  onSelect={(date) => {
                    setFormData({ ...formData, nextActionDate: date || null });
                    setIsDatePickerOpen(false);
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="input-field resize-none"
              placeholder="Add notes about this task..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="btn-primary"
              disabled={isCreating && !formData.selectedLeadId}
            >
              {task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
