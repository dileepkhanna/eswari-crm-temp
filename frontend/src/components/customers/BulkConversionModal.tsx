import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle, XCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

import { logger } from '@/lib/logger';
interface BulkConversionModalProps {
  open: boolean;
  onClose: () => void;
  selectedCustomerIds: string[];
  onConversionComplete: () => void;
}

interface BulkConversionFormData {
  requirement_type: 'villa' | 'apartment' | 'house' | 'plot';
  bhk_requirement: '1' | '2' | '3' | '4' | '5+';
  budget_min: string;
  budget_max: string;
  status: 'new' | 'hot' | 'warm' | 'cold';
}

interface ValidationErrors {
  requirement_type?: string;
  bhk_requirement?: string;
  budget_min?: string;
  budget_max?: string;
  status?: string;
}

interface ConversionSummary {
  total: number;
  success_count: number;
  skipped_count: number;
  error_count: number;
  errors: Array<{
    customer_id: string;
    error: string;
  }>;
}

export default function BulkConversionModal({
  open,
  onClose,
  selectedCustomerIds,
  onConversionComplete,
}: BulkConversionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [progress, setProgress] = useState(0);
  const [formData, setFormData] = useState<BulkConversionFormData>({
    requirement_type: 'apartment',
    bhk_requirement: '2',
    budget_min: '',
    budget_max: '',
    status: 'warm',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [budgetError, setBudgetError] = useState<string>('');
  const [conversionSummary, setConversionSummary] = useState<ConversionSummary | null>(null);

  // Real-time budget validation
  useEffect(() => {
    if (formData.budget_min && formData.budget_max) {
      const min = parseFloat(formData.budget_min);
      const max = parseFloat(formData.budget_max);
      
      if (!isNaN(min) && !isNaN(max) && min > max) {
        setBudgetError('Minimum budget must be less than or equal to maximum budget');
      } else {
        setBudgetError('');
      }
    } else {
      setBudgetError('');
    }
  }, [formData.budget_min, formData.budget_max]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Required fields
    if (!formData.requirement_type) {
      newErrors.requirement_type = 'Requirement type is required';
    }

    if (!formData.bhk_requirement) {
      newErrors.bhk_requirement = 'BHK requirement is required';
    }

    if (!formData.budget_min) {
      newErrors.budget_min = 'Minimum budget is required';
    } else if (parseFloat(formData.budget_min) < 0) {
      newErrors.budget_min = 'Budget must be positive';
    }

    if (!formData.budget_max) {
      newErrors.budget_max = 'Maximum budget is required';
    } else if (parseFloat(formData.budget_max) < 0) {
      newErrors.budget_max = 'Budget must be positive';
    }

    // Budget range validation
    if (formData.budget_min && formData.budget_max) {
      const min = parseFloat(formData.budget_min);
      const max = parseFloat(formData.budget_max);
      if (!isNaN(min) && !isNaN(max) && min > max) {
        newErrors.budget_max = 'Maximum budget must be greater than or equal to minimum budget';
      }
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    if (budgetError) {
      toast.error('Please fix the budget range error');
      return;
    }

    if (selectedCustomerIds.length === 0) {
      toast.error('No customers selected for conversion');
      return;
    }

    try {
      setIsSubmitting(true);
      setProgress(10);

      const defaultValues = {
        requirement_type: formData.requirement_type,
        bhk_requirement: formData.bhk_requirement,
        budget_min: parseFloat(formData.budget_min),
        budget_max: parseFloat(formData.budget_max),
        status: formData.status,
      };

      setProgress(30);

      const response = await apiClient.bulkConvertCustomers(selectedCustomerIds, defaultValues);

      setProgress(100);

      if (response.success) {
        setConversionSummary(response.summary);
        setShowResults(true);
        
        const { success_count, skipped_count, error_count } = response.summary;
        
        if (error_count === 0 && skipped_count === 0) {
          toast.success(`Successfully converted ${success_count} call(s) to leads!`);
        } else if (success_count > 0) {
          toast.success(`Converted ${success_count} call(s). ${skipped_count} skipped, ${error_count} errors.`);
        } else {
          toast.warning(`No calls converted. ${skipped_count} skipped, ${error_count} errors.`);
        }
        
        // Refresh customer list
        onConversionComplete();
      } else {
        toast.error('Bulk conversion failed. Please try again.');
      }
    } catch (error: any) {
      logger.error('Failed to convert customers:', error);
      
      // Handle validation errors from backend
      if (error.message && error.message.includes('details:')) {
        try {
          const errorDetails = JSON.parse(error.message.split('details:')[1]);
          if (errorDetails.details) {
            const backendErrors: ValidationErrors = {};
            Object.keys(errorDetails.details).forEach(key => {
              backendErrors[key as keyof ValidationErrors] = errorDetails.details[key][0];
            });
            setErrors(backendErrors);
            toast.error('Please fix the validation errors');
          } else {
            toast.error(errorDetails.message || 'Failed to convert customers');
          }
        } catch {
          toast.error('Failed to convert customers. Please try again.');
        }
      } else {
        toast.error('Failed to convert customers. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      setProgress(0);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        requirement_type: 'apartment',
        bhk_requirement: '2',
        budget_min: '',
        budget_max: '',
        status: 'warm',
      });
      setErrors({});
      setBudgetError('');
      setShowResults(false);
      setConversionSummary(null);
      setProgress(0);
      onClose();
    }
  };

  const handleStartNew = () => {
    setShowResults(false);
    setConversionSummary(null);
    setFormData({
      requirement_type: 'apartment',
      bhk_requirement: '2',
      budget_min: '',
      budget_max: '',
      status: 'warm',
    });
    setErrors({});
    setBudgetError('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Convert Calls to Leads</DialogTitle>
          <DialogDescription>
            Convert {selectedCustomerIds.length} selected call(s) to leads with default values.
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selected Customers Count */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Selected Customers</p>
                  <p className="text-2xl font-bold text-primary">{selectedCustomerIds.length}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Already-converted calls will be automatically skipped
              </p>
            </div>

            {/* Default Values Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Default Lead Values</h3>
              <p className="text-xs text-muted-foreground">
                These values will be applied to all converted leads
              </p>

              {/* Requirement Type and BHK */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requirement_type">
                    Requirement Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.requirement_type}
                    onValueChange={(value: any) => setFormData({ ...formData, requirement_type: value })}
                  >
                    <SelectTrigger className={errors.requirement_type ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="plot">Plot</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.requirement_type && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.requirement_type}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bhk_requirement">
                    BHK Requirement <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.bhk_requirement}
                    onValueChange={(value: any) => setFormData({ ...formData, bhk_requirement: value })}
                  >
                    <SelectTrigger className={errors.bhk_requirement ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 BHK</SelectItem>
                      <SelectItem value="2">2 BHK</SelectItem>
                      <SelectItem value="3">3 BHK</SelectItem>
                      <SelectItem value="4">4 BHK</SelectItem>
                      <SelectItem value="5+">5+ BHK</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.bhk_requirement && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.bhk_requirement}
                    </p>
                  )}
                </div>
              </div>

              {/* Budget Range */}
              <div className="space-y-2">
                <Label>
                  Budget Range <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Input
                      type="number"
                      value={formData.budget_min}
                      onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                      placeholder="Minimum"
                      min="0"
                      step="100000"
                      className={errors.budget_min || budgetError ? 'border-red-500' : ''}
                    />
                    {errors.budget_min && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.budget_min}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      value={formData.budget_max}
                      onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                      placeholder="Maximum"
                      min="0"
                      step="100000"
                      className={errors.budget_max || budgetError ? 'border-red-500' : ''}
                    />
                    {errors.budget_max && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.budget_max}
                      </p>
                    )}
                  </div>
                </div>
                {budgetError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {budgetError}
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.status}
                  </p>
                )}
              </div>
            </div>

            {/* Progress Indicator */}
            {isSubmitting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Converting calls...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !!budgetError}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Converting...
                  </>
                ) : (
                  `Convert ${selectedCustomerIds.length} Call(s)`
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* Conversion Results */
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600" />
              <h3 className="text-2xl font-bold">Conversion Complete</h3>
              
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{conversionSummary?.success_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Converted</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{conversionSummary?.skipped_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{conversionSummary?.error_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            {conversionSummary && conversionSummary.errors && conversionSummary.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Error Details
                </h4>
                <div className="border rounded-lg max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer ID</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversionSummary.errors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{error.customer_id}</TableCell>
                          <TableCell className="text-red-600">{error.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleStartNew}>
                Convert More
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
