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
  const canViewPhone = user ? canViewCustomerPhone(user.role) : false;
  const [formData, setFormData] = useState({
    status: 'todo' as TaskStatus,
    assignedProject: 'none' as string,
    nextActionDate: null as Date | null,
    notes: '' as string,
    selectedLeadId: '' as string,
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        status: task.status,
        assignedProject: task.assignedProject || 'none',
        nextActionDate: task.nextActionDate || null,
        notes: task.notes.length > 0 ? task.notes[task.notes.length - 1].content : '',
        selectedLeadId: '',
      });
    } else {
      setFormData({
        status: 'todo',
        assignedProject: 'none',
        nextActionDate: null,
        notes: '',
        selectedLeadId: '',
      });
    }
  }, [task, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const assignedProject = formData.assignedProject === 'none' ? undefined : formData.assignedProject;

    if (isCreating) {
      if (!formData.selectedLeadId) {
        return;
      }
      const selectedLead = availableLeads.find(l => l.id === formData.selectedLeadId);
      if (!selectedLead) return;

      onSave({
        lead: selectedLead,
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
            {task ? 'Update task details and status' : 'Create a new task for lead follow-up'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {task && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Lead</p>
              <p className="font-medium">{task.lead.name}</p>
              {canViewPhone && (
                <p className="text-sm text-muted-foreground">{task.lead.phone}</p>
              )}
            </div>
          )}

          {isCreating && !task && (
            <div className="space-y-2">
              <Label>Select Lead <span className="text-destructive">*</span></Label>
              <Select
                value={formData.selectedLeadId}
                onValueChange={(value) => setFormData({ ...formData, selectedLeadId: value })}
                required
              >
                <SelectTrigger className={cn(!formData.selectedLeadId && "text-muted-foreground")}>
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent>
                  {availableLeads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {canViewPhone ? `${lead.name} - ${lead.phone}` : lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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
