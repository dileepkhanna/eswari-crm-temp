import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextDjango';
import { apiClient } from '@/lib/api';
import UserFormModal from './UserFormModal';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deletingUsers, setDeletingUsers] = useState<Set<string>>(new Set());
  const [deletedUsers, setDeletedUsers] = useState<Set<string>>(new Set());

  // Fetch users from database
  const fetchUsers = async (showLoader = true) => {
    try {
      // Only show loader on initial load
      if (showLoader && users.length === 0) {
        setLoading(true);
      }
      
      console.log('🔄 Fetching users from backend...');
      
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
      
      console.log(`📊 Fetched ${usersData.length} users from backend:`, usersData.map(u => ({ id: u.id, username: u.username, name: `${u.first_name} ${u.last_name}`.trim() })));
      
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
      
      console.log(`✅ Transformed ${transformedUsers.length} users for UI:`, transformedUsers.map(u => ({ id: u.id, name: u.name, role: u.role })));
      
      setUsers(transformedUsers);
      
      // Extract managers for the form
      const managersList = transformedUsers
        .filter(user => user.role === 'manager')
        .map(user => ({ id: user.id, name: user.name }));
      setManagers(managersList);
      
    } catch (error) {
      console.error('❌ Error fetching users:', error);
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
            console.log(`User ${deletedId} still exists after deletion attempt, removing from deleted set`);
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
    
    console.log('🚀 Starting bulk delete for users:', idsToDelete);
    console.log('🚀 Selected user objects:', filteredUsers.filter(u => selectedIds.has(u.id)));
    
    // Close dialog immediately and show progress
    setShowBulkDeleteDialog(false);
    setDeletingUsers(new Set(idsToDelete));
    
    try {
      // Delete users one by one using the working API
      for (const id of idsToDelete) {
        try {
          console.log(`🗑️ Deleting user ${id} (as integer: ${parseInt(id)})...`);
          const result = await apiClient.simpleDeleteUser(parseInt(id));
          console.log(`✅ Successfully deleted user ${id}:`, result);
          successCount++;
          // Mark as deleted immediately for UI update
          setDeletedUsers(prev => new Set(prev).add(id));
        } catch (error) {
          console.error(`❌ Failed to delete user ${id}:`, error);
          failCount++;
        }
        // Small delay between deletions for smooth animation
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Refresh the user list to ensure UI is updated
      console.log('🔄 Refreshing user list...');
      await fetchUsers(false);
      
    } catch (error) {
      console.error('❌ Bulk delete failed:', error);
      toast.error('Failed to delete users. Please try again.');
    } finally {
      setDeletingUsers(new Set());
      setSelectedIds(new Set());
    }
    
    console.log(`📊 Bulk delete completed: ${successCount} success, ${failCount} failed`);
    
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
      console.error('Error updating user:', error);
      
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
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
                            try {
                              console.log(`🗑️ Individual delete for user ${user.id} (${user.name})...`);
                              const result = await apiClient.simpleDeleteUser(parseInt(user.id));
                              console.log(`✅ Individual delete successful:`, result);
                              await fetchUsers(false);
                              toast.success(`User "${user.name}" deleted successfully`);
                            } catch (error: any) {
                              console.error(`❌ Individual delete failed:`, error);
                              toast.error('Failed to delete user: ' + error.message);
                            }
                          }
                        }}
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