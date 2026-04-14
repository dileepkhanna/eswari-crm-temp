import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Customer } from '@/types';
import { useData } from '@/contexts/DataContextDjango';
import { cn } from '@/lib/utils';

import { logger } from '@/lib/logger';
interface ConversionFormModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onConversionComplete: () => void;
}

interface ConversionFormData {
  name: string;
  phone: string;
  email: string;
  lead_source: string;
  assigned_projects: string[];
  address: string;
  requirement_type: 'villa' | 'apartment' | 'house' | 'plot';
  bhk_requirement: '1' | '2' | '3' | '4' | '5+';
  budget_min: string;
  budget_max: string;
  preferred_location: string;
  status: 'new' | 'hot' | 'warm' | 'cold';
  follow_up_date: Date | undefined;
  notes: string;
}

export default function ConversionFormModal({ open, onClose, customer, onConversionComplete }: ConversionFormModalProps) {
  const { projects } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ConversionFormData>({
    name: '',
    phone: '',
    email: '',
    lead_source: 'Customer Conversion',
    assigned_projects: [],
    address: '',
    requirement_type: 'apartment',
    bhk_requirement: '2',
    budget_min: '',
    budget_max: '',
    preferred_location: '',
    status: 'new',
    follow_up_date: undefined,
    notes: '',
  });

  // Pre-fill form with customer data when modal opens
  useEffect(() => {
    if (open && customer) {
      setFormData(prev => ({
        ...prev,
        name: customer.name || '',
        phone: customer.phone || '',
        email: '', // Customer type doesn't have email, so start with empty string
      }));
    }
  }, [open, customer]);

  const handleProjectToggle = (projectId: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_projects: prev.assigned_projects.includes(projectId)
        ? prev.assigned_projects.filter(id => id !== projectId)
        : [...prev.assigned_projects, projectId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customer) return;

    // Validation
    if (!formData.name.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    // Note: Assigned projects are optional - no validation required

    try {
      setIsSubmitting(true);

      const leadData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
        requirement_type: formData.requirement_type,
        bhk_requirement: formData.bhk_requirement,
        budget_min: parseFloat(formData.budget_min) || 0,
        budget_max: parseFloat(formData.budget_max) || 0,
        preferred_location: formData.preferred_location,
        status: formData.status,
        source: formData.lead_source,
        assigned_projects: formData.assigned_projects.map(id => parseInt(id)),
        follow_up_date: formData.follow_up_date ? formData.follow_up_date.toISOString() : undefined,
        description: formData.notes || undefined,
      };

      const response = await apiClient.convertCustomer(customer.id, leadData);

      toast.success('Call converted to lead successfully!');
      onConversionComplete();
      handleClose();
    } catch (error: any) {
      logger.error('Failed to convert call:', error);
      toast.error('Failed to convert call. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => { 
    setFormData({
      name: '',
      phone: '',
      email: '',
      lead_source: 'Customer Conversion',
      assigned_projects: [],
      address: '',
      requirement_type: 'apartment',
      bhk_requirement: '2',
      budget_min: '',
      budget_max: '',
      preferred_location: '',
      status: 'new',
      follow_up_date: undefined,
      notes: '',
    });
    onClose();
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert Call to Lead</DialogTitle>
          <DialogDescription>
            Fill in the lead details to convert {customer.name || customer.phone} to a lead.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead_source">Lead Source</Label>
              <Select
                value={formData.lead_source}
                onValueChange={(value) => setFormData({ ...formData, lead_source: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer Conversion">Customer Conversion</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Advertisement">Advertisement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assigned Projects */}
          <div className="space-y-2">
            <Label>Assigned Projects (Optional)</Label>
            <div className="text-xs text-muted-foreground mb-2">
              Select one or more projects to assign to this lead (optional)
            </div>
            
            {projects.length === 0 ? (
              <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">No projects available</p>
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg">
                <div className="p-2 space-y-2">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors",
                        formData.assigned_projects.includes(project.id)
                          ? "bg-primary/10 border border-primary"
                          : "bg-background border border-border hover:bg-muted/50"
                      )}
                      onClick={() => handleProjectToggle(project.id)}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center",
                        formData.assigned_projects.includes(project.id)
                          ? "bg-primary border-primary"
                          : "border-gray-300"
                      )}>
                        {formData.assigned_projects.includes(project.id) && (
                          <div className="w-2 h-2 bg-white rounded-sm" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.location}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
            />
          </div>

          {/* Property Requirements */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requirement_type">Requirement Type</Label>
              <Select
                value={formData.requirement_type}
                onValueChange={(value: any) => setFormData({ ...formData, requirement_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="plot">Plot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bhk_requirement">BHK Requirement</Label>
              <Select
                value={formData.bhk_requirement}
                onValueChange={(value: any) => setFormData({ ...formData, bhk_requirement: value })}
              >
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Budget Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget_min">Minimum Budget ($)</Label>
              <Input
                id="budget_min"
                type="number"
                value={formData.budget_min}
                onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                min="0"
                step="1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget_max">Maximum Budget ($)</Label>
              <Input
                id="budget_max"
                type="number"
                value={formData.budget_max}
                onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                min="0"
                step="1000"
              />
            </div>
          </div>

          {/* Location and Follow-up */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preferred_location">Preferred Location</Label>
              <Input
                id="preferred_location"
                value={formData.preferred_location}
                onChange={(e) => setFormData({ ...formData, preferred_location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.follow_up_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.follow_up_date ? format(formData.follow_up_date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.follow_up_date}
                    onSelect={(date) => setFormData({ ...formData, follow_up_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Description / Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Converting...
                </>
              ) : (
                'Convert to Lead'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}