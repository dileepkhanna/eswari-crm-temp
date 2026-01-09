export type UserRole = 'admin' | 'manager' | 'employee';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export type RequirementType = 'villa' | 'apartment' | 'house' | 'plot';

export type LeadSource = 'call' | 'walk_in' | 'website' | 'referral';

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
  source?: LeadSource;
  status: LeadStatus;
  followUpDate?: Date;
  notes: LeadNote[];
  createdBy: string;
  assignedProject?: string;
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
  photos: string[];
  coverImage: string;
  status: ProjectStatus;
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
  targetRoles: ('admin' | 'manager' | 'employee')[];
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}
