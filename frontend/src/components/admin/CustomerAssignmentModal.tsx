import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { User, Users, UserCheck, UserX, Search, Loader2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  assignedTo?: string;
  assignedToName?: string;
}

interface Employee {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface CustomerAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onAssignmentComplete: () => void;
}

export default function CustomerAssignmentModal({
  open,
  onClose,
  onAssignmentComplete
}: CustomerAssignmentModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Fetch data when modal opens
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [customersResponse, employeesResponse] = await Promise.all([
        apiClient.getCustomers(),
        apiClient.getUsers()
      ]);

      // Transform customers data
      const customersData = Array.isArray(customersResponse) 
        ? customersResponse 
        : (customersResponse as any).results || [];
      
      const transformedCustomers: Customer[] = customersData.map((customer: any) => ({
        id: customer.id.toString(),
        name: customer.name || 'Unknown',
        phone: customer.phone,
        assignedTo: customer.assigned_to?.toString(),
        assignedToName: customer.assigned_to_name
      }));

      // Filter and transform employees
      const employeesData = employeesResponse.filter((user: any) => user.role === 'employee');
      const transformedEmployees: Employee[] = employeesData.map((user: any) => ({
        id: user.id.toString(),
        name: user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}`.trim()
          : user.username,
        username: user.username,
        role: user.role
      }));

      setCustomers(transformedCustomers);
      setEmployees(transformedEmployees);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search and assignment status
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery);

    const matchesAssignment = 
      assignmentFilter === 'all' ||
      (assignmentFilter === 'assigned' && customer.assignedTo) ||
      (assignmentFilter === 'unassigned' && !customer.assignedTo);

    return matchesSearch && matchesAssignment;
  });

  const handleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    const newSet = new Set(selectedCustomers);
    if (newSet.has(customerId)) {
      newSet.delete(customerId);
    } else {
      newSet.add(customerId);
    }
    setSelectedCustomers(newSet);
  };

  const handleAssign = async () => {
    if (selectedCustomers.size === 0) {
      toast.error('Please select customers to assign');
      return;
    }

    if (!selectedEmployee && selectedEmployee !== 'unassigned') {
      toast.error('Please select an employee or choose to unassign');
      return;
    }

    setAssigning(true);
    try {
      await apiClient.bulkAssignCustomers(
        Array.from(selectedCustomers),
        selectedEmployee === 'unassigned' ? 'unassigned' : selectedEmployee
      );

      const employeeName = selectedEmployee === 'unassigned' 
        ? 'unassigned' 
        : employees.find(e => e.id === selectedEmployee)?.name || 'employee';

      toast.success(`${selectedCustomers.size} customers assigned to ${employeeName}`);
      
      // Reset selections
      setSelectedCustomers(new Set());
      setSelectedEmployee('');
      
      // Refresh data and notify parent
      await fetchData();
      onAssignmentComplete();
    } catch (error) {
      console.error('Error assigning customers:', error);
      toast.error('Failed to assign customers');
    } finally {
      setAssigning(false);
    }
  };

  const getAssignmentStats = () => {
    const assigned = customers.filter(c => c.assignedTo).length;
    const unassigned = customers.length - assigned;
    return { assigned, unassigned, total: customers.length };
  };

  const stats = getAssignmentStats();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Customer Assignment Management
          </DialogTitle>
          <DialogDescription>
            Assign customers to employees for better workload distribution
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading customers and employees...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            <div className="flex gap-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                Total: {stats.total}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                Assigned: {stats.assigned}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <UserX className="w-3 h-3" />
                Unassigned: {stats.unassigned}
              </Badge>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Search Customers</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assignment Status</Label>
                <Select value={assignmentFilter} onValueChange={(value: any) => setAssignmentFilter(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="assigned">Assigned Only</SelectItem>
                    <SelectItem value="unassigned">Unassigned Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assign To Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Remove Assignment</SelectItem>
                    {employees.map(employee => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} ({employee.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selection Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label>
                  Select All ({selectedCustomers.size} of {filteredCustomers.length} selected)
                </Label>
              </div>

              {selectedCustomers.size > 0 && (
                <Button
                  onClick={handleAssign}
                  disabled={assigning || !selectedEmployee}
                  className="flex items-center gap-2"
                >
                  {assigning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  Assign {selectedCustomers.size} Customer{selectedCustomers.size !== 1 ? 's' : ''}
                </Button>
              )}
            </div>

            {/* Customer List */}
            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-4 space-y-2">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No customers found matching your criteria
                  </div>
                ) : (
                  filteredCustomers.map(customer => (
                    <div
                      key={customer.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedCustomers.has(customer.id)}
                        onCheckedChange={() => handleSelectCustomer(customer.id)}
                      />
                      
                      <div className="flex-1">
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">{customer.phone}</div>
                      </div>
                      
                      <div className="text-right">
                        {customer.assignedToName ? (
                          <Badge variant="secondary" className="text-xs">
                            {customer.assignedToName}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Unassigned
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}