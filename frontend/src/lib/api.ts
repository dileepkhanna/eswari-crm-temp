import { logger } from '@/lib/logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';

// Utility function to construct proper media URLs
export const getMediaUrl = (path: string): string => {
  if (!path) return '';
  
  // If it's already a full URL, fix any wrong ports
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // Check if it's using the Django port (8001) and convert to current port
    if (path.includes(':8001/media/')) {
      return path.replace(':8001/media/', '/media/').replace('http://13.205.34.169', MEDIA_BASE_URL);
    }
    // Check if it's using the old nginx port (8080) and convert to current port (80)
    if (path.includes(':8080/media/')) {
      return path.replace(':8080/media/', '/media/').replace('http://13.205.34.169', MEDIA_BASE_URL);
    }
    // If it's already using the correct format, return as is
    return path;
  }
  
  // If it starts with /media/, construct the full URL using MEDIA_BASE_URL
  if (path.startsWith('/media/')) {
    return `${MEDIA_BASE_URL}${path}`;
  }
  
  // If it doesn't start with /, add it
  if (!path.startsWith('/')) {
    return `${MEDIA_BASE_URL}/media/${path}`;
  }
  
  return `${MEDIA_BASE_URL}${path}`;
};

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'admin' | 'manager' | 'employee';
  created_at: string;
  manager?: number | null;
  manager_name?: string | null;
  employees_count?: number;
  employees_names?: string[];
}

interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

