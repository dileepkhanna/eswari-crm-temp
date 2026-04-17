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
    created_by?: string;
    company?: string | number;
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
    // Clean the data before sending
    const cleanedData: any = { ...leadData };
    
    // Remove or clean email if it's empty
    if (cleanedData.email && typeof cleanedData.email === 'string') {
      if (cleanedData.email.trim() === '') {
        delete cleanedData.email; // Remove empty email
      } else {
        cleanedData.email = cleanedData.email.trim(); // Trim whitespace
      }
    }
    
    // Clean up other empty strings
    Object.keys(cleanedData).forEach(key => {
      const value = cleanedData[key];
      if (typeof value === 'string' && value.trim() === '') {
        delete cleanedData[key];
      }
    });
    
    return await apiClient.post(`${this.baseUrl}/`, cleanedData);
  }

  async updateLead(id: string, leadData: Partial<ASELeadFormData>): Promise<ASELead> {
    // Clean the data before sending
    const cleanedData: any = { ...leadData };
    
    // Remove or clean email if it's empty
    if (cleanedData.email && typeof cleanedData.email === 'string') {
      if (cleanedData.email.trim() === '') {
        delete cleanedData.email; // Remove empty email
      } else {
        cleanedData.email = cleanedData.email.trim(); // Trim whitespace
      }
    }
    
    // Clean up other empty strings
    Object.keys(cleanedData).forEach(key => {
      const value = cleanedData[key];
      if (typeof value === 'string' && value.trim() === '') {
        delete cleanedData[key];
      }
    });
    
    return await apiClient.patch(`${this.baseUrl}/${id}/`, cleanedData);
  }

  async deleteLead(id: string): Promise<void> {
    return await apiClient.delete(`${this.baseUrl}/${id}/`);
  }

  async getStats(company?: string): Promise<ASELeadStats> {
    const url = company ? `${this.baseUrl}/stats/?company=${company}` : `${this.baseUrl}/stats/`;
    return await apiClient.get(url);
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

  async bulkDeleteByIds(ids: string[], companyId?: string | number): Promise<{ deleted_count: number }> {
    return await apiClient.post(`${this.baseUrl}/bulk_delete_by_ids/`, { ids, company: companyId });
  }

  async bulkDeleteByFilter(filters: { search?: string; status?: string; priority?: string }): Promise<{ deleted_count: number }> {
    return await apiClient.post(`${this.baseUrl}/bulk_delete_by_filter/`, filters);
  }

  async getCreators(company?: string | number): Promise<{ id: number; name: string }[]> {
    const url = company ? `${this.baseUrl}/creators/?company=${company}` : `${this.baseUrl}/creators/`;
    return await apiClient.get(url);
  }
}

export const aseLeadService = new ASELeadService();