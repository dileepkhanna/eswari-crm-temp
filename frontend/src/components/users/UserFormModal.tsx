import { useEffect, useState } from 'react';
import { UserRole } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(20),
  address: z.string().max(500).optional(),
  role: z.enum(['admin', 'manager', 'employee'] as const),
  managerId: z.string().optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-zA-Z])/, 'Password must contain at least one letter')
    .regex(/^(?=.*\d)/, 'Password must contain at least one number'),
}).refine((data) => {
  // Manager is required for employees
  if (data.role === 'employee' && !data.managerId) {
    return false;
  }
  return true;
}, {
  message: "Manager must be assigned for employees",
  path: ["managerId"],
});

const editUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(20),
  address: z.string().max(500).optional(),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-zA-Z])/, 'Password must contain at least one letter')
    .regex(/^(?=.*\d)/, 'Password must contain at least one number')
    .optional().or(z.literal('')),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUser {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (userData: {
    email: string;
    password: string;
    name: string;
    phone: string;
    address: string;
    role: UserRole;
    managerId?: string;
  }) => Promise<{ success: boolean; userId?: string }>;
  onUpdate?: (userId: string, userData: {
    name: string;
    phone: string;
    address: string;
    newPassword?: string;
  }) => Promise<{ success: boolean }>;
  managers?: { id: string; name: string }[];
  isSubmitting?: boolean;
  editUser?: EditUser | null;
}

export default function UserFormModal({ 
  open, 
  onClose, 
  onSave, 
  onUpdate,
  managers = [], 
  isSubmitting = false,
  editUser 
}: UserFormModalProps) {
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const isEditMode = !!editUser;

  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      role: 'staff',
      managerId: '',
      password: '',
    },
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      newPassword: '',
    },
  });

  const selectedRole = createForm.watch('role');
  const nameValue = createForm.watch('name');

  // Generate preview user_id with sequential format
  const previewUserId = nameValue 
    ? `${nameValue.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_${selectedRole}_XX`
    : '';

  useEffect(() => {
    if (open) {
      if (editUser) {
        editForm.reset({
          name: editUser.name,
          phone: editUser.phone || '',
          address: editUser.address || '',
          newPassword: '',
        });
      } else {
        createForm.reset({
          name: '',
          email: '',
          phone: '',
          address: '',
          role: 'employee',
          managerId: '',
          password: '',
        });
      }
      setCreatedUserId(null);
      setCopied(false);
    }
  }, [open, editUser, createForm, editForm]);

  const handleCreateSubmit = async (data: CreateUserFormData) => {
    const result = await onSave({
      email: data.email,
      password: data.password,
      name: data.name,
      phone: data.phone,
      address: data.address || '',
      role: data.role as UserRole,
      managerId: data.managerId || undefined,
    });

    if (result.success && result.userId) {
      setCreatedUserId(result.userId);
    }
  };

  const handleEditSubmit = async (data: EditUserFormData) => {
    if (!editUser || !onUpdate) return;
    
    const result = await onUpdate(editUser.id, {
      name: data.name,
      phone: data.phone,
      address: data.address || '',
      newPassword: data.newPassword || undefined,
    });

    if (result.success) {
      toast.success('User updated successfully!');
      handleClose();
    }
  };

  const handleCopyUserId = async () => {
    if (createdUserId) {
      await navigator.clipboard.writeText(createdUserId);
      setCopied(true);
      toast.success('User ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setCreatedUserId(null);
    setCopied(false);
    onClose();
  };

  // Show success screen after user creation
  if (createdUserId) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600">User Created Successfully!</DialogTitle>
            <DialogDescription className="text-center">
              The new user account has been created and is ready to use.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-muted-foreground mb-4">
                Share these login credentials with the user:
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">User ID (for login)</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-background rounded border text-sm font-mono break-all">
                    {createdUserId}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyUserId}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Password</label>
                <p className="text-sm mt-1">The password you set in the form</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> Make sure to share these credentials securely with the user. They will need the User ID and password to log in.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Edit mode form
  if (isEditMode) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit User: {editUser.name}</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                <div className="p-3 rounded-lg bg-muted">
                  <label className="text-xs font-medium text-muted-foreground">User ID</label>
                  <p className="font-mono text-sm mt-1">{editUser.user_id}</p>
                </div>

                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Leave empty to keep current password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter a new password only if you want to change it.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" className="btn-accent" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update User'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  // Create mode form
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account with role and permissions.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormDescription>
                      This will be used to generate the User ID for login.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {previewUserId && (
                <div className="p-3 rounded-lg bg-muted">
                  <label className="text-xs font-medium text-muted-foreground">Generated User ID (Preview)</label>
                  <p className="font-mono text-sm mt-1">{previewUserId}</p>
                </div>
              )}

              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormDescription>
                      Email is required for account creation but staff/managers will login with User ID.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password (min 8 characters)" {...field} />
                    </FormControl>
                    <FormDescription>
                      Password must be at least 8 characters and contain both letters and numbers.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedRole === 'employee' && (
                <FormField
                  control={createForm.control}
                  name="managerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign Manager <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {managers.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Every employee must be assigned to a manager.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Login Instructions</p>
                <p className="text-xs text-muted-foreground">
                  After creating the user, share the <strong>User ID</strong> and <strong>Password</strong> with them. 
                  They can login using the "Staff / Manager" tab on the login page.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-accent" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
