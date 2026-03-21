export type UserRole = 'admin' | 'manager' | 'employee' | 'hr';

export type LeadStatus = 'new' | 'hot' | 'warm' | 'cold' | 'not_interested' | 'reminder' | 'contacted' | 'qualified' | 'converted';

export type TaskStatus = 'in_progress' | 'site_visit' | 'family_visit' | 'perfect_family_visit' | 'completed' | 'rejected';

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export type ProjectStatus = 'pre_launch' | 'launch' | 'under_construction' | 'mid_stage' | 'ready_to_go';

export type RequirementType = 'villa' | 'apartment' | 'house' | 'plot';

export type LeadSource = 'call' | 'walk_in' | 'website' | 'referral' | 'customer_conversion';

// Customer Management Types
export type CallStatus = 'pending' | 'answered' | 'not_answered' | 'busy' | 'not_interested' | 'custom';

// Company Types
export interface Company {
  id: number;
  name: string;
  code: string;
  logo?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  userId: string; // Auto-generated login ID (e.g., "john_admin_001")
  email?: string; // Optional email
  name: string;
  phone: string;
  address: string;
  role: UserRole;
  status: 'active' | 'inactive';
  permissions: Permission[];
  createdAt: Date;
  managerId?: string;
  manager?: number; // Manager ID for backend API
  manager_name?: string; // Manager's name from backend
  employees_count?: number; // Count of employees under this manager
  password?: string; // For demo purposes
}

export interface Permission {
  module: 'leads' | 'tasks' | 'projects' | 'leaves' | 'reports' | 'users';
  actions: ('view' | 'create' | 'edit' | 'delete' | 'approve')[];
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  requirementType: RequirementType;
  bhkRequirement: '1' | '2' | '3' | '4' | '5+';
  budgetMin: number;
  budgetMax: number;
  description: string;
  preferredLocation?: string;
  source?: LeadSource | string;
  status: LeadStatus;
  followUpDate?: Date;
  notes: LeadNote[];
  createdBy: string;
  assignedTo?: string; // Employee assignment for role-based visibility
  assignedProjects?: string[]; // Changed to array for multiple projects
  assignedProject?: string; // Keep for backward compatibility
  company?: number; // Company ID
  company_detail?: Company; // Nested company information from backend
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  leadId: string;
  lead: Lead;
  status: TaskStatus;
  nextActionDate?: Date;
  notes: TaskNote[];
  attachments: string[];
  assignedTo: string;
  assignedProject?: string;
  company?: number; // Company ID
  company_detail?: Company; // Nested company information from backend
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  type: 'villa' | 'apartment' | 'plots';
  priceMin: number;
  priceMax: number;
  launchDate: Date;
  possessionDate: Date;
  amenities: string[];
  description: string;
  towerDetails?: string;
  nearbyLandmarks: string[];
  coverImage: string; // Cover/Project image (same image)
  blueprintImage: string; // Blueprint/Plan image
  status: ProjectStatus;
  availability?: string;
  company?: number; // Company ID
  company_detail?: Company; // Nested company information from backend
  createdAt: Date;
}

export interface Leave {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  type: 'sick' | 'casual' | 'annual' | 'other';
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  createdAt: Date;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  targetRoles: ('admin' | 'manager' | 'employee' | 'hr')[];
  assignedEmployeeIds?: number[];
  assignedEmployeeDetails?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  }[];
  document?: File; // For form uploads
  document_url?: string; // URL to download document
  document_name?: string; // Original filename
  companies_detail?: {
    id: number;
    name: string;
    is_active?: boolean;
  }[]; // Company details for multi-company announcements
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface Holiday {
  id: string;
  name: string;
  start_date: Date;
  end_date?: Date;
  date: Date; // Backward compatibility - maps to start_date
  holiday_type: 'national' | 'religious' | 'company' | 'optional';
  description: string;
  image?: string | File;
  is_recurring: boolean;
  created_by: string;
  created_by_detail?: User;
  created_at: Date;
  updated_at: Date;
}

export interface Customer {
  id: string;
  name?: string;
  phone: string;
  callStatus: CallStatus;
  customCallStatus?: string; // For custom status
  assignedTo?: string; // Employee ID
  assignedToName?: string; // Employee name
  createdBy: string;
  createdByName: string;
  company?: number; // Company ID
  company_detail?: Company; // Nested company information from backend
  createdAt: Date;
  updatedAt: Date;
  callDate?: Date; // When the call was made
  scheduledDate?: Date; // When this customer is scheduled to be called
  isConverted: boolean; // Whether converted to lead
  convertedLeadId?: string; // ID of the lead if converted
  notes?: string;
}

export interface CallAllocation {
  id: string;
  employeeId: string;
  employeeName: string;
  date: Date;
  totalAllocated: number;
  completed: number;
  pending: number;
  createdBy: string;
  createdAt: Date;
}

// HR Dashboard Types
export interface HRDashboardMetrics {
  total_employees: number;
  pending_leaves: number;
  upcoming_holidays: number;
  active_announcements: number;
}

export interface EmployeeStatistics {
  total_employees: number;
  by_role: Array<{ role: string; count: number }>;
  with_manager: number;
  without_manager: number;
}

export interface LeaveStatistics {
  total_leaves: number;
  by_status: Array<{ status: string; count: number }>;
  by_type: Array<{ leave_type: string; count: number }>;
  pending_count: number;
}

// Project Availability Types (for complex JSON structure - currently not used)
export interface ProjectFlat {
  flatNumber: string;
  facing: string;
  bhk: string;
  area: number;
  status: 'available' | 'sold' | 'blocked';
  price?: number;
}

export interface ProjectFloor {
  floor: number;
  flats: ProjectFlat[];
}

export interface ProjectAvailability {
  floors: ProjectFloor[];
  summary: {
    totalFlats: number;
    available: number;
    sold: number;
    blocked: number;
  };
}
