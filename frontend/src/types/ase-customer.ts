export interface ASECustomer {
  id: string;
  
  // Basic Information
  name?: string;
  phone: string;
  email?: string;
  company_name?: string;
  
  // Call Management
  call_status: ASECallStatus;
  custom_call_status?: string;
  
  // Assignment and Company
  company: string;
  company_name_display: string;
  company_code: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_by: string;
  created_by_name: string;
  
  // Service Interests
  service_interests: string[];
  custom_services?: string;
  
  // Notes
  notes?: string;
  
  // Conversion tracking
  is_converted: boolean;
  converted_lead_id?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  scheduled_date?: string;
}

export type ASECallStatus = 
  | 'pending'
  | 'answered'
  | 'not_answered'
  | 'busy'
  | 'not_interested'
  | 'custom';

// Form data interface
export interface ASECustomerFormData {
  name?: string;
  phone: string;
  email?: string;
  company_name?: string;
  call_status: ASECallStatus;
  custom_call_status?: string;
  service_interests?: string[];
  custom_services?: string;
  notes?: string;
}

// Call log entry
export interface CallLog {
  id: string;
  customer: string;
  called_by: string | null;
  called_by_name: string;
  call_status: ASECallStatus;
  call_status_display: string;
  custom_status?: string;
  notes?: string;
  called_at: string;
}

// Append-only note entry
export interface CustomerNote {
  id: string;
  customer: string;
  author: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

// Activity interface for customer activities
export interface ASECustomerActivity {
  id: string;
  customer: string;
  activity_type: string;
  title: string;
  description?: string;
  metadata?: any;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

// Constants for dropdowns
export const ASE_CALL_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'answered', label: 'Answered' },
  { value: 'not_answered', label: 'Not Answered' },
  { value: 'busy', label: 'Busy' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'custom', label: 'Custom' },
];

// Stats interface
export interface ASECustomerStats {
  total: number;
  pending: number;
  answered: number;
  not_answered: number;
  busy: number;
  not_interested: number;
  custom: number;
  converted: number;
}

// ASE Lead types (with digital marketing fields)
export interface ASELead {
  id: string;
  
  // Basic Information
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  website?: string;
  
  // Business Information
  industry: string;
  company_size?: string;
  annual_revenue?: string;
  
  // Marketing Information
  service_interests: string[];
  service_interests_display: string[];
  custom_services?: string;
  current_marketing_spend?: string;
  budget_amount?: string;
  
  // Current Marketing Status
  has_website: boolean;
  has_social_media: boolean;
  current_seo_agency?: string;
  marketing_goals?: string;
  
  // Lead Information
  lead_source?: string;
  referral_source?: string;
  
  // Status and Management
  status: ASELeadStatus;
  priority: ASELeadPriority;
  
  // Assignment and Company
  company: string;
  company_name_display: string;
  company_code: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_by: string;
  created_by_name: string;
  
  // Important Dates
  first_contact_date?: string;
  last_contact_date?: string;
  next_follow_up?: string;
  proposal_sent_date?: string;
  contract_start_date?: string;
  
  // Financial Information
  estimated_project_value?: number;
  monthly_retainer?: number;
  
  // Notes and Communication
  notes?: string;
  communication_log: any[];
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export type ASELeadStatus = 
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal_sent'
  | 'negotiating'
  | 'won'
  | 'lost'
  | 'on_hold'
  | 'nurturing';

export type ASELeadPriority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

export type ASEServiceType = 
  | 'seo'
  | 'social_media'
  | 'content_marketing'
  | 'ppc'
  | 'email_marketing'
  | 'web_design'
  | 'branding'
  | 'analytics'
  | 'influencer'
  | 'video_marketing'
  | 'custom';

export type ASEIndustry = 
  | 'technology'
  | 'healthcare'
  | 'finance'
  | 'retail'
  | 'real_estate'
  | 'education'
  | 'hospitality'
  | 'manufacturing'
  | 'professional_services'
  | 'non_profit'
  | 'automotive'
  | 'food_beverage'
  | 'fashion'
  | 'sports_fitness'
  | 'entertainment'
  | 'other';

// ASE Lead form data
export interface ASELeadFormData {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  website?: string;
  industry: ASEIndustry;
  company_size?: string;
  annual_revenue?: string;
  service_interests: ASEServiceType[];
  custom_services?: string;
  current_marketing_spend?: string;
  budget_amount?: string;
  has_website: boolean;
  has_social_media: boolean;
  current_seo_agency?: string;
  marketing_goals?: string;
  lead_source?: string;
  referral_source?: string;
  status: ASELeadStatus;
  priority: ASELeadPriority;
  assigned_to?: string;
  first_contact_date?: Date;
  last_contact_date?: Date;
  next_follow_up?: Date;
  proposal_sent_date?: Date;
  contract_start_date?: Date;
  estimated_project_value?: number;
  monthly_retainer?: number;
  notes?: string;
}

// Constants for ASE Leads
export const ASE_LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'nurturing', label: 'Nurturing' },
];

export const ASE_LEAD_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const ASE_SERVICE_OPTIONS = [
  { value: 'seo', label: 'SEO' },
  { value: 'social_media', label: 'Social Media Marketing' },
  { value: 'content_marketing', label: 'Content Marketing' },
  { value: 'ppc', label: 'Pay-Per-Click Advertising' },
  { value: 'email_marketing', label: 'Email Marketing' },
  { value: 'web_design', label: 'Web Design & Development' },
  { value: 'branding', label: 'Branding & Design' },
  { value: 'analytics', label: 'Analytics & Reporting' },
  { value: 'influencer', label: 'Influencer Marketing' },
  { value: 'video_marketing', label: 'Video Marketing' },
  { value: 'custom', label: 'Custom/Other Services' },
];

export const ASE_INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'education', label: 'Education' },
  { value: 'hospitality', label: 'Hospitality & Tourism' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'non_profit', label: 'Non-Profit' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'fashion', label: 'Fashion & Beauty' },
  { value: 'sports_fitness', label: 'Sports & Fitness' },
  { value: 'entertainment', label: 'Entertainment & Media' },
  { value: 'other', label: 'Other' },
];