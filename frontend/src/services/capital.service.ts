import { apiClient } from '@/lib/api';

const BASE = '/capital';

export interface CapitalCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company_name?: string;
  call_status: string;
  custom_call_status?: string;
  interest?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_by?: number;
  created_by_name?: string;
  scheduled_date?: string;
  call_date?: string;
  notes?: string;
  is_converted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CapitalLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  description?: string;
  status: string;
  source: string;
  follow_up_date?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CapitalTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  loan?: number;
  loan_name?: string;
  loan_phone?: string;
  service?: number;
  service_name?: string;
  service_type_display?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_by?: number;
  created_by_name?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

async function get(url: string) {
  return (apiClient as any).request(url);
}
async function post(url: string, body: any) {
  return (apiClient as any).request(url, { method: 'POST', body: JSON.stringify(body) });
}
async function patch(url: string, body: any) {
  return (apiClient as any).request(url, { method: 'PATCH', body: JSON.stringify(body) });
}
async function del(url: string) {
  return (apiClient as any).request(url, { method: 'DELETE' });
}

// ── Customers ──────────────────────────────────────────────────────────────
export const capitalCustomerService = {
  list: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)]))).toString() : '';
    return get(`${BASE}/customers/${q}`);
  },
  create: (data: Partial<CapitalCustomer>) => post(`${BASE}/customers/`, data),
  update: (id: string, data: Partial<CapitalCustomer>) => patch(`${BASE}/customers/${id}/`, data),
  delete: (id: string) => del(`${BASE}/customers/${id}/`),
  convertToLead: (id: string) => post(`${BASE}/customers/${id}/convert_to_lead/`, {}),
  bulkImport: (customers: any[]) => post(`${BASE}/customers/bulk_import/`, { customers }),
};

// ── Leads ──────────────────────────────────────────────────────────────────
export const capitalLeadService = {
  list: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)]))).toString() : '';
    return get(`${BASE}/leads/${q}`);
  },
  create: (data: Partial<CapitalLead>) => post(`${BASE}/leads/`, data),
  update: (id: string, data: Partial<CapitalLead>) => patch(`${BASE}/leads/${id}/`, data),
  delete: (id: string) => del(`${BASE}/leads/${id}/`),
  bulkImport: (leads: any[]) => post(`${BASE}/leads/bulk_import/`, { leads }),
};

// ── Tasks ──────────────────────────────────────────────────────────────────
export const capitalTaskService = {
  list: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)]))).toString() : '';
    return get(`${BASE}/tasks/${q}`);
  },
  create: (data: Partial<CapitalTask>) => post(`${BASE}/tasks/`, data),
  update: (id: string, data: Partial<CapitalTask>) => patch(`${BASE}/tasks/${id}/`, data),
  delete: (id: string) => del(`${BASE}/tasks/${id}/`),
  bulkImport: (tasks: any[]) => post(`${BASE}/tasks/bulk_import/`, { tasks }),
};

// ── Loans ──────────────────────────────────────────────────────────────────
export interface CapitalLoan {
  id: string;
  applicant_name: string;
  phone: string;
  email?: string;
  address?: string;
  loan_type: string;
  loan_type_display?: string;
  loan_amount?: string;
  tenure_months?: number;
  interest_rate?: string;
  bank_name?: string;
  status: string;
  status_display?: string;
  notes?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export const capitalLoanService = {
  list: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)]))).toString() : '';
    return get(`${BASE}/loans/${q}`);
  },
  create: (data: Partial<CapitalLoan>) => post(`${BASE}/loans/`, data),
  update: (id: string, data: Partial<CapitalLoan>) => patch(`${BASE}/loans/${id}/`, data),
  delete: (id: string) => del(`${BASE}/loans/${id}/`),
  bulkImport: (loans: any[]) => post(`${BASE}/loans/bulk_import/`, { loans }),
};

// ── Services (GST / MSME / Income Tax) ────────────────────────────────────
export interface CapitalService {
  id: string;
  client_name: string;
  phone: string;
  email?: string;
  business_name?: string;
  city_state?: string;
  service_type: string;
  service_type_display?: string;
  status: string;
  status_display?: string;
  // GST / MSME shared
  business_type?: string;
  business_type_display?: string;
  // GST specific
  turnover_range?: string;
  turnover_range_display?: string;
  existing_gst_number?: boolean | null;
  gstin?: string;
  // MSME specific
  existing_msme_number?: boolean | null;
  udyam_number?: string;
  // Income Tax specific
  date_of_birth?: string;
  income_nature?: string[];
  income_slab?: string;
  income_slab_display?: string;
  // Common optional
  pan_number?: string;
  aadhaar_number?: string;
  financial_year?: string;
  service_fee?: string;
  notes?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export const capitalServiceService = {
  list: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)]))).toString() : '';
    return get(`${BASE}/services/${q}`);
  },
  create: (data: Partial<CapitalService>) => post(`${BASE}/services/`, data),
  update: (id: string, data: Partial<CapitalService>) => patch(`${BASE}/services/${id}/`, data),
  delete: (id: string) => del(`${BASE}/services/${id}/`),
  bulkImport: (services: any[]) => post(`${BASE}/services/bulk_import/`, { services }),
};
