import { apiClient } from '@/lib/api';

// Simple console wrapper to avoid tree-shaking issues
const logger = {
  log: (...args: any[]) => console.log('[BirthdayService]', ...args),
  info: (...args: any[]) => console.info('[BirthdayService]', ...args),
  warn: (...args: any[]) => console.warn('[BirthdayService]', ...args),
  error: (...args: any[]) => console.error('[BirthdayService]', ...args),
  debug: (...args: any[]) => console.debug('[BirthdayService]', ...args),
};
export interface Birthday {
  id: number;
  employee: number;
  employee_name: string;
  employee_email: string;
  employee_role: string;
  employee_company: string;
  birth_date: string;
  show_age: boolean;
  announce_birthday: boolean;
  age?: number;
  next_birthday: string;
  is_birthday_today: boolean;
  days_until_birthday: number;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role: string;
  company_name: string;
}

export interface BirthdayAnnouncement {
  id: number;
  birthday: number;
  employee_name: string;
  announcement_date: string;
  announcement_id: number;
  created_at: string;
}

export interface BirthdayStats {
  today_count: number;
  month_count: number;
  upcoming_count: number;
  total_birthdays: number;
}

class BirthdayService {
  private baseUrl = '/birthdays';

  // Get all birthdays
  async getBirthdays(): Promise<Birthday[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/`);
      
      // Handle paginated response format from Django REST framework
      if (response && typeof response === 'object') {
        if (Array.isArray(response.results)) {
          return response.results;
        } else if (Array.isArray(response)) {
          return response;
        }
      }
      
      // Fallback to empty array
      return [];
    } catch (error) {
      logger.error('Error fetching birthdays:', error);
      throw error;
    }
  }

  // Get birthday by ID
  async getBirthday(id: number): Promise<Birthday> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/`);
    return response;
  }

  // Create new birthday
  async createBirthday(birthdayData: Partial<Birthday>): Promise<Birthday> {
    const response = await apiClient.post(`${this.baseUrl}/`, birthdayData);
    return response;
  }

  // Update birthday
  async updateBirthday(id: number, birthdayData: Partial<Birthday>): Promise<Birthday> {
    const response = await apiClient.put(`${this.baseUrl}/${id}/`, birthdayData);
    return response;
  }

  // Delete birthday
  async deleteBirthday(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}/`);
  }

  // Get employees without birthday records
  async getEmployeesWithoutBirthday(): Promise<Employee[]> {
    const response = await apiClient.get(`${this.baseUrl}/employees_without_birthday/`);
    return response;
  }

  // Get today's birthdays
  async getTodayBirthdays(): Promise<Birthday[]> {
    const response = await apiClient.get(`${this.baseUrl}/today_birthdays/`);
    return response;
  }

  // Get upcoming birthdays (next 30 days)
  async getUpcomingBirthdays(): Promise<Birthday[]> {
    const response = await apiClient.get(`${this.baseUrl}/upcoming_birthdays/`);
    return response;
  }

  // Manually create birthday announcements
  async createBirthdayAnnouncements(): Promise<{ message: string; announcements: any[] }> {
    const response = await apiClient.post(`${this.baseUrl}/create_birthday_announcements/`);
    return response; // API client already returns the parsed JSON directly
  }
}

export const birthdayService = new BirthdayService();