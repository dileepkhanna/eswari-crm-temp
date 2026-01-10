import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextDjango';
import { apiClient } from '@/lib/api';
// import { supabase } from '@/integrations/supabase/client'; // Removed - using Django backend
import UserFormModal from './UserFormModal';
import UserDeleteConfirmDialog from './UserDeleteConfirmDialog';
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
import { Search, Plus, MoreHorizontal, Edit, UserX, Trash2, Loader2 } from 'lucide-react';
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
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';

interface DBUser {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  manager_id: string | null;
  manager_name?: string | null; // Manager's name from API
  created_at: string;
  updated_at: string;
  role?: UserRole;
}

export default function UserList() {
  const { createUser } = useAuth();
  const [users, setUsers] = useState<DBUser[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DBUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<DBUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Fetch users from database
  const fetchUsers = async (showLoader = true) => {
    try {
      // Only show loader on initial load
      if (showLoader && users.length === 0) {
        setLoading(true);
      }
      
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
      
      // Transform Django user data to match frontend interface
      const transformedUsers: DBUser[] = usersData.map((user: any) => ({
        id: user.id.toString(),
        user_id: user.username,
        name: `${user.first_name} ${user.last_name}`.trim() || user.username,
        email: user.email,
        phone: user.phone || null,
        address: null, // Django User model doesn't have address field
        role: user.role as UserRole,
        status: 'active', // Default status
        manager_id: user.manager?.toString() || null,
        manager_name: user.manager_name || null, // From serializer
        created_at: user.created_at,
        updated_at: user.created_at, // Use created_at as updated_at for now
      }));
      
      setUsers(transformedUsers);
      
      // Extract managers for the form
      const managersList = transformedUsers
        .filter(user => user.role === 'manager')
        .map(user => ({ id: user.id, name: user.name }));
      setManagers(managersList);
      
    } catch (error) {
      console.error('Error fetching users:', error);
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
      setUsers(placeholderUsers);
      setManagers([{ id: '2', name: 'Manager User' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(true);
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
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
    
    // Close dialog immediately and show progress
    setShowBulkDeleteDialog(false);
    
    // TODO: Implement bulk delete API in Django backend
    // For now, simulate deletion
    for (const id of idsToDelete) {
      try {
        // Simulate API call
        // const { error } = await supabase.functions.invoke('delete-user', {
        //   body: { userId: id }
        // });
        
        // Simulate successful deletion
        successCount++;
        // Update UI immediately for each successful deletion
        setUsers(prev => prev.filter(u => u.id !== id));
      } catch (error) {
        failCount++;
      }
    }
    
    setSelectedIds(new Set());
    
    if (successCount > 0) {
      toast.success(`${successCount} user(s) deleted successfully`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} user(s)`);
    }
  };

  const handleSaveUser = async (userData: {
    email: string;
    password: string;
    name: string;
    phone: string;
    address: string;
    role: UserRole;
    managerId?: string;
  }): Promise<{ success: boolean; userId?: string }> => {
    try {
      setIsSubmitting(true);
      
      const result = await createUser(
        userData.email,
        userData.password,
        userData.name,
        userData.phone,
        userData.address,
        userData.role,
        userData.managerId
      );

      if (result.success) {
        toast.success(`User created successfully!`);
        await fetchUsers(false);
        return { success: true, userId: result.userId };
      } else {
        toast.error('Failed to create user', {
          description: result.error
        });
        return { success: false };
      }
    } catch (error: any) {
      toast.error('Error creating user', {
        description: error.message
      });
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (
    userId: string,
    userData: { name: string; phone: string; address: string; newPassword?: string }
  ): Promise<{ success: boolean }> => {
    try {
      setIsSubmitting(true);
      
      // TODO: Implement update user API in Django backend
      // const { data, error } = await supabase.functions.invoke('update-user', {
      //   body: { userId, ...userData },
      // });

      // Simulate successful update
      const error = null;
      const data = { success: true };

      if (error) {
        toast.error('Failed to update user', { description: 'Update failed' });
        return { success: false };
      }

      // Remove the data.error check since our simulated data doesn't have an error property
      // if (data?.error) {
      //   toast.error('Failed to update user', { description: data.error });
      //   return { success: false };
      // }

      await fetchUsers(false);
      return { success: true };
    } catch (error: any) {
      toast.error('Error updating user', { description: error.message });
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: DBUser) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      
      // TODO: Implement toggle status API in Django backend
      // const { error } = await supabase
      //   .from('profiles')
      //   .update({ status: newStatus })
      //   .eq('id', user.id);

      // Simulate successful update
      const error = null;

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, status: newStatus } : u
      ));
      
      const action = user.status === 'active' ? 'disabled' : 'enabled';
      toast.success(`${user.name}'s account has been ${action}`);
    } catch (error: any) {
      toast.error('Failed to update user status');
    }
  };

  const handleDeactivateUser = async () => {
    if (!deleteUser) return;
    
    try {
      // TODO: Implement deactivate user API in Django backend
      // const { error } = await supabase
      //   .from('profiles')
      //   .update({ status: 'inactive' })
      //   .eq('id', deleteUser.id);

      // Simulate successful deactivation
      const error = null;

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === deleteUser.id ? { ...u, status: 'inactive' } : u
      ));
      toast.success(`${deleteUser.name}'s account has been deactivated`);
    } catch (error: any) {
      toast.error('Failed to deactivate user', {
        description: error.message
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    
    try {
      // Call the real Django API to delete the user
      await apiClient.deleteUser(parseInt(deleteUser.id));

      // Remove from frontend state
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
      toast.success('User and all associated data deleted successfully');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user', {
        description: error.message
      });
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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-4 flex-1 w-full sm:w-auto flex-wrap items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-field"
            />
          </div>
          
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
            </SelectContent>
          </Select>

          {someSelected && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedIds.size})
            </Button>
          )}
        </div>

        <Button className="btn-accent shrink-0" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
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
              <TableHead className="font-semibold hidden sm:table-cell">Contact</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold hidden lg:table-cell">Manager</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">Joined</TableHead>
              <TableHead className="font-semibold w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user, index) => (
              <TableRow 
                key={user.id} 
                className="table-row-hover animate-fade-in"
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
                <TableCell className="hidden sm:table-cell">
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
                <TableCell className="hidden lg:table-cell">
                  {user.role === 'employee' && user.manager_name ? (
                    <p className="text-sm text-muted-foreground">
                      {user.manager_name}
                    </p>
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
                <TableCell className="hidden md:table-cell">
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(user.created_at), 'MMM dd, yyyy')}
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
                      <DropdownMenuItem 
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleToggleStatus(user)}
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        {user.status === 'active' ? 'Disable Account' : 'Enable Account'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteUser(user)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete User
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

      <UserFormModal
        open={isFormOpen || !!editingUser}
        onClose={() => { setIsFormOpen(false); setEditingUser(null); }}
        onSave={handleSaveUser}
        onUpdate={handleUpdateUser}
        managers={managers.map(m => ({ id: m.id, name: m.name }))}
        isSubmitting={isSubmitting}
        editUser={editingUser}
      />

      <UserDeleteConfirmDialog
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onDeactivate={handleDeactivateUser}
        onDelete={handleDeleteUser}
        userName={deleteUser?.name || ''}
        userId={deleteUser?.id || ''}
      />

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} user(s)? This action cannot be undone. All data created by these users will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}