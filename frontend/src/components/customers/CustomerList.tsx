import { useState, useMemo } from 'react';
import { Customer, CallStatus, User } from '@/types';
import { useAuth } from '@/contexts/AuthContextDjango';
import CustomerStatusChip from './CustomerStatusChip';
import CustomerFormModal from './CustomerFormModal';
import CustomerExcelImportExport from './CustomerExcelImportExport';
import LeadFormModal from '../leads/LeadFormModal';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Phone, 
  ArrowRight, 
  Trash2, 
  Calendar,
  Target,
  Edit,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface CustomerListProps {
  customers: Customer[];
  employees: User[];
  projects: any[]; // Add projects prop
  onAddCustomer: (customer: Partial<Customer>) => void;
  onUpdateCustomer: (id: string, data: Partial<Customer>) => void;
  onDeleteCustomer: (id: string) => void;
  onBulkImport: (customers: Partial<Customer>[]) => void;
  onConvertToLead: (customerId: string) => void;
  onCreateLead: (leadData: any) => void; // Add new prop for creating lead
  onRefreshCustomers: () => Promise<void>; // Add refresh function
  canManageAll?: boolean; // Admin/Manager permissions
}

export default function CustomerList({
  customers,
  employees,
  projects,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onBulkImport,
  onConvertToLead,
  onCreateLead,
  onRefreshCustomers,
  canManageAll = false
}: CustomerListProps) {
  const { user } = useAuth();
  const isPageVisible = usePageVisibility();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [bulkAssignEmployee, setBulkAssignEmployee] = useState('');
  
  // Lead form modal state
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [convertingCustomer, setConvertingCustomer] = useState<Customer | null>(null);
  
  // Custom status input state
  const [customStatusInputs, setCustomStatusInputs] = useState<Record<string, string>>({});
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingCustomers, setUpdatingCustomers] = useState<Set<string>>(new Set());

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshCustomers();
      toast.success('Customer data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh hook - silent background refresh every 30 seconds
  useAutoRefresh({
    interval: 30, // 30 seconds
    enabled: isPageVisible, // Only refresh when page is visible
    onRefresh: async () => {
      try {
        await onRefreshCustomers();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
        // Don't show error toast for auto-refresh failures to avoid spam
      }
    },
  });

  // Get unique custom statuses from all customers
  const uniqueCustomStatuses = useMemo(() => {
    const customStatuses = customers
      .filter(customer => customer.callStatus === 'custom' && customer.customCallStatus)
      .map(customer => customer.customCallStatus!)
      .filter((status, index, array) => array.indexOf(status) === index) // Remove duplicates
      .sort(); // Sort alphabetically
    
    return customStatuses;
  }, [customers]);

  // Filter customers based on user role and permissions
  const filteredCustomers = useMemo(() => {
    console.log(`🔍 Filtering customers for user: ${user?.id} (${user?.role}), canManageAll: ${canManageAll}`);
    console.log(`📊 Total customers to filter: ${customers.length}`);
    
    return customers.filter(customer => {
      // Search filter
      const matchesSearch = 
        customer.phone.includes(searchQuery) ||
        (customer.name && customer.name.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter - enhanced to handle specific custom statuses
      let matchesStatus = false;
      if (statusFilter === 'all') {
        matchesStatus = true;
      } else if (statusFilter === 'custom') {
        // Generic custom filter - matches any custom status
        matchesStatus = customer.callStatus === 'custom';
      } else if (customer.callStatus === 'custom' && customer.customCallStatus === statusFilter) {
        // Specific custom status filter
        matchesStatus = true;
      } else {
        // Standard status filter
        matchesStatus = customer.callStatus === statusFilter;
      }

      // Assignee filter
      const matchesAssignee = assigneeFilter === 'all' || 
        (assigneeFilter === 'unassigned' && !customer.assignedTo) ||
        customer.assignedTo === assigneeFilter;

      // Role-based access
      let hasAccess = true;
      if (!canManageAll && user?.role === 'employee') {
        // Employees can only see their assigned customers
        const customerAssignedTo = customer.assignedTo;
        const userId = user.id;
        
        // Convert both to strings for comparison to avoid type issues
        const customerAssignedToStr = customerAssignedTo ? customerAssignedTo.toString() : '';
        const userIdStr = userId ? userId.toString() : '';
        
        hasAccess = customerAssignedToStr === userIdStr;
        
        console.log(`🔍 Access check for customer ${customer.phone}: assignedTo='${customerAssignedToStr}', userId='${userIdStr}', hasAccess=${hasAccess}`);
      }

      const finalResult = matchesSearch && matchesStatus && matchesAssignee && hasAccess;
      if (!finalResult) {
        console.log(`❌ Customer ${customer.phone} filtered out: search=${matchesSearch}, status=${matchesStatus}, assignee=${matchesAssignee}, access=${hasAccess}`);
      }
      
      return finalResult;
    });
  }, [customers, searchQuery, statusFilter, assigneeFilter, canManageAll, user]);

  const handlePhoneCall = (customer: Customer) => {
    // Create phone call URL (tel: protocol)
    const phoneUrl = `tel:${customer.phone}`;
    
    // Open phone app
    window.open(phoneUrl, '_self');
    
    // Update call date
    onUpdateCustomer(customer.id, {
      callDate: new Date(),
    });
    
    toast.success(`Calling ${customer.name || customer.phone}...`);
  };

  const handleStatusChange = (customerId: string, newStatus: CallStatus, customStatus?: string) => {
    // Prevent multiple simultaneous updates to the same customer
    if (updatingCustomers.has(customerId)) {
      console.log('⏳ Update already in progress for customer:', customerId);
      return;
    }
    
    // Find the customer to preserve existing assignment
    const customer = customers.find(c => c.id === customerId);
    
    console.log('🔄 Status change requested for customer:', customerId);
    console.log('📋 Customer found:', customer ? `${customer.name || 'Unknown'} (${customer.phone})` : 'NOT FOUND');
    console.log('📝 New status:', newStatus);
    
    if (!customer) {
      console.error('❌ Customer not found for status change:', customerId);
      toast.error('Customer not found. Please refresh the page.');
      return;
    }
    
    if (newStatus === 'custom') {
      // Show custom input for this customer
      setShowCustomInput(prev => ({ ...prev, [customerId]: true }));
      // Initialize with existing custom status if available
      setCustomStatusInputs(prev => ({ 
        ...prev, 
        [customerId]: customer?.customCallStatus || '' 
      }));
      return; // Don't update status yet, wait for custom input
    } else {
      // Hide custom input and clear custom status
      setShowCustomInput(prev => ({ ...prev, [customerId]: false }));
      setCustomStatusInputs(prev => ({ ...prev, [customerId]: '' }));
    }
    
    // Mark customer as being updated
    setUpdatingCustomers(prev => new Set(prev).add(customerId));
    
    // Call update and handle completion
    (async () => {
      try {
        await onUpdateCustomer(customerId, {
          callStatus: newStatus,
          customCallStatus: undefined, // Clear custom status for non-custom statuses
          callDate: new Date(), // Update call date when status changes
          // Preserve existing assignment
          assignedTo: customer?.assignedTo,
        });
      } finally {
        // Remove from updating set when done
        setUpdatingCustomers(prev => {
          const newSet = new Set(prev);
          newSet.delete(customerId);
          return newSet;
        });
      }
    })();
  };

  const handleCustomStatusSubmit = (customerId: string) => {
    // Prevent multiple simultaneous updates to the same customer
    if (updatingCustomers.has(customerId)) {
      console.log('⏳ Update already in progress for customer:', customerId);
      return;
    }
    
    const customStatusText = customStatusInputs[customerId]?.trim();
    
    console.log('🔄 Custom status submit for customer:', customerId);
    console.log('📝 Custom status text:', customStatusText);
    
    if (!customStatusText) {
      toast.error('Please enter a custom status');
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    
    if (!customer) {
      console.error('❌ Customer not found for custom status submit:', customerId);
      toast.error('Customer not found. Please refresh the page.');
      return;
    }
    
    console.log('📋 Customer found:', `${customer.name || 'Unknown'} (${customer.phone})`);
    
    // Mark customer as being updated
    setUpdatingCustomers(prev => new Set(prev).add(customerId));
    
    // Hide custom input
    setShowCustomInput(prev => ({ ...prev, [customerId]: false }));
    
    // Call update and handle completion
    (async () => {
      try {
        await onUpdateCustomer(customerId, {
          callStatus: 'custom',
          customCallStatus: customStatusText,
          callDate: new Date(),
          // Preserve existing assignment
          assignedTo: customer?.assignedTo,
        });
        toast.success('Custom status updated successfully');
      } finally {
        // Remove from updating set when done
        setUpdatingCustomers(prev => {
          const newSet = new Set(prev);
          newSet.delete(customerId);
          return newSet;
        });
      }
    })();
  };

  const handleCustomStatusCancel = (customerId: string) => {
    // Hide custom input and reset to previous status
    setShowCustomInput(prev => ({ ...prev, [customerId]: false }));
    setCustomStatusInputs(prev => ({ ...prev, [customerId]: '' }));
  };

  const handleConvert = (customer: Customer) => {
    if (customer.isConverted) {
      toast.info('Customer is already converted to a lead');
      return;
    }
    
    // Open LeadFormModal with customer data pre-filled
    setConvertingCustomer(customer);
    setIsLeadFormOpen(true);
  };

  const handleLeadFormSave = async (leadData: any) => {
    if (!convertingCustomer) return;
    
    try {
      // Create the lead with customer data
      await onCreateLead({
        ...leadData,
        source: 'customer_conversion', // Set source as customer conversion
      });
      
      // Mark customer as converted
      await onConvertToLead(convertingCustomer.id);
      
      // Close modal and reset state
      setIsLeadFormOpen(false);
      setConvertingCustomer(null);
      
      toast.success(`Customer "${convertingCustomer.name || convertingCustomer.phone}" converted to lead successfully`);
    } catch (error) {
      console.error('Error converting customer to lead:', error);
      toast.error('Failed to convert customer to lead');
    }
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => onDeleteCustomer(id));
    setSelectedIds(new Set());
    setShowDeleteDialog(false);
    toast.success(`${selectedIds.size} customer(s) deleted`);
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignEmployee) {
      toast.error('Please select an employee');
      return;
    }

    if (selectedIds.size === 0) {
      toast.error('Please select customers to assign');
      return;
    }

    try {
      // Use API to bulk assign customers
      await apiClient.bulkAssignCustomers(Array.from(selectedIds), bulkAssignEmployee);
      
      setSelectedIds(new Set());
      setShowBulkAssignDialog(false);
      setBulkAssignEmployee('');
      
      const employeeName = bulkAssignEmployee === 'unassigned' 
        ? 'unassigned' 
        : employees.find(e => e.id === bulkAssignEmployee)?.name || 'employee';
      
      toast.success(`${selectedIds.size} customer(s) assigned to ${employeeName}`);
      
      // Refresh the customer list to show updated assignments
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('Error assigning customers:', error);
      toast.error('Failed to assign customers');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Get today's statistics
  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayCustomers = customers.filter(c => 
      c.callDate && c.callDate.toDateString() === today
    );
    
    return {
      total: todayCustomers.length,
      answered: todayCustomers.filter(c => c.callStatus === 'answered').length,
      pending: todayCustomers.filter(c => c.callStatus === 'pending').length,
      converted: todayCustomers.filter(c => c.isConverted).length,
    };
  }, [customers]);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="glass-card p-3 md:p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Today's Calls</p>
              <p className="text-xl md:text-2xl font-bold text-foreground">{todayStats.total}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-3 md:p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Answered</p>
              <p className="text-xl md:text-2xl font-bold text-green-600">{todayStats.answered}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-3 md:p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
              <p className="text-xl md:text-2xl font-bold text-yellow-600">{todayStats.pending}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-3 md:p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Converted</p>
              <p className="text-xl md:text-2xl font-bold text-blue-600">{todayStats.converted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="space-y-4">
        {/* Search and Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-field"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="answered">Answered</SelectItem>
                <SelectItem value="not_answered">Not Answered</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="no_response">No Response</SelectItem>
                <SelectItem value="custom">Custom (All)</SelectItem>
                {uniqueCustomStatuses.length > 0 && (
                  <>
                    {uniqueCustomStatuses.map(customStatus => (
                      <SelectItem key={customStatus} value={customStatus}>
                        Custom: {customStatus}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>

            {canManageAll && (
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {employees.length > 0 ? (
                    employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-employees" disabled>
                      No employees available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Bulk Actions Row */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap gap-2">
            {canManageAll && (
              <>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-xs"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete ({selectedIds.size})
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBulkAssignDialog(true)}
                  className="text-xs"
                >
                  <Target className="w-4 h-4 mr-1" />
                  Assign ({selectedIds.size})
                </Button>
              </>
            )}
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          
          <CustomerExcelImportExport
            customers={filteredCustomers}
            onImport={onBulkImport}
            employees={employees}
            canAssignToEmployee={canManageAll}
          />
          
          <Button 
            className="btn-accent text-xs sm:text-sm" 
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1 sm:mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Customer Table/Cards */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0} 
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                {canManageAll && <TableHead className="font-semibold">Assigned To</TableHead>}
                <TableHead className="font-semibold">Last Call</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer, index) => (
                <TableRow 
                  key={customer.id} 
                  className="table-row-hover animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.has(customer.id)} 
                      onCheckedChange={() => toggleSelect(customer.id)}
                      aria-label={`Select ${customer.name || customer.phone}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{customer.phone}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handlePhoneCall(customer)}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{customer.name || '-'}</span>
                  </TableCell>
                  <TableCell>
                    {showCustomInput[customer.id] ? (
                      <div className="flex items-center gap-1 w-48">
                        <Input
                          value={customStatusInputs[customer.id] || ''}
                          onChange={(e) => setCustomStatusInputs(prev => ({ 
                            ...prev, 
                            [customer.id]: e.target.value 
                          }))}
                          placeholder="Enter custom status"
                          className="h-8 text-xs"
                          maxLength={50}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCustomStatusSubmit(customer.id);
                            } else if (e.key === 'Escape') {
                              handleCustomStatusCancel(customer.id);
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                          onClick={() => handleCustomStatusSubmit(customer.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => handleCustomStatusCancel(customer.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Select 
                        value={customer.callStatus} 
                        onValueChange={(value: CallStatus) => handleStatusChange(customer.id, value)}
                      >
                        <SelectTrigger className="w-36 h-8">
                          <CustomerStatusChip 
                            status={customer.callStatus} 
                            customStatus={customer.customCallStatus}
                          />
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
                    )}
                  </TableCell>
                  {canManageAll && (
                    <TableCell>
                      <span className="text-sm">{customer.assignedToName || 'Unassigned'}</span>
                    </TableCell>
                  )}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {customer.callDate ? format(customer.callDate, 'MMM dd, HH:mm') : 'Never'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          console.log('🖱️ Edit button clicked for customer:', customer);
                          setEditingCustomer(customer);
                          setIsFormOpen(true);
                          console.log('✅ Modal should open with customer data');
                        }}
                        className="text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConvert(customer)}
                        disabled={customer.isConverted}
                        className="text-xs"
                      >
                        {customer.isConverted ? 'Converted' : 'Convert to Lead'}
                      </Button>
                      {customer.isConverted && (
                        <Badge variant="secondary" className="text-xs">
                          Lead
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden">
          {/* Select All Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0} 
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
              <span className="text-sm font-medium">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Customer Cards */}
          <div className="divide-y">
            {filteredCustomers.map((customer, index) => (
              <div 
                key={customer.id} 
                className="p-4 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <Checkbox 
                    checked={selectedIds.has(customer.id)} 
                    onCheckedChange={() => toggleSelect(customer.id)}
                    aria-label={`Select ${customer.name || customer.phone}`}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-3">
                    {/* Header with Phone and Call Button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-base">{customer.phone}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handlePhoneCall(customer)}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                      </div>
                      {customer.isConverted && (
                        <Badge variant="secondary" className="text-xs">
                          Lead
                        </Badge>
                      )}
                    </div>

                    {/* Customer Name */}
                    {customer.name && (
                      <div>
                        <span className="text-sm text-muted-foreground">Name: </span>
                        <span className="text-sm font-medium">{customer.name}</span>
                      </div>
                    )}

                    {/* Status */}
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      {showCustomInput[customer.id] ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={customStatusInputs[customer.id] || ''}
                            onChange={(e) => setCustomStatusInputs(prev => ({ 
                              ...prev, 
                              [customer.id]: e.target.value 
                            }))}
                            placeholder="Enter custom status"
                            className="h-8 text-xs flex-1"
                            maxLength={50}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCustomStatusSubmit(customer.id);
                              } else if (e.key === 'Escape') {
                                handleCustomStatusCancel(customer.id);
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                            onClick={() => handleCustomStatusSubmit(customer.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => handleCustomStatusCancel(customer.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Select 
                          value={customer.callStatus} 
                          onValueChange={(value: CallStatus) => handleStatusChange(customer.id, value)}
                        >
                          <SelectTrigger className="w-full h-8">
                            <CustomerStatusChip 
                              status={customer.callStatus} 
                              customStatus={customer.customCallStatus}
                            />
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
                      )}
                    </div>

                    {/* Assignment (for managers/admins) */}
                    {canManageAll && (
                      <div>
                        <span className="text-sm text-muted-foreground">Assigned to: </span>
                        <span className="text-sm">{customer.assignedToName || 'Unassigned'}</span>
                      </div>
                    )}

                    {/* Last Call */}
                    <div>
                      <span className="text-sm text-muted-foreground">Last call: </span>
                      <span className="text-sm">
                        {customer.callDate ? format(customer.callDate, 'MMM dd, HH:mm') : 'Never'}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          console.log('🖱️ Edit button clicked for customer:', customer);
                          setEditingCustomer(customer);
                          setIsFormOpen(true);
                          console.log('✅ Modal should open with customer data');
                        }}
                        className="text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConvert(customer)}
                        disabled={customer.isConverted}
                        className="text-xs"
                      >
                        {customer.isConverted ? 'Converted' : 'Convert to Lead'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No customers found</p>
          </div>
        )}
      </div>

      {/* Customer Form Modal */}
      <CustomerFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCustomer(null);
        }}
        onSave={(customerData) => {
          if (editingCustomer) {
            onUpdateCustomer(editingCustomer.id, customerData);
          } else {
            onAddCustomer(customerData);
          }
          setIsFormOpen(false);
          setEditingCustomer(null);
        }}
        customer={editingCustomer}
        employees={employees}
        canAssignToEmployee={canManageAll}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="mx-4 sm:mx-auto max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete Customers</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete {selectedIds.size} customer(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Assignment Dialog */}
      <AlertDialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
        <AlertDialogContent className="mx-4 sm:mx-auto max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Assign Customers to Employee</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Assign {selectedIds.size} customer(s) to an employee. This will update their assignment immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Employee</label>
              <Select value={bulkAssignEmployee} onValueChange={setBulkAssignEmployee}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Choose employee or unassign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Remove Assignment</SelectItem>
                  {employees.length > 0 ? (
                    employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-employees" disabled>
                      No employees available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAssign} className="w-full sm:w-auto">
              Assign Customers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lead Form Modal for Convert to Lead */}
      <LeadFormModal
        open={isLeadFormOpen}
        onClose={() => {
          setIsLeadFormOpen(false);
          setConvertingCustomer(null);
        }}
        onSave={handleLeadFormSave}
        lead={convertingCustomer ? {
          id: '', // New lead
          name: convertingCustomer.name || '',
          phone: convertingCustomer.phone,
          email: '',
          address: '',
          requirementType: 'apartment',
          bhkRequirement: '2',
          budgetMin: 0,
          budgetMax: 0,
          description: convertingCustomer.notes || '',
          preferredLocation: '',
          source: 'customer_conversion',
          status: 'new',
          followUpDate: undefined,
          notes: [],
          createdBy: '',
          assignedProjects: [], // Initialize as empty array
          assignedProject: '', // Keep for backward compatibility
          createdAt: new Date(),
          updatedAt: new Date(),
        } : null}
        projects={projects || []}
      />
    </div>
  );
}