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
import { Search, Loader2, Plus, Pencil, Trash2, Building2 } from 'lucide-react';
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
    password: '',
    password_confirm: '',
    role: 'employee' as 'manager' | 'employee',
    manager: '' as string,
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
    role: 'employee' as 'manager' | 'employee',
    manager: '' as string,
  });

  // Delete employee modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

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
    if (!createFormData.email.trim()) {
      toast.error('Email is required');
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
    if (createFormData.role === 'employee' && !createFormData.manager) {
      toast.error('Manager is required for employees');
      return;
    }

    try {
      setIsCreating(true);
      
      // HR users must have a company
      if (!user?.company?.id) {
        toast.error('Cannot create employee: HR user has no company assigned');
        setIsCreating(false);
        return;
      }
      
      const userData = {
        first_name: createFormData.first_name.trim(),
        last_name: createFormData.last_name.trim(),
        email: createFormData.email.trim(),
        phone: createFormData.phone.trim(),
        password: createFormData.password,
        password_confirm: createFormData.password_confirm,
        role: createFormData.role,
        company: user.company.id, // Add HR user's company
        ...(createFormData.role === 'employee' && createFormData.manager && {
          manager: parseInt(createFormData.manager)
        })
      };

      logger.log('[HREmployees] Creating user with data:', userData);
      await apiClient.createUser(userData);
      
      toast.success('Employee created successfully');
      setIsCreateModalOpen(false);
      
      // Reset form
      setCreateFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        password_confirm: '',
        role: 'employee',
        manager: '',
      });
      
      // Refresh employee list
      fetchEmployees();
      
    } catch (error: any) {
      logger.error('Error creating employee:', error);
      const errorMessage = error.message || 'Failed to create employee';
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
      password: '',
      password_confirm: '',
      role: 'employee',
      manager: '',
    });
    setIsCreateModalOpen(true);
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
      role: employee.role as 'manager' | 'employee',
      manager: employee.manager ? employee.manager.toString() : '',
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
    if (!editFormData.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (editFormData.role === 'employee' && !editFormData.manager) {
      toast.error('Manager is required for employees');
      return;
    }

    try {
      setIsUpdating(true);
      
      const userData = {
        first_name: editFormData.first_name.trim(),
        last_name: editFormData.last_name.trim(),
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim(),
        role: editFormData.role,
        ...(editFormData.role === 'employee' && editFormData.manager && {
          manager: parseInt(editFormData.manager)
        }),
        ...(editFormData.role === 'manager' && {
          manager: null
        })
      };

      await apiClient.updateUser(parseInt(editingEmployee.id), userData);
      
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
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-field"
              />
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              {/* Role Filter */}
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by role" />
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
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by company" />
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
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by manager" />
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

              {/* Create Employee Button */}
              <Button 
                onClick={handleOpenCreateModal}
                className="btn-primary whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Employee
              </Button>
            </div>
          </div>

          {/* Employee Table */}
          <div className="glass-card rounded-2xl overflow-hidden">
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
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  placeholder="Enter email address"
                  disabled={isCreating}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Role and Manager - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Manager (only for employees) */}
              {createFormData.role === 'employee' && (
                <div className="grid gap-2">
                  <Label htmlFor="manager">
                    Manager <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={createFormData.manager}
                    onValueChange={(value) => setCreateFormData({ ...createFormData, manager: value })}
                    disabled={isCreating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id.toString()}>
                          {manager.first_name} {manager.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

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

            {/* Info Note */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Only manager and employee roles can be created by HR. The employee will be assigned to your company automatically.
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
        <DialogContent className="sm:max-w-[500px]">
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
              <Label htmlFor="edit_email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit_email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="Enter email address"
                disabled={isUpdating}
              />
            </div>

            {/* Phone */}
            <div className="grid gap-2">
              <Label htmlFor="edit_phone">Phone</Label>
              <Input
                id="edit_phone"
                type="tel"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="Enter phone number"
                disabled={isUpdating}
              />
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
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id.toString()}>
                        {manager.first_name} {manager.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
    </div>
  );
}
