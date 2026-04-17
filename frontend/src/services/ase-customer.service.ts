import { apiClient } from '@/lib/api';
import { ASECustomer, ASECustomerFormData, ASECustomerStats, ASECustomerActivity, CallLog, CustomerNote } from '@/types/ase-customer';

// Simple console wrapper to avoid tree-shaking issues
const logger = {
  log: (...args: any[]) => console.log('[ASECustomerService]', ...args),
  info: (...args: any[]) => console.info('[ASECustomerService]', ...args),
  warn: (...args: any[]) => console.warn('[ASECustomerService]', ...args),
  error: (...args: any[]) => console.error('[ASECustomerService]', ...args),
  debug: (...args: any[]) => console.debug('[ASECustomerService]', ...args),
};

export class ASECustomerService {
  private static baseUrl = '/ase/customers';

  // Get ASE customers (paginated)
  static async getCustomers(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    call_status?: string;
    company?: number | string;
    assigned_to?: number | string;
    is_converted?: string; // 'true' | 'false'
  }): Promise<{ results: ASECustomer[]; count: number; next: string | null; previous: string | null }> {
    try {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', String(params.page));
      if (params?.page_size) query.set('page_size', String(params.page_size));
      if (params?.search) query.set('search', params.search);
      if (params?.call_status && params.call_status !== 'all') query.set('call_status', params.call_status);
      if (params?.company) query.set('company', String(params.company));
      if (params?.assigned_to) query.set('assigned_to', String(params.assigned_to));
      if (params?.is_converted !== undefined) query.set('is_converted', params.is_converted);

      const url = `${this.baseUrl}/${query.toString() ? '?' + query.toString() : ''}`;
      const response = await apiClient.get(url);

      if (response && response.results !== undefined) {
        return response;
      }
      // Fallback for non-paginated response
      return { results: Array.isArray(response) ? response : [], count: 0, next: null, previous: null };
    } catch (error) {
      logger.error('Error fetching ASE customers:', error);
      throw error;
    }
  }

  // Get single ASE customer
  static async getCustomer(id: string): Promise<ASECustomer> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${id}/`);
      return response;
    } catch (error) {
      logger.error('Error fetching ASE customer:', error);
      throw error;
    }
  }

  // Create ASE customer
  static async createCustomer(data: Partial<ASECustomerFormData>): Promise<ASECustomer> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/`, data);
      return response;
    } catch (error) {
      logger.error('Error creating ASE customer:', error);
      throw error;
    }
  }

  // Update ASE customer
  static async updateCustomer(id: string, data: Partial<ASECustomerFormData>): Promise<ASECustomer> {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/${id}/`, data);
      return response;
    } catch (error) {
      logger.error('Error updating ASE customer:', error);
      throw error;
    }
  }

  // Delete ASE customer
  static async deleteCustomer(id: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}/`);
    } catch (error) {
      logger.error('Error deleting ASE customer:', error);
      throw error;
    }
  }

  // Get ASE customer statistics
  static async getStats(): Promise<ASECustomerStats> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/stats/`);
      return response;
    } catch (error) {
      logger.error('Error fetching ASE customer stats:', error);
      throw error;
    }
  }

  // Get team performance stats (manager/admin only)
  static async getTeamPerformance(companyId?: string | number): Promise<{
    date: string;
    week_start: string;
    employees: Array<{
      employee_id: number;
      name: string;
      role: string;
      calls_today: number;
      answered_today: number;
      answered_rate: number;
      conversions_this_week: number;
      total_assigned: number;
      pending: number;
    }>;
  }> {
    try {
      const url = companyId
        ? `${this.baseUrl}/team_performance/?company=${companyId}`
        : `${this.baseUrl}/team_performance/`;
      return await apiClient.get(url);
    } catch (error) {
      logger.error('Error fetching team performance:', error);
      throw error;
    }
  }

  // Get overdue follow-up count (scheduled_date in past + still pending)
  static async getOverdueCount(): Promise<number> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/overdue_follow_ups/?count_only=true`);
      return response.count ?? 0;
    } catch (error) {
      logger.error('Error fetching overdue count:', error);
      return 0;
    }
  }

  // Get today's follow-ups for the current user
  static async getFollowUps(date?: string): Promise<{ date: string; count: number; results: ASECustomer[] }> {
    try {
      const url = date
        ? `${this.baseUrl}/follow_ups/?date=${date}`
        : `${this.baseUrl}/follow_ups/`;
      const response = await apiClient.get(url);
      return response;
    } catch (error) {
      logger.error('Error fetching follow-ups:', error);
      throw error;
    }
  }

  // Get high priority customers
  static async getHighPriority(): Promise<ASECustomer[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/high_priority/`);
      return response;
    } catch (error) {
      logger.error('Error fetching high priority customers:', error);
      throw error;
    }
  }

  // Add activity to customer
  static async addActivity(customerId: string, activity: {
    activity_type: string;
    title: string;
    description?: string;
    metadata?: any;
  }): Promise<ASECustomerActivity> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${customerId}/add_activity/`, activity);
      return response;
    } catch (error) {
      logger.error('Error adding activity:', error);
      throw error;
    }
  }

  // Get customer activities
  static async getActivities(customerId: string): Promise<ASECustomerActivity[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${customerId}/activities/`);
      return response;
    } catch (error) {
      logger.error('Error fetching activities:', error);
      throw error;
    }
  }

  // Convert customer to lead
  static async convertToLead(customerId: string, leadData: {
    company_name: string;
    industry: string;
    service_interests: string[];
    budget_amount?: string;
    budget_range?: string; // legacy alias, maps to budget_amount on backend
    marketing_goals?: string;
    website?: string;
    has_website: boolean;
    has_social_media: boolean;
    current_seo_agency?: string;
    status?: string;
    priority?: string;
  }): Promise<{ success: boolean; lead_id: string; message: string }> {
    try {
      // Clean the data - remove any email field and ensure no empty strings
      const cleanedData: any = { ...leadData };
      
      // Remove email if it exists (shouldn't be there, but just in case)
      if ('email' in cleanedData) {
        delete cleanedData.email;
      }
      
      // Clean up empty strings - convert to null or remove
      Object.keys(cleanedData).forEach(key => {
        const value = cleanedData[key];
        if (typeof value === 'string' && value.trim() === '') {
          delete cleanedData[key]; // Remove empty strings entirely
        }
      });
      
      const response = await apiClient.post(`${this.baseUrl}/${customerId}/convert_to_lead/`, cleanedData);
      return response;
    } catch (error) {
      logger.error('Error converting customer to lead:', error);
      throw error;
    }
  }

  // Bulk import customers from parsed rows (fast path)
  static async bulkImportCustomers(customers: any[]): Promise<{ imported: number; errors: any[] }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/bulk_import/`, { customers });
      return response;
    } catch (error) {
      logger.error('Error bulk importing customers:', error);
      throw error;
    }
  }

  // Import customers from Excel/CSV
  static async importCustomers(file: File): Promise<{
    success: boolean;
    message: string;
    created_customers: any[];
    errors: any[];
    total_processed: number;
    total_created: number;
    total_errors: number;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post(`${this.baseUrl}/import_customers/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      logger.error('Error importing customers:', error);
      throw error;
    }
  }

  // Export customers to Excel
  static async exportCustomers(): Promise<Blob> {
    try {
      // Use a direct fetch with proper authentication since apiClient.get doesn't support blob responses
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api${this.baseUrl}/export_customers/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      return await response.blob();
    } catch (error) {
      logger.error('Error exporting customers:', error);
      throw error;
    }
  }

  // Download import template
  static async downloadTemplate(): Promise<Blob> {
    try {
      // Use a direct fetch with proper authentication since apiClient.get doesn't support blob responses
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api${this.baseUrl}/download_template/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Template download failed');
      }
      
      return await response.blob();
    } catch (error) {
      logger.error('Error downloading template:', error);
      throw error;
    }
  }

  // Bulk delete customers
  static async bulkDelete(customerIds: string[]): Promise<{ success: boolean; deleted: number }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/bulk_delete/`, { customer_ids: customerIds });
      return response;
    } catch (error) {
      logger.error('Error bulk deleting customers:', error);
      throw error;
    }
  }

  // Bulk update call_status for multiple customers
  static async bulkUpdateStatus(customerIds: string[], callStatus: string): Promise<{ success: boolean; updated: number }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/bulk_update_status/`, {
        customer_ids: customerIds,
        call_status: callStatus,
      });
      return response;
    } catch (error) {
      logger.error('Error bulk updating status:', error);
      throw error;
    }
  }

  // Bulk assign customers to an employee
  static async bulkAssign(customerIds: string[], assignedTo: string): Promise<{
    success: boolean;
    updated: number;
    assigned_to: string;
  }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/bulk_assign/`, {
        customer_ids: customerIds,
        assigned_to: assignedTo,
      });
      return response;
    } catch (error) {
      logger.error('Error bulk assigning customers:', error);
      throw error;
    }
  }

  // Get notes history for a customer
  static async getNotes(customerId: string): Promise<CustomerNote[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${customerId}/notes_history/`);
      return Array.isArray(response) ? response : response.results || [];
    } catch (error) {
      logger.error('Error fetching notes:', error);
      throw error;
    }
  }

  // Append a new note
  static async addNote(customerId: string, content: string): Promise<CustomerNote> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${customerId}/notes_history/`, { content });
      return response;
    } catch (error) {
      logger.error('Error adding note:', error);
      throw error;
    }
  }

  // Get call logs for a customer
  static async getCallLogs(customerId: string): Promise<CallLog[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${customerId}/call_logs/`);
      return Array.isArray(response) ? response : response.results || [];
    } catch (error) {
      logger.error('Error fetching call logs:', error);
      throw error;
    }
  }

  // Add a manual call log entry
  static async addCallLog(customerId: string, data: {
    call_status: string;
    custom_status?: string;
    notes?: string;
  }): Promise<CallLog> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${customerId}/call_logs/`, data);
      return response;
    } catch (error) {
      logger.error('Error adding call log:', error);
      throw error;
    }
  }

  // Reassign customer to another employee
  static async reassignCustomer(customerId: string, assignedTo: string, reason?: string): Promise<{
    success: boolean;
    message: string;
    old_assignee: string | null;
    new_assignee: string;
  }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${customerId}/reassign_customer/`, {
        assigned_to: assignedTo,
        reason: reason || ''
      });
      return response;
    } catch (error) {
      logger.error('Error reassigning customer:', error);
      throw error;
    }
  }
}