import { apiClient } from '@/lib/api';
import { ASELead, ASELeadFormData } from '@/types/ase-customer';

export interface ASELeadStats {
  total: number;
  by_status: {
    [key: string]: {
      count: number;
      label: string;
    };
  };
  by_priority: {
    [key: string]: {
      count: number;
      label: string;
    };
  };
  by_industry: {
    [key: string]: {
      count: number;
      label: string;
    };
  };
  total_estimated_value: number;
  total_monthly_retainer: number;
}

export class ASELeadService {
  private baseUrl = '/ase-leads';

  async getLeads(params?: {
    search?: string;
    status?: string;
    priority?: string;
    industry?: string;
    assigned_to?: string;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: ASELead[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const url = queryParams.toString() ? `${this.baseUrl}/?${queryParams}` : `${this.baseUrl}/`;
    return await apiClient.get(url);
  }

  async getLead(id: string): Promise<ASELead> {
    return await apiClient.get(`${this.baseUrl}/${id}/`);
  }

  async createLead(leadData: ASELeadFormData): Promise<ASELead> {
    return await apiClient.post(`${this.baseUrl}/`, leadData);
  }

  async updateLead(id: string, leadData: Partial<ASELeadFormData>): Promise<ASELead> {
    return await apiClient.patch(`${this.baseUrl}/${id}/`, leadData);
  }

  async deleteLead(id: string): Promise<void> {
    return await apiClient.delete(`${this.baseUrl}/${id}/`);
  }

  async getStats(): Promise<ASELeadStats> {
    return await apiClient.get(`${this.baseUrl}/stats/`);
  }

  async getFollowUps(): Promise<ASELead[]> {
    return await apiClient.get(`${this.baseUrl}/follow_ups/`);
  }

  async getHighPriorityLeads(): Promise<ASELead[]> {
    return await apiClient.get(`${this.baseUrl}/high_priority/`);
  }

  async bulkImportLeads(leads: any[]): Promise<{ imported: number; errors: any[] }> {
    return await apiClient.post(`${this.baseUrl}/bulk_import/`, { leads });
  }

  async bulkDeleteByFilter(filters: { search?: string; status?: string; priority?: string }): Promise<{ deleted_count: number }> {
    return await apiClient.post(`${this.baseUrl}/bulk_delete_by_filter/`, filters);
  }
}

export const aseLeadService = new ASELeadService();