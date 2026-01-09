import { useState } from 'react';
import { Announcement } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Megaphone, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface AnnouncementFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (announcement: Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>) => void;
}

export default function AnnouncementFormModal({
  open,
  onOpenChange,
  onSubmit,
}: AnnouncementFormModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    expiresAt: '',
  });
  const [targetRoles, setTargetRoles] = useState<('admin' | 'manager' | 'employee')[]>(['manager', 'employee']);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Please fill in title and message');
      return;
    }

    if (targetRoles.length === 0) {
      toast.error('Please select at least one target role');
      return;
    }

    onSubmit({
      title: formData.title,
      message: formData.message,
      priority: formData.priority,
      targetRoles,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined,
      isActive: true,
    });

    // Reset form
    setFormData({ title: '', message: '', priority: 'medium', expiresAt: '' });
    setTargetRoles(['manager', 'employee']);
    onOpenChange(false);
    toast.success('Announcement created successfully!');
  };

  const toggleRole = (role: 'admin' | 'manager' | 'employee') => {
    setTargetRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Megaphone className="w-5 h-5 text-primary" />
            New Announcement
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., New Policy Update"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Write your announcement message here..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              className="input-field resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires On (Optional)</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="expiresAt"
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="pl-10 input-field"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Target Audience *</Label>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="role-admin"
                  checked={targetRoles.includes('admin')}
                  onCheckedChange={() => toggleRole('admin')}
                />
                <label htmlFor="role-admin" className="text-sm cursor-pointer">
                  Admins
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="role-manager"
                  checked={targetRoles.includes('manager')}
                  onCheckedChange={() => toggleRole('manager')}
                />
                <label htmlFor="role-manager" className="text-sm cursor-pointer">
                  Managers
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="role-employee"
                  checked={targetRoles.includes('employee')}
                  onCheckedChange={() => toggleRole('employee')}
                />
                <label htmlFor="role-employee" className="text-sm cursor-pointer">
                  Employees
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="btn-accent">
              Send Announcement
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
