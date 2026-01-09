const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'admin' | 'manager' | 'employee';
  created_at: string;
}

interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('access_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      await this.refreshToken();
      // Retry the request with new token
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
        const retryResponse = await fetch(url, { ...options, headers });
        if (!retryResponse.ok) {
          let errorData = {};
          try {
            errorData = await retryResponse.json();
          } catch (jsonError) {
            errorData = { error: `HTTP ${retryResponse.status} ${retryResponse.statusText}` };
          }
          throw new Error(`HTTP error! status: ${retryResponse.status}, details: ${JSON.stringify(errorData)}`);
        }
        
        // Handle 204 No Content responses (like DELETE)
        if (retryResponse.status === 204) {
          return null;
        }
        
        // Try to parse JSON, but handle empty responses gracefully
        try {
          return await retryResponse.json();
        } catch (jsonError) {
          console.warn('Failed to parse JSON response, returning null:', jsonError);
          return null;
        }
      }
    }

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, create a simple error object
        errorData = { error: `HTTP ${response.status} ${response.statusText}` };
      }
      throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
    }

    // Handle 204 No Content responses (like DELETE)
    if (response.status === 204) {
      return null;
    }

    // Try to parse JSON, but handle empty responses gracefully
    try {
      return await response.json();
    } catch (jsonError) {
      // If JSON parsing fails but status is OK, return null
      console.warn('Failed to parse JSON response, returning null:', jsonError);
      return null;
    }
  }

  private async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return;

    try {
      const response = await fetch(`${this.baseURL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.access;
        localStorage.setItem('access_token', data.access);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
    }
  }

  // Auth methods
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.token = data.access;
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    
    return data;
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    phone: string;
    role?: string;
  }): Promise<AuthResponse> {
    return this.request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getProfile(): Promise<User> {
    return this.request('/auth/profile/');
  }

  async logout() {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Users
  async getUsers(): Promise<User[]> {
    return this.request('/auth/users/');
  }

  async getManagers(): Promise<User[]> {
    return this.request('/auth/managers/');
  }

  async createUser(userData: {
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    phone: string;
    role: string;
    manager?: number;
  }) {
    return this.request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Leads
  async getLeads(params?: Record<string, any>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/leads/${queryString}`);
  }

  async createLead(leadData: any) {
    return this.request('/leads/', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  }

  async updateLead(id: number, leadData: any) {
    return this.request(`/leads/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(leadData),
    });
  }

  async deleteLead(id: number) {
    return this.request(`/leads/${id}/`, {
      method: 'DELETE',
    });
  }

  // Projects
  async getProjects(params?: Record<string, any>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/projects/${queryString}`);
  }

  async createProject(projectData: any) {
    return this.request('/projects/', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async updateProject(id: number, projectData: any) {
    return this.request(`/projects/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  }

  async deleteProject(id: number) {
    return this.request(`/projects/${id}/`, {
      method: 'DELETE',
    });
  }

  // Project image upload
  async uploadProjectImage(imageFile: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const url = `${this.baseURL}/projects/upload_image/`;
    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (jsonError) {
        errorData = { error: `HTTP ${response.status} ${response.statusText}` };
      }
      throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  }

  // Tasks
  async getTasks(params?: Record<string, any>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/tasks/${queryString}`);
  }

  async createTask(taskData: any) {
    return this.request('/tasks/', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(id: number, taskData: any) {
    return this.request(`/tasks/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async deleteTask(id: number) {
    return this.request(`/tasks/${id}/`, {
      method: 'DELETE',
    });
  }

  // Announcements
  async getAnnouncements(params?: Record<string, any>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/announcements/${queryString}`);
  }

  async getUnreadAnnouncements() {
    return this.request('/announcements/unread/');
  }

  async createAnnouncement(announcementData: any) {
    return this.request('/announcements/', {
      method: 'POST',
      body: JSON.stringify(announcementData),
    });
  }

  async updateAnnouncement(id: number, announcementData: any) {
    return this.request(`/announcements/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(announcementData),
    });
  }

  async deleteAnnouncement(id: number) {
    return this.request(`/announcements/${id}/`, {
      method: 'DELETE',
    });
  }

  async toggleAnnouncementActive(id: number) {
    return this.request(`/announcements/${id}/toggle_active/`, {
      method: 'PATCH',
    });
  }

  async markAnnouncementRead(id: number) {
    return this.request(`/announcements/${id}/mark_read/`, {
      method: 'POST',
    });
  }

  async markAllAnnouncementsRead() {
    return this.request('/announcements/mark_all_read/', {
      method: 'POST',
    });
  }

  // Activity Logs
  async getActivityLogs(params?: Record<string, any>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/activity-logs/${queryString}`);
  }

  async createActivityLog(activityData: any) {
    return this.request('/activity-logs/', {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
  }

  // Leaves
  async getLeaves(params?: Record<string, any>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/leaves/${queryString}`);
  }

  async createLeave(leaveData: any) {
    return this.request('/leaves/', {
      method: 'POST',
      body: JSON.stringify(leaveData),
    });
  }

  async updateLeave(id: number, leaveData: any) {
    return this.request(`/leaves/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(leaveData),
    });
  }

  async deleteLeave(id: number) {
    return this.request(`/leaves/${id}/`, {
      method: 'DELETE',
    });
  }

  async approveLeave(id: number) {
    return this.request(`/leaves/${id}/approve/`, {
      method: 'PATCH',
    });
  }

  async rejectLeave(id: number, rejectionReason?: string) {
    return this.request(`/leaves/${id}/reject/`, {
      method: 'PATCH',
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    });
  }

  async bulkDeleteLeaves(ids: number[]) {
    return this.request('/leaves/bulk_delete/', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);