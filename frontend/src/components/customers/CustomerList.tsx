import { useState, useMemo, useEffect, useRef, useCallback, memo, lazy, Suspense } from 'react';
import { Customer, CallStatus, User } from '@/types';
import { useAuth } from '@/contexts/AuthContextDjango';
import { canViewCustomerPhone, maskPhoneNumber } from '@/lib/permissions';
import CustomerStatusChip from './CustomerStatusChip';
import CustomerFormModal from './CustomerFormModal';
// Lazy load heavy components
const CustomerExcelImportExport = lazy(() => import('./CustomerExcelImportExport'));
const LeadFormModal = lazy(() => import('../leads/LeadFormModal'));
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
  SearchIcon, 
  PlusIcon, 
  PhoneIcon, 
  DeleteIcon, 
  CalendarIcon,
  EditIcon,
  CheckIcon,
  XIcon,
  ArrowRightIcon,
  TargetIcon
} from '@/components/icons';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface CustomerListProps {
  customers: Customer[];
  employees: User[];
  projects: any[];
  loading?: boolean;
  onAddCustomer: (customer: Partial<Customer>) => void;
  onUpdateCustomer: (id: string, data: Partial<Customer>) => void;
  onDeleteCustomer: (id: string) => void;
  onBulkImport: (customers: Partial<Customer>[]) => void;
  onConvertToLead: (customerId: string) => void;
  onCreateLead: (leadData: any) => void;
  onRefreshCustomers: () => Promise<void>;
  canManageAll?: boolean;
  isManagerView?: boolean;
}