import { handleAuthError } from './tokenCleaner';
import type { Customer, CallAllocation } from '@/types';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('access_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    // Add company filter to URL if company is selected
    let url = `${this.baseURL}${endpoint}`;
    
    // Skip company injection for endpoints that manage all companies
    const skipCompanyFilter = ['/auth/users/', '/auth/companies/', '/auth/setup/', '/auth/login/', '/auth/register/', '/auth/profile/'].some(p => endpoint.startsWith(p));
    
    const selectedCompanyStr = localStorage.getItem('selectedCompany');
    if (!skipCompanyFilter && selectedCompanyStr) {
      try {
        const selectedCompany = JSON.parse(selectedCompanyStr);
        if (selectedCompany && selectedCompany.id) {
          const separator = endpoint.includes('?') ? '&' : '?';
          url = `${url}${separator}company=${selectedCompany.id}`;
        }
      } catch (error) {
        logger.error('Failed to parse selected company:', error);
      }
    }

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    // Only set Content-Type if not already provided and not FormData
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Always get the latest token from localStorage
    this.token = localStorage.getItem('access_token');
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      logger.log(`API Request: ${options.method || 'GET'} ${endpoint} - Token exists: ${!!this.token}`);
    } else {
      logger.warn(`API Request: ${options.method || 'GET'} ${endpoint} - No token available`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    logger.log(`API Response: ${options.method || 'GET'} ${endpoint} - Status: ${response.status}`);

    if (response.status === 401) {
      logger.log('API: 401 Unauthorized, attempting token refresh...');
      // Token expired, try to refresh
      const refreshResult = await this.refreshToken();
      if (refreshResult) {
        logger.log('API: Token refresh successful, retrying request...');
        // Retry the request with new token
        headers['Authorization'] = `Bearer ${this.token}`;
        const retryResponse = await fetch(url, { ...options, headers });
        logger.log(`API Retry Response: ${options.method || 'GET'} ${endpoint} - Status: ${retryResponse.status}`);
        
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
          logger.warn('Failed to parse JSON response, returning null:', jsonError);
          return null;
        }
      } else {
        logger.error('API: Token refresh failed, clearing tokens');
        // Refresh failed, clear tokens and throw error
        this.logout();
        
        // Use token cleaner to handle auth error
        const error = new Error(`HTTP error! status: ${response.status}`);
        if (handleAuthError(error)) {
          return; // Token cleaner will handle the reload
        }
        
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (jsonError) {
          errorData = { error: `HTTP ${response.status} ${response.statusText}` };
        }
        throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
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
      logger.warn('Failed to parse JSON response, returning null:', jsonError);
      return null;
    }
  }

  private async requestBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
    // Add company filter to URL if company is selected
    let url = `${this.baseURL}${endpoint}`;
    const skipCompanyFilter = ['/auth/users/', '/auth/companies/', '/auth/setup/', '/auth/login/', '/auth/register/', '/auth/profile/'].some(p => endpoint.startsWith(p));
    const selectedCompanyStr = localStorage.getItem('selectedCompany');
    if (!skipCompanyFilter && selectedCompanyStr) {
      try {
        const selectedCompany = JSON.parse(selectedCompanyStr);
        if (selectedCompany && selectedCompany.id) {
          const separator = endpoint.includes('?') ? '&' : '?';
          url = `${url}${separator}company=${selectedCompany.id}`;
        }
      } catch (error) {
        logger.error('Failed to parse selected company:', error);
      }
    }

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    // Always get the latest token from localStorage
    this.token = localStorage.getItem('access_token');
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshResult = await this.refreshToken();
      if (refreshResult) {
        // Retry the request with new token
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
        
        return await retryResponse.blob();
      } else {
        // Refresh failed, clear tokens and throw error
        this.logout();
        
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (jsonError) {
          errorData = { error: `HTTP ${response.status} ${response.statusText}` };
        }
        throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
      }
    }

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (jsonError) {
        errorData = { error: `HTTP ${response.status} ${response.statusText}` };
      }
      throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
    }

    return await response.blob();
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token');
    logger.log(`API: Attempting token refresh - Refresh token exists: ${!!refreshToken}`);
    
    if (!refreshToken) {
      logger.warn('API: No refresh token available');
      return false;
    }

    try {
      logger.log('API: Making token refresh request...');
      const response = await fetch(`${this.baseURL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      logger.log(`API: Token refresh response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        this.token = data.access;
        localStorage.setItem('access_token', data.access);
        logger.log('API: Token refresh successful');
        return true;
      } else {
        logger.error('API: Token refresh failed - invalid refresh token');
        // Refresh token is invalid
        this.logout();
        return false;
      }
    } catch (error) {
      logger.error('API: Token refresh failed with error:', error);
      this.logout();
      return false;
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

  async checkAdminExists(): Promise<{ admin_exists: boolean; needs_setup: boolean }> {
    return this.request('/auth/setup/check/');
  }

  async createInitialAdmin(adminData: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const data = await this.request('/auth/setup/admin/', {
      method: 'POST',
      body: JSON.stringify(adminData),
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

  async updateProfile(profileData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }): Promise<{ message: string; user: User }> {
    return this.request('/auth/profile/update/', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async changePassword(passwordData: {
    current_password: string;
    new_password: string;
  }): Promise<{ message: string }> {
    return this.request('/auth/profile/change-password/', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  }

  async deleteAccount(adminPassword: string): Promise<{ message: string; deleted_data: any }> {
    return this.request('/auth/profile/delete-account/', {
      method: 'POST',
      body: JSON.stringify({ admin_password: adminPassword }),
    });
  }

  async logout() {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Users
  async getUsers(params?: { company?: string | number }): Promise<User[]> {
    const query = params?.company ? `?company=${params.company}` : '';
    return this.request(`/auth/users/${query}`);
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
    company: number;
    manager?: number;
  }) {
    logger.log('[API] createUser called with data:', userData);
    return this.request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: number) {
    logger.log(`API: Attempting to delete user ${userId}`);
    
    try {
      const result = await this.request(`/auth/users/${userId}/delete/`, {
        method: 'DELETE',
      });
      logger.log(`API: Delete user ${userId} successful:`, result);
      return result;
    } catch (error) {
      logger.error(`API: Delete user ${userId} failed:`, error);
      throw error;
    }
  }

  async simpleDeleteUser(userId: number) {
    logger.log(`API: Attempting simple delete for user ${userId}`);
    logger.log(`API: Base URL: ${this.baseURL}`);
    logger.log(`API: Token exists: ${!!this.token}`);
    logger.log(`API: Token from localStorage: ${!!localStorage.getItem('access_token')}`);
    
    // Force refresh token from localStorage
    this.token = localStorage.getItem('access_token');
    
    const url = `${this.baseURL}/auth/users/simple-delete/`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    const body = JSON.stringify({ user_id: userId });
    
    logger.log(`API: Making direct fetch to ${url}`);
    logger.log(`API: Headers:`, headers);
    logger.log(`API: Body:`, body);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });
      
      logger.log(`API: Response status: ${response.status}`);
      logger.log(`API: Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`API: Error response:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      logger.log(`API: Simple delete user ${userId} successful:`, result);
      return result;
    } catch (error) {
      logger.error(`API: Simple delete user ${userId} failed:`, error);
      throw error;
    }
  }

  async adminUpdateUser(userId: string, userData: {
    name: string;
    phone: string;
    address: string;
    newPassword?: string;
    managerId?: string;
    company?: number;
  }) {
    return this.request(`/auth/users/${userId}/update/`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async promoteEmployeeToManager(userId: string) {
    logger.log(`API: Promoting employee ${userId} to manager`);
    try {
      const response = await this.request(`/auth/users/${userId}/promote/`, {
        method: 'POST',
      });
      logger.log(`API: Promotion successful for user ${userId}:`, response);
      return response;
    } catch (error) {
      logger.error(`API: Promotion failed for user ${userId}:`, error);
      throw error;
    }
  }

  // Customers
  async getCustomers(params?: Record<string, any>): Promise<any> {
    const query = params ? '?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    return this.request(`/customers/${query}`);
  }

  async createCustomer(customerData: Partial<Customer>) {
    return this.request('/customers/', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  }

  async updateCustomer(id: string, customerData: Partial<Customer>) {
    return this.request(`/customers/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(customerData),
    });
  }

  async deleteCustomer(id: string) {
    return this.request(`/customers/${id}/`, {
      method: 'DELETE',
    });
  }

  async bulkImportCustomers(customers: Partial<Customer>[]) {
    return this.request('/customers/bulk_import/', {
      method: 'POST',
      body: JSON.stringify({ customers }),
    });
  }

  async bulkAssignCustomers(customerIds: string[], employeeId: string) {
    return this.request('/customers/bulk_assign/', {
      method: 'POST',
      body: JSON.stringify({ 
        customer_ids: customerIds, 
        employee_id: employeeId === 'unassigned' ? null : employeeId 
      }),
    });
  }

  async convertCustomerToLead(customerId: string) {
    return this.request(`/customers/${customerId}/convert_to_lead/`, {
      method: 'POST',
    });
  }

  async getConversionForm(customerId: string) {
    return this.request(`/customers/${customerId}/conversion-form/`);
  }

  async convertCustomer(customerId: string, leadData: any) {
    return this.request(`/customers/${customerId}/convert-to-lead/`, {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  }

  async bulkConvertCustomers(customerIds: string[], defaultValues: any) {
    return this.request('/customers/bulk-convert/', {
      method: 'POST',
      body: JSON.stringify({
        customer_ids: customerIds,
        default_values: defaultValues,
      }),
    });
  }

  async importCustomers(formData: FormData) {
    return this.request('/customers/import/', {
      method: 'POST',
      body: formData,
    });
  }

  async previewImport(formData: FormData) {
    return this.request('/customers/import/preview/', {
      method: 'POST',
      body: formData,
    });
  }

  async downloadImportTemplate() {
    return this.requestBlob('/customers/import/template/', {
      method: 'GET',
    });
  }

  // Analytics
  async getConversionRate(startDate?: string, endDate?: string) {
    let endpoint = '/customers/analytics/conversion-rate/';
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) {
      endpoint += '?' + params.toString();
    }
    return this.request(endpoint);
  }

  async getConversionByUser() {
    return this.request('/customers/analytics/conversion-by-user/');
  }

  async getConversionTrend(days: number = 30) {
    return this.request(`/customers/analytics/conversion-trend/?days=${days}`);
  }

  // Call Allocations
  async getCallAllocations(): Promise<CallAllocation[]> {
    return this.request('/allocations/');
  }

  async createCallAllocation(allocationData: Partial<CallAllocation>) {
    return this.request('/allocations/', {
      method: 'POST',
      body: JSON.stringify(allocationData),
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
      method: 'PATCH',
      body: JSON.stringify(leadData),
    });
  }

  async deleteLead(id: number) {
    return this.request(`/leads/${id}/`, {
      method: 'DELETE',
    });
  }

  async bulkDeleteLeads(leadIds: number[]) {
    return this.request('/leads/bulk_delete/', {
      method: 'POST',
      body: JSON.stringify({ lead_ids: leadIds }),
    });
  }

  async bulkDeleteLeadsByFilter(filters: { search?: string; status?: string; source?: string }) {
    return this.request('/leads/bulk_delete_by_filter/', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  }

  async bulkImportLeads(leads: any[]) {
    return this.request('/leads/bulk_import/', {
      method: 'POST',
      body: JSON.stringify({ leads }),
    });
  }

  async bulkImportTasks(tasks: any[]) {
    return this.request('/tasks/bulk_import/', {
      method: 'POST',
      body: JSON.stringify({ tasks }),
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

  // Upload cover/project image
  async uploadCoverImage(imageFile: File): Promise<{ url: string; filename: string; type: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);

    return this.request('/projects/upload_cover_image/', {
      method: 'POST',
      body: formData,
    });
  }

  // Upload blueprint image
  async uploadBlueprintImage(imageFile: File): Promise<{ url: string; filename: string; type: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);

    return this.request('/projects/upload_blueprint_image/', {
      method: 'POST',
      body: formData,
    });
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
      method: 'PATCH',
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

  async createAnnouncement(announcementData: FormData | any) {
    const options: RequestInit = {
      method: 'POST',
    };

    // Handle FormData (for file uploads) vs regular JSON
    if (announcementData instanceof FormData) {
      options.body = announcementData;
      // Don't set Content-Type for FormData - browser will set it with boundary
    } else {
      options.body = JSON.stringify(announcementData);
    }

    return this.request('/announcements/', options);
  }

  async updateAnnouncement(id: number, announcementData: FormData | any) {
    const options: RequestInit = {
      method: 'PUT',
    };

    // Handle FormData (for file uploads) vs regular JSON
    if (announcementData instanceof FormData) {
      options.body = announcementData;
      // Don't set Content-Type for FormData - browser will set it with boundary
    } else {
      options.body = JSON.stringify(announcementData);
    }

    return this.request(`/announcements/${id}/`, options);
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

  // Get manager's employees for announcement assignment
  async getManagerEmployees() {
    return this.request('/announcements/my_employees/');
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

  // Holidays
  async getHolidays(params?: Record<string, any>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/holidays/${queryString}`);
  }

  async createHoliday(holidayData: any) {
    const isFormData = holidayData instanceof FormData;
    const headers: Record<string, string> = {};
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    return this.request('/holidays/', {
      method: 'POST',
      body: isFormData ? holidayData : JSON.stringify(holidayData),
      headers,
    });
  }

  async updateHoliday(id: number, holidayData: any) {
    const isFormData = holidayData instanceof FormData;
    const headers: Record<string, string> = {};
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    return this.request(`/holidays/${id}/`, {
      method: 'PUT',
      body: isFormData ? holidayData : JSON.stringify(holidayData),
      headers,
    });
  }

  async deleteHoliday(id: number) {
    return this.request(`/holidays/${id}/`, {
      method: 'DELETE',
    });
  }

  // Leaves
  async getLeaves(params?: Record<string, any>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/leaves/${queryString}`);
  }

  async createLeave(leaveData: any) {
    // Handle file upload if document is provided
    if (leaveData.document instanceof File) {
      const formData = new FormData();
      Object.keys(leaveData).forEach(key => {
        if (key === 'document') {
          formData.append(key, leaveData[key]);
        } else {
          formData.append(key, leaveData[key]);
        }
      });
      
      return this.request('/leaves/', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary for FormData
      });
    } else {
      return this.request('/leaves/', {
        method: 'POST',
        body: JSON.stringify(leaveData),
      });
    }
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

  // App Settings
  async getAppSettings() {
    return this.request('/app-settings/');
  }

  async updateAppSettings(settingsData: {
    app_name?: string;
    logo_url?: string | null;
    favicon_url?: string | null;
    primary_color?: string;
    accent_color?: string;
    sidebar_color?: string;
    custom_css?: string | null;
  }) {
    return this.request('/app-settings/update/', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  }

  async uploadLogo(logoFile: File): Promise<{ message: string; logo_url: string; filename: string }> {
    const formData = new FormData();
    formData.append('logo', logoFile);

    return this.request('/app-settings/upload-logo/', {
      method: 'POST',
      body: formData,
    });
  }

  async uploadFavicon(faviconFile: File): Promise<{ message: string; favicon_url: string; filename: string }> {
    const formData = new FormData();
    formData.append('favicon', faviconFile);

    return this.request('/app-settings/upload-favicon/', {
      method: 'POST',
      body: formData,
    });
  }

  async resetAppSettings() {
    return this.request('/app-settings/reset/', {
      method: 'POST',
    });
  }

  // Download project cover image (Admin only)
  async downloadProjectCoverImage(projectId: string): Promise<Blob> {
    return this.requestBlob(`/projects/${projectId}/download_cover_image/`, {
      method: 'GET',
    });
  }

  // Download project blueprint image (Admin only)
  async downloadProjectBlueprintImage(projectId: string): Promise<Blob> {
    return this.requestBlob(`/projects/${projectId}/download_blueprint_image/`, {
      method: 'GET',
    });
  }

  // HR Reports
  async getHRDashboardMetrics() {
    return this.request('/hr/reports/dashboard/');
  }

  async getEmployeeStatistics() {
    return this.request('/hr/reports/employees/');
  }

  async getLeaveStatistics() {
    return this.request('/hr/reports/leaves/');
  }

  // HR User Management
  async getAllUsers(): Promise<User[]> {
    return this.request('/auth/users/');
  }

  async updateUser(userId: number, userData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    role?: string;
    manager?: number | null;
  }) {
    return this.request(`/auth/users/${userId}/`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Companies
  async getCompanies() {
    return this.request('/auth/companies/');
  }

  async createCompany(companyData: FormData) {
    return this.request('/auth/companies/', {
      method: 'POST',
      body: companyData,
    });
  }

  async updateCompany(companyId: number, companyData: FormData) {
    return this.request(`/auth/companies/${companyId}/`, {
      method: 'PATCH',
      body: companyData,
    });
  }

  async deleteCompany(companyId: number, force = false) {
    const url = force
      ? `/auth/companies/${companyId}/?force=true`
      : `/auth/companies/${companyId}/`;
    return this.request(url, { method: 'DELETE' });
  }

  async getActiveCompanies() {
    return this.request('/auth/companies/active/');
  }

  // Generic HTTP methods for external services
  async get(endpoint: string, options?: RequestInit) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint: string, data?: any, options?: RequestInit) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  async patch(endpoint: string, data?: any, options?: RequestInit) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  async delete(endpoint: string, options?: RequestInit) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);