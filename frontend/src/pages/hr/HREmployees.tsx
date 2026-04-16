import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useCompany } from '@/contexts/CompanyContext';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Loader2, Plus, Pencil, Trash2, Building2, Eye, Link } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import type { Company } from '@/types';

import { logger } from '@/lib/logger';
interface Employee {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: UserRole;
  manager?: number | null;
  manager_name?: string | null;
  company_info?: Company;
  created_at: string;
}

export default function HREmployees() {
  const { user } = useAuth();
  const { availableCompanies: contextCompanies } = useCompany();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  
  // Create employee modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    designation: '',
    password: '',
    password_confirm: '',
    role: 'employee' as 'manager' | 'employee',
    manager: '' as string,
    company: user?.company?.id || 0,
    joining_date: new Date().toISOString().split('T')[0], // Default to today
  });

  // Edit employee modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    designation: '',
    joining_date: '',
    role: 'employee' as 'manager' | 'employee',
    manager: '' as string,
    company: 0,
    newPassword: '',
  });

  // Delete employee modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

  // View employee modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  // Success modal state for showing created user ID
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);

  // Invite link state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviteCompany, setInviteCompany] = useState<number | ''>('');
  const [inviteManager, setInviteManager] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteGenerating, setInviteGenerating] = useState(false);

  // Fetch employees from API
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      logger.log('🔄 Fetching employees from backend...');
      const response = await apiClient.getAllUsers();
      
      // Handle both paginated and non-paginated responses
      let employeesData: Employee[];
      if (Array.isArray(response)) {
        employeesData = response;
      } else if (response && typeof response === 'object' && 'results' in response) {
        employeesData = (response as any).results;
      } else {
        employeesData = [];
      }
      
      logger.log(`📊 Fetched ${employeesData.length} employees from backend`);
      setEmployees(employeesData);
      
    } catch (error: any) {
      logger.error('❌ Error fetching employees:', error);
      setError('Failed to load employees. Please try again.');
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  // Fetch managers from API
  const fetchManagers = async () => {
    try {
      logger.log('🔄 Fetching managers from backend...');
      const response = await apiClient.getManagers();
      
      // Handle both paginated and non-paginated responses
      let managersData: Employee[];
      if (Array.isArray(response)) {
        managersData = response;
      } else if (response && typeof response === 'object' && 'results' in response) {
        managersData = (response as any).results;
      } else {
        managersData = [];
      }
      
      logger.log(`📊 Fetched ${managersData.length} managers from backend`);
      setManagers(managersData);
      
    } catch (error: any) {
      logger.error('❌ Error fetching managers:', error);
      // Don't show error toast for managers, just log it
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchManagers();
    fetchCompanies();
  }, []);

  // Fetch companies for filter dropdown
  const fetchCompanies = async () => {
    try {
      logger.log('🔄 Fetching companies for filter...');
      const response = await apiClient.getCompanies();
      
      // Handle paginated response
      const companiesData = response.results || response;
      const companiesList = Array.isArray(companiesData) ? companiesData : [];
      
      logger.log(`📊 Fetched ${companiesList.length} companies for filter`);
      setCompanies(companiesList);
    } catch (error: any) {
      logger.error('❌ Error fetching companies:', error);
      // Fallback to context companies if available
      if (contextCompanies && contextCompanies.length > 0) {
        setCompanies(contextCompanies);
      }
    }
  };

  // Handle create employee
  const handleCreateEmployee = async () => {
    // Validation
    if (!createFormData.first_name.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!createFormData.last_name.trim()) {
      toast.error('Last name is required');
      return;
    }
    if (!createFormData.phone.trim()) {
      toast.error('Phone is required');
      return;
    }
    if (!createFormData.password) {
      toast.error('Password is required');
      return;
    }
    if (createFormData.password !== createFormData.password_confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (createFormData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!createFormData.company || createFormData.company === 0) {
      toast.error('Company is required');
      return;
    }
    if (createFormData.role === 'employee' && !createFormData.manager) {
      toast.error('Manager is required for employees');
      return;
    }

    try {
      setIsCreating(true);
      
      // Combine first and last name
      const fullName = `${createFormData.first_name.trim()} ${createFormData.last_name.trim()}`;
      
      const userData = {
        email: createFormData.email.trim() || '', // Empty string if not provided
        password: createFormData.password,
        name: fullName,
        phone: createFormData.phone.trim(),
        address: createFormData.address.trim() || '',
        role: createFormData.role,
        company: createFormData.company,
        joining_date: createFormData.joining_date,
        designation: createFormData.designation.trim() || undefined,
        managerId: createFormData.role === 'employee' && createFormData.manager 
          ? createFormData.manager 
          : undefined
      };

      logger.log('[HREmployees] Creating user with data:', userData);
      
      // Use the same approach as admin panel
      const response = await apiClient.createUser({
        first_name: createFormData.first_name.trim(),
        last_name: createFormData.last_name.trim(),
        email: createFormData.email.trim() || undefined,
        phone: createFormData.phone.trim(),
        address: createFormData.address.trim() || undefined,
        password: createFormData.password,
        password_confirm: createFormData.password_confirm,
        role: createFormData.role,
        company: createFormData.company,
        joining_date: createFormData.joining_date,
        designation: createFormData.designation.trim() || undefined,
        ...(createFormData.role === 'employee' && createFormData.manager && {
          manager: parseInt(createFormData.manager)
        })
      });
      
      logger.log('[HREmployees] API response:', response);
      
      // Extract user ID from response - check multiple possible locations
      const userId = response?.user?.username || response?.user?.user_id || response?.username || response?.user_id || response?.id;
      
      logger.log('[HREmployees] Extracted userId:', userId);
      
      if (userId) {
        // Close create modal first
        setIsCreateModalOpen(false);
        
        // Small delay to ensure modal transition
        setTimeout(() => {
          // Then show success modal with user ID
          setCreatedUserId(userId);
          setIsSuccessModalOpen(true);
        }, 100);
        
        toast.success('Employee created successfully');
      } else {
        logger.warn('[HREmployees] No userId found in response, showing generic success');
        toast.success('Employee created successfully');
        setIsCreateModalOpen(false);
      }
      
      // Reset form
      setCreateFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        designation: '',
        password: '',
        password_confirm: '',
        role: 'employee',
        manager: '',
        company: user?.company?.id || 0,
        joining_date: new Date().toISOString().split('T')[0],
      });
      
      // Refresh employee list
      fetchEmployees();
      
    } catch (error: any) {
      logger.error('Error creating employee:', error);
      
      // Parse error message for better user feedback
      let errorMessage = error.message || 'Failed to create employee';
      
      // Check for specific error patterns
      if (errorMessage.includes('UNIQUE constraint failed: accounts_user.email')) {
        errorMessage = 'This email address is already registered. Please use a different email or leave it empty.';
      } else if (errorMessage.includes('email')) {
        errorMessage = 'Email error: ' + errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenCreateModal = () => {
    setCreateFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      designation: '',
      password: '',
      password_confirm: '',
      role: 'employee',
      manager: '',
      company: user?.company?.id || 0,
      joining_date: new Date().toISOString().split('T')[0],
    });
    setIsCreateModalOpen(true);
  };

  const handleGenerateInvite = async () => {
    setInviteGenerating(true);
    try {
      const payload: { role: string; company?: number; manager_id?: number } = { role: inviteRole };
      if (inviteCompany) payload.company = inviteCompany as number;
      else if (user?.company?.id) payload.company = user.company.id;
      if (inviteManager) payload.manager_id = parseInt(inviteManager);
      const res: any = await apiClient.generateInvite(payload);
      setInviteLink(`${window.location.origin}/register?token=${res.token}`);
    } catch {
      toast.error('Failed to generate invite link');
    } finally {
      setInviteGenerating(false);
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied!');
  };

  // Handle open edit modal
  const handleOpenEditModal = (employee: Employee) => {
    // Check if employee is admin or HR - these cannot be edited by HR
    if (employee.role === 'admin' || employee.role === 'hr') {
      toast.error('HR cannot modify admin or HR users');
      return;
    }

    setEditingEmployee(employee);
    setEditFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone || '',
      address: (employee as any).address || '',
      designation: (employee as any).designation || '',
      joining_date: (employee as any).joining_date || '',
      role: employee.role as 'manager' | 'employee',
      manager: employee.manager ? employee.manager.toString() : '',
      company: employee.company_info?.id || 0,
      newPassword: '',
    });
    setIsEditModalOpen(true);
  };

  // Handle update employee
  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    // Validation
    if (!editFormData.first_name.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!editFormData.last_name.trim()) {
      toast.error('Last name is required');
      return;
    }
    if (!editFormData.phone.trim()) {
      toast.error('Phone is required');
      return;
    }
    if (editFormData.role === 'employee' && !editFormData.manager) {
      toast.error('Manager is required for employees');
      return;
    }

    try {
      setIsUpdating(true);
      
      // Combine first and last name
      const fullName = `${editFormData.first_name.trim()} ${editFormData.last_name.trim()}`;
      
      const userData = {
        name: fullName,
        email: editFormData.email.trim() || undefined,
        phone: editFormData.phone.trim(),
        address: editFormData.address.trim() || '',
        designation: editFormData.designation.trim() || undefined,
        joining_date: editFormData.joining_date || undefined,
        company: editFormData.company,
        managerId: editFormData.role === 'employee' && editFormData.manager 
          ? editFormData.manager 
          : undefined,
        newPassword: editFormData.newPassword.trim() || undefined,
      };

      await apiClient.adminUpdateUser(editingEmployee.id, userData);
      
      toast.success('Employee updated successfully');
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      
      // Refresh employee list
      fetchEmployees();
      
    } catch (error: any) {
      logger.error('Error updating employee:', error);
      const errorMessage = error.message || 'Failed to update employee';
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle open delete modal
  const handleOpenDeleteModal = (employee: Employee) => {
    // Check if employee is admin or HR - these cannot be deleted by HR
    if (employee.role === 'admin' || employee.role === 'hr') {
      toast.error('HR cannot delete admin or HR users');
      return;
    }

    // Get current user from localStorage to prevent self-deletion
    const currentUserStr = localStorage.getItem('user');
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        if (currentUser.id === employee.id || currentUser.id === parseInt(employee.id)) {
          toast.error('You cannot delete yourself');
          return;
        }
      } catch (error) {
        logger.error('Error parsing current user:', error);
      }
    }

    setDeletingEmployee(employee);
    setIsDeleteModalOpen(true);
  };

  // Handle delete employee
  const handleDeleteEmployee = async () => {
    if (!deletingEmployee) return;

    try {
      setIsDeleting(true);
      
      await apiClient.deleteUser(parseInt(deletingEmployee.id));
      
      toast.success('Employee deleted successfully');
      setIsDeleteModalOpen(false);
      setDeletingEmployee(null);
      
      // Refresh employee list
      fetchEmployees();
      
    } catch (error: any) {
      logger.error('Error deleting employee:', error);
      const errorMessage = error.message || 'Failed to delete employee';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter employees based on search query and role filter
  const filteredEmployees = employees.filter(employee => {
    const fullName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    
    // Search filter
    const matchesSearch = (
      fullName.includes(query) ||
      employee.email.toLowerCase().includes(query) ||
      (employee.phone?.toLowerCase().includes(query) ?? false) ||
      employee.username.toLowerCase().includes(query)
    );
    
    // Role filter
    const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
    
    // Manager filter
    const matchesManager = managerFilter === 'all' || 
      (managerFilter === 'unassigned' && !employee.manager) ||
      (employee.manager && employee.manager.toString() === managerFilter);
    
    // Company filter
    const matchesCompany = companyFilter === 'all' || 
      (employee.company_info && employee.company_info.id.toString() === companyFilter);
    
    return matchesSearch && matchesRole && matchesManager && matchesCompany;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'hr':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'manager':
        return 'bg-primary/15 text-primary border-primary/30';
      case 'employee':
        return 'bg-info/15 text-info border-info/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar title="Employee Management" subtitle="Manage employee accounts" />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <TopBar title="Employee Management" subtitle="Manage employee accounts" />
        <div className="p-6">
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchEmployees}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Employee Management" subtitle="Manage employee accounts" />
      <div className="p-6">
        <div className="space-y-6">
          {/* Search Bar and Filters */}
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-field w-full"
              />
            </div>
            
            {/* Filters Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Role Filter */}
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>

              {/* Company Filter */}
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-full">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Manager Filter */}
              <Select value={managerFilter} onValueChange={setManagerFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Managers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Managers</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id.toString()}>
                      {manager.first_name} {manager.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Create Employee + Invite Link Buttons */}
              <div className="flex gap-2 col-span-2 sm:col-span-1">
                <Button
                  onClick={handleOpenCreateModal}
                  className="btn-primary flex-1"
                >
                  <Plus className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">New</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setInviteLink(''); setInviteCompany(''); setInviteManager(''); setShowInviteModal(true); }}
                  className="flex-1"
                >
                  <Link className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Invite</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Card View - Hidden on desktop */}
          <div className="md:hidden space-y-3">
            {filteredEmployees.map((employee, index) => (
              <div 
                key={employee.id}
                className="glass-card rounded-xl p-4 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-semibold shrink-0">
                      {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">@{employee.username}</p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn("capitalize shrink-0", getRoleBadgeColor(employee.role))}
                  >
                    {employee.role}
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground min-w-[60px]">Email:</span>
                    <span className="text-foreground truncate">{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground min-w-[60px]">Phone:</span>
                    <span className="text-foreground">{employee.phone || '-'}</span>
                  </div>
                  {employee.company_info && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground min-w-[60px]">Company:</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {employee.company_info.code.charAt(0)}
                        </div>
                        <span className="text-foreground text-sm">{employee.company_info.name}</span>
                      </div>
                    </div>
                  )}
                  {employee.role === 'employee' && employee.manager_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground min-w-[60px]">Manager:</span>
                      <span className="text-foreground">{employee.manager_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground min-w-[60px]">Joined:</span>
                    <span className="text-foreground">{format(new Date(employee.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewingEmployee(employee);
                      setIsViewModalOpen(true);
                    }}
                    className="flex-1 h-9 text-xs"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditModal(employee)}
                    disabled={employee.role === 'admin' || employee.role === 'hr'}
                    className="flex-1 h-9 text-xs"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDeleteModal(employee)}
                    disabled={employee.role === 'admin' || employee.role === 'hr'}
                    className="h-9 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {filteredEmployees.length === 0 && (
              <div className="glass-card rounded-xl text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery ? 'No employees found matching your search' : 'No employees found'}
                </p>
              </div>
            )}
          </div>

          {/* Desktop Table View - Hidden on mobile */}
          <div className="hidden md:block glass-card rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold hidden xl:table-cell">Company</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Manager</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Joined</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee, index) => (
                  <TableRow 
                    key={employee.id} 
                    className="table-row-hover animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-semibold shrink-0">
                          {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {employee.first_name} {employee.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">@{employee.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">{employee.email}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <p className="text-sm text-muted-foreground">{employee.phone || '-'}</p>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("capitalize", getRoleBadgeColor(employee.role))}
                      >
                        {employee.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {employee.company_info ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {employee.company_info.code.charAt(0)}
                          </div>
                          <span className="text-sm text-muted-foreground">{employee.company_info.name}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">-</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {employee.role === 'employee' && employee.manager_name ? (
                        <p className="text-sm text-muted-foreground">
                          {employee.manager_name}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">-</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(employee.created_at), 'MMM dd, yyyy')}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setViewingEmployee(employee);
                            setIsViewModalOpen(true);
                          }}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="View employee details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(employee)}
                          disabled={employee.role === 'admin' || employee.role === 'hr'}
                          className="h-8 w-8 p-0"
                          title={
                            employee.role === 'admin' || employee.role === 'hr'
                              ? 'HR cannot modify admin or HR users'
                              : 'Edit employee'
                          }
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeleteModal(employee)}
                          disabled={employee.role === 'admin' || employee.role === 'hr'}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title={
                            employee.role === 'admin' || employee.role === 'hr'
                              ? 'HR cannot delete admin or HR users'
                              : 'Delete employee'
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredEmployees.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery ? 'No employees found matching your search' : 'No employees found'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Employee Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Employee</DialogTitle>
            <DialogDescription>
              Add a new manager or employee to the system. Only manager and employee roles are available.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Name Fields - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  value={createFormData.first_name}
                  onChange={(e) => setCreateFormData({ ...createFormData, first_name: e.target.value })}
                  placeholder="Enter first name"
                  disabled={isCreating}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="last_name">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  value={createFormData.last_name}
                  onChange={(e) => setCreateFormData({ ...createFormData, last_name: e.target.value })}
                  placeholder="Enter last name"
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Contact Fields - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  placeholder="Enter email address (optional)"
                  disabled={isCreating}
                  className="h-11"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  disabled={isCreating}
                  className="h-11"
                />
              </div>
            </div>
            
            {/* Email helper text - separate row */}
            <div className="text-xs text-muted-foreground -mt-2">
              Email is optional
            </div>

            {/* Address Field - Full Width */}
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={createFormData.address}
                onChange={(e) => setCreateFormData({ ...createFormData, address: e.target.value })}
                placeholder="Enter address (optional)"
                disabled={isCreating}
                className="h-11"
              />
            </div>

            {/* Joining Date Field - Full Width */}
            <div className="grid gap-2">
              <Label htmlFor="joining_date">Joining Date</Label>
              <Input
                id="joining_date"
                type="date"
                value={createFormData.joining_date}
                onChange={(e) => setCreateFormData({ ...createFormData, joining_date: e.target.value })}
                disabled={isCreating}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Date when the user joined the company
              </p>
            </div>

            {/* Designation Field - Full Width */}
            <div className="grid gap-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={createFormData.designation}
                onChange={(e) => setCreateFormData({ ...createFormData, designation: e.target.value })}
                placeholder="e.g., Software Engineer, Manager, etc."
                disabled={isCreating}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Job title or designation
              </p>
            </div>

            {/* Role Field - Full Width */}
            <div className="grid gap-2">
              <Label htmlFor="role">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={createFormData.role}
                onValueChange={(value: 'manager' | 'employee') => 
                  setCreateFormData({ ...createFormData, role: value, manager: value === 'manager' ? '' : createFormData.manager })
                }
                disabled={isCreating}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company Field - Full Width */}
            <div className="grid gap-2">
              <Label htmlFor="company">
                Company <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none" />
                <Select
                  value={createFormData.company?.toString() || '0'}
                  onValueChange={(value) => {
                    // Clear manager selection when company changes
                    setCreateFormData({ 
                      ...createFormData, 
                      company: parseInt(value),
                      manager: '' // Reset manager when company changes
                    });
                  }}
                  disabled={isCreating}
                >
                  <SelectTrigger className="h-11 pl-10">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Select the company this user belongs to
              </p>
            </div>

            {/* Manager Field - Full Width (only for employees) */}
            {createFormData.role === 'employee' && (
              <div className="grid gap-2">
                <Label htmlFor="manager">
                  Assign Manager <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={createFormData.manager}
                  onValueChange={(value) => setCreateFormData({ ...createFormData, manager: value })}
                  disabled={isCreating}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers
                      .filter((manager) => {
                        // Only show managers from the selected company
                        if (!createFormData.company || createFormData.company === 0) {
                          return true; // Show all if no company selected
                        }
                        return manager.company_info?.id === createFormData.company;
                      })
                      .map((manager) => (
                        <SelectItem 
                          key={manager.id} 
                          value={manager.id.toString()}
                          className="bg-amber-100 text-amber-900 font-medium my-1"
                        >
                          {manager.username}
                        </SelectItem>
                      ))}
                    {managers.filter((manager) => {
                      if (!createFormData.company || createFormData.company === 0) return true;
                      return manager.company_info?.id === createFormData.company;
                    }).length === 0 && (
                      <SelectItem value="no-managers" disabled>
                        No managers in selected company
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Password Fields - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                  placeholder="Min 8 characters"
                  disabled={isCreating}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password_confirm">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password_confirm"
                  type="password"
                  value={createFormData.password_confirm}
                  onChange={(e) => setCreateFormData({ ...createFormData, password_confirm: e.target.value })}
                  placeholder="Confirm password"
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Login Instructions */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-semibold mb-2">Login Instructions</p>
              <p className="text-xs text-muted-foreground">
                After creating the user, share the <strong>User ID</strong> and <strong>Password</strong> with them. 
                They can login using the "Staff / Manager" tab on the login page.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateEmployee}
              disabled={isCreating}
              className="btn-primary"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Employee'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information. Only manager and employee roles can be modified by HR.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* First Name */}
            <div className="grid gap-2">
              <Label htmlFor="edit_first_name">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit_first_name"
                value={editFormData.first_name}
                onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                placeholder="Enter first name"
                disabled={isUpdating}
              />
            </div>

            {/* Last Name */}
            <div className="grid gap-2">
              <Label htmlFor="edit_last_name">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit_last_name"
                value={editFormData.last_name}
                onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                placeholder="Enter last name"
                disabled={isUpdating}
              />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="Enter email address (optional)"
                disabled={isUpdating}
              />
              <p className="text-xs text-muted-foreground">
                Email is optional
              </p>
            </div>

            {/* Phone */}
            <div className="grid gap-2">
              <Label htmlFor="edit_phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit_phone"
                type="tel"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="Enter phone number"
                disabled={isUpdating}
              />
            </div>

            {/* Address */}
            <div className="grid gap-2">
              <Label htmlFor="edit_address">Address</Label>
              <Input
                id="edit_address"
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                placeholder="Enter address (optional)"
                disabled={isUpdating}
              />
            </div>

            {/* Designation */}
            <div className="grid gap-2">
              <Label htmlFor="edit_designation">Designation</Label>
              <Input
                id="edit_designation"
                value={editFormData.designation}
                onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                placeholder="e.g., Software Engineer, Manager, etc."
                disabled={isUpdating}
              />
              <p className="text-xs text-muted-foreground">
                Job title or designation (optional)
              </p>
            </div>

            {/* Joining Date */}
            <div className="grid gap-2">
              <Label htmlFor="edit_joining_date">Joining Date</Label>
              <Input
                id="edit_joining_date"
                type="date"
                value={editFormData.joining_date}
                onChange={(e) => setEditFormData({ ...editFormData, joining_date: e.target.value })}
                disabled={isUpdating}
              />
              <p className="text-xs text-muted-foreground">
                Date when the user joined the company
              </p>
            </div>

            {/* Company */}
            <div className="grid gap-2">
              <Label htmlFor="edit_company">
                Company <span className="text-red-500">*</span>
              </Label>
              <Select
                value={editFormData.company?.toString() || '0'}
                onValueChange={(value) => {
                  // Clear manager selection when company changes
                  setEditFormData({ 
                    ...editFormData, 
                    company: parseInt(value),
                    manager: '' // Reset manager when company changes
                  });
                }}
                disabled={isUpdating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Changing company will clear manager assignment
              </p>
            </div>

            {/* Role */}
            <div className="grid gap-2">
              <Label htmlFor="edit_role">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={editFormData.role}
                onValueChange={(value: 'manager' | 'employee') => 
                  setEditFormData({ ...editFormData, role: value, manager: value === 'manager' ? '' : editFormData.manager })
                }
                disabled={isUpdating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only manager and employee roles can be set by HR
              </p>
            </div>

            {/* Manager (only for employees) */}
            {editFormData.role === 'employee' && (
              <div className="grid gap-2">
                <Label htmlFor="edit_manager">
                  Manager <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={editFormData.manager}
                  onValueChange={(value) => setEditFormData({ ...editFormData, manager: value })}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers
                      .filter((manager) => {
                        // Only show managers from the selected company
                        if (!editFormData.company || editFormData.company === 0) {
                          return true; // Show all if no company selected
                        }
                        return manager.company_info?.id === editFormData.company;
                      })
                      .map((manager) => (
                        <SelectItem key={manager.id} value={manager.id.toString()}>
                          {manager.first_name} {manager.last_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Assign this employee to a manager for proper hierarchy
                </p>
              </div>
            )}

            {/* New Password */}
            <div className="grid gap-2">
              <Label htmlFor="edit_password">New Password</Label>
              <Input
                id="edit_password"
                type="password"
                value={editFormData.newPassword}
                onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                placeholder="Leave empty to keep current password"
                disabled={isUpdating}
              />
              <p className="text-xs text-muted-foreground">
                Enter a new password only if you want to change it
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingEmployee(null);
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateEmployee}
              disabled={isUpdating}
              className="btn-primary"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Employee'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deletingEmployee && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-semibold shrink-0">
                  {deletingEmployee.first_name.charAt(0)}{deletingEmployee.last_name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {deletingEmployee.first_name} {deletingEmployee.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{deletingEmployee.email}</p>
                  <Badge 
                    variant="outline" 
                    className={cn("capitalize mt-1", getRoleBadgeColor(deletingEmployee.role))}
                  >
                    {deletingEmployee.role}
                  </Badge>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> Deleting this employee will permanently remove their account and all associated data.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingEmployee(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEmployee}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Employee
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Employee Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>
              View complete employee information
            </DialogDescription>
          </DialogHeader>
          
          {viewingEmployee && (
            <div className="space-y-4 py-4">
              {/* Profile Section */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-xl shrink-0">
                  {viewingEmployee.first_name.charAt(0)}{viewingEmployee.last_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {viewingEmployee.first_name} {viewingEmployee.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">@{viewingEmployee.username}</p>
                  <Badge 
                    variant="outline" 
                    className={cn("capitalize mt-1", getRoleBadgeColor(viewingEmployee.role))}
                  >
                    {viewingEmployee.role}
                  </Badge>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium">{viewingEmployee.email || 'Not provided'}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <p className="text-sm font-medium">{viewingEmployee.phone || 'Not provided'}</p>
                </div>

                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">Designation</Label>
                  <p className="text-sm font-medium">{(viewingEmployee as any).designation || 'Not specified'}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Company</Label>
                  {viewingEmployee.company_info ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {viewingEmployee.company_info.code.charAt(0)}
                      </div>
                      <span className="text-sm font-medium">{viewingEmployee.company_info.name}</span>
                    </div>
                  ) : (
                    <p className="text-sm font-medium">Not assigned</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Manager</Label>
                  <p className="text-sm font-medium">
                    {viewingEmployee.role === 'employee' && viewingEmployee.manager_name 
                      ? viewingEmployee.manager_name 
                      : 'Not applicable'}
                  </p>
                </div>

                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">User ID</Label>
                  <code className="block p-2 bg-muted rounded text-sm font-mono">
                    {viewingEmployee.username}
                  </code>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Joined</Label>
                  <p className="text-sm font-medium">
                    {format(new Date(viewingEmployee.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsViewModalOpen(false);
                setViewingEmployee(null);
              }}
            >
              Close
            </Button>
            {viewingEmployee && viewingEmployee.role !== 'admin' && viewingEmployee.role !== 'hr' && (
              <Button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEditModal(viewingEmployee);
                }}
                className="btn-primary"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Employee
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal - Show Created User ID */}
      <Dialog open={isSuccessModalOpen} onOpenChange={(open) => {
        setIsSuccessModalOpen(open);
        if (!open) {
          setCreatedUserId(null);
          setCopiedUserId(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600 text-2xl font-bold">
              User Created Successfully!
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              The new user account has been created and is ready to use.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-muted-foreground text-base">
                Share these login credentials with the user:
              </p>
            </div>

            <div className="p-5 rounded-lg bg-muted/50 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  User ID (for login)
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-white rounded border text-base font-mono break-all">
                    {createdUserId}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={async () => {
                      if (createdUserId) {
                        await navigator.clipboard.writeText(createdUserId);
                        setCopiedUserId(true);
                        toast.success('User ID copied to clipboard!');
                        setTimeout(() => setCopiedUserId(false), 2000);
                      }
                    }}
                  >
                    {copiedUserId ? (
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  Password
                </label>
                <p className="text-sm text-muted-foreground">
                  The password you set in the form
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-900">
                <strong>Important:</strong> Make sure to share these credentials securely with the user. They will need the User ID and password to log in.
              </p>
            </div>

            <Button 
              onClick={() => {
                setIsSuccessModalOpen(false);
                setCreatedUserId(null);
                setCopiedUserId(false);
              }} 
              className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Link Modal */}
      {showInviteModal && (
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Invite Link</DialogTitle>
              <DialogDescription>
                Create a one-time link for a new user to self-register. Expires in 7 days.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={inviteCompany === '' ? 'none' : String(inviteCompany)} onValueChange={v => { setInviteCompany(v === 'none' ? '' : Number(v)); setInviteManager(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific company</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {inviteRole === 'employee' && (
                <div className="space-y-2">
                  <Label>Assign Manager <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Select value={inviteManager || 'none'} onValueChange={v => setInviteManager(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No manager</SelectItem>
                      {managers
                        .filter((m: any) => !inviteCompany || m.company === inviteCompany || (m as any).company?.id === inviteCompany)
                        .map((m: any) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.first_name} {m.last_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button className="w-full" onClick={handleGenerateInvite} disabled={inviteGenerating}>
                {inviteGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : 'Generate Link'}
              </Button>

              {inviteLink && (
                <div className="space-y-2">
                  <Label>Invite Link</Label>
                  <div className="flex gap-2">
                    <Input value={inviteLink} readOnly className="text-xs font-mono" />
                    <Button variant="outline" size="sm" onClick={handleCopyInvite}>Copy</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">One-time use, expires in 7 days.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
