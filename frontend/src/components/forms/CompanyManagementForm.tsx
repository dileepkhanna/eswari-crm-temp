import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Upload, X, Building2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Company } from '@/types';

const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(200),
  code: z.string()
    .min(2, 'Company code must be at least 2 characters')
    .max(50)
    .regex(/^[A-Z0-9_]+$/, 'Company code must be uppercase letters, numbers, and underscores only'),
  is_active: z.boolean().default(true),
  logo: z.any().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyManagementFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  company?: Company | null;
  isSubmitting?: boolean;
}

/**
 * CompanyManagementForm component for creating/editing companies
 * 
 * Features:
 * - Company name and code fields
 * - Logo upload with image preview
 * - Active/inactive toggle
 * - Admin-only access
 * 
 * Requirements: 4.6, 4.7, 12.6
 */
export default function CompanyManagementForm({
  open,
  onClose,
  onSubmit,
  company,
  isSubmitting = false,
}: CompanyManagementFormProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isEditMode = !!company;

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      code: '',
      is_active: true,
    },
  });

  // Load company data when editing
  useEffect(() => {
    if (company && open) {
      form.reset({
        name: company.name,
        code: company.code,
        is_active: company.is_active ?? true,
      });
      
      // Set logo preview if exists
      if (company.logo_url) {
        setLogoPreview(company.logo_url);
      }
    } else if (!open) {
      // Reset form when dialog closes
      form.reset({
        name: '',
        code: '',
        is_active: true,
      });
      setLogoPreview(null);
      setLogoFile(null);
    }
  }, [company, open, form]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (data: CompanyFormData) => {
    try {
      // Create FormData for multipart/form-data submission
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('code', data.code.toUpperCase());
      formData.append('is_active', data.is_active.toString());
      
      // Add logo file if selected
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      await onSubmit(formData);
      
      // Reset form on success
      form.reset();
      setLogoPreview(null);
      setLogoFile(null);
      onClose();
    } catch (error: any) {
      // Handle validation errors
      if (error.response?.data) {
        const errors = error.response.data;
        Object.keys(errors).forEach((key) => {
          form.setError(key as any, {
            type: 'manual',
            message: Array.isArray(errors[key]) ? errors[key][0] : errors[key],
          });
        });
      }
    }
  };

  // Auto-format code to uppercase
  const handleCodeChange = (value: string) => {
    return value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditMode ? 'Edit Company' : 'Create New Company'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update company information and logo' 
              : 'Add a new company to the system'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Company Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Company Name
                        <span className="text-destructive ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Eswari Group"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Company Code */}
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Company Code
                        <span className="text-destructive ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., ESWARI"
                          {...field}
                          onChange={(e) => field.onChange(handleCodeChange(e.target.value))}
                          disabled={isSubmitting || isEditMode}
                          className="uppercase"
                        />
                      </FormControl>
                      <FormDescription>
                        Uppercase letters, numbers, and underscores only. Cannot be changed after creation.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Logo Upload */}
                <div className="space-y-2">
                  <FormLabel>Company Logo</FormLabel>
                  <div className="flex items-start gap-4">
                    {/* Logo Preview */}
                    {logoPreview ? (
                      <div className="relative">
                        <div className="w-32 h-32 border-2 border-dashed rounded-lg overflow-hidden bg-muted">
                          <img
                            src={logoPreview}
                            alt="Company logo preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={handleRemoveLogo}
                          disabled={isSubmitting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}

                    {/* Upload Button */}
                    <div className="flex-1 space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {logoPreview ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Recommended: Square image, max 5MB
                        <br />
                        Supported formats: JPG, PNG, GIF, WebP
                      </p>
                    </div>
                  </div>
                </div>

                {/* Active Status */}
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <FormDescription>
                          Inactive companies cannot be accessed by users
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Update Company' : 'Create Company'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
