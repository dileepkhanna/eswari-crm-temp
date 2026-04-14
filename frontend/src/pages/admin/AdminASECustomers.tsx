import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import TopBar from '@/components/layout/TopBar';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusIcon, SearchIcon, UserIcon, PhoneIcon, MailIcon, CalendarIcon, MoreVerticalIcon, ArrowRightIcon, UploadIcon, DownloadIcon, UsersIcon, Trash2Icon, XIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import ASECustomerFormModal from '@/components/ase-customers/ASECustomerFormModal';
import ASECustomerConvertModal from '@/components/ase-customers/ASECustomerConvertModal';
import ASECustomerImportExportModal from '@/components/ase-customers/ASECustomerImportExportModal';
import ASECustomerReassignModal from '@/components/ase-customers/ASECustomerReassignModal';
import CallLogPanel from '@/components/ase-customers/CallLogPanel';
import NotesPanel from '@/components/ase-customers/NotesPanel';
import { useASECustomers } from '@/contexts/ASECustomerContext';
import { useASELead } from '@/contexts/ASELeadContext';
import { ASECustomer, ASE_CALL_STATUS_OPTIONS, ASE_SERVICE_OPTIONS } from '@/types/ase-customer';
import { ASECustomerService } from '@/services/ase-customer.service';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
export default function AdminASECustomers() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const [conversionFilter, setConversionFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [overdueFilter, setOverdueFilter] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ASECustomer | null>(null);
  const [convertCustomer, setConvertCustomer] = useState<ASECustomer | null>(null);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [bulkAssignEmployeeId, setBulkAssignEmployeeId] = useState<string>('');
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<string>('');
  const [customStatusModal, setCustomStatusModal] = useState<{ open: boolean; customerId: string | null }>({ open: false, customerId: null });
  const [customStatusText, setCustomStatusText] = useState('');
  const [reassignTarget, setReassignTarget] = useState<ASECustomer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<ASECustomer | null>(null);
  const [detailTab, setDetailTab] = useState<'calls' | 'notes'>('calls');
  const [followUpCount, setFollowUpCount] = useState<number>(0);
  
  const { 
    customers, 
    stats, 
    loading, 
    error,
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    currentPage, setCurrentPage,
    totalPages, totalCount,
    createCustomer, 
    updateCustomer,
    deleteCustomer,
    fetchCustomers,
    convertToLead,
    reassignCustomer,
    bulkAssignCustomers,
    bulkDeleteCustomers,
    overdueCount,
    refreshOverdueCount,
  } = useASECustomers();

  const { fetchLeads: fetchASELeads } = useASELead();

  // Derive the ASE company ID from loaded customers (most reliable source)
  const aseCompanyId = useMemo(() => {
    if (customers.length > 0) return (customers[0] as any).company;
    return selectedCompany?.id || user?.company?.id || null;
  }, [customers, selectedCompany, user]);

  const loadEmployees = async () => {
    try {
      // Use the dedicated teammates endpoint — works for all roles (employee, manager, admin, hr)
      const companyId = aseCompanyId;
      const url = companyId
        ? `/api/ase/customers/teammates/?company=${companyId}`
        : `/api/ase/customers/teammates/`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      logger.error('Failed to load employees:', error);
    }
  };

  // Load employees when the ASE company ID is resolved
  useEffect(() => {
    loadEmployees();
  }, [aseCompanyId]);

  // Load today's follow-up count on mount
  useEffect(() => {
    ASECustomerService.getFollowUps()
      .then(res => setFollowUpCount(res.count))
      .catch(() => {});
  }, []);

  const handleCreateCustomer = async (customerData: any) => {
    try {
      logger.log('📄 ASE Customers: Creating customer with data:', customerData);
      // Always pass the ASE company ID explicitly so admin doesn't accidentally
      // create customers under the wrong company (e.g. Eswari Group)
      await createCustomer({ ...customerData, company: aseCompanyId });
      logger.log('✅ ASE Customers: Customer created successfully');
      setIsCreateModalOpen(false);
    } catch (error: any) {
      logger.error('❌ ASE Customers: Failed to create customer:', error);
      // Error toast is handled in the context
    }
  };

  const handleUpdateCustomer = async (customerData: any) => {
    if (!selectedCustomer) return;
    
    try {
      await updateCustomer(selectedCustomer.id, customerData);
      setSelectedCustomer(null);
    } catch (error: any) {
      logger.error('❌ ASE Customers: Failed to update customer:', error);
      // Error toast is handled in the context
    }
  };

  const handleConvertToLead = async (leadData: any) => {
    if (!convertCustomer) return;
    
    try {
      logger.log('📄 ASE Customers: Converting customer to lead:', convertCustomer.name);
      await convertToLead(convertCustomer.id, leadData);
      logger.log('✅ ASE Customers: Customer converted to lead successfully');
      setConvertCustomer(null);
      // Refresh the leads list so the new lead appears immediately
      fetchASELeads();
    } catch (error: any) {
      logger.error('❌ ASE Customers: Failed to convert customer to lead:', error);
      // Error toast is handled in the context
    }
  };

  const handleImportComplete = () => {
    // Refresh customers list after import
    fetchCustomers();
  };

  const handleReassign = async (assignedTo: string, reason: string) => {
    if (!reassignTarget) return;
    await reassignCustomer(reassignTarget.id, assignedTo, reason);
    setReassignTarget(null);
    fetchCustomers();
  };
  // Client-side filter for conversion/assignee/date/overdue (search & status are server-side)
  const filteredCustomers = useMemo(() => {
    const today = new Date().toDateString();
    const filterDateStr = selectedDate ? new Date(selectedDate).toDateString() : null;
    const now = new Date();

    return customers.filter(customer => {
      // Overdue filter: scheduled_date in the past + still pending
      if (overdueFilter) {
        const isOverdue = customer.scheduled_date &&
          new Date(customer.scheduled_date) < now &&
          customer.call_status === 'pending';
        if (!isOverdue) return false;
      }

      // Conversion filter
      let matchesConversion = true;
      if (conversionFilter === 'converted') matchesConversion = customer.is_converted;
      else if (conversionFilter === 'not_converted') matchesConversion = !customer.is_converted;

      // Assignee filter
      let matchesAssignee = true;
      if (assigneeFilter === 'unassigned') matchesAssignee = !customer.assigned_to;
      else if (assigneeFilter !== 'all') matchesAssignee = customer.assigned_to?.toString() === assigneeFilter;

      // Date filter
      let matchesDate = true;
      if (filterDateStr) {
        matchesDate = new Date(customer.created_at).toDateString() === filterDateStr;
      }

      return matchesConversion && matchesAssignee && matchesDate;
    });
  }, [customers, conversionFilter, assigneeFilter, selectedDate, overdueFilter]);

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
    }
  };
  
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  const handleBulkDelete = async () => {
    try {
      await bulkDeleteCustomers(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    } catch (error) {
      logger.error('Error deleting customers:', error);
    }
  };
  
  const handleBulkExport = async () => {
    try {
      // Filter customers by selected IDs
      const selectedCustomers = customers.filter(c => selectedIds.has(c.id));
      
      // Create CSV content
      const headers = ['Name', 'Phone', 'Email', 'Company', 'Status', 'Assigned To', 'Created At'];
      const csvContent = [
        headers.join(','),
        ...selectedCustomers.map(customer => [
          customer.name || '',
          customer.phone,
          customer.email || '',
          customer.company_name || '',
          customer.call_status,
          customer.assigned_to_name || '',
          new Date(customer.created_at).toLocaleDateString()
        ].map(field => `"${field}"`).join(','))
      ].join('\n');
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ase-customers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${selectedIds.size} calls exported successfully`);
      setSelectedIds(new Set());
    } catch (error) {
      logger.error('Error exporting customers:', error);
      toast.error('Failed to export calls');
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { phone: '1234567890', name: 'John Doe', company_name: 'ABC Corp' },
      { phone: '0987654321', name: 'Jane Smith', company_name: 'XYZ Ltd' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    const instructions = [
      { Field: 'phone', Required: 'Yes', Description: 'Phone number (required)' },
      { Field: 'name', Required: 'No', Description: 'Customer full name (optional)' },
      { Field: 'company_name', Required: 'No', Description: 'Company name (optional)' },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instructions), 'Instructions');
    XLSX.writeFile(wb, 'ase_customers_import_template.xlsx');
    toast.success('Template downloaded');
  };

  const handleExportAll = async () => {
    try {
      // Build API params matching all active server-side filters
      const apiParams: any = {
        page: 1,
        page_size: 1000,
        company: aseCompanyId || undefined,
      };
      if (searchTerm) apiParams.search = searchTerm;
      if (statusFilter !== 'all') apiParams.call_status = statusFilter;
      if (assigneeFilter !== 'all' && assigneeFilter !== 'unassigned') apiParams.assigned_to = assigneeFilter;
      if (conversionFilter === 'converted') apiParams.is_converted = 'true';
      else if (conversionFilter === 'not_converted') apiParams.is_converted = 'false';

      const res = await ASECustomerService.getCustomers(apiParams);
      let exportList = res.results;

      // Apply client-side-only filters (unassigned, date, overdue)
      const now = new Date();
      exportList = exportList.filter(c => {
        if (assigneeFilter === 'unassigned' && c.assigned_to) return false;
        if (selectedDate) {
          const filterDateStr = new Date(selectedDate).toDateString();
          if (new Date(c.created_at).toDateString() !== filterDateStr) return false;
        }
        if (overdueFilter) {
          const isOverdue = c.scheduled_date && new Date(c.scheduled_date) < now && c.call_status === 'pending';
          if (!isOverdue) return false;
        }
        return true;
      });

      const data = exportList.map(c => ({
        Name: c.name || '',
        Phone: c.phone,
        Email: c.email || '',
        'Company Name': (c as any).company_name_display || c.company_name || '',
        'Call Status': c.call_status,
        'Assigned To': c.assigned_to_name || '',
        'Created At': new Date(c.created_at).toLocaleDateString(),
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ASE Customers');

      // Build descriptive filename from active filters
      const dateStr = new Date().toISOString().split('T')[0];
      const filenameParts = ['ase_customers'];
      if (assigneeFilter !== 'all' && assigneeFilter !== 'unassigned') {
        const emp = employees.find(e => e.id.toString() === assigneeFilter);
        const empName = emp ? (`${emp.first_name} ${emp.last_name}`.trim() || emp.username) : assigneeFilter;
        filenameParts.push(empName.replace(/\s+/g, '_'));
      } else if (assigneeFilter === 'unassigned') {
        filenameParts.push('unassigned');
      }
      if (statusFilter !== 'all') filenameParts.push(statusFilter);
      if (conversionFilter !== 'all') filenameParts.push(conversionFilter);
      if (overdueFilter) filenameParts.push('overdue');
      if (selectedDate) filenameParts.push(selectedDate);
      filenameParts.push(dateStr);

      XLSX.writeFile(wb, `${filenameParts.join('_')}.xlsx`);
      toast.success(`${exportList.length} calls exported`);
    } catch (error) {
      logger.error('Export error:', error);
      toast.error('Failed to export calls');
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignEmployeeId) return;
    try {
      if (bulkAssignEmployeeId === 'remove') {
        // Remove assignment — patch each customer with assigned_to = null
        await Promise.all(
          Array.from(selectedIds).map(id => updateCustomer(id, { assigned_to: null } as any))
        );
        toast.success(`Assignment removed from ${selectedIds.size} call${selectedIds.size !== 1 ? 's' : ''}`);
        setSelectedIds(new Set());
      } else {
        await bulkAssignCustomers(Array.from(selectedIds), bulkAssignEmployeeId);
        setSelectedIds(new Set());
      }
      setShowBulkAssignDialog(false);
      setBulkAssignEmployeeId('');
    } catch (error) {
      logger.error('Error bulk assigning customers:', error);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatusValue) return;
    try {
      const result = await ASECustomerService.bulkUpdateStatus(Array.from(selectedIds), bulkStatusValue);
      toast.success(`Updated status for ${result.updated} call${result.updated !== 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      setShowBulkStatusDialog(false);
      setBulkStatusValue('');
      fetchCustomers();
    } catch (error) {
      logger.error('Error bulk updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleStatusChange = async (customerId: string, newStatus: string, customStatusText?: string) => {
    try {
      const updateData: any = { call_status: newStatus };
      if (newStatus === 'custom' && customStatusText) {
        updateData.custom_call_status = customStatusText;
      }
      
      await updateCustomer(customerId, updateData);
      toast.success('Status updated successfully');
      refreshOverdueCount();
    } catch (error) {
      logger.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleCustomStatusSubmit = async () => {
    if (customStatusModal.customerId && customStatusText.trim()) {
      await handleStatusChange(customStatusModal.customerId, 'custom', customStatusText.trim());
      setCustomStatusModal({ open: false, customerId: null });
      setCustomStatusText('');
    }
  };

  const clearDateFilter = () => {
    setSelectedDate('');
  };
  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, statusFilter, conversionFilter, assigneeFilter, selectedDate, currentPage, overdueFilter]);

  // Calculate today's stats
  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const selectedDateStr = selectedDate ? new Date(selectedDate).toDateString() : today;
    
    let displayDate = 'Today';
    if (selectedDateStr !== today) {
      displayDate = new Date(selectedDate).toLocaleDateString();
    }
    
    let todayCalls = 0;
    let answered = 0;
    let converted = 0;
    
    for (const customer of filteredCustomers) {
      const createdDate = new Date(customer.created_at);
      
      // Count customers created on the selected date as "calls"
      if (createdDate.toDateString() === selectedDateStr) {
        todayCalls++;
        if (customer.call_status === 'answered') {
          answered++;
        }
      }
      
      if (customer.is_converted) {
        converted++;
      }
    }
    
    return {
      displayDate,
      displayCount: filteredCustomers.length,
      todayCalls,
      answered,
      converted
    };
  }, [filteredCustomers, selectedDate]);

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-300';
      case 'answered': return 'bg-green-50 text-green-700 border-green-300';
      case 'not_answered': return 'bg-red-50 text-red-700 border-red-300';
      case 'busy': return 'bg-orange-50 text-orange-700 border-orange-300';
      case 'not_interested': return 'bg-gray-50 text-gray-700 border-gray-300';
      case 'custom': return 'bg-purple-50 text-purple-700 border-purple-300';
      default: return 'bg-gray-50 text-gray-700 border-gray-300';
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="ASE Calls" />
        <div className="p-6">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
              <UserIcon className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Customers</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchCustomers}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <TopBar title="ASE Calls" />
      
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Announcements */}
        <AnnouncementBanner userRole={user?.role || 'admin'} maxDisplay={2} />
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
              <PhoneIcon className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
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
          <div className="glass-card p-3 md:p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Follow-ups Today</p>
                <p className={`text-xl md:text-2xl font-bold ${followUpCount > 0 ? 'text-orange-500' : 'text-foreground'}`}>
                  {followUpCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="glass-card p-3 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-6">
            <div>
              <h2 className="text-xl font-semibold">ASE Call Management</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your ASE call contacts and interactions
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Search and Filters Row - Mobile Responsive */}
            <div className="space-y-3">
              {/* Search Bar - Full Width on Mobile */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search calls by name or phone number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 input-field"
                />
              </div>
              {/* Filters - Stack on Mobile, Row on Desktop */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Overdue tab */}
                <button
                  onClick={() => {
                    setOverdueFilter(v => !v);
                    if (!overdueFilter) {
                      setStatusFilter('all');
                    }
                  }}
                  className={cn(
                    "h-7 min-h-7 px-3 text-xs rounded-full border font-medium transition-colors",
                    overdueFilter
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-background text-red-600 border-red-400 hover:bg-red-50"
                  )}
                >
                  Overdue
                  {overdueCount > 0 && (
                    <span className={cn(
                      "ml-1.5 inline-flex items-center justify-center rounded-full font-bold leading-none",
                      overdueFilter
                        ? "bg-white text-red-500 min-w-[16px] h-[16px] px-1 text-[10px]"
                        : "bg-red-500 text-white min-w-[16px] h-[16px] px-1 text-[10px]"
                    )}>
                      {overdueCount > 99 ? '99+' : overdueCount}
                    </span>
                  )}
                </button>

                <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setOverdueFilter(false); }}>
                  <SelectTrigger className="select-trigger-pill w-36">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {ASE_CALL_STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={conversionFilter} onValueChange={setConversionFilter}>
                  <SelectTrigger className="select-trigger-pill w-36">
                    <SelectValue placeholder="All Calls" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Calls</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="not_converted">Not Converted</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex items-center">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-7 min-h-7 pr-7 rounded-full text-xs border-gray-300 w-36"
                    style={{ fontSize: '12px' }}
                  />
                  {selectedDate && (
                    <button
                      onClick={clearDateFilter}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Clear date filter"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <Button
                  variant={selectedDate === new Date().toISOString().split('T')[0] ? 'default' : 'outline'}
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="h-7 min-h-7 px-3 text-xs rounded-full"
                >
                  Today
                </Button>

                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="select-trigger-pill w-36" style={{ display: user?.role === 'employee' ? 'none' : undefined }}>
                    <SelectValue placeholder="All Assignees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {`${emp.first_name} ${emp.last_name}`.trim() || emp.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Action Buttons Row - Mobile Responsive */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              {selectedIds.size > 0 ? (
                // Bulk Actions - Stack on Mobile
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {selectedIds.size} call{selectedIds.size !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user?.role !== 'employee' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowBulkAssignDialog(true)}
                      className="h-9 min-h-9 text-green-600 border-green-600 hover:bg-green-50"
                    >
                      <UsersIcon className="w-4 h-4 mr-2" />
                      Assign Employee
                    </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkStatusDialog(true)}
                      className="h-9 min-h-9 text-purple-600 border-purple-600 hover:bg-purple-50"
                    >
                      <ChevronDownIcon className="w-4 h-4 mr-2" />
                      Update Status
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleBulkExport}
                      className="h-9 min-h-9 text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="h-9 min-h-9 text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <Trash2Icon className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ) : (
                // Regular Actions - Stack on Mobile
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="h-9 min-h-9 flex-1 sm:flex-none">
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Download Template</span>
                    <span className="sm:hidden">Template</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsImportExportModalOpen(true)} className="h-9 min-h-9 flex-1 sm:flex-none">
                    <UploadIcon className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Import Excel</span>
                    <span className="sm:hidden">Import</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportAll} className="h-9 min-h-9 flex-1 sm:flex-none">
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Export Data</span>
                    <span className="sm:hidden">Export</span>
                  </Button>
                </div>
              )}
              
              <Button className="btn-primary h-9 min-h-9 w-full sm:w-auto" onClick={() => setIsCreateModalOpen(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Call
              </Button>
            </div>
          </div>
          {/* Customer List */}
          <div className="mt-4" />
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <UserIcon className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Loading ASE calls...</h3>
              <p className="text-muted-foreground">Please wait while we fetch your calls</p>
            </div>
          ) : (
            <>
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <span className="text-sm font-medium">Call List</span>
                <span className="text-sm text-muted-foreground">
                  {totalCount} call{totalCount !== 1 ? 's' : ''}
                </span>
              </div>
              
              {/* Desktop Table View - Hidden on Mobile/Tablet */}
              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground w-12">
                        <Checkbox
                          checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all calls"
                        />
                      </th>
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground">Phone</th>
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground">Name</th>
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground">Service Interests</th>
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground">Status</th>
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground">Assigned To</th>
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground">Last Call</th>
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer, index) => (
                      <tr key={customer.id} className="border-b hover:bg-muted/20 transition-colors">
                        {/* Checkbox */}
                        <td className="p-4 w-12">
                          <Checkbox
                            checked={selectedIds.has(customer.id)}
                            onCheckedChange={() => toggleSelect(customer.id)}
                            aria-label={`Select call ${customer.name || customer.phone}`}
                          />
                        </td>
                        
                        {/* Phone */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => window.open(`tel:${customer.phone}`, '_self')}
                              className="p-1 rounded-full hover:bg-green-100 transition-colors group"
                              title={`Call ${customer.phone}`}
                            >
                              <PhoneIcon className="w-4 h-4 text-green-600 group-hover:text-green-700" />
                            </button>
                            <span className="font-medium">{customer.phone}</span>
                          </div>
                        </td>
                        
                        {/* Name */}
                        <td className="p-4">
                          <span className="text-sm">{customer.name || '-'}</span>
                        </td>
                        {/* Service Interests */}
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-48">
                            {customer.service_interests && customer.service_interests.length > 0 ? (
                              customer.service_interests.slice(0, 2).map((interest) => {
                                const serviceOption = ASE_SERVICE_OPTIONS.find(s => s.value === interest);
                                return (
                                  <span
                                    key={interest}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                                  >
                                    {serviceOption?.label || interest}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-xs text-muted-foreground">No interests</span>
                            )}
                            {customer.service_interests && customer.service_interests.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{customer.service_interests.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        
                        {/* Status */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getCallStatusColor(customer.call_status)} cursor-pointer hover:opacity-80 transition-opacity h-9 min-h-9`}>
                                  <span className="text-sm font-medium">
                                    {customer.call_status === 'custom' && customer.custom_call_status 
                                      ? customer.custom_call_status
                                      : ASE_CALL_STATUS_OPTIONS.find(s => s.value === customer.call_status)?.label || customer.call_status
                                    }
                                  </span>
                                  <ChevronDownIcon className="w-3 h-3 text-current" />
                                </div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-48">
                                {ASE_CALL_STATUS_OPTIONS.map((option) => (
                                  <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => {
                                      if (option.value === 'custom') {
                                        setCustomStatusModal({ open: true, customerId: customer.id });
                                        setCustomStatusText(customer.custom_call_status || '');
                                      } else {
                                        handleStatusChange(customer.id, option.value);
                                      }
                                    }}
                                    className={`cursor-pointer ${customer.call_status === option.value ? 'bg-primary/10 text-primary' : ''}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded-full ${
                                        option.value === 'pending' ? 'bg-yellow-500' :
                                        option.value === 'answered' ? 'bg-green-500' :
                                        option.value === 'not_answered' ? 'bg-red-500' :
                                        option.value === 'busy' ? 'bg-orange-500' :
                                        option.value === 'not_interested' ? 'bg-gray-500' :
                                        'bg-purple-500'
                                      }`} />
                                      <span>{option.label}</span>
                                      {customer.call_status === option.value && (
                                        <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                        {/* Assigned To */}
                        <td className="p-4">
                          <span className="text-sm text-muted-foreground">
                            {customer.assigned_to_name || 'Unassigned'}
                          </span>
                        </td>
                        
                        {/* Last Call */}
                        <td className="p-4">
                          <span className="text-sm text-muted-foreground">
                            {customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Never'}
                          </span>
                        </td>
                        
                        {/* Actions */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {/* View Button */}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setDetailTab('calls');
                                setViewCustomer(customer);
                              }}
                              className="h-9 min-h-9 px-3 text-sm"
                            >
                              View
                            </Button>
                            
                            {/* 3-Dot Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-9 w-9 p-0"
                                >
                                  <MoreVerticalIcon className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => { setDetailTab('calls'); setViewCustomer(customer); }}
                                  className="cursor-pointer"
                                >
                                  <MailIcon className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setSelectedCustomer(customer)}
                                  className="cursor-pointer"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit Call
                                </DropdownMenuItem>
                                {!customer.is_converted && (
                                  <DropdownMenuItem
                                    onClick={() => setConvertCustomer(customer)}
                                    className="cursor-pointer"
                                  >
                                    <ArrowRightIcon className="w-4 h-4 mr-2" />
                                    Convert to Lead
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() => setReassignTarget(customer)}
                                  className="cursor-pointer"
                                >
                                  <UsersIcon className="w-4 h-4 mr-2" />
                                  Assign to Employee
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to delete ${customer.name || customer.phone}?`)) {
                                      await deleteCustomer(customer.id);
                                    }
                                  }}
                                  className="cursor-pointer text-red-600 focus:text-red-600"
                                >
                                  <Trash2Icon className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            
                            {/* Converted Badge */}
                            {customer.is_converted && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white">
                                Converted
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Card View - Visible on Mobile/Tablet */}
              <div className="xl:hidden mobile-customer-cards space-y-3 p-3">
                {/* Bulk Selection Header for Mobile */}
                {filteredCustomers.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all calls"
                        className="h-4 w-4 flex-shrink-0"
                      />
                      <span className="text-sm font-medium">
                        {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                      </span>
                    </div>
                    {selectedIds.size > 0 && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowBulkAssignDialog(true)}
                          className="h-9 min-h-9 text-green-600 border-green-600"
                          title="Assign Employee"
                          style={{ display: user?.role === 'employee' ? 'none' : undefined }}
                        >
                          <UsersIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBulkStatusDialog(true)}
                          className="h-9 min-h-9 text-purple-600 border-purple-600"
                          title="Update Status"
                        >
                          <ChevronDownIcon className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleBulkExport}
                          className="h-9 min-h-9 text-blue-600 border-blue-600"
                        >
                          <DownloadIcon className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowDeleteDialog(true)}
                          className="h-9 min-h-9 text-red-600 border-red-600"
                        >
                          <Trash2Icon className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Call Cards */}
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="mobile-customer-card bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.has(customer.id)}
                          onCheckedChange={() => toggleSelect(customer.id)}
                          aria-label={`Select call ${customer.name || customer.phone}`}
                          className="h-4 w-4 flex-shrink-0 mt-0.5"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => window.open(`tel:${customer.phone}`, '_self')}
                              className="p-1 rounded-full hover:bg-green-100 transition-colors group"
                              title={`Call ${customer.phone}`}
                            >
                              <PhoneIcon className="w-4 h-4 text-green-600 group-hover:text-green-700" />
                            </button>
                            <span className="font-semibold text-base">{customer.phone}</span>
                          </div>
                          {customer.name && (
                            <p className="text-sm text-muted-foreground mt-1">{customer.name}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions Menu */}
                      <div className="flex items-center gap-2">
                        {/* Actions Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                              <MoreVerticalIcon className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => { setDetailTab('calls'); setViewCustomer(customer); }}
                            className="cursor-pointer"
                          >
                            <MailIcon className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setSelectedCustomer(customer)}
                            className="cursor-pointer"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Call
                          </DropdownMenuItem>
                          {!customer.is_converted && (
                            <DropdownMenuItem
                              onClick={() => setConvertCustomer(customer)}
                              className="cursor-pointer"
                            >
                              <ArrowRightIcon className="w-4 h-4 mr-2" />
                              Convert to Lead
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setReassignTarget(customer)}
                            className="cursor-pointer"
                            style={{ display: user?.role === 'employee' ? 'none' : undefined }}
                          >
                            <UsersIcon className="w-4 h-4 mr-2" />
                            Assign to Employee
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete ${customer.name || customer.phone}?`)) {
                                await deleteCustomer(customer.id);
                              }
                            }}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                          >
                            <Trash2Icon className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {/* Status Row */}
                    <div className="flex items-center justify-between">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${getCallStatusColor(customer.call_status)} cursor-pointer hover:opacity-80 transition-opacity`}>
                            <span className="text-sm font-medium">
                              {customer.call_status === 'custom' && customer.custom_call_status 
                                ? customer.custom_call_status
                                : ASE_CALL_STATUS_OPTIONS.find(s => s.value === customer.call_status)?.label || customer.call_status
                              }
                            </span>
                            <ChevronDownIcon className="w-3 h-3 text-current" />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          {ASE_CALL_STATUS_OPTIONS.map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() => {
                                if (option.value === 'custom') {
                                  setCustomStatusModal({ open: true, customerId: customer.id });
                                  setCustomStatusText(customer.custom_call_status || '');
                                } else {
                                  handleStatusChange(customer.id, option.value);
                                }
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  option.value === 'pending' ? 'bg-yellow-500' :
                                  option.value === 'answered' ? 'bg-green-500' :
                                  option.value === 'not_answered' ? 'bg-red-500' :
                                  option.value === 'busy' ? 'bg-orange-500' :
                                  option.value === 'not_interested' ? 'bg-gray-500' :
                                  'bg-purple-500'
                                }`} />
                                <span>{option.label}</span>
                                {customer.call_status === option.value && (
                                  <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {customer.is_converted && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white">
                          Converted
                        </span>
                      )}
                    </div>

                    {/* Service Interests */}
                    {customer.service_interests && customer.service_interests.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Service Interests:</p>
                        <div className="flex flex-wrap gap-1">
                          {customer.service_interests.slice(0, 3).map((interest) => {
                            const serviceOption = ASE_SERVICE_OPTIONS.find(s => s.value === interest);
                            return (
                              <span
                                key={interest}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                              >
                                {serviceOption?.label || interest}
                              </span>
                            );
                          })}
                          {customer.service_interests.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{customer.service_interests.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Assignment Section - Mobile Specific */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Assigned:</span>
                        <span className="text-sm font-medium">
                          {customer.assigned_to_name || 'Unassigned'}
                        </span>
                      </div>
                      
                      {/* Quick Action Buttons for Mobile */}
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedCustomer(customer)}
                          className="h-7 min-h-7 px-2 text-xs"
                        >
                          Edit
                        </Button>
                        {!customer.is_converted && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setConvertCustomer(customer)}
                            className="h-7 min-h-7 px-2 text-xs text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            Convert
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Bottom Info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        <span>
                          {customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State for Mobile Cards */}
              {filteredCustomers.length === 0 && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <UserIcon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No ASE calls found</h3>
                  <p className="text-muted-foreground mb-4">
                    {customers.length === 0 
                      ? "Get started by adding your first ASE call"
                      : "Try adjusting your search or filters"
                    }
                  </p>
                  {customers.length === 0 && (
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Add First Call
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * 50 + 1} - {Math.min(currentPage * 50, totalCount)} of {totalCount} calls
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>{'«'}</Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                    <ChevronLeftIcon className="w-4 h-4" />
                  </Button>
                  {(() => {
                    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2);
                    const items: (number | string)[] = [];
                    pages.forEach((p, i) => {
                      if (i > 0 && p - pages[i - 1] > 1) items.push('...');
                      items.push(p);
                    });
                    return items.map((p, i) =>
                      p === '...' ? (
                        <span key={`e-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                      ) : (
                        <Button key={p} variant={currentPage === p ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setCurrentPage(p as number)}>{p}</Button>
                      )
                    );
                  })()}
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
                    <ChevronRightIcon className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>{'»'}</Button>
                </div>
              </div>
            )}
          </>
          )}
        </div>
        
        {/* Customer Form Modal */}
        <ASECustomerFormModal
          open={isCreateModalOpen || selectedCustomer !== null}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedCustomer(null);
          }}
          onSave={selectedCustomer ? handleUpdateCustomer : handleCreateCustomer}
          customer={selectedCustomer}
        />

        {/* Convert to Lead Modal */}
        {convertCustomer && (
          <ASECustomerConvertModal
            open={convertCustomer !== null}
            onClose={() => setConvertCustomer(null)}
            onConvert={handleConvertToLead}
            customer={convertCustomer}
          />
        )}

        {/* Import/Export Modal */}
        <ASECustomerImportExportModal
          open={isImportExportModalOpen}
          onClose={() => setIsImportExportModalOpen(false)}
          onImportComplete={handleImportComplete}
        />

        {/* Reassign Modal */}
        {reassignTarget && (
          <ASECustomerReassignModal
            open={reassignTarget !== null}
            onClose={() => setReassignTarget(null)}
            onReassign={handleReassign}
            customer={reassignTarget}
            employees={employees}
          />
        )}

        {/* Custom Status Modal */}
        <AlertDialog open={customStatusModal.open} onOpenChange={(open) => setCustomStatusModal({ open, customerId: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Set Custom Status</AlertDialogTitle>
              <AlertDialogDescription>
                Enter a custom status for this call.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                placeholder="Enter custom status..."
                value={customStatusText}
                onChange={(e) => setCustomStatusText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomStatusSubmit();
                  }
                }}
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setCustomStatusModal({ open: false, customerId: null });
                setCustomStatusText('');
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCustomStatusSubmit}
                disabled={!customStatusText.trim()}
              >
                Set Status
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Customer Detail / Call Log Modal */}
        {viewCustomer && (
          <AlertDialog open={viewCustomer !== null} onOpenChange={(open) => { if (!open) setViewCustomer(null); }}>
            <AlertDialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-primary" />
                  {viewCustomer.name || viewCustomer.phone}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-left">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{viewCustomer.phone}</span></div>
                      {viewCustomer.email && <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{viewCustomer.email}</span></div>}
                      <div><span className="text-muted-foreground">Assigned:</span> <span className="font-medium">{viewCustomer.assigned_to_name || 'Unassigned'}</span></div>
                      <div><span className="text-muted-foreground">Status:</span> <span className="font-medium capitalize">{viewCustomer.call_status}</span></div>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              {/* Tabs */}
              <div className="mt-2">
                <div className="flex border-b mb-3">
                  <button
                    onClick={() => setDetailTab('calls')}
                    className={cn(
                      "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                      detailTab === 'calls'
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Call Log
                  </button>
                  <button
                    onClick={() => setDetailTab('notes')}
                    className={cn(
                      "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                      detailTab === 'notes'
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Notes
                  </button>
                </div>
                {detailTab === 'calls' ? (
                  <CallLogPanel customer={viewCustomer} />
                ) : (
                  <NotesPanel customer={viewCustomer} />
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setViewCustomer(null)}>Close</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setSelectedCustomer(viewCustomer); setViewCustomer(null); }}>
                  Edit Customer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Bulk Assign Dialog */}
        <AlertDialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Assign Employees</AlertDialogTitle>
              <AlertDialogDescription>
                Assign {selectedIds.size} selected call{selectedIds.size !== 1 ? 's' : ''} to an employee.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Select value={bulkAssignEmployeeId} onValueChange={setBulkAssignEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remove">
                    <span className="text-red-600">— Remove Assignment —</span>
                  </SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {`${emp.first_name} ${emp.last_name}`.trim() || emp.username}
                      {emp.role && <span className="text-muted-foreground ml-1 text-xs">({emp.role})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setShowBulkAssignDialog(false); setBulkAssignEmployeeId(''); }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkAssign} disabled={!bulkAssignEmployeeId}>
                Assign
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Status Update Dialog */}
        <AlertDialog open={showBulkStatusDialog} onOpenChange={setShowBulkStatusDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Update Call Status</AlertDialogTitle>
              <AlertDialogDescription>
                Set call status for {selectedIds.size} selected call{selectedIds.size !== 1 ? 's' : ''}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Select value={bulkStatusValue} onValueChange={setBulkStatusValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a status..." />
                </SelectTrigger>
                <SelectContent>
                  {ASE_CALL_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setShowBulkStatusDialog(false); setBulkStatusValue(''); }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkStatusUpdate} disabled={!bulkStatusValue}>
                Update Status
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Selected Calls</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedIds.size} call{selectedIds.size !== 1 ? 's' : ''}? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete {selectedIds.size} Call{selectedIds.size !== 1 ? 's' : ''}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}