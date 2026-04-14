import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useCompany } from '@/contexts/CompanyContext';
import { apiClient } from '@/lib/api';
import UserFormModal from './UserFormModal';
import PromotionModal from './PromotionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, Plus, MoreHorizontal, Edit, UserX, Trash2, Loader2, Building2, TrendingUp, Eye } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import type { Company } from '@/types';

import { logger } from '@/lib/logger';
interface DBUser {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  designation?: string | null; // Job title/designation
  joining_date?: string | null; // Date when employee joined
  status: string;
  manager_id: string | null;
  manager_name?: string | null; // Manager's name from API
  company?: Company; // Company information
  company_name?: string | null; // Company name for easy access
  created_at: string;
  updated_at: string;
  role: UserRole;
}

interface UserListProps {
  users?: DBUser[];
  companies?: any[];
  loading?: boolean;
  onRefresh?: () => void;
  companyFilter?: string;
}

export default function UserList(props?: UserListProps) {
  const { createUser } = useAuth();
  const { selectedCompany, availableCompanies: contextCompanies } = useCompany();
  
  // Use props if provided, otherwise use local state
  const [localUsers, setLocalUsers] = useState<DBUser[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [localCompanies, setLocalCompanies] = useState<Company[]>([]);
  
  const users = props?.users ?? localUsers;
  const loading = props?.loading ?? localLoading;
  const companies = props?.companies ?? localCompanies;
  const setUsers = props?.users ? () => {} : setLocalUsers;  // No-op if using props
  const setLoading = props?.loading !== undefined ? () => {} : setLocalLoading;
  const setCompanies = props?.companies ? () => {} : setLocalCompanies;
  
  const [managers, setManagers] = useState<{ id: string; name: string; company?: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>(props?.companyFilter || 'all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DBUser | null>(null);
  const [viewingUser, setViewingUser] = useState<DBUser | null>(null);
  const [promotingUser, setPromotingUser] = useState<DBUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deletingUsers, setDeletingUsers] = useState<Set<string>>(new Set());
  const [deletedUsers, setDeletedUsers] = useState<Set<string>>(new Set());

  // Fetch users from database (only if not using props)
  const fetchUsers = async (showLoader = true) => {
    // If using props, call the onRefresh callback instead
    if (props?.users) {
      props.onRefresh?.();
      return;
    }
    
    try {
      // Only show loader on initial load
      if (showLoader && localUsers.length === 0) {
        setLocalLoading(true);
      }
      
      logger.log('🔄 Fetching users from backend...');
      
      // Fetch users from Django backend
      const response = await apiClient.getUsers();
      
      // Handle both paginated and non-paginated responses
      let usersData;
      if (Array.isArray(response)) {
        // Non-paginated response (direct array)
        usersData = response;
      } else if (response && response.results) {
        // Paginated response
        usersData = response.results;
      } else {
        // Fallback
        usersData = [];
      }
      
      logger.log(`📊 Fetched ${usersData.length} users from backend:`, usersData.map(u => ({ id: u.id, username: u.username, name: `${u.first_name} ${u.last_name}`.trim() })));
      
      // Transform Django user data to match frontend interface
      const transformedUsers: DBUser[] = usersData.map((user: any) => ({
        id: user.id.toString(),
        user_id: user.username,
        name: `${user.first_name} ${user.last_name}`.trim() || user.username,
        email: user.email,
        phone: user.phone || null,
        address: null, // Django User model doesn't have address field
        designation: user.designation || null,
        joining_date: user.joining_date || null,
        role: user.role as UserRole,
        status: 'active', // Default status
        manager_id: user.manager?.toString() || null,
        manager_name: user.manager_name || null, // From serializer
        company: user.company_info || user.company, // Company information
        company_name: user.company_info?.name || null, // Extract company name for easy access
        created_at: user.created_at,
        updated_at: user.created_at, // Use created_at as updated_at for now
      }));
      
      logger.log(`✅ Transformed ${transformedUsers.length} users for UI:`, transformedUsers.map(u => ({ id: u.id, name: u.name, role: u.role })));
      
      setLocalUsers(transformedUsers);
      
      // Extract managers for the form (include company id for filtering)
      const managersList = transformedUsers
        .filter(user => user.role === 'manager')
        .map(user => ({
          id: user.id,
          name: user.name,
          company: user.company?.id,
        }));
      setManagers(managersList);
      
    } catch (error) {
      logger.error('❌ Error fetching users:', error);
      toast.error('Failed to fetch users');
      
      // Fallback to placeholder data if API fails
      const placeholderUsers: DBUser[] = [
        {
          id: '1',
          user_id: 'admin',
          name: 'Admin User',
          email: 'admin@example.com',
          phone: null,
          address: null,
          role: 'admin' as UserRole,
          status: 'active',
          manager_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: 'manager_test',
          name: 'Manager User',
          email: 'manager@test.com',
          phone: '1234567891',
          address: null,
          role: 'manager' as UserRole,
          status: 'active',
          manager_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          user_id: 'employee_test',
          name: 'Employee User',
          email: 'employee@test.com',
          phone: '1234567892',
          address: null,
          role: 'employee' as UserRole,
          status: 'active',
          manager_id: '2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      setLocalUsers(placeholderUsers);
      setManagers([{ id: '2', name: 'Manager User' }]);
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if not using props
    if (!props?.users) {
      fetchUsers(true);
    }
    if (!props?.companies) {
      fetchCompanies();
    }
  }, [props?.users, props?.companies]);

  // Fetch companies for filter dropdown
  const fetchCompanies = async () => {
    // If using props, don't fetch
    if (props?.companies) {
      return;
    }
    
    try {
      logger.log('🔄 Fetching companies for filter...');
      const response = await apiClient.getCompanies();
      
      // Handle paginated response
      const companiesData = response.results || response;
      const companiesList = Array.isArray(companiesData) ? companiesData : [];
      
      logger.log(`📊 Fetched ${companiesList.length} companies for filter`);
      setLocalCompanies(companiesList);
    } catch (error: any) {
      logger.error('❌ Error fetching companies:', error);
      // Fallback to context companies if available
      if (contextCompanies && contextCompanies.length > 0) {
        setCompanies(contextCompanies);
      }
    }
  };

  // Clear deleted users when the users list updates, but only if they're actually gone
  useEffect(() => {
    if (users.length > 0) {
      setDeletedUsers(prev => {
        const newDeletedUsers = new Set(prev);
        // Only keep users in deletedUsers if they're actually gone from the fresh data
        for (const deletedId of prev) {
          const stillExists = users.some(user => user.id === deletedId);
          if (stillExists) {
            // User still exists in fresh data, remove from deleted set
            newDeletedUsers.delete(deletedId);
            logger.log(`User ${deletedId} still exists after deletion attempt, removing from deleted set`);
          }
        }
        return newDeletedUsers;
      });
    }
  }, [users]);

  const filteredUsers = users.filter(user => {
    // Filter out deleted users immediately
    if (deletedUsers.has(user.id)) {
      return false;
    }
    
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    const matchesCompany = companyFilter === 'all' || 
      (user.company && user.company.id.toString() === companyFilter);
    
    return matchesSearch && matchesRole && matchesCompany;
  });

  const allSelected = filteredUsers.length > 0 && filteredUsers.every(user => selectedIds.has(user.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map(user => user.id)));
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

  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    let successCount = 0;
    let failCount = 0;
    
    logger.log('🚀 Starting bulk delete for users:', idsToDelete);
    logger.log('🚀 Selected user objects:', filteredUsers.filter(u => selectedIds.has(u.id)));
    
    // Close dialog immediately and show progress
    setShowBulkDeleteDialog(false);
    setDeletingUsers(new Set(idsToDelete));
    
    try {
      // Delete users one by one using the working API
      for (const id of idsToDelete) {
        try {
          logger.log(`🗑️ Deleting user ${id} (as integer: ${parseInt(id)})...`);
          const result = await apiClient.simpleDeleteUser(parseInt(id));
          logger.log(`✅ Successfully deleted user ${id}:`, result);
          successCount++;
          // Mark as deleted immediately for UI update
          setDeletedUsers(prev => new Set(prev).add(id));
        } catch (error) {
          logger.error(`❌ Failed to delete user ${id}:`, error);
          failCount++;
        }
        // Small delay between deletions for smooth animation
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Refresh the user list to ensure UI is updated
      logger.log('🔄 Refreshing user list...');
      await fetchUsers(false);
      
    } catch (error) {
      logger.error('❌ Bulk delete failed:', error);
      toast.error('Failed to delete users. Please try again.');
    } finally {
      setDeletingUsers(new Set());
      setSelectedIds(new Set());
    }
    
    logger.log(`📊 Bulk delete completed: ${successCount} success, ${failCount} failed`);
    
    if (successCount > 0) {
      toast.success(`${successCount} user(s) deleted successfully`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} user(s)`);
    }
  };

  const handleToggleStatus = async (user: DBUser) => {
    // For now, just show a message that this feature is not implemented
    toast.info(`Status toggle for ${user.name} is not implemented yet`);
  };

  const handleSaveUser = async (userData: {
    email: string;
    password: string;
    name: string;
    phone: string;
    address: string;
    designation?: string;
    role: UserRole;
    company?: number;
    managerId?: string;
    joining_date?: string;
  }): Promise<{ success: boolean; userId?: string }> => {
    try {
      setIsSubmitting(true);
      
      logger.log('[UserList] handleSaveUser called with userData:', userData);
      
      const result = await createUser(
        userData.email,
        userData.password,
        userData.name,
        userData.phone,
        userData.address,
        userData.role,
        userData.company, // Add company parameter
        userData.managerId,
        userData.joining_date,
        userData.designation
      );

      if (result.success) {
        toast.success(`User created successfully!`);
        await fetchUsers(false);
        return { success: true, userId: result.userId };
      } else {
        // Parse error message for better user feedback
        let errorMessage = result.error || 'Failed to create user';
        
        // Check for specific error patterns
        if (errorMessage.includes('UNIQUE constraint failed: accounts_user.email')) {
          errorMessage = 'This email address is already registered. Please use a different email or leave it empty.';
        } else if (errorMessage.includes('email')) {
          errorMessage = 'Email error: ' + errorMessage;
        }
        
        toast.error('Failed to create user', {
          description: errorMessage
        });
        return { success: false };
      }
    } catch (error: any) {
      // Parse error message for better user feedback
      let errorMessage = error.message || 'Unknown error occurred';
      
      // Check for specific error patterns
      if (errorMessage.includes('UNIQUE constraint failed: accounts_user.email')) {
        errorMessage = 'This email address is already registered. Please use a different email or leave it empty.';
      } else if (errorMessage.includes('email')) {
        errorMessage = 'Email error: ' + errorMessage;
      }
      
      toast.error('Error creating user', {
        description: errorMessage
      });
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (
    userId: string,
    userData: { 
      name: string; 
      email?: string;
      phone: string; 
      address: string; 
      designation?: string;
      joining_date?: string;
      managerId?: string; 
      company?: number;
      newPassword?: string;
    }
  ): Promise<{ success: boolean }> => {
    try {
      setIsSubmitting(true);
      
      // Call the real Django API to update the user
      const response = await apiClient.adminUpdateUser(userId, userData);

      if (response && response.message) {
        toast.success(response.message);
        if (response.password_changed) {
          toast.success('Password updated successfully');
        }
        await fetchUsers(false);
        return { success: true };
      } else {
        toast.error('Failed to update user');
        return { success: false };
      }
    } catch (error: any) {
      logger.error('Error updating user:', error);
      
      // Parse error details from API response
      let errorMessage = 'Failed to update user';
      let errorDetails: string[] = [];
      
      try {
        const errorData = JSON.parse(error.message.split('details: ')[1]);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        if (errorData.details && Array.isArray(errorData.details)) {
          errorDetails = errorData.details;
        }
      } catch (parseError) {
        // If parsing fails, use the original error message
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        description: errorDetails.length > 0 ? errorDetails.join(', ') : undefined
      });
      
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromoteEmployee = async (userId: string): Promise<{ success: boolean; message?: string; newUsername?: string }> => {
    try {
      logger.log(`🚀 Promoting employee ${userId} to manager...`);
      const response = await apiClient.promoteEmployeeToManager(userId);
      
      if (response && response.message) {
        // Refresh the user list to show updated role
        await fetchUsers(false);
        
        return {
          success: true,
          message: response.message,
          newUsername: response.promotion_details?.new_username
        };
      } else {
        return {
          success: false,
          message: 'Failed to promote employee'
        };
      }
    } catch (error: any) {
      logger.error('Error promoting employee:', error);
      
      // Parse error message from API response
      let errorMessage = 'Failed to promote employee';
      try {
        if (error.message && error.message.includes('details: ')) {
          const errorData = JSON.parse(error.message.split('details: ')[1]);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        }
      } catch (parseError) {
        errorMessage = error.message || 'Failed to promote employee';
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'manager':
        return 'bg-primary/15 text-primary border-primary/30';
      case 'staff':
        return 'bg-info/15 text-info border-info/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-field"
            />
          </div>
          <Button className="btn-primary shrink-0" onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add User</span>
          </Button>
        </div>

        <div className="flex gap-2 items-center">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="flex-1 sm:w-36 sm:flex-none">
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

          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="flex-1 sm:w-44 sm:flex-none">
              <Building2 className="w-4 h-4 mr-1 shrink-0" />
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

          {someSelected && (
            <Button 
              variant="destructive" 
              size="sm"
              className="shrink-0"
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete ({selectedIds.size})</span>
              <span className="sm:hidden">{selectedIds.size}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No users found</p>
          </div>
        ) : filteredUsers.map((user) => (
          <div
            key={user.id}
            className={`glass-card rounded-xl p-3 flex items-center gap-3 ${
              deletingUsers.has(user.id) ? 'opacity-50' : ''
            }`}
          >
            <Checkbox
              checked={selectedIds.has(user.id)}
              onCheckedChange={() => toggleSelect(user.id)}
              aria-label={`Select ${user.name}`}
            />
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-semibold shrink-0 text-sm">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email || user.user_id}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge variant="outline" className={cn("capitalize text-[10px] px-1.5 py-0", getRoleBadgeColor(user.role || ''))}>
                  {user.role}
                </Badge>
                {user.company && (
                  <span className="text-[10px] text-muted-foreground">{user.company.name}</span>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewingUser(user)}>
                  <Eye className="w-4 h-4 mr-2" />View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingUser(user)}>
                  <Edit className="w-4 h-4 mr-2" />Edit User
                </DropdownMenuItem>
                {user.role === 'employee' && (
                  <DropdownMenuItem onClick={() => setPromotingUser(user)}>
                    <TrendingUp className="w-4 h-4 mr-2" />Promote to Manager
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                  <UserX className="w-4 h-4 mr-2" />
                  {user.status === 'active' ? 'Disable Account' : 'Enable Account'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    if (confirm(`Delete ${user.name}? This cannot be undone.`)) {
                      try {
                        await apiClient.simpleDeleteUser(parseInt(user.id));
                        await fetchUsers(false);
                        toast.success(`User "${user.name}" deleted`);
                      } catch (error: any) {
                        toast.error('Failed to delete user: ' + error.message);
                      }
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />Delete User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="glass-card rounded-2xl overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox 
                  checked={allSelected} 
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="font-semibold">User</TableHead>
              <TableHead className="font-semibold">User ID</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">Contact</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold hidden xl:table-cell">Company</TableHead>
              <TableHead className="font-semibold hidden lg:table-cell">Manager</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold hidden lg:table-cell">Joined</TableHead>
              <TableHead className="font-semibold w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user, index) => (
              <TableRow 
                key={user.id} 
                className={`table-row-hover animate-fade-in ${
                  deletingUsers.has(user.id) 
                    ? 'animate-delete-row bg-red-50 opacity-50' 
                    : ''
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.has(user.id)} 
                    onCheckedChange={() => toggleSelect(user.id)}
                    aria-label={`Select ${user.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-semibold shrink-0">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {user.user_id}
                  </code>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="text-sm text-muted-foreground">{user.phone || '-'}</p>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={cn("capitalize", getRoleBadgeColor(user.role || ''))}
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  {user.company ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {user.company.code.charAt(0)}
                      </div>
                      <span className="text-sm text-muted-foreground">{user.company.name}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {user.role === 'employee' && user.manager_name ? (
                    <p className="text-sm text-muted-foreground">{user.manager_name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={cn(
                      user.status === 'active' 
                        ? 'bg-success/15 text-success border-success/30' 
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <p className="text-sm text-muted-foreground">
                    {user.joining_date 
                      ? format(new Date(user.joining_date), 'MMM dd, yyyy')
                      : format(new Date(user.created_at), 'MMM dd, yyyy')}
                  </p>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewingUser(user)}>
                        <Eye className="w-4 h-4 mr-2" />View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingUser(user)}>
                        <Edit className="w-4 h-4 mr-2" />Edit User
                      </DropdownMenuItem>
                      {user.role === 'employee' && (
                        <DropdownMenuItem onClick={() => setPromotingUser(user)}>
                          <TrendingUp className="w-4 h-4 mr-2" />Promote to Manager
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                        <UserX className="w-4 h-4 mr-2" />
                        {user.status === 'active' ? 'Disable Account' : 'Enable Account'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
                            try {
                              logger.log(`🗑️ Individual delete for user ${user.id} (${user.name})...`);
                              const result = await apiClient.simpleDeleteUser(parseInt(user.id));
                              logger.log(`✅ Individual delete successful:`, result);
                              await fetchUsers(false);
                              toast.success(`User "${user.name}" deleted successfully`);
                            } catch (error: any) {
                              logger.error(`❌ Individual delete failed:`, error);
                              toast.error('Failed to delete user: ' + error.message);
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No users found</p>
          </div>
        )}
        </div>
      </div>

      <UserFormModal
        open={isFormOpen || !!editingUser}
        onClose={() => { setIsFormOpen(false); setEditingUser(null); }}
        onSave={handleSaveUser}
        onUpdate={handleUpdateUser}
        managers={managers.map(m => ({ id: m.id, name: m.name, company: m.company }))}
        isSubmitting={isSubmitting}
        editUser={editingUser}
      />

      <PromotionModal
        open={!!promotingUser}
        onClose={() => setPromotingUser(null)}
        user={promotingUser}
        onPromote={handlePromoteEmployee}
      />

      {/* View User Modal */}
      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View complete user information
            </DialogDescription>
          </DialogHeader>
          
          {viewingUser && (
            <div className="space-y-4 py-4">
              {/* Profile Section */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-xl shrink-0">
                  {viewingUser.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {viewingUser.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">@{viewingUser.user_id}</p>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "capitalize mt-1",
                      viewingUser.role === 'admin' && "bg-purple-100 text-purple-700 border-purple-300",
                      viewingUser.role === 'hr' && "bg-blue-100 text-blue-700 border-blue-300",
                      viewingUser.role === 'manager' && "bg-primary/15 text-primary border-primary/30",
                      viewingUser.role === 'employee' && "bg-info/15 text-info border-info/30"
                    )}
                  >
                    {viewingUser.role}
                  </Badge>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium">{viewingUser.email || 'Not provided'}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <p className="text-sm font-medium">{viewingUser.phone || 'Not provided'}</p>
                </div>

                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <p className="text-sm font-medium">{viewingUser.address || 'Not provided'}</p>
                </div>

                <div class="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">Designation</Label>
                  <p className="text-sm font-medium">{viewingUser.designation || 'Not specified'}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Joining Date</Label>
                  <p className="text-sm font-medium">
                    {viewingUser.joining_date 
                      ? format(new Date(viewingUser.joining_date), 'MMM dd, yyyy')
                      : 'Not specified'}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Company</Label>
                  {viewingUser.company ? (
                    <div className="flex items-center gap-2">
                      {typeof viewingUser.company === 'object' && (viewingUser.company as any).name ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {((viewingUser.company as any).code || (viewingUser.company as any).name).charAt(0)}
                          </div>
                          <span className="text-sm font-medium">{(viewingUser.company as any).name}</span>
                        </>
                      ) : (
                        <p className="text-sm font-medium">{viewingUser.company_name || 'Not assigned'}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm font-medium">Not assigned</p>
                  )}
                </div>

                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">Manager</Label>
                  <p className="text-sm font-medium">
                    {viewingUser.role === 'employee' && viewingUser.manager_name 
                      ? viewingUser.manager_name 
                      : viewingUser.role === 'employee' 
                        ? 'Not assigned' 
                        : 'Not applicable'}
                  </p>
                </div>

                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">User ID</Label>
                  <code className="block p-2 bg-muted rounded text-sm font-mono">
                    {viewingUser.user_id}
                  </code>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant={viewingUser.status === 'active' ? 'default' : 'secondary'}>
                    {viewingUser.status}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p className="text-sm font-medium">
                    {format(new Date(viewingUser.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewingUser(null)}
            >
              Close
            </Button>
            {viewingUser && (
              <Button
                onClick={() => {
                  setViewingUser(null);
                  setEditingUser(viewingUser);
                }}
                className="btn-primary"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit User
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent className="mx-4 sm:mx-auto max-w-md animate-scale-in">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              Delete Users
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete <span className="font-semibold text-red-600">{selectedIds.size}</span> user{selectedIds.size > 1 ? 's' : ''}?
              <br />
              <span className="text-red-500 font-medium">This action cannot be undone. All data created by these users will also be deleted.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto transition-all duration-200 hover:scale-105"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedIds.size > 1 ? 'All' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}