import { useState, useEffect } from 'react';
import { Customer, CallStatus, User } from '@/types';
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
import { toast } from 'sonner';

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (customer: Partial<Customer>) => void;
  customer?: Customer | null;
  employees: User[]; // For assignment by managers/admins
  canAssignToEmployee?: boolean;
}

export default function CustomerFormModal({ 
  open, 
  onClose, 
  onSave, 
  customer, 
  employees = [],
  canAssignToEmployee = false 
}: CustomerFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    callStatus: 'pending' as CallStatus,
    customCallStatus: '',
    assignedTo: '',
    scheduledDate: null as Date | null,
    notes: '',
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    console.log('🔍 CustomerFormModal - customer prop changed:', customer);
    console.log('🔍 CustomerFormModal - modal open:', open);
    
    if (customer) {
      console.log('📝 Setting form data for editing customer:', customer);
      setFormData({
        name: customer.name || '',
        phone: customer.phone,
        callStatus: customer.callStatus,
        customCallStatus: customer.customCallStatus || '',
        assignedTo: customer.assignedTo || '',
        scheduledDate: customer.scheduledDate || null,
        notes: customer.notes || '',
      });
    } else {
      console.log('➕ Setting form data for new customer');
      setFormData({
        name: '',
        phone: '',
        callStatus: 'pending',
        customCallStatus: '',
        assignedTo: '',
        scheduledDate: null,
        notes: '',
      });
    }
  }, [customer, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number (mandatory)
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    // Validate custom status if selected (only for existing customers)
    if (customer && formData.callStatus === 'custom' && !formData.customCallStatus.trim()) {
      toast.error('Please enter a custom call status');
      return;
    }

    onSave({
      ...formData,
      name: formData.name.trim() || undefined,
      phone: formData.phone.trim(),
      customCallStatus: formData.callStatus === 'custom' ? formData.customCallStatus.trim() : undefined,
      assignedTo: formData.assignedTo || undefined,
      scheduledDate: formData.scheduledDate || undefined,
      notes: formData.notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {customer 
              ? 'Update customer information and call status after making the call' 
              : 'Add customer with phone number and name. You can update call status after making the call.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Basic Information - Always shown */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
                maxLength={15}
                required
                className="input-field h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Name (Optional)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter customer name"
                className="input-field h-10"
              />
            </div>

            {/* Call Status - Always enabled for editing */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Call Status</Label>
              <Select
                value={formData.callStatus}
                onValueChange={(value: CallStatus) => setFormData({ ...formData, callStatus: value })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="not_answered">Not Answered</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="no_response">No Response</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Custom status input field */}
              {formData.callStatus === 'custom' && (
                <div className="mt-2">
                  <Input
                    placeholder="Enter custom call status"
                    value={formData.customCallStatus}
                    onChange={(e) => setFormData({ ...formData, customCallStatus: e.target.value })}
                    className="input-field h-10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Examples: "Callback Requested", "Wrong Number", "Interested but Busy"
                  </p>
                </div>
              )}
            </div>

            {/* Employee Assignment - Only for managers/admins */}
            {canAssignToEmployee && employees.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Assign to Employee</Label>
                <Select
                  value={formData.assignedTo || "unassigned"}
                  onValueChange={(value) => setFormData({ ...formData, assignedTo: value === "unassigned" ? "" : value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select employee (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">No assignment</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} ({employee.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Scheduled Date - Always enabled for editing */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Scheduled Call Date (Optional)</Label>
              <div className="flex gap-2">
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal h-10",
                        !formData.scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.scheduledDate ? format(formData.scheduledDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.scheduledDate || undefined}
                      onSelect={(date) => {
                        setFormData({ ...formData, scheduledDate: date || null });
                        setIsDatePickerOpen(false);
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {formData.scheduledDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, scheduledDate: null })}
                    className="px-3 h-10"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Notes - Always enabled for editing */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Add any notes about this customer..."
                className="input-field resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="h-10">
              Cancel
            </Button>
            <Button type="submit" className="btn-primary h-10">
              {customer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}