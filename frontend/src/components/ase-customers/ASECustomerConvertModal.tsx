import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ASECustomer,
  ASE_INDUSTRY_OPTIONS,
  ASE_SERVICE_OPTIONS,
  ASE_LEAD_STATUS_OPTIONS,
  ASE_LEAD_PRIORITY_OPTIONS,
  ASEServiceType,
  ASEIndustry,
  ASELeadStatus,
  ASELeadPriority
} from '@/types/ase-customer';

import { logger } from '@/lib/logger';
interface ASECustomerConvertModalProps {
  open: boolean;
  onClose: () => void;
  onConvert: (leadData: any) => Promise<void>;
  customer: ASECustomer;
}

export default function ASECustomerConvertModal({
  open,
  onClose,
  onConvert,
  customer
}: ASECustomerConvertModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contact_person: customer.name || '',
    company_name: customer.company_name || '',
    industry: 'technology' as ASEIndustry,
    service_interests: (customer.service_interests || []) as ASEServiceType[],
    custom_services: customer.custom_services || '',
    budget_amount: '',
    marketing_goals: '',
    website: '',
    has_website: false,
    has_social_media: false,
    current_seo_agency: '',
    status: 'new' as ASELeadStatus,
    priority: 'medium' as ASELeadPriority,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contact_person.trim()) {
      alert('Contact person is required');
      return;
    }

    if (!formData.company_name.trim()) {
      alert('Company name is required');
      return;
    }
    
    if (formData.service_interests.length === 0) {
      alert('Please select at least one service interest');
      return;
    }

    try {
      setLoading(true);
      await onConvert(formData);
      onClose();
    } catch (error) {
      logger.error('Error converting customer to lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceInterestChange = (service: ASEServiceType, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      service_interests: checked
        ? [...prev.service_interests, service]
        : prev.service_interests.filter(s => s !== service)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="convert-description">
        <DialogHeader>
          <DialogTitle>
            Convert Call to Lead: {customer.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add digital marketing information to convert this call into a qualified lead.
          </p>
        </DialogHeader>

        <div id="convert-description" className="sr-only">
          Convert a simple ASE call into a qualified lead by adding digital marketing information
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_person">Contact Person *</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                  placeholder="Full name of contact"
                  required
                />
              </div>
              <div>
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="industry">Industry *</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value as ASEIndustry }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASE_INDUSTRY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Service Interests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Service Interests *</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ASE_SERVICE_OPTIONS.map(service => (
                <div key={service.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={service.value}
                    checked={formData.service_interests.includes(service.value as ASEServiceType)}
                    onCheckedChange={(checked) => 
                      handleServiceInterestChange(service.value as ASEServiceType, checked as boolean)
                    }
                  />
                  <Label htmlFor={service.value} className="text-sm">
                    {service.label}
                  </Label>
                </div>
              ))}
            </div>
            
            {/* Custom Services Input (only if custom is selected) */}
            {formData.service_interests.includes('custom' as ASEServiceType) && (
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

          {/* Budget and Marketing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Budget & Marketing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget_amount">Budget Amount (Monthly)</Label>
                <Input
                  id="budget_amount"
                  placeholder="e.g., ₹2,00,000 per month"
                  value={formData.budget_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget_amount: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="current_seo_agency">Current SEO Agency</Label>
                <Input
                  id="current_seo_agency"
                  placeholder="Current agency name (if any)"
                  value={formData.current_seo_agency}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_seo_agency: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_website"
                  checked={formData.has_website}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, has_website: checked as boolean }))
                  }
                />
                <Label htmlFor="has_website">Has existing website</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_social_media"
                  checked={formData.has_social_media}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, has_social_media: checked as boolean }))
                  }
                />
                <Label htmlFor="has_social_media">Has social media presence</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="marketing_goals">Marketing Goals</Label>
              <Textarea
                id="marketing_goals"
                placeholder="Describe their marketing goals and objectives..."
                value={formData.marketing_goals}
                onChange={(e) => setFormData(prev => ({ ...prev, marketing_goals: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          {/* Lead Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Lead Classification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Lead Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as ASELeadStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASE_LEAD_STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as ASELeadPriority }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASE_LEAD_PRIORITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Converting...' : 'Convert to Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}