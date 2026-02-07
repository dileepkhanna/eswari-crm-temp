import { useState, useEffect } from 'react';
import { Announcement } from '@/types';
import { useAuth } from '@/contexts/AuthContextDjango';
import { apiClient } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Megaphone, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

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
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    expiresAt: '',
  });
  const [targetRoles, setTargetRoles] = useState<('admin' | 'manager' | 'employee')[]>(['manager', 'employee']);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<number[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Load manager's employees when modal opens
  useEffect(() => {
    if (open && user?.role === 'manager') {
      loadManagerEmployees();
    }
  }, [open, user]);

  const loadManagerEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const employeesList = await apiClient.getManagerEmployees();
      setEmployees(employeesList);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Could not load your employees list');
    } finally {
      setLoadingEmployees(false);
    }
  };

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

    const announcementData: any = {
      title: formData.title,
      message: formData.message,
      priority: formData.priority,
      target_roles: targetRoles,
      expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
      is_active: true,
    };

    // Add assigned employees if manager selected any
    if (user?.role === 'manager' && assignedEmployeeIds.length > 0) {
      announcementData.assigned_employee_ids = assignedEmployeeIds;
    }

    onSubmit(announcementData);

    // Reset form
    setFormData({ title: '', message: '', priority: 'medium', expiresAt: '' });
    setTargetRoles(['manager', 'employee']);
    setAssignedEmployeeIds([]);
    onOpenChange(false);
  };

  const toggleRole = (role: 'admin' | 'manager' | 'employee') => {
    setTargetRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const toggleEmployee = (employeeId: number) => {
    setAssignedEmployeeIds(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const getEmployeeDisplayName = (employee: Employee) => {
    if (employee.first_name || employee.last_name) {
      return `${employee.first_name} ${employee.last_name}`.trim();
    }
    return employee.username;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Megaphone className="w-5 h-5 text-primary" />
            New Announcement
          </DialogTitle>
          <DialogDescription>
            Create a new announcement to notify team members about important updates or information.
          </DialogDescription>
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

          {/* Assign to Specific Employees (Managers Only) */}
          {user?.role === 'manager' && (
            <div className="space-y-3">
              <Label>Assign to Specific Employees (Optional)</Label>
              <p className="text-xs text-muted-foreground">
                Select specific employees to see this announcement. If none selected, all employees in target roles will see it.
              </p>
              {loadingEmployees ? (
                <div className="flex items-center gap-2 p-4 border rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading employees...</span>
                </div>
              ) : employees.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-start gap-2 p-2 hover:bg-accent/50 rounded">
                      <Checkbox
                        id={`employee-${employee.id}`}
                        checked={assignedEmployeeIds.includes(employee.id)}
                        onCheckedChange={() => toggleEmployee(employee.id)}
                      />
                      <label
                        htmlFor={`employee-${employee.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="text-sm font-medium">
                          {getEmployeeDisplayName(employee)}
                        </div>
                        {employee.email && (
                          <div className="text-xs text-muted-foreground">
                            {employee.email}
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">No employees assigned to you</p>
                </div>
              )}
            </div>
          )}

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
