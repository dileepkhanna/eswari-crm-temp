import type { UserRole, Company } from '@/types';

export interface DBUser {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  designation?: string | null;
  joining_date?: string | null;
  team?: number | null;
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
  status: string;
  manager_id: string | null;
  manager_name?: string | null;
  company?: Company;
  company_name?: string | null;
  created_at: string;
  updated_at: string;
  role: UserRole;
}