function CustomerList({
  customers,
  employees,
  projects,
  loading = false,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onBulkImport,
  onConvertToLead,
  onCreateLead,
  onRefreshCustomers,
  canManageAll = false,
  isManagerView = false
}: CustomerListProps) {
  const { user } = useAuth();
  const isPageVisible = usePageVisibility();
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  // All state declarations must be at the top
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to today
  const [showDatePicker, setShowDatePicker] = useState(false); // Show/hide date picker
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [bulkAssignEmployee, setBulkAssignEmployee] = useState('');
  
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [convertingCustomer, setConvertingCustomer] = useState<Customer | null>(null);
  
  const [customStatusInputs, setCustomStatusInputs] = useState<Record<string, string>>({});
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({});
  const [updatingCustomers, setUpdatingCustomers] = useState<Set<string>>(new Set());
  const [deletingCustomers, setDeletingCustomers] = useState<Set<string>>(new Set());
  const [deletedCustomers, setDeletedCustomers] = useState<Set<string>>(new Set());
  
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Debounce search query to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  useEffect(() => {
    // Always set initial load to false immediately to show UI
    setIsInitialLoad(false);
  }, []);

  // Separate effect for tracking actual data loading
  useEffect(() => {
    if (customers.length > 0 || !user || !loading) {
      // Data is ready or not needed
    }
  }, [customers, user, loading]);

  // Clear deleted customers when the customers prop updates
  useEffect(() => {
    setDeletedCustomers(new Set());
  }, [customers]);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDatePicker]);
  
  const canSeePhoneNumber = useCallback((customer: Customer) => {
    return canViewCustomerPhone(user?.role, user?.id, customer.createdBy);
  }, [user?.role, user?.id]);

  const uniqueCustomStatuses = useMemo(() => {
    const statusSet = new Set<string>();
    
    for (const customer of customers) {
      if (customer.callStatus === 'custom' && customer.customCallStatus) {
        statusSet.add(customer.customCallStatus);
      }
    }
    
    return Array.from(statusSet).sort();
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    // Pre-calculate date strings to avoid repeated Date object creation
    const today = new Date().toDateString();
    const filterDateStr = selectedDate ? new Date(selectedDate).toDateString() : null;
    const isFilterToday = filterDateStr === today;
    
    return customers.filter(customer => {
      // Filter out deleted customers immediately
      if (deletedCustomers.has(customer.id)) {
        return false;
      }
      
      // Search filter - case insensitive
      const searchLower = debouncedSearchQuery.toLowerCase();
      const matchesSearch = debouncedSearchQuery === '' || 
        customer.phone.includes(debouncedSearchQuery) ||
        (customer.name && customer.name.toLowerCase().includes(searchLower));

      // Status filter - optimized logic
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'custom') {
          matchesStatus = customer.callStatus === 'custom';
        } else if (customer.callStatus === 'custom') {
          matchesStatus = customer.customCallStatus === statusFilter;
        } else {
          matchesStatus = customer.callStatus === statusFilter;
        }
      }

      // Assignee filter
      const matchesAssignee = assigneeFilter === 'all' || 
        (assigneeFilter === 'unassigned' && !customer.assignedTo) ||
        customer.assignedTo === assigneeFilter;

      // Date filter - optimized with pre-calculated strings
      let matchesDate = true;
      if (filterDateStr) {
        if (customer.callDate) {
          const callDateStr = customer.callDate.toDateString();
          matchesDate = callDateStr === filterDateStr;
        } else {
          // If customer has no call date, include them only when viewing today
          matchesDate = isFilterToday;
        }
      }

      // Access control
      let hasAccess = true;
      if (!canManageAll && user?.role === 'employee') {
        const customerAssignedToStr = customer.assignedTo ? customer.assignedTo.toString() : '';
        const userIdStr = user.id ? user.id.toString() : '';
        hasAccess = customerAssignedToStr === userIdStr;
      }

      return matchesSearch && matchesStatus && matchesAssignee && matchesDate && hasAccess;
    });
  }, [customers, debouncedSearchQuery, statusFilter, assigneeFilter, selectedDate, canManageAll, user, deletedCustomers]);

  // Virtual scrolling for large lists
  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);
  
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, currentPage]);
  
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, statusFilter, assigneeFilter, selectedDate]);

  const handlePhoneCall = useCallback((customer: Customer) => {
    const phoneUrl = `tel:${customer.phone}`;
    window.open(phoneUrl, '_self');
    onUpdateCustomer(customer.id, { callDate: new Date() });
    toast.success(`Calling ${customer.name || customer.phone}...`);
  }, [onUpdateCustomer]);

  const handleStatusChange = useCallback((customerId: string, newStatus: CallStatus, customStatus?: string) => {
    if (updatingCustomers.has(customerId)) {
      return;
    }
    
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      toast.error('Customer not found. Please refresh the page.');
      return;
    }
    
    if (newStatus === 'custom') {
      setShowCustomInput(prev => ({ ...prev, [customerId]: true }));
      setCustomStatusInputs(prev => ({ 
        ...prev, 
        [customerId]: customer?.customCallStatus || '' 
      }));
      return;
    } else {
      setShowCustomInput(prev => ({ ...prev, [customerId]: false }));
      setCustomStatusInputs(prev => ({ ...prev, [customerId]: '' }));
    }
    
    setUpdatingCustomers(prev => new Set(prev).add(customerId));
    
    (async () => {
      try {
        await onUpdateCustomer(customerId, {
          callStatus: newStatus,
          customCallStatus: undefined,
          callDate: new Date(),
          assignedTo: customer?.assignedTo,
        });
      } catch (error) {
        console.error('Error updating customer status:', error);
        toast.error('Failed to update customer status');
      } finally {
        setUpdatingCustomers(prev => {
          const newSet = new Set(prev);
          newSet.delete(customerId);
          return newSet;
        });
      }
    })();
  }, [customers, updatingCustomers, onUpdateCustomer]);

  const handleCustomStatusSubmit = (customerId: string) => {
    if (updatingCustomers.has(customerId)) {
      return;
    }
    
    const customStatusText = customStatusInputs[customerId]?.trim();
    if (!customStatusText) {
      toast.error('Please enter a custom status');
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      toast.error('Customer not found. Please refresh the page.');
      return;
    }
    
    setUpdatingCustomers(prev => new Set(prev).add(customerId));
    setShowCustomInput(prev => ({ ...prev, [customerId]: false }));
    
    (async () => {
      try {
        await onUpdateCustomer(customerId, {
          callStatus: 'custom',
          customCallStatus: customStatusText,
          callDate: new Date(),
          assignedTo: customer?.assignedTo,
        });
        toast.success('Custom status updated successfully');
      } catch (error) {
        console.error('Error updating custom status:', error);
        toast.error('Failed to update custom status');
        
        // Show custom input again on error
        setShowCustomInput(prev => ({ ...prev, [customerId]: true }));
      } finally {
        setUpdatingCustomers(prev => {
          const newSet = new Set(prev);
          newSet.delete(customerId);
          return newSet;
        });
      }
    })();
  };

  const handleCustomStatusCancel = (customerId: string) => {
    setShowCustomInput(prev => ({ ...prev, [customerId]: false }));
    setCustomStatusInputs(prev => ({ ...prev, [customerId]: '' }));
  };

  const handleConvert = (customer: Customer) => {
    if (customer.isConverted) {
      toast.info('Customer is already converted to a lead');
      return;
    }
    
    setConvertingCustomer(customer);
    setIsLeadFormOpen(true);
  };

  const handleLeadFormSave = async (leadData: any) => {
    if (!convertingCustomer) return;
    
    try {
      await onCreateLead({
        ...leadData,
        source: 'customer_conversion',
      });
      
      await onConvertToLead(convertingCustomer.id);
      
      setIsLeadFormOpen(false);
      setConvertingCustomer(null);
      
      toast.success(`Customer "${convertingCustomer.name || convertingCustomer.phone}" converted to lead successfully`);
    } catch (error) {
      console.error('Error converting customer to lead:', error);
      toast.error('Failed to convert customer to lead');
    }
  };

  const handleBulkDelete = async () => {
    const customerIds = Array.from(selectedIds);
    const customerCount = customerIds.length;
    
    // Add deleting animation to selected customers
    setDeletingCustomers(new Set(customerIds));
    
    try {
      // Add a small delay to show the animation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Delete customers one by one with animation
      for (const id of customerIds) {
        try {
          await onDeleteCustomer(id);
          // Immediately mark as deleted for UI update
          setDeletedCustomers(prev => new Set(prev).add(id));
        } catch (error) {
          console.error(`Failed to delete customer ${id}:`, error);
          // Continue with other deletions even if one fails
        }
        // Small delay between deletions for smooth animation
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Always refresh the customer list to ensure UI is updated
      try {
        await onRefreshCustomers();
        // Clear the deleted customers set after successful refresh
        setDeletedCustomers(new Set());
      } catch (refreshError) {
        console.error('Failed to refresh customers after deletion:', refreshError);
        // If refresh fails, try to reload the page as fallback
        window.location.reload();
      }
      
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error(
        `Failed to delete customers. Please try again.`,
        {
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
          },
          icon: '❌',
        }
      );
    } finally {
      setDeletingCustomers(new Set());
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    }
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
      await apiClient.bulkAssignCustomers(Array.from(selectedIds), bulkAssignEmployee);
      
      setSelectedIds(new Set());
      setShowBulkAssignDialog(false);
      setBulkAssignEmployee('');
      
      const employeeName = bulkAssignEmployee === 'unassigned' 
        ? 'unassigned' 
        : employees.find(e => e.id === bulkAssignEmployee)?.name || 'employee';
      
      toast.success(`${selectedIds.size} customer(s) assigned to ${employeeName}`);
      
      await onRefreshCustomers();
    } catch (error) {
      console.error('Error assigning customers:', error);
      toast.error('Failed to assign customers');
    }
  };

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
    }
  }, [selectedIds.size, filteredCustomers]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    // Pre-calculate selected date string
    const selectedDateStr = selectedDate ? new Date(selectedDate).toDateString() : null;
    
    // Determine display date
    let displayDate = 'Today';
    if (selectedDateStr) {
      if (selectedDateStr === today) {
        displayDate = 'Today';
      } else if (selectedDateStr === yesterdayStr) {
        displayDate = 'Yesterday';
      } else {
        displayDate = format(new Date(selectedDate), 'MMM dd');
      }
    }
    
    // Single pass through customers to calculate all stats
    let todayCalls = 0;
    let answered = 0;
    let pending = 0;
    let converted = 0;
    
    const targetDateStr = selectedDateStr || today;
    
    for (const customer of filteredCustomers) {
      // Count converted customers from filtered list
      if (customer.isConverted) {
        converted++;
      }
      
      // Count calls for the target date
      if (customer.callDate && customer.callDate.toDateString() === targetDateStr) {
        todayCalls++;
        
        if (customer.callStatus === 'answered') {
          answered++;
        } else if (customer.callStatus === 'pending') {
          pending++;
        }
      }
    }
    
    // If no specific date selected, count all today's calls from all customers
    if (!selectedDateStr) {
      todayCalls = 0;
      for (const customer of customers) {
        if (customer.callDate && customer.callDate.toDateString() === today) {
          todayCalls++;
        }
      }
    }
    
    return {
      displayDate,
      displayCount: filteredCustomers.length,
      todayCalls,
      answered,
      pending,
      converted,
    };
  }, [filteredCustomers, selectedDate, customers]);

  return (
    <div className="space-y-6">
      {loading && customers.length === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card p-3 md:p-4 rounded-xl animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 md:w-5 md:h-5 bg-muted rounded"></div>
                  <div>
                    <div className="w-16 h-3 bg-muted rounded mb-2"></div>
                    <div className="w-8 h-6 bg-muted rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-muted-foreground">Loading customers...</span>
            </div>
          </div>
        </div>
      )}

      {(customers.length > 0 || !loading) && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div className="glass-card p-3 md:p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <PhoneIcon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Today Calls</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">{todayStats.todayCalls}</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-3 md:p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <TargetIcon className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Answered</p>
                  <p className="text-xl md:text-2xl font-bold text-green-600">{todayStats.answered}</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-3 md:p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <ArrowRightIcon className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Converted</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-600">{todayStats.converted}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 input-field"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40 h-10">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="answered">Answered</SelectItem>
                    <SelectItem value="not_answered">Not Answered</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                    <SelectItem value="custom">Custom (All)</SelectItem>
                    {uniqueCustomStatuses.map(customStatus => (
                      <SelectItem key={customStatus} value={customStatus}>
                        Custom: {customStatus}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative flex-shrink-0" ref={datePickerRef}>
                  <Button
                    variant="outline"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="h-10 px-3 w-full sm:w-40 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {selectedDate ? format(new Date(selectedDate), 'MMM dd, yyyy') : 'Filter by date'}
                  </Button>
                  
                  {showDatePicker && (
                    <div className="absolute top-12 left-0 z-50 bg-white border rounded-lg shadow-lg p-3">
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          setShowDatePicker(false);
                        }}
                        className="w-48"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDate('');
                            setShowDatePicker(false);
                          }}
                          className="text-xs"
                        >
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setShowDatePicker(false)}
                          className="text-xs"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {selectedDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground z-20"
                      onClick={() => setSelectedDate('')}
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <Button
                  variant={selectedDate === new Date().toISOString().split('T')[0] ? 'default' : 'outline'}
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    if (selectedDate === today) {
                      // If today is selected, don't clear - keep today as default
                      return;
                    } else {
                      setSelectedDate(today);
                    }
                  }}
                  className="h-10 px-4 w-full sm:w-auto flex-shrink-0"
                >
                  Today
                </Button>

                {canManageAll && (
                  <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                    <SelectTrigger className="w-full sm:w-40 h-10">
                      <SelectValue placeholder="All Assignees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignees</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {selectedIds.size > 0 && !isManagerView && (
              <div className="flex flex-wrap gap-2">
                {canManageAll && (
                  <>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-xs"
                    >
                      <DeleteIcon className="w-4 h-4 mr-1" />
                      Delete ({selectedIds.size})
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowBulkAssignDialog(true)}
                      className="text-xs"
                    >
                      <TargetIcon className="w-4 h-4 mr-1" />
                      Assign ({selectedIds.size})
                    </Button>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              {!isManagerView && (
                <>
                  <Suspense fallback={<div className="w-32 h-10 bg-muted animate-pulse rounded"></div>}>
                    <CustomerExcelImportExport
                      customers={filteredCustomers}
                      onImport={onBulkImport}
                      employees={employees}
                      canAssignToEmployee={canManageAll}
                    />
                  </Suspense>
                  
                  <Button 
                    className="btn-accent text-xs sm:text-sm" 
                    onClick={() => setIsFormOpen(true)}
                  >
                    <PlusIcon className="w-4 h-4 mr-1 sm:mr-2" />
                    Add Customer
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="hidden lg:block">
              <div className="p-4 border-b flex items-center justify-between">
                <span className="text-sm font-medium">Customer List</span>
                <span className="text-sm text-muted-foreground">
                  {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {!isManagerView && (
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0} 
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    {canManageAll && <TableHead className="font-semibold">Assigned To</TableHead>}
                    <TableHead className="font-semibold">Last Call</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers.map((customer, index) => (
                    <TableRow 
                      key={customer.id} 
                      className={`table-row-hover animate-fade-in ${
                        deletingCustomers.has(customer.id) 
                          ? 'animate-delete-row bg-red-50 opacity-50' 
                          : ''
                      }`}
                    >
                      {!isManagerView && (
                        <TableCell>
                          <Checkbox 
                            checked={selectedIds.has(customer.id)} 
                            onCheckedChange={() => toggleSelect(customer.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {canSeePhoneNumber(customer) ? customer.phone : maskPhoneNumber(customer.phone)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handlePhoneCall(customer)}
                            disabled={!canSeePhoneNumber(customer)}
                          >
                            <PhoneIcon className="w-4 h-4" />
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
                              <CheckIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleCustomStatusCancel(customer.id)}
                            >
                              <XIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className={`relative ${updatingCustomers.has(customer.id) ? 'opacity-70' : ''}`}>
                            <Select 
                              value={customer.callStatus} 
                              onValueChange={(value: CallStatus) => handleStatusChange(customer.id, value)}
                              disabled={updatingCustomers.has(customer.id)}
                            >
                              <SelectTrigger className="w-32 h-8">
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
                                <SelectItem value="not_interested">Not Interested</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                            {updatingCustomers.has(customer.id) && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
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
                          {!isManagerView && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingCustomer(customer);
                                  setIsFormOpen(true);
                                }}
                                className="text-xs"
                              >
                                <EditIcon className="w-3 h-3 mr-1" />
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
                            </>
                          )}
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

            <div className="lg:hidden">
              <div className="p-4 border-b flex items-center justify-between">
                {!isManagerView && (
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0} 
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm font-medium">
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                    </span>
                  </div>
                )}
                <span className="text-sm text-muted-foreground">
                  {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="divide-y">
                {paginatedCustomers.map((customer, index) => (
                  <div 
                    key={customer.id} 
                    className={`p-4 animate-fade-in ${
                      deletingCustomers.has(customer.id) 
                        ? 'animate-delete-mobile bg-red-50 opacity-50 transform scale-95' 
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {!isManagerView && (
                        <Checkbox 
                          checked={selectedIds.has(customer.id)} 
                          onCheckedChange={() => toggleSelect(customer.id)}
                          className="mt-1"
                        />
                      )}
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-base">
                              {canSeePhoneNumber(customer) ? customer.phone : maskPhoneNumber(customer.phone)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handlePhoneCall(customer)}
                              disabled={!canSeePhoneNumber(customer)}
                            >
                              <PhoneIcon className="w-4 h-4" />
                            </Button>
                          </div>
                          {customer.isConverted && (
                            <Badge variant="secondary" className="text-xs">
                              Lead
                            </Badge>
                          )}
                        </div>

                        {customer.name && (
                          <div>
                            <span className="text-sm text-muted-foreground">Name: </span>
                            <span className="text-sm font-medium">{customer.name}</span>
                          </div>
                        )}

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
                                <CheckIcon className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                onClick={() => handleCustomStatusCancel(customer.id)}
                              >
                                <XIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className={`relative ${updatingCustomers.has(customer.id) ? 'opacity-70' : ''}`}>
                              <Select 
                                value={customer.callStatus} 
                                onValueChange={(value: CallStatus) => handleStatusChange(customer.id, value)}
                                disabled={updatingCustomers.has(customer.id)}
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
                                  <SelectItem value="not_interested">Not Interested</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              {updatingCustomers.has(customer.id) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded">
                                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {canManageAll && (
                          <div>
                            <span className="text-sm text-muted-foreground">Assigned to: </span>
                            <span className="text-sm">{customer.assignedToName || 'Unassigned'}</span>
                          </div>
                        )}

                        <div>
                          <span className="text-sm text-muted-foreground">Last call: </span>
                          <span className="text-sm">
                            {customer.callDate ? format(customer.callDate, 'MMM dd, HH:mm') : 'Never'}
                          </span>
                        </div>

                        {!isManagerView && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCustomer(customer);
                                setIsFormOpen(true);
                              }}
                              className="text-xs"
                            >
                              <EditIcon className="w-3 h-3 mr-1" />
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
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {filteredCustomers.length === 0 && customers.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No customers available</p>
              </div>
            )}

            {filteredCustomers.length === 0 && customers.length > 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No customers found matching your filters</p>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)} of {filteredCustomers.length} customers
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!isManagerView && (
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
      )}

      {!isManagerView && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="mx-4 sm:mx-auto max-w-md animate-scale-in">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <DeleteIcon className="w-4 h-4 text-red-600" />
                </div>
                Delete Customers
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                Are you sure you want to delete <span className="font-semibold text-red-600">{selectedIds.size}</span> customer{selectedIds.size > 1 ? 's' : ''}? 
                <br />
                <span className="text-red-500 font-medium">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleBulkDelete} 
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto transition-all duration-200 hover:scale-105"
              >
                <DeleteIcon className="w-4 h-4 mr-2" />
                Delete {selectedIds.size > 1 ? 'All' : ''}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {!isManagerView && (
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
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </SelectItem>
                    ))}
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
      )}

      {!isManagerView && (
        <Suspense fallback={<div></div>}>
          <LeadFormModal
            open={isLeadFormOpen}
            onClose={() => {
              setIsLeadFormOpen(false);
              setConvertingCustomer(null);
            }}
            onSave={handleLeadFormSave}
            lead={convertingCustomer ? {
              id: '',
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
              assignedTo: user?.role === 'employee' ? user.id : undefined,
              notes: [],
              createdBy: '',
              assignedProjects: [],
              assignedProject: '',
              createdAt: new Date(),
              updatedAt: new Date(),
            } : null}
            projects={projects || []}
            employees={employees}
            showAssignment={user?.role !== 'manager'}
          />
        </Suspense>
      )}
    </div>
  );
}

export default memo(CustomerList);