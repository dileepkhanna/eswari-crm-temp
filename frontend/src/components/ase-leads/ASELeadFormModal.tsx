import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ASELead,
  ASELeadFormData,
  ASE_INDUSTRY_OPTIONS,
  ASE_SERVICE_OPTIONS,
  ASE_LEAD_STATUS_OPTIONS,
  ASE_LEAD_PRIORITY_OPTIONS,
  ASEServiceType,
  ASEIndustry,
  ASELeadStatus,
  ASELeadPriority
} from '@/types/ase-customer';

import { apiClient } from '@/lib/api';
import { logger } from '@/lib/logger';
interface ASELeadFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ASELeadFormData) => Promise<void>;
  lead?: ASELead | null;
}

export default function ASELeadFormModal({
  open,
  onClose,
  onSave,
  lead
}: ASELeadFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const checkPhoneDuplicate = async (phone: string) => {
    if (!phone.trim()) return;
    try {
      const params = new URLSearchParams({ phone: phone.trim() });
      if (lead?.id) params.append('exclude_id', String(lead.id));
      const data = await apiClient.get(`/ase-leads/check_phone/?${params}`);
      if (data?.exists) {
        setPhoneError(`Phone number '${phone.trim()}' already exists in your company.`);
      }
    } catch {
      // silently ignore on blur
    }
  };
  const [formData, setFormData] = useState<ASELeadFormData>({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    website: '',
    industry: 'technology',
    company_size: '',
    annual_revenue: '',
    service_interests: [],
    custom_services: '',
    current_marketing_spend: '',
    budget_amount: '',
    has_website: false,
    has_social_media: false,
    current_seo_agency: '',
    marketing_goals: '',
    lead_source: '',
    referral_source: '',
    status: 'new',
    priority: 'medium',
    first_contact_date: undefined,
    last_contact_date: undefined,
    next_follow_up: undefined,
    proposal_sent_date: undefined,
    contract_start_date: undefined,
    estimated_project_value: undefined,
    monthly_retainer: undefined,
    notes: '',
  });

  // Reset form when modal opens/closes or lead changes
  useEffect(() => {
    if (open) {
      setPhoneError(null);
      if (lead) {
        // Edit mode - populate with lead data
        setFormData({
          company_name: lead.company_name,
          contact_person: lead.contact_person,
          email: lead.email,
          phone: lead.phone,
          website: lead.website || '',
          industry: lead.industry as ASEIndustry,
          company_size: lead.company_size || '',
          annual_revenue: lead.annual_revenue || '',
          service_interests: (lead.service_interests || []) as ASEServiceType[],
          custom_services: lead.custom_services || '',
          current_marketing_spend: lead.current_marketing_spend || '',
          budget_amount: lead.budget_amount || '',
          has_website: lead.has_website,
          has_social_media: lead.has_social_media,
          current_seo_agency: lead.current_seo_agency || '',
          marketing_goals: lead.marketing_goals || '',
          lead_source: lead.lead_source || '',
          referral_source: lead.referral_source || '',
          status: lead.status as ASELeadStatus,
          priority: lead.priority as ASELeadPriority,
          first_contact_date: lead.first_contact_date ? new Date(lead.first_contact_date) : undefined,
          last_contact_date: lead.last_contact_date ? new Date(lead.last_contact_date) : undefined,
          next_follow_up: lead.next_follow_up ? new Date(lead.next_follow_up) : undefined,
          proposal_sent_date: lead.proposal_sent_date ? new Date(lead.proposal_sent_date) : undefined,
          contract_start_date: lead.contract_start_date ? new Date(lead.contract_start_date) : undefined,
          estimated_project_value: lead.estimated_project_value || undefined,
          monthly_retainer: lead.monthly_retainer || undefined,
          notes: lead.notes || '',
        });
      } else {
        // Create mode - reset to defaults
        setFormData({
          company_name: '',
          contact_person: '',
          email: '',
          phone: '',
          website: '',
          industry: 'technology',
          company_size: '',
          annual_revenue: '',
          service_interests: [],
          custom_services: '',
          current_marketing_spend: '',
          budget_amount: '',
          has_website: false,
          has_social_media: false,
          current_seo_agency: '',
          marketing_goals: '',
          lead_source: '',
          referral_source: '',
          status: 'new',
          priority: 'medium',
          first_contact_date: undefined,
          last_contact_date: undefined,
          next_follow_up: undefined,
          proposal_sent_date: undefined,
          contract_start_date: undefined,
          estimated_project_value: undefined,
          monthly_retainer: undefined,
          notes: '',
        });
      }
    }
  }, [open, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company_name.trim()) {
      alert('Company name is required');
      return;
    }
    
    if (!formData.contact_person.trim()) {
      alert('Contact person is required');
      return;
    }
    
    if (!formData.email.trim()) {
      alert('Email is required');
      return;
    }
    
    if (!formData.phone.trim()) {
      alert('Phone is required');
      return;
    }
    
    if (phoneError) return;
    
    if (formData.service_interests.length === 0) {
      alert('Please select at least one service interest');
      return;
    }

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
        logger.error('Error saving ASE lead:', error);
      }
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

  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleDateChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value ? new Date(value) : undefined
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lead ? 'Edit ASE Lead' : 'Add New ASE Lead'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="contact_person">Contact Person *</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
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

          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div>
                <Label htmlFor="company_size">Company Size</Label>
                <Input
                  id="company_size"
                  placeholder="e.g., 10-50 employees"
                  value={formData.company_size}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_size: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="annual_revenue">Annual Revenue</Label>
                <Input
                  id="annual_revenue"
                  placeholder="e.g., ₹1-5 Crores"
                  value={formData.annual_revenue}
                  onChange={(e) => setFormData(prev => ({ ...prev, annual_revenue: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Service Interests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Service Interests *</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-lg p-4">
              {ASE_SERVICE_OPTIONS.map(service => (
                <div key={service.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={service.value}
                    checked={formData.service_interests.includes(service.value as ASEServiceType)}
                    onCheckedChange={(checked) => 
                      handleServiceInterestChange(service.value as ASEServiceType, checked as boolean)
                    }
                  />
                  <Label htmlFor={service.value} className="text-sm cursor-pointer">
                    {service.label}
                  </Label>
                </div>
              ))}
            </div>
            {formData.service_interests.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {formData.service_interests.length} service{formData.service_interests.length !== 1 ? 's' : ''} selected
              </p>
            )}
            
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

          {/* Marketing Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Marketing Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget_amount">Budget Amount</Label>
                <Input
                  id="budget_amount"
                  placeholder="e.g., ₹2,00,000 per month"
                  value={formData.budget_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget_amount: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="current_marketing_spend">Current Marketing Spend</Label>
                <Input
                  id="current_marketing_spend"
                  placeholder="e.g., ₹50,000 per month"
                  value={formData.current_marketing_spend}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_marketing_spend: e.target.value }))}
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
              <div>
                <Label htmlFor="lead_source">Lead Source</Label>
                <Input
                  id="lead_source"
                  placeholder="e.g., Website, Referral, Cold Call"
                  value={formData.lead_source}
                  onChange={(e) => setFormData(prev => ({ ...prev, lead_source: e.target.value }))}
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

          {/* Lead Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Lead Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
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

          {/* Important Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Important Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_contact_date">First Contact Date</Label>
                <Input
                  id="first_contact_date"
                  type="date"
                  value={formatDateForInput(formData.first_contact_date)}
                  onChange={(e) => handleDateChange('first_contact_date', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="next_follow_up">Next Follow Up</Label>
                <Input
                  id="next_follow_up"
                  type="date"
                  value={formatDateForInput(formData.next_follow_up)}
                  onChange={(e) => handleDateChange('next_follow_up', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Financial Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated_project_value">Estimated Project Value (₹)</Label>
                <Input
                  id="estimated_project_value"
                  type="number"
                  placeholder="e.g., 500000"
                  value={formData.estimated_project_value || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    estimated_project_value: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="monthly_retainer">Monthly Retainer (₹)</Label>
                <Input
                  id="monthly_retainer"
                  type="number"
                  placeholder="e.g., 50000"
                  value={formData.monthly_retainer || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    monthly_retainer: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes and comments..."
              value={formData.notes}
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
              {loading ? 'Saving...' : (lead ? 'Update Lead' : 'Create Lead')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}