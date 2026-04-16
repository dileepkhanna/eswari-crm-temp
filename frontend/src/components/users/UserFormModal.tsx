import { useEffect, useState } from 'react';
import { UserRole } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useCompany } from '@/contexts/CompanyContext';
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { CompanyFormField } from '@/components/forms';

import { logger } from '@/lib/logger';
const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(20),
  designation: z.string().min(1, 'Designation is required').max(100),
  role: z.enum(['admin', 'manager', 'employee', 'hr'] as const),
  company: z.number().positive('Company is required').optional(),
  managerId: z.string().optional(),
  joining_date: z.string().min(1, 'Joining date is required'),
  present_address: z.string().min(1, 'Present address is required'),
  permanent_address: z.string().min(1, 'Permanent address is required'),
  bank_name: z.string().min(1, 'Bank name is required'),
  bank_account_number: z.string().min(1, 'Account number is required'),
  bank_ifsc: z.string().min(1, 'IFSC code is required'),
  blood_group: z.string().min(1, 'Blood group is required'),
  aadhar_number: z.string().length(12, 'Aadhar number must be exactly 12 digits').regex(/^\d+$/, 'Aadhar must contain only digits'),
  emergency_contact1_name: z.string().min(1, 'Contact 1 name is required'),
  emergency_contact1_phone: z.string().min(10, 'Contact 1 phone must be at least 10 digits'),
  emergency_contact1_relation: z.string().min(1, 'Contact 1 relation is required'),
  emergency_contact2_name: z.string().min(1, 'Contact 2 name is required'),
  emergency_contact2_phone: z.string().min(10, 'Contact 2 phone must be at least 10 digits'),
  emergency_contact2_relation: z.string().min(1, 'Contact 2 relation is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-zA-Z])/, 'Password must contain at least one letter')
    .regex(/^(?=.*\d)/, 'Password must contain at least one number'),
}).refine((data) => {
  if (data.role === 'employee' && !data.managerId) return false;
  return true;
}, { message: "Manager must be assigned for employees", path: ["managerId"] })
.refine((data) => {
  if ((data.role === 'manager' || data.role === 'employee') && !data.company) return false;
  return true;
}, { message: "Company is required for manager and employee roles", path: ["company"] });

const editUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(20),
  designation: z.string().min(1, 'Designation is required').max(100),
  joining_date: z.string().min(1, 'Joining date is required'),
  managerId: z.string().optional(),
  company: z.number().positive('Company is required').optional(),
  present_address: z.string().min(1, 'Present address is required'),
  permanent_address: z.string().min(1, 'Permanent address is required'),
  bank_name: z.string().min(1, 'Bank name is required'),
  bank_account_number: z.string().min(1, 'Account number is required'),
  bank_ifsc: z.string().min(1, 'IFSC code is required'),
  blood_group: z.string().min(1, 'Blood group is required'),
  aadhar_number: z.string().length(12, 'Aadhar number must be exactly 12 digits').regex(/^\d+$/, 'Aadhar must contain only digits'),
  emergency_contact1_name: z.string().min(1, 'Contact 1 name is required'),
  emergency_contact1_phone: z.string().min(10, 'Contact 1 phone must be at least 10 digits'),
  emergency_contact1_relation: z.string().min(1, 'Contact 1 relation is required'),
  emergency_contact2_name: z.string().min(1, 'Contact 2 name is required'),
  emergency_contact2_phone: z.string().min(10, 'Contact 2 phone must be at least 10 digits'),
  emergency_contact2_relation: z.string().min(1, 'Contact 2 relation is required'),
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
  role?: string;
  manager_id?: string | null;
  company?: { id: number; name: string; code: string } | null;
  permanent_address?: string | null;
  present_address?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  blood_group?: string | null;
  aadhar_number?: string | null;
  emergency_contact1_name?: string | null;
  emergency_contact1_phone?: string | null;
  emergency_contact1_relation?: string | null;
  emergency_contact2_name?: string | null;
  emergency_contact2_phone?: string | null;
  emergency_contact2_relation?: string | null;
}

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (userData: {
    email: string; password: string; name: string; phone: string; address: string;
    designation?: string; role: UserRole; company?: number; managerId?: string; joining_date?: string;
    permanent_address?: string; present_address?: string; bank_name?: string;
    bank_account_number?: string; bank_ifsc?: string; blood_group?: string; aadhar_number?: string;
    emergency_contact1_name?: string; emergency_contact1_phone?: string; emergency_contact1_relation?: string;
    emergency_contact2_name?: string; emergency_contact2_phone?: string; emergency_contact2_relation?: string;
  }) => Promise<{ success: boolean; userId?: string }>;
  onUpdate?: (userId: string, userData: {
    name: string; email?: string; phone: string; address: string;
    designation?: string; joining_date?: string; managerId?: string; company?: number; newPassword?: string;
    permanent_address?: string; present_address?: string; bank_name?: string;
    bank_account_number?: string; bank_ifsc?: string; blood_group?: string; aadhar_number?: string;
    emergency_contact1_name?: string; emergency_contact1_phone?: string; emergency_contact1_relation?: string;
    emergency_contact2_name?: string; emergency_contact2_phone?: string; emergency_contact2_relation?: string;
  }) => Promise<{ success: boolean }>;
  managers?: { id: string; name: string; company?: number }[];
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
  const [sameAsPresent, setSameAsPresent] = useState(false);
  const [declared, setDeclared] = useState(false);
  const { user } = useAuth();
  const { canSelectCompany } = useCompany();
  
  const isEditMode = !!editUser;

  // Auto-assign the logged-in user's company as default (admin/hr can still change it)
  const defaultCompanyId = (user?.company as any)?.id || (user?.company as any) || undefined;

  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '', email: '', phone: '', designation: '', role: 'employee',
      company: defaultCompanyId as any, managerId: '',
      joining_date: new Date().toISOString().split('T')[0],
      present_address: '', permanent_address: '',
      bank_name: '', bank_account_number: '', bank_ifsc: '', blood_group: '', aadhar_number: '',
      emergency_contact1_name: '', emergency_contact1_phone: '', emergency_contact1_relation: '',
      emergency_contact2_name: '', emergency_contact2_phone: '', emergency_contact2_relation: '',
      password: '',
    },
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: '', email: '', phone: '', designation: '', joining_date: '',
      managerId: 'none', company: 0,
      present_address: '', permanent_address: '',
      bank_name: '', bank_account_number: '', bank_ifsc: '', blood_group: '', aadhar_number: '',
      emergency_contact1_name: '', emergency_contact1_phone: '', emergency_contact1_relation: '',
      emergency_contact2_name: '', emergency_contact2_phone: '', emergency_contact2_relation: '',
      newPassword: '',
    },
  });

  const selectedRole = createForm.watch('role');
  const nameValue = createForm.watch('name');
  const selectedCompanyCreate = createForm.watch('company');
  const selectedCompanyEdit = editForm.watch('company');

  // Filter managers by selected company
  const filteredManagersCreate = selectedCompanyCreate
    ? managers.filter(m => !m.company || m.company === selectedCompanyCreate)
    : managers;

  const filteredManagersEdit = selectedCompanyEdit
    ? managers.filter(m => !m.company || m.company === selectedCompanyEdit)
    : managers;

  // Clear manager selection when company changes
  useEffect(() => {
    createForm.setValue('managerId', '');
  }, [selectedCompanyCreate]);

  useEffect(() => {
    editForm.setValue('managerId', 'none');
  }, [selectedCompanyEdit]);

  // Generate preview user_id with sequential format
  const previewUserId = nameValue 
    ? `${nameValue.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_${selectedRole}_XX`
    : '';

  useEffect(() => {
    if (open) {
      if (editUser) {
        editForm.reset({
          name: editUser.name, email: (editUser as any).email || '',
          phone: editUser.phone || '', designation: (editUser as any).designation || '',
          joining_date: (editUser as any).joining_date || '',
          managerId: editUser.manager_id || 'none',
          company: editUser.company?.id || (user?.company as any)?.id || (user?.company as any) || 0,
          newPassword: '',
          present_address: editUser.present_address || '',
          permanent_address: editUser.permanent_address || '',
          bank_name: editUser.bank_name || '',
          bank_account_number: editUser.bank_account_number || '',
          bank_ifsc: editUser.bank_ifsc || '',
          blood_group: editUser.blood_group || '',
          aadhar_number: editUser.aadhar_number || '',
          emergency_contact1_name: editUser.emergency_contact1_name || '',
          emergency_contact1_phone: editUser.emergency_contact1_phone || '',
          emergency_contact1_relation: editUser.emergency_contact1_relation || '',
          emergency_contact2_name: editUser.emergency_contact2_name || '',
          emergency_contact2_phone: editUser.emergency_contact2_phone || '',
          emergency_contact2_relation: editUser.emergency_contact2_relation || '',
        });
        setSameAsPresent(
          !!editUser.present_address &&
          editUser.present_address === editUser.permanent_address
        );
      } else {
        createForm.reset({
          name: '', email: '', phone: '', designation: '', role: 'employee',
          company: defaultCompanyId as any, managerId: '',
          joining_date: new Date().toISOString().split('T')[0],
          present_address: '', permanent_address: '',
          bank_name: '', bank_account_number: '', bank_ifsc: '', blood_group: '', aadhar_number: '',
          emergency_contact1_name: '', emergency_contact1_phone: '', emergency_contact1_relation: '',
          emergency_contact2_name: '', emergency_contact2_phone: '', emergency_contact2_relation: '',
          password: '',
        });
        setSameAsPresent(false);
      }
      setCreatedUserId(null);
      setCopied(false);
      setDeclared(false);
    }
  }, [open, editUser, createForm, editForm, defaultCompanyId]);

  const handleCreateSubmit = async (data: CreateUserFormData) => {
    logger.log('[UserFormModal] Form data before submit:', data);
    logger.log('[UserFormModal] Company value:', data.company, 'Type:', typeof data.company);
    
    // For manager/employee roles, company is required
    // For admin/hr roles, company can be undefined (0 means no company selected)
    let companyValue: number | undefined;
    if (data.role === 'manager' || data.role === 'employee') {
      // Company is required for these roles
      if (!data.company || data.company === 0) {
        toast.error('Company is required for manager and employee roles');
        return;
      }
      companyValue = data.company;
    } else {
      // For admin/hr, 0 means no company (undefined)
      companyValue = data.company === 0 ? undefined : data.company;
    }
    
    const result = await onSave({
      email: data.email || '', password: data.password, name: data.name, phone: data.phone, address: '',
      designation: data.designation || undefined, role: data.role as UserRole,
      company: companyValue, managerId: data.managerId || undefined, joining_date: data.joining_date || undefined,
      permanent_address: data.permanent_address, present_address: data.present_address,
      bank_name: data.bank_name, bank_account_number: data.bank_account_number,
      bank_ifsc: data.bank_ifsc, blood_group: data.blood_group, aadhar_number: data.aadhar_number,
      emergency_contact1_name: data.emergency_contact1_name,
      emergency_contact1_phone: data.emergency_contact1_phone,
      emergency_contact1_relation: data.emergency_contact1_relation,
      emergency_contact2_name: data.emergency_contact2_name,
      emergency_contact2_phone: data.emergency_contact2_phone,
      emergency_contact2_relation: data.emergency_contact2_relation,
    });

    if (result.success && result.userId) {
      setCreatedUserId(result.userId);
    }
  };

  const handleEditSubmit = async (data: EditUserFormData) => {
    if (!editUser || !onUpdate) return;
    
    const result = await onUpdate(editUser.id, {
      name: data.name, email: data.email || undefined, phone: data.phone, address: '',
      designation: data.designation || undefined, joining_date: data.joining_date || undefined,
      managerId: data.managerId === 'none' ? undefined : data.managerId,
      company: data.company, newPassword: data.newPassword || undefined,
      permanent_address: data.permanent_address, present_address: data.present_address,
      bank_name: data.bank_name, bank_account_number: data.bank_account_number,
      bank_ifsc: data.bank_ifsc, blood_group: data.blood_group, aadhar_number: data.aadhar_number,
      emergency_contact1_name: data.emergency_contact1_name,
      emergency_contact1_phone: data.emergency_contact1_phone,
      emergency_contact1_relation: data.emergency_contact1_relation,
      emergency_contact2_name: data.emergency_contact2_name,
      emergency_contact2_phone: data.emergency_contact2_phone,
      emergency_contact2_relation: data.emergency_contact2_relation,
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

                <div className="p-3 rounded-lg bg-muted">
                  <label className="text-xs font-medium text-muted-foreground">Role</label>
                  <p className="text-sm mt-1 capitalize font-medium">{editUser.role}</p>
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
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
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Software Engineer, Manager, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="joining_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Joining Date <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Company Selection — hidden for HR (global role) */}
                {editUser.role !== 'hr' && (
                  <CompanyFormField
                    control={editForm.control}
                    name="company"
                    label="Company"
                    description="Assign user to a company. Changing company will clear manager assignment."
                    required={true}
                  />
                )}

                {editUser.role === 'employee' && (
                  <FormField
                    control={editForm.control}
                    name="managerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign Manager</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select manager" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Manager</SelectItem>
                            {filteredManagersEdit.map((manager) => (
                              <SelectItem key={manager.id} value={manager.id}>
                                {manager.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Assign this employee to a manager for proper hierarchy.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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

                {/* Personal & Banking Details */}
                <div className="pt-2 border-t">
                  <p className="text-sm font-semibold mb-3">Personal & Banking Details</p>

                  <div className="space-y-4">
                    <FormField control={editForm.control} name="present_address" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Present Address <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter present/current address" {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              if (sameAsPresent) editForm.setValue('permanent_address', e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="edit-same-as-present"
                        checked={sameAsPresent}
                        onCheckedChange={(checked) => {
                          setSameAsPresent(!!checked);
                          if (checked) editForm.setValue('permanent_address', editForm.getValues('present_address'), { shouldValidate: true });
                        }}
                      />
                      <label htmlFor="edit-same-as-present" className="text-sm text-muted-foreground cursor-pointer select-none">
                        Permanent address same as present address
                      </label>
                    </div>

                    <FormField control={editForm.control} name="permanent_address" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Permanent Address <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter permanent address" {...field} disabled={sameAsPresent} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={editForm.control} name="blood_group" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blood Group <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="e.g. A+, O-" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="aadhar_number" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aadhar Number <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="12-digit Aadhar" maxLength={12} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={editForm.control} name="bank_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Enter bank name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={editForm.control} name="bank_account_number" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="Account number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="bank_ifsc" render={({ field }) => (
                        <FormItem>
                          <FormLabel>IFSC Code <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="IFSC code" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                {/* Emergency Contacts */}
                <div className="pt-2 border-t">
                  <p className="text-sm font-semibold mb-3">Emergency Contacts</p>
                  <div className="space-y-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact 1</p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={editForm.control} name="emergency_contact1_name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="Contact name" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="emergency_contact1_relation" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relation <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="e.g. Father, Spouse" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={editForm.control} name="emergency_contact1_phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Contact phone number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Contact 2</p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={editForm.control} name="emergency_contact2_name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="Contact name" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="emergency_contact2_relation" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relation <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="e.g. Mother, Sibling" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={editForm.control} name="emergency_contact2_phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Contact phone number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Declaration */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border">
                  <Checkbox id="edit-declaration" checked={declared} onCheckedChange={c => setDeclared(!!c)} className="mt-0.5 shrink-0" />
                  <label htmlFor="edit-declaration" className="text-xs text-muted-foreground cursor-pointer leading-relaxed select-none">
                    I hereby declare that all the details furnished by me in this form are true, complete, and correct to the best of my knowledge, and I understand that any discrepancy may lead to appropriate action.
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" className="btn-primary" disabled={isSubmitting || !declared}>
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
                name="joining_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Joining Date <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Software Engineer, Manager, etc." {...field} />
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
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company Selection — hidden for HR (global role) */}
              {selectedRole !== 'hr' && (
                <CompanyFormField
                  control={createForm.control}
                  name="company"
                  description={
                    selectedRole === 'admin'
                      ? "Optional: Select a company to assign this user to, or leave empty for global access"
                      : "Select the company this user belongs to"
                  }
                  required={selectedRole === 'manager' || selectedRole === 'employee'}
                />
              )}

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
                          {filteredManagersCreate.map((manager) => (
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

              {/* Personal & Banking Details */}
              <div className="pt-2 border-t">
                <p className="text-sm font-semibold mb-3">Personal & Banking Details</p>
                <div className="space-y-4">
                  <FormField control={createForm.control} name="present_address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Present Address <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter present/current address" {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (sameAsPresent) createForm.setValue('permanent_address', e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="create-same-as-present"
                      checked={sameAsPresent}
                      onCheckedChange={(checked) => {
                        setSameAsPresent(!!checked);
                        if (checked) createForm.setValue('permanent_address', createForm.getValues('present_address'), { shouldValidate: true });
                      }}
                    />
                    <label htmlFor="create-same-as-present" className="text-sm text-muted-foreground cursor-pointer select-none">
                      Permanent address same as present address
                    </label>
                  </div>

                  <FormField control={createForm.control} name="permanent_address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permanent Address <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter permanent address" {...field} disabled={sameAsPresent} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={createForm.control} name="blood_group" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blood Group <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="e.g. A+, O-" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="aadhar_number" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aadhar Number <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="12-digit Aadhar" maxLength={12} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={createForm.control} name="bank_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Enter bank name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={createForm.control} name="bank_account_number" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Account number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="bank_ifsc" render={({ field }) => (
                      <FormItem>
                        <FormLabel>IFSC Code <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="IFSC code" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              </div>

              {/* Emergency Contacts */}
              <div className="pt-2 border-t">
                <p className="text-sm font-semibold mb-3">Emergency Contacts</p>
                <div className="space-y-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact 1</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={createForm.control} name="emergency_contact1_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Contact name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="emergency_contact1_relation" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relation <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="e.g. Father, Spouse" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={createForm.control} name="emergency_contact1_phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Contact phone number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Contact 2</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={createForm.control} name="emergency_contact2_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Contact name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="emergency_contact2_relation" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relation <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="e.g. Mother, Sibling" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={createForm.control} name="emergency_contact2_phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Contact phone number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Login Instructions</p>
                <p className="text-xs text-muted-foreground">
                  After creating the user, share the <strong>User ID</strong> and <strong>Password</strong> with them. 
                  They can login using the "Staff / Manager" tab on the login page.
                </p>
              </div>

              {/* Declaration */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border">
                <Checkbox id="create-declaration" checked={declared} onCheckedChange={c => setDeclared(!!c)} className="mt-0.5 shrink-0" />
                <label htmlFor="create-declaration" className="text-xs text-muted-foreground cursor-pointer leading-relaxed select-none">
                  I hereby declare that all the details furnished by me in this form are true, complete, and correct to the best of my knowledge, and I understand that any discrepancy may lead to appropriate action.
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-primary" disabled={isSubmitting || !declared}>
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
