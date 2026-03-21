import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ASECustomer, 
  ASECustomerFormData,
  ASE_CALL_STATUS_OPTIONS,
  ASECallStatus,
  ASE_SERVICE_OPTIONS
} from '@/types/ase-customer';
import { useAuth } from '@/contexts/AuthContextDjango';

import { apiClient } from '@/lib/api';
import { logger } from '@/lib/logger';
interface ASECustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ASECustomerFormData>) => Promise<void>;
  customer?: ASECustomer | null;
}

export default function ASECustomerFormModal({
  open,
  onClose,
  onSave,
  customer
}: ASECustomerFormModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const checkPhoneDuplicate = async (phone: string) => {
    if (!phone.trim()) return;
    try {
      const params = new URLSearchParams({ phone: phone.trim() });
      if (customer?.id) params.append('exclude_id', String(customer.id));
      const data = await apiClient.get(`/ase/customers/check_phone/?${params}`);
      if (data?.exists) {
        setPhoneError(`Phone number '${phone.trim()}' already exists in your company.`);
      }
    } catch {
      // silently ignore on blur
    }
  };
  const [formData, setFormData] = useState<Partial<ASECustomerFormData>>({
    name: '',
    phone: '',
    email: '',
    company_name: '',
    call_status: 'pending',
    custom_call_status: '',
    service_interests: [],
    custom_services: '',
    notes: '',
  });

  // Reset form when modal opens/closes or customer changes
  useEffect(() => {
    if (open) {
      setPhoneError(null);
      if (customer) {
        // Edit mode - populate with customer data
        setFormData({
          name: customer.name || '',
          phone: customer.phone,
          email: customer.email || '',
          company_name: customer.company_name || '',
          call_status: customer.call_status,
          custom_call_status: customer.custom_call_status || '',
          service_interests: customer.service_interests || [],
          custom_services: customer.custom_services || '',
          notes: customer.notes || '',
        });
      } else {
        // Create mode - reset to defaults
        setFormData({
          name: '',
          phone: '',
          email: '',
          company_name: '',
          call_status: 'pending',
          custom_call_status: '',
          service_interests: [],
          custom_services: '',
          notes: '',
        });
      }
    }
  }, [open, customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.phone?.trim()) {
      alert('Phone number is required');
      return;
    }

    if (phoneError) return;

    try {
      setLoading(true);
      setPhoneError(null);
      await onSave(formData);
      onClose();
    } catch (error: any) {
      const details = (() => {
        try {
          const match = error?.message?.match(/details: (\{.*\})/s);
          return match ? JSON.parse(match[1]) : null;
        } catch { return null; }
      })();
      const phoneMsg = details?.phone?.[0] ?? details?.phone ?? null;
      if (phoneMsg) {
        setPhoneError(typeof phoneMsg === 'string' ? phoneMsg : String(phoneMsg));
      } else {
        logger.error('Error saving ASE customer:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-describedby="customer-form-description">
        <DialogHeader>
          <DialogTitle>
            {customer ? 'Edit ASE Customer' : 'Add New ASE Customer'}
          </DialogTitle>
        </DialogHeader>

        <div id="customer-form-description" className="sr-only">
          {customer ? 'Edit existing ASE customer information' : 'Add a new ASE customer with basic contact details'}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Name */}
          <div>
            <Label htmlFor="name">Customer Name</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* Company Name */}
          <div>
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              placeholder="Enter customer's company name..."
              value={formData.company_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
            />
          </div>

          {/* Phone Number */}
          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, phone: e.target.value }));
                if (phoneError) setPhoneError(null);
              }}
              onBlur={(e) => checkPhoneDuplicate(e.target.value)}
              required
              className={phoneError ? 'border-red-500' : ''}
            />
            {phoneError && (
              <p className="text-sm text-red-500 mt-1">{phoneError}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          {/* Call Status */}
          <div>
            <Label htmlFor="call_status">Call Status</Label>
            <Select
              value={formData.call_status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, call_status: value as ASECallStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASE_CALL_STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Status (only if custom is selected) */}
          {formData.call_status === 'custom' && (
            <div>
              <Label htmlFor="custom_call_status">Custom Status</Label>
              <Input
                id="custom_call_status"
                placeholder="Enter custom status"
                value={formData.custom_call_status || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_call_status: e.target.value }))}
              />
            </div>
          )}

          {/* Service Interests */}
          <div>
            <Label>Service Interests</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select the digital marketing services this customer is interested in:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
              {ASE_SERVICE_OPTIONS.map((service) => (
                <div key={service.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`service-${service.value}`}
                    checked={formData.service_interests?.includes(service.value) || false}
                    onCheckedChange={(checked) => {
                      const currentInterests = formData.service_interests || [];
                      if (checked) {
                        setFormData(prev => ({
                          ...prev,
                          service_interests: [...currentInterests, service.value]
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          service_interests: currentInterests.filter(interest => interest !== service.value)
                        }));
                      }
                    }}
                  />
                  <Label 
                    htmlFor={`service-${service.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {service.label}
                  </Label>
                </div>
              ))}
            </div>
            {formData.service_interests && formData.service_interests.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {formData.service_interests.length} service{formData.service_interests.length !== 1 ? 's' : ''} selected
              </p>
            )}
            
            {/* Custom Services Input (only if custom is selected) */}
            {formData.service_interests?.includes('custom') && (
              <div className="mt-3">
                <Label htmlFor="custom_services">Custom Services</Label>
                <Input
                  id="custom_services"
                  placeholder="Specify other services you're interested in..."
                  value={formData.custom_services || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_services: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Please describe any additional services not listed above
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Customer notes and comments..."
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (customer ? 'Update Customer' : 'Create Customer')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}