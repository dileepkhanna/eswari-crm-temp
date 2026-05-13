import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { marketingActions } from '@/hooks/ase-marketing/useASEMarketing';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface TaskFormProps {
  leadId: number;
  assignedTo?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TaskForm({ leadId, assignedTo, onSuccess, onCancel }: TaskFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    task_type: 'followup',
    priority: 'medium',
    description: '',
    due_date: '',
    assigned_to: assignedTo?.toString() || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error('Title is required'); return; }
    if (!formData.due_date) { toast.error('Due date is required'); return; }
    if (!formData.assigned_to) { toast.error('Assigned to is required'); return; }

    try {
      setLoading(true);
      await marketingActions.createTask({
        lead_id: leadId,
        assigned_to: parseInt(formData.assigned_to),
        task_type: formData.task_type,
        title: formData.title.trim(),
        due_date: new Date(formData.due_date).toISOString(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
      });
      toast.success('Task created');
      setFormData({ title: '', task_type: 'followup', priority: 'medium', description: '', due_date: '', assigned_to: assignedTo?.toString() || '' });
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Task
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Task title"
              />
            </div>

            <div className="space-y-2">
              <Label>Task Type</Label>
              <Select value={formData.task_type} onValueChange={(v) => setFormData({ ...formData, task_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Make Call</SelectItem>
                  <SelectItem value="email">Send Email</SelectItem>
                  <SelectItem value="meeting">Schedule Meeting</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="proposal">Prepare Proposal</SelectItem>
                  <SelectItem value="followup">Follow Up</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          {!assignedTo && (
            <div className="space-y-2">
              <Label>Assign To (User ID) *</Label>
              <Input
                type="number"
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                placeholder="User ID"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task details..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
