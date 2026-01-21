import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Announcement, Lead, Project, Task, Leave } from '@/types';
import { useNotifications } from './NotificationContext';
import { useAuth } from '@/contexts/AuthContextDjango';
import { apiClient } from '@/lib/api';
import { logLeadActivity, logTaskActivity, logProjectActivity, logLeaveActivity } from '@/lib/activityLogger';
import { toast } from 'sonner';

interface DataContextType {
  leads: Lead[];
  tasks: Task[];
  projects: Project[];
  announcements: Announcement[];
  leaves: Leave[];
  loading: boolean;
  refreshData: (showLoading?: boolean) => Promise<void>;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  toggleAnnouncementActive: (id: string) => Promise<void>;
  addLeave: (leave: Omit<Leave, 'id' | 'createdAt'>) => Promise<void>;
  updateLeave: (id: string, data: Partial<Leave>) => Promise<void>;
  deleteLeave: (id: string) => Promise<void>;
  approveLeave: (id: string) => Promise<void>;
  rejectLeave: (id: string, reason?: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper to convert Django API response to Leave type
const apiToLeave = (apiLeave: any): Leave => ({
  id: apiLeave.id.toString(),
  userId: apiLeave.user.toString(),
  userName: apiLeave.user_name,
  userRole: apiLeave.user_role as 'admin' | 'manager' | 'employee',
  type: apiLeave.leave_type as 'sick' | 'casual' | 'annual' | 'other',
  startDate: new Date(apiLeave.start_date),
  endDate: new Date(apiLeave.end_date),
  reason: apiLeave.reason,
  status: apiLeave.status as 'pending' | 'approved' | 'rejected',
  approvedBy: apiLeave.approved_by?.toString(),
  createdAt: new Date(apiLeave.created_at),
});

// Helper to convert Django API response to Lead type
const apiToLead = (apiLead: any): Lead => ({
  id: apiLead.id.toString(),
  name: apiLead.name,
  phone: apiLead.phone || '',
  email: apiLead.email || '',
  address: apiLead.address || '',
  requirementType: apiLead.requirement_type || 'apartment',
  bhkRequirement: apiLead.bhk_requirement || '2',
  budgetMin: Number(apiLead.budget_min) || 0,
  budgetMax: Number(apiLead.budget_max) || 0,
  description: apiLead.description || '',
  preferredLocation: apiLead.preferred_location || '',
  source: apiLead.source || 'website',
  status: apiLead.status,
  followUpDate: apiLead.follow_up_date ? new Date(apiLead.follow_up_date) : undefined,
  notes: [],
  createdBy: apiLead.created_by_detail?.id?.toString() || apiLead.created_by?.toString() || '',
  assignedProjects: apiLead.assigned_projects || [], // New multiple projects field
  assignedProject: apiLead.assigned_project || '', // Keep for backward compatibility
  createdAt: new Date(apiLead.created_at),
  updatedAt: new Date(apiLead.updated_at),
});

// Helper to convert Django API response to Project type
const apiToProject = (apiProject: any): Project => ({
  id: apiProject.id.toString(),
  name: apiProject.name,
  location: '', // You'll need to add this field to Django model
  type: 'apartment', // Default value
  priceMin: Number(apiProject.budget) || 0,
  priceMax: Number(apiProject.budget) || 0,
  launchDate: new Date(apiProject.start_date),
  possessionDate: new Date(apiProject.end_date || apiProject.start_date),
  amenities: [],
  description: apiProject.description || '',
  towerDetails: '',
  nearbyLandmarks: [],
  photos: apiProject.photos || [], // Serializer already converts JSON to array
  coverImage: apiProject.cover_image || '',
  status: apiProject.status,
  createdAt: new Date(apiProject.created_at),
});

// Helper to convert Django API response to Task type
const apiToTask = (apiTask: any): Task => ({
  id: apiTask.id.toString(),
  leadId: apiTask.lead?.toString() || '',
  lead: apiTask.lead_detail ? {
    id: apiTask.lead_detail.id.toString(),
    name: apiTask.lead_detail.name,
    phone: apiTask.lead_detail.phone || '',
    email: apiTask.lead_detail.email || '',
    address: apiTask.lead_detail.address || '',
    requirementType: apiTask.lead_detail.requirement_type || 'apartment',
    bhkRequirement: apiTask.lead_detail.bhk_requirement || '2',
    budgetMin: Number(apiTask.lead_detail.budget_min) || 0,
    budgetMax: Number(apiTask.lead_detail.budget_max) || 0,
    description: apiTask.lead_detail.description || '',
    preferredLocation: apiTask.lead_detail.preferred_location || '',
    source: apiTask.lead_detail.source || 'website',
    status: apiTask.lead_detail.status,
    followUpDate: apiTask.lead_detail.follow_up_date ? new Date(apiTask.lead_detail.follow_up_date) : undefined,
    notes: [],
    createdBy: apiTask.lead_detail.created_by?.toString() || '',
    assignedProject: apiTask.lead_detail.assigned_project || '',
    createdAt: new Date(apiTask.lead_detail.created_at),
    updatedAt: new Date(apiTask.lead_detail.updated_at),
  } : {
    id: '',
    name: apiTask.title || 'Task',
    phone: '',
    email: '',
    address: '',
    requirementType: 'apartment',
    bhkRequirement: '2',
    budgetMin: 0,
    budgetMax: 0,
    description: apiTask.description || '',
    status: 'hot',
    notes: [],
    createdBy: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  status: apiTask.status,
  nextActionDate: apiTask.due_date ? new Date(apiTask.due_date) : undefined,
  notes: [],
  attachments: [],
  assignedTo: apiTask.assigned_to_detail?.id?.toString() || apiTask.assigned_to?.toString() || '',
  assignedProject: apiTask.project_detail?.id?.toString() || apiTask.project?.toString() || '',
  createdAt: new Date(apiTask.created_at),
  updatedAt: new Date(apiTask.updated_at),
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  
  const notificationContext = useNotifications();

  const fetchLeaves = useCallback(async () => {
    // Don't make API calls if no user is authenticated
    if (!user) {
      console.log('No authenticated user, skipping leaves fetch');
      return [];
    }
    
    try {
      const response = await apiClient.getLeaves();
      const leavesData = Array.isArray(response) ? response : (response as any).results || [];
      const leavesList = leavesData.map(apiToLeave);
      setLeaves(leavesList);
      return leavesList;
    } catch (error: any) {
      console.error('Error fetching leaves:', error);
      
      // Handle authentication errors
      if (error.message?.includes('401')) {
        console.warn('Authentication failed while fetching leaves. Clearing tokens.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      
      return [];
    }
  }, [user]);

  const fetchProjects = useCallback(async () => {
    // Don't make API calls if no user is authenticated
    if (!user) {
      console.log('No authenticated user, skipping projects fetch');
      return [];
    }
    
    try {
      const response = await apiClient.getProjects();
      const projectsList = response.results ? response.results.map(apiToProject) : [];
      setProjects(projectsList);
      return projectsList;
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      
      // Handle authentication errors
      if (error.message?.includes('401')) {
        console.warn('Authentication failed while fetching projects. Clearing tokens.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      
      return [];
    }
  }, [user]);

  const fetchLeads = useCallback(async () => {
    // Don't make API calls if no user is authenticated
    if (!user) {
      console.log('No authenticated user, skipping leads fetch');
      return [];
    }
    
    try {
      const response = await apiClient.getLeads();
      const leadsList = response.results ? response.results.map(apiToLead) : [];
      setLeads(leadsList);
      return leadsList;
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      
      // Handle authentication errors
      if (error.message?.includes('401')) {
        console.warn('Authentication failed while fetching leads. Clearing tokens.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      
      return [];
    }
  }, [user]);

  const fetchTasks = useCallback(async () => {
    // Don't make API calls if no user is authenticated
    if (!user) {
      console.log('No authenticated user, skipping tasks fetch');
      return [];
    }
    
    try {
      const response = await apiClient.getTasks();
      const tasksList = response.results ? response.results.map(apiToTask) : [];
      setTasks(tasksList);
      return tasksList;
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      
      // Handle authentication errors
      if (error.message?.includes('401')) {
        console.warn('Authentication failed while fetching tasks. Clearing tokens.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      
      return [];
    }
  }, [user]);

  const fetchAnnouncements = useCallback(async () => {
    // Don't make API calls if no user is authenticated
    if (!user) {
      console.log('No authenticated user, skipping announcements fetch');
      return [];
    }
    
    try {
      const response = await apiClient.getAnnouncements();
      // Handle paginated response from Django REST framework
      const announcementsData = Array.isArray(response) ? response : (response as any).results || [];
      
      // Transform Django announcement data to match frontend interface
      const transformedAnnouncements: Announcement[] = announcementsData.map((announcement: any) => ({
        id: announcement.id.toString(),
        title: announcement.title,
        message: announcement.message,
        priority: announcement.priority as 'low' | 'medium' | 'high',
        targetRoles: announcement.target_roles,
        isActive: announcement.is_active,
        expiresAt: announcement.expires_at ? new Date(announcement.expires_at) : undefined,
        createdBy: announcement.created_by.toString(),
        createdAt: new Date(announcement.created_at),
      }));
      
      setAnnouncements(transformedAnnouncements);
      return transformedAnnouncements;
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      
      // Handle authentication errors
      if (error.message?.includes('401')) {
        console.warn('Authentication failed while fetching announcements. Clearing tokens.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      
      toast.error('Failed to fetch announcements');
      setAnnouncements([]);
      return [];
    }
  }, [user]);

  const refreshData = useCallback(async (showLoading = false) => {
    // Don't fetch data if no user is authenticated
    if (!user) {
      setLoading(false);
      return;
    }
    
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      await Promise.all([
        fetchProjects(),
        fetchLeads(),
        fetchTasks(),
        fetchAnnouncements(),
        fetchLeaves(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
      
      // If we get authentication errors, it might mean tokens are invalid
      if (error instanceof Error && error.message.includes('401')) {
        console.warn('Authentication failed during data refresh. Tokens may be invalid.');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [fetchProjects, fetchLeads, fetchTasks, fetchAnnouncements, fetchLeaves, user]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user, refreshData]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      refreshData(true); // Show loading on initial fetch
    } else {
      setLoading(false);
    }
  }, [user, refreshData]);

  const addLead = useCallback(async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const leadData: any = {
        name: lead.name,
        phone: lead.phone,
        email: lead.email || '',
        address: lead.address || '',
        requirement_type: lead.requirementType || 'apartment',
        bhk_requirement: lead.bhkRequirement || '2',
        budget_min: lead.budgetMin || 0,
        budget_max: lead.budgetMax || 0,
        description: lead.description || '',
        preferred_location: lead.preferredLocation || '',
        status: lead.status,
        source: lead.source || 'website',
        assigned_projects: lead.assignedProjects || [], // New multiple projects field
        assigned_project: lead.assignedProject || null, // Keep for backward compatibility
        follow_up_date: lead.followUpDate?.toISOString() || null,
      };

      const newLead = await apiClient.createLead(leadData);
      const convertedLead = apiToLead(newLead);
      setLeads(prev => [convertedLead, ...prev]);

      // Log activity
      if (user) {
        console.log('Logging lead creation activity for user:', user);
        console.log('User structure:', { id: user.id, name: user.name, role: user.role });
        try {
          await logLeadActivity(user, 'created', lead.name);
          console.log('Lead activity logged successfully');
        } catch (activityError) {
          console.error('Failed to log lead activity:', activityError);
        }
      } else {
        console.warn('No user found for activity logging');
      }

      if (notificationContext?.addNotification) {
        notificationContext.addNotification({
          title: 'New Lead Created',
          message: `Lead "${lead.name}" has been created${lead.followUpDate ? ` with follow-up on ${lead.followUpDate.toLocaleDateString()}` : ''}`,
          type: 'lead',
          createdAt: new Date(),
        });
      }

      toast.success('Lead created successfully');
    } catch (error) {
      console.error('Error adding lead:', error);
      toast.error('Failed to add lead');
      throw error;
    }
  }, [notificationContext, user]);

  const updateLead = useCallback(async (id: string, data: Partial<Lead>) => {
    try {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email || '';
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.requirementType !== undefined) updateData.requirement_type = data.requirementType;
      if (data.bhkRequirement !== undefined) updateData.bhk_requirement = data.bhkRequirement;
      if (data.budgetMin !== undefined) updateData.budget_min = data.budgetMin;
      if (data.budgetMax !== undefined) updateData.budget_max = data.budgetMax;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.preferredLocation !== undefined) updateData.preferred_location = data.preferredLocation;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.source !== undefined) updateData.source = data.source;
      if (data.assignedProjects !== undefined) updateData.assigned_projects = data.assignedProjects;
      if (data.assignedProject !== undefined) updateData.assigned_project = data.assignedProject;
      if (data.followUpDate !== undefined) {
        updateData.follow_up_date = data.followUpDate?.toISOString() || null;
      }

      await apiClient.updateLead(parseInt(id), updateData);
      
      setLeads(prev =>
        prev.map(l => (l.id === id ? { ...l, ...data, updatedAt: new Date() } : l))
      );

      // Log activity
      if (user) {
        const leadName = data.name || leads.find(l => l.id === id)?.name || 'Unknown Lead';
        console.log('Logging lead update activity for user:', user);
        try {
          await logLeadActivity(user, 'updated', leadName);
          console.log('Lead update activity logged successfully');
        } catch (activityError) {
          console.error('Failed to log lead update activity:', activityError);
        }
      }

      toast.success('Lead updated successfully');
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
      throw error;
    }
  }, [user, leads]);

  const deleteLead = useCallback(async (id: string) => {
    try {
      // Get lead details before deletion for activity logging
      const leadToDelete = leads.find(l => l.id === id);
      const leadName = leadToDelete?.name || 'Unknown Lead';
      
      await apiClient.deleteLead(parseInt(id));
      setLeads(prev => prev.filter(l => l.id !== id));
      
      // Log activity after successful deletion
      if (user) {
        console.log('Logging lead deletion activity for user:', user);
        try {
          await logLeadActivity(user, 'deleted', leadName);
          console.log('Lead deletion activity logged successfully');
        } catch (activityError) {
          console.error('Failed to log lead deletion activity:', activityError);
        }
      }
      
      toast.success('Lead deleted successfully');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
      throw error;
    }
  }, [user, leads]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Ensure we have a project to assign the task to
      if (!projects || projects.length === 0) {
        toast.error('No projects available. Please create a project first.');
        throw new Error('No projects available');
      }

      let leadId = null;
      
      // If the lead has an auto-generated ID (starts with 'lead_'), create it first
      if (task.lead && task.lead.id.startsWith('lead_')) {
        try {
          const leadData = {
            name: task.lead.name,
            phone: task.lead.phone,
            email: task.lead.email || '',
            address: task.lead.address || '',
            requirement_type: task.lead.requirementType,
            bhk_requirement: task.lead.bhkRequirement,
            budget_min: task.lead.budgetMin,
            budget_max: task.lead.budgetMax,
            description: task.lead.description || '',
            status: task.lead.status,
          };
          
          const newLead = await apiClient.createLead(leadData);
          leadId = newLead.id;
          
          // Update leads list with the new lead
          const convertedLead = apiToLead(newLead);
          setLeads(prev => [convertedLead, ...prev]);
          
          toast.success('New customer created successfully');
        } catch (error) {
          console.error('Error creating lead:', error);
          toast.error('Failed to create customer');
          throw error;
        }
      } else if (task.lead) {
        // Use existing lead ID
        leadId = parseInt(task.lead.id);
      }

      const taskData = {
        title: `Task for ${task.lead?.name || 'Lead'}`,
        description: task.notes?.join('\n') || '',
        lead: leadId,
        status: task.status,
        priority: 'medium',
        project: parseInt(projects[0].id), // Assign to first project
        assigned_to: task.assignedTo ? parseInt(task.assignedTo) : null,
        due_date: task.nextActionDate?.toISOString() || null,
      };

      const newTask = await apiClient.createTask(taskData);
      const convertedTask = apiToTask(newTask);
      setTasks(prev => [convertedTask, ...prev]);

      // Log activity
      if (user) {
        await logTaskActivity(user, 'created', `for ${task.lead?.name || 'customer'}`);
      }

      if (notificationContext?.addNotification) {
        notificationContext.addNotification({
          title: 'New Task Created',
          message: `Task has been created for ${task.lead?.name || 'customer'}`,
          type: 'task',
          createdAt: new Date(),
        });
      }

      toast.success('Task created successfully');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
      throw error;
    }
  }, [notificationContext, projects, user]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    try {
      const updateData: any = {};
      if (data.status !== undefined) updateData.status = data.status;
      if (data.nextActionDate !== undefined) updateData.due_date = data.nextActionDate?.toISOString();

      await apiClient.updateTask(parseInt(id), updateData);
      
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, ...data, updatedAt: new Date() } : t))
      );

      // Log activity
      if (user && data.status) {
        const task = tasks.find(t => t.id === id);
        const taskDetails = task?.lead?.name ? `for ${task.lead.name}` : 'task';
        console.log('Logging task update activity for user:', user);
        try {
          await logTaskActivity(user, 'updated', `${taskDetails} status to ${data.status}`);
          console.log('Task update activity logged successfully');
        } catch (activityError) {
          console.error('Failed to log task update activity:', activityError);
        }
      }

      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      throw error;
    }
  }, [user, tasks]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await apiClient.deleteTask(parseInt(id));
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
      throw error;
    }
  }, []);

  const addProject = useCallback(async (project: Omit<Project, 'id' | 'createdAt'>) => {
    try {
      // Helper function to validate URL - match Django URLField validation
      const isValidUrl = (url: string) => {
        if (!url || !url.trim()) return false;
        
        const trimmedUrl = url.trim();
        
        // Must start with http:// or https://
        if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
          return false;
        }
        
        try {
          const urlObj = new URL(trimmedUrl);
          // Additional checks to match Django's URLField validation
          return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
          return false;
        }
      };

      // Filter valid photo URLs - send as array, not JSON string
      const validPhotos = (project.photos || []).filter(photo => {
        const isValid = isValidUrl(photo);
        if (!isValid && photo) {
          console.warn('Invalid photo URL filtered out:', photo);
        }
        return isValid;
      });

      console.log('Sending photos to backend:', validPhotos); // Debug log

      const projectData = {
        name: project.name,
        description: project.description,
        status: project.status,
        start_date: project.launchDate.toISOString().split('T')[0],
        end_date: project.possessionDate?.toISOString().split('T')[0],
        budget: project.priceMax || 0,
        photos: validPhotos, // Send as array - serializer handles JSON conversion
        cover_image: project.coverImage && isValidUrl(project.coverImage) ? project.coverImage : '',
      };

      const newProject = await apiClient.createProject(projectData);
      const convertedProject = apiToProject(newProject);
      setProjects(prev => [convertedProject, ...prev]);

      toast.success('Project created successfully');
    } catch (error: any) {
      console.error('Error adding project:', error);
      
      // Check if it's a photo URL validation error
      if (error.details?.photos) {
        const photoErrors = error.details.photos;
        if (typeof photoErrors === 'object') {
          // Handle individual photo URL errors
          Object.keys(photoErrors).forEach(index => {
            const photoError = photoErrors[index];
            if (Array.isArray(photoError) && photoError.includes('Enter a valid URL.')) {
              toast.error(`Photo URL at position ${parseInt(index) + 1} is invalid. Please use a valid http:// or https:// URL.`);
            }
          });
        } else {
          toast.error('Invalid photo URLs. Please ensure all URLs start with http:// or https://');
        }
      } else {
        toast.error('Failed to add project');
      }
      throw error;
    }
  }, []);

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => {
    try {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.launchDate !== undefined) updateData.start_date = data.launchDate.toISOString().split('T')[0];
      if (data.possessionDate !== undefined) updateData.end_date = data.possessionDate.toISOString().split('T')[0];
      if (data.priceMax !== undefined) updateData.budget = data.priceMax;
      if (data.photos !== undefined) updateData.photos = data.photos;
      if (data.coverImage !== undefined) updateData.cover_image = data.coverImage;

      await apiClient.updateProject(parseInt(id), updateData);
      
      setProjects(prev =>
        prev.map(p => (p.id === id ? { ...p, ...data } : p))
      );

      toast.success('Project updated successfully');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
      throw error;
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await apiClient.deleteProject(parseInt(id));
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
      throw error;
    }
  }, []);

  // Announcement functions
  const addAnnouncement = useCallback(async (announcement: Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      const announcementData = {
        title: announcement.title,
        message: announcement.message,
        priority: announcement.priority,
        target_roles: announcement.targetRoles,
        is_active: announcement.isActive,
        expires_at: announcement.expiresAt?.toISOString() || null,
      };
      
      const response = await apiClient.createAnnouncement(announcementData);
      
      // Transform response and add to state
      const newAnnouncement: Announcement = {
        id: response.id.toString(),
        title: response.title,
        message: response.message,
        priority: response.priority,
        targetRoles: response.target_roles,
        isActive: response.is_active,
        expiresAt: response.expires_at ? new Date(response.expires_at) : undefined,
        createdBy: response.created_by.toString(),
        createdAt: new Date(response.created_at),
      };
      
      setAnnouncements(prev => [newAnnouncement, ...prev]);
      toast.success('Announcement created successfully');
    } catch (error: any) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
      throw error;
    }
  }, []);

  const deleteAnnouncement = useCallback(async (id: string) => {
    try {
      await apiClient.deleteAnnouncement(parseInt(id));
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Announcement deleted successfully');
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      
      // Handle 404 errors (announcement already deleted)
      if (error.message.includes('404')) {
        // Remove from frontend state anyway since it doesn't exist on backend
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        toast.success('Announcement removed');
        // Refresh data to ensure sync
        await fetchAnnouncements();
      } else {
        toast.error('Failed to delete announcement');
        throw error;
      }
    }
  }, [fetchAnnouncements]);

  const toggleAnnouncementActive = useCallback(async (id: string) => {
    try {
      const response = await apiClient.toggleAnnouncementActive(parseInt(id));
      
      // Transform response and update state
      const updatedAnnouncement: Announcement = {
        id: response.id.toString(),
        title: response.title,
        message: response.message,
        priority: response.priority,
        targetRoles: response.target_roles,
        isActive: response.is_active,
        expiresAt: response.expires_at ? new Date(response.expires_at) : undefined,
        createdBy: response.created_by.toString(),
        createdAt: new Date(response.created_at),
      };
      
      setAnnouncements(prev => prev.map(a => a.id === id ? updatedAnnouncement : a));
      toast.success('Announcement updated successfully');
    } catch (error: any) {
      console.error('Error updating announcement:', error);
      toast.error('Failed to update announcement');
      throw error;
    }
  }, []);

  // Leave functions
  const addLeave = useCallback(async (leave: Omit<Leave, 'id' | 'createdAt'>) => {
    try {
      const leaveData = {
        leave_type: leave.type,
        start_date: leave.startDate.toISOString().split('T')[0],
        end_date: leave.endDate.toISOString().split('T')[0],
        reason: leave.reason,
      };
      
      const newLeave = await apiClient.createLeave(leaveData);
      const convertedLeave = apiToLeave(newLeave);
      setLeaves(prev => [convertedLeave, ...prev]);
      
      // Log activity
      if (user) {
        const duration = Math.ceil((leave.endDate.getTime() - leave.startDate.getTime()) / (1000 * 60 * 60 * 24));
        await logLeaveActivity(user, 'created', `${leave.type} leave for ${duration} days`);
      }
      
      toast.success('Leave request submitted successfully');
    } catch (error: any) {
      console.error('Error creating leave:', error);
      toast.error('Failed to submit leave request');
      throw error;
    }
  }, [user]);

  const updateLeave = useCallback(async (id: string, data: Partial<Leave>) => {
    try {
      const updateData: any = {};
      if (data.type !== undefined) updateData.leave_type = data.type;
      if (data.startDate !== undefined) updateData.start_date = data.startDate.toISOString().split('T')[0];
      if (data.endDate !== undefined) updateData.end_date = data.endDate.toISOString().split('T')[0];
      if (data.reason !== undefined) updateData.reason = data.reason;
      if (data.status !== undefined) updateData.status = data.status;

      const updatedLeave = await apiClient.updateLeave(parseInt(id), updateData);
      const convertedLeave = apiToLeave(updatedLeave);
      
      setLeaves(prev => prev.map(l => l.id === id ? convertedLeave : l));
      toast.success('Leave updated successfully');
    } catch (error: any) {
      console.error('Error updating leave:', error);
      toast.error('Failed to update leave');
      throw error;
    }
  }, []);

  const deleteLeave = useCallback(async (id: string) => {
    try {
      await apiClient.deleteLeave(parseInt(id));
      setLeaves(prev => prev.filter(l => l.id !== id));
      toast.success('Leave deleted successfully');
    } catch (error: any) {
      console.error('Error deleting leave:', error);
      toast.error('Failed to delete leave');
      throw error;
    }
  }, []);

  const approveLeave = useCallback(async (id: string) => {
    try {
      const updatedLeave = await apiClient.approveLeave(parseInt(id));
      const convertedLeave = apiToLeave(updatedLeave);
      
      setLeaves(prev => prev.map(l => l.id === id ? convertedLeave : l));
      toast.success('Leave approved successfully');
    } catch (error: any) {
      console.error('Error approving leave:', error);
      toast.error('Failed to approve leave');
      throw error;
    }
  }, []);

  const rejectLeave = useCallback(async (id: string, reason?: string) => {
    try {
      const updatedLeave = await apiClient.rejectLeave(parseInt(id), reason);
      const convertedLeave = apiToLeave(updatedLeave);
      
      setLeaves(prev => prev.map(l => l.id === id ? convertedLeave : l));
      toast.success('Leave rejected successfully');
    } catch (error: any) {
      console.error('Error rejecting leave:', error);
      toast.error('Failed to reject leave');
      throw error;
    }
  }, []);

  const value = {
    leads,
    tasks,
    projects,
    announcements,
    leaves,
    loading,
    refreshData,
    addLead,
    updateLead,
    deleteLead,
    addTask,
    updateTask,
    deleteTask,
    addProject,
    updateProject,
    deleteProject,
    addAnnouncement,
    deleteAnnouncement,
    toggleAnnouncementActive,
    addLeave,
    updateLeave,
    deleteLeave,
    approveLeave,
    rejectLeave,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}