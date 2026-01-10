import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Announcement, Lead, Project, Task } from '@/types';
import { useNotifications } from './NotificationContext';
import { useAuth } from '@/contexts/AuthContextDjango';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

interface DataContextType {
  leads: Lead[];
  tasks: Task[];
  projects: Project[];
  announcements: Announcement[];
  loading: boolean;
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
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper to convert Django API response to Lead type
const apiToLead = (apiLead: any): Lead => ({
  id: apiLead.id.toString(),
  name: apiLead.name,
  phone: apiLead.phone || '',
  email: apiLead.email,
  address: apiLead.company || '', // Using company as address for now
  requirementType: 'apartment', // Default value, you can enhance this
  bhkRequirement: '2', // Default value
  budgetMin: 0, // You'll need to add these fields to Django model
  budgetMax: 0,
  description: apiLead.notes || '',
  preferredLocation: '',
  source: apiLead.source || '',
  status: apiLead.status,
  followUpDate: undefined,
  notes: [],
  createdBy: apiLead.created_by_detail?.id?.toString() || apiLead.created_by?.toString() || '',
  assignedProject: '',
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
  photos: apiProject.photos || [],
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
    address: apiTask.lead_detail.company || '',
    requirementType: 'apartment', // Default value
    bhkRequirement: '2', // Default value
    budgetMin: 0,
    budgetMax: 0,
    description: apiTask.lead_detail.notes || '',
    status: apiTask.lead_detail.status,
    notes: [],
    createdBy: '',
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
    status: 'new',
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
  const [loading, setLoading] = useState(true);
  
  const notificationContext = useNotifications();

  const fetchProjects = useCallback(async () => {
    try {
      const response = await apiClient.getProjects();
      const projectsList = response.results ? response.results.map(apiToProject) : [];
      setProjects(projectsList);
      return projectsList;
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      const response = await apiClient.getLeads();
      const leadsList = response.results ? response.results.map(apiToLead) : [];
      setLeads(leadsList);
      return leadsList;
    } catch (error) {
      console.error('Error fetching leads:', error);
      return [];
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await apiClient.getTasks();
      const tasksList = response.results ? response.results.map(apiToTask) : [];
      setTasks(tasksList);
      return tasksList;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
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
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to fetch announcements');
      setAnnouncements([]);
      return [];
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    
    try {
      await Promise.all([
        fetchProjects(),
        fetchLeads(),
        fetchTasks(),
        fetchAnnouncements(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchProjects, fetchLeads, fetchTasks, fetchAnnouncements]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user, refreshData]);

  const addLead = useCallback(async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const leadData: any = {
        name: lead.name,
        phone: lead.phone,
        company: lead.address, // Using address as company for now
        status: lead.status,
        priority: 'medium',
        source: lead.source,
        notes: lead.description,
      };

      // Only include email if it's not empty
      if (lead.email && lead.email.trim()) {
        leadData.email = lead.email;
      }

      const newLead = await apiClient.createLead(leadData);
      const convertedLead = apiToLead(newLead);
      setLeads(prev => [convertedLead, ...prev]);

      if (notificationContext?.addNotification) {
        notificationContext.addNotification({
          title: 'New Lead Created',
          message: `Lead "${lead.name}" has been created`,
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
  }, [notificationContext]);

  const updateLead = useCallback(async (id: string, data: Partial<Lead>) => {
    try {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) {
        // Only include email if it's not empty
        if (data.email && data.email.trim()) {
          updateData.email = data.email;
        }
      }
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.company = data.address;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.source !== undefined) updateData.source = data.source;
      if (data.description !== undefined) updateData.notes = data.description;

      await apiClient.updateLead(parseInt(id), updateData);
      
      setLeads(prev =>
        prev.map(l => (l.id === id ? { ...l, ...data, updatedAt: new Date() } : l))
      );

      toast.success('Lead updated successfully');
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
      throw error;
    }
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    try {
      await apiClient.deleteLead(parseInt(id));
      setLeads(prev => prev.filter(l => l.id !== id));
      toast.success('Lead deleted successfully');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
      throw error;
    }
  }, []);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Ensure we have a project to assign the task to
      if (!projects || projects.length === 0) {
        toast.error('No projects available. Please create a project first.');
        throw new Error('No projects available');
      }

      const taskData = {
        title: `Task for ${task.lead?.name || 'Lead'}`,
        description: task.notes?.join('\n') || '',
        status: task.status,
        priority: 'medium',
        project: parseInt(projects[0].id), // Assign to first project
        assigned_to: task.assignedTo ? parseInt(task.assignedTo) : null,
        due_date: task.nextActionDate?.toISOString() || null,
      };

      const newTask = await apiClient.createTask(taskData);
      const convertedTask = apiToTask(newTask);
      setTasks(prev => [convertedTask, ...prev]);

      if (notificationContext?.addNotification) {
        notificationContext.addNotification({
          title: 'New Task Created',
          message: `Task has been created`,
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
  }, [notificationContext, projects]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    try {
      const updateData: any = {};
      if (data.status !== undefined) updateData.status = data.status;
      if (data.nextActionDate !== undefined) updateData.due_date = data.nextActionDate?.toISOString();

      await apiClient.updateTask(parseInt(id), updateData);
      
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, ...data, updatedAt: new Date() } : t))
      );

      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      throw error;
    }
  }, []);

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
      const projectData = {
        name: project.name,
        description: project.description,
        status: project.status,
        start_date: project.launchDate.toISOString().split('T')[0],
        end_date: project.possessionDate?.toISOString().split('T')[0],
        budget: project.priceMax || 0,
        photos: project.photos || [],
        cover_image: project.coverImage || '',
      };

      const newProject = await apiClient.createProject(projectData);
      const convertedProject = apiToProject(newProject);
      setProjects(prev => [convertedProject, ...prev]);

      toast.success('Project created successfully');
    } catch (error) {
      console.error('Error adding project:', error);
      toast.error('Failed to add project');
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

  const value = {
    leads,
    tasks,
    projects,
    announcements,
    loading,
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
    refreshData,
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