import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Birthday, Employee, birthdayService } from '@/services/birthday.service';

import { logger } from '@/lib/logger';
interface BirthdayFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (birthdayData: Partial<Birthday>) => Promise<void>;
  birthday?: Birthday;
}

export default function BirthdayFormModal({
  open,
  onOpenChange,
  onSubmit,
  birthday
}: BirthdayFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [formData, setFormData] = useState({
    employee: '',
    birth_date: '',
    show_age: true,
    announce_birthday: true,
  });

  // Load employees without birthday records
  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const data = await birthdayService.getEmployeesWithoutBirthday();
      setEmployees(data);
    } catch (error) {
      logger.error('Error loading employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Load form data when editing
  useEffect(() => {
    if (birthday) {
      setFormData({
        employee: birthday.employee.toString(),
        birth_date: birthday.birth_date,
        show_age: birthday.show_age,
        announce_birthday: birthday.announce_birthday,
      });
    } else {
      setFormData({
        employee: '',
        birth_date: '',
        show_age: true,
        announce_birthday: true,
      });
    }
  }, [birthday]);

  // Load employees when modal opens for new birthday
  useEffect(() => {
    if (open && !birthday) {
      loadEmployees();
    }
  }, [open, birthday]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employee) {
      toast.error('Please select an employee');
      return;
    }
    
    if (!formData.birth_date) {
      toast.error('Please enter a birth date');
      return;
    }

    // Validate birth date is not in the future
    const birthDate = new Date(formData.birth_date);
    const today = new Date();
    if (birthDate > today) {
      toast.error('Birth date cannot be in the future');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        employee: parseInt(formData.employee),
        birth_date: formData.birth_date,
        show_age: formData.show_age,
        announce_birthday: formData.announce_birthday,
      });
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {birthday ? 'Edit Birthday' : 'Add Birthday'}
          </DialogTitle>
          <DialogDescription>
            {birthday 
              ? 'Update the birthday information below.'
              : 'Add a new employee birthday to the calendar.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label htmlFor="employee">Employee *</Label>
            {birthday ? (
              <Input
                value={birthday.employee_name}
                disabled
                className="input-field"
              />
            ) : (
              <Select 
                value={formData.employee} 
                onValueChange={(value) => setFormData({ ...formData, employee: value })}
                disabled={loadingEmployees}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingEmployees ? "Loading employees..." : "Select an employee"} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      <div className="flex flex-col">
                        <span>{employee.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {employee.role} • {employee.company_name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                  {employees.length === 0 && !loadingEmployees && (
                    <SelectItem value="" disabled>
                      No employees available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label htmlFor="birth_date">Birth Date *</Label>
            <Input
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="input-field"
              max={new Date().toISOString().split('T')[0]} // Prevent future dates
            />
          </div>

          {/* Show Age Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show_age"
              checked={formData.show_age}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, show_age: checked as boolean })
              }
            />
            <Label htmlFor="show_age" className="text-sm font-medium">
              Show age in birthday announcements
            </Label>
          </div>

          {/* Announce Birthday Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="announce_birthday"
              checked={formData.announce_birthday}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, announce_birthday: checked as boolean })
              }
            />
            <Label htmlFor="announce_birthday" className="text-sm font-medium">
              Create automatic birthday announcements
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {birthday ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                birthday ? 'Update Birthday' : 'Add Birthday'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}