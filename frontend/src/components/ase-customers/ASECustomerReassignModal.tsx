import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ASECustomer } from '@/types/ase-customer';
import { UserIcon, ArrowRightIcon } from 'lucide-react';

import { logger } from '@/lib/logger';
interface Employee {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface ASECustomerReassignModalProps {
  open: boolean;
  onClose: () => void;
  onReassign: (assignedTo: string, reason: string) => Promise<void>;
  customer: ASECustomer;
  employees: Employee[];
}

export default function ASECustomerReassignModal({
  open,
  onClose,
  onReassign,
  customer,
  employees
}: ASECustomerReassignModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [reason, setReason] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedEmployee('');
      setReason('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee) {
      alert('Please select an employee to assign');
      return;
    }

    try {
      setLoading(true);
      if (selectedEmployee === 'remove') {
        await onReassign('', reason);
      } else {
        await onReassign(selectedEmployee, reason);
      }
      onClose();
    } catch (error) {
      logger.error('Error reassigning customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (employee: Employee) => {
    const fullName = `${employee.first_name} ${employee.last_name}`.trim();
    return fullName || employee.username;
  };

  const selectedEmployeeData = employees.find(emp => emp.id === selectedEmployee);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby="reassign-description">
        <DialogHeader>
          <DialogTitle>Reassign Customer</DialogTitle>
        </DialogHeader>

        <div id="reassign-description" className="sr-only">
          Reassign this customer to a different employee or telecaller
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{customer.name}</h3>
                <p className="text-sm text-muted-foreground">{customer.phone}</p>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm">
                <span className="text-muted-foreground">Currently assigned to: </span>
                <span className="font-medium">
                  {customer.assigned_to_name || 'Unassigned'}
                </span>
              </p>
            </div>
          </div>

          {/* Assignment Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="assigned_to">Assign To *</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee or telecaller" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remove">
                    <span className="text-red-600">— Remove Assignment —</span>
                  </SelectItem>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex items-center gap-2">
                        <span>{getEmployeeName(employee)}</span>
                        <span className="text-xs text-muted-foreground">
                          ({employee.role})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignment Preview */}
            {selectedEmployeeData && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{customer.assigned_to_name || 'Unassigned'}</span>
                  <ArrowRightIcon className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-blue-700">
                    {getEmployeeName(selectedEmployeeData)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="reason">Reason for Reassignment</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for reassignment (optional)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Common Reasons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Reasons:</Label>
            <div className="flex flex-wrap gap-2">
              {[
                'Customer interested - needs follow-up',
                'Language preference',
                'Workload balancing',
                'Specialized expertise needed',
                'Customer request'
              ].map((quickReason) => (
                <Button
                  key={quickReason}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReason(quickReason)}
                  className="text-xs"
                >
                  {quickReason}
                </Button>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedEmployee}>
              {loading ? 'Reassigning...' : 'Reassign Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}