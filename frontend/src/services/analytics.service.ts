import { apiClient } from '@/lib/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function fetchWithAuth(endpoint: string) {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_BASE_URL}/insights${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Analytics API error: ${res.status}`);
  }
  return res.json();
}

export const analyticsService = {
  getOverview(period = 'month') {
    return fetchWithAuth(`/overview/?period=${period}`);
  },

  getConversionFunnel(period = 'month', company = 'all') {
    return fetchWithAuth(`/funnel/?period=${period}&company=${company}`);
  },

  getEmployeeScorecards(period = 'month', company = 'all', role = 'all') {
    return fetchWithAuth(`/scorecards/?period=${period}&company=${company}&role=${role}`);
  },

  getRevenueTrend(period = 'month', granularity = 'daily') {
    return fetchWithAuth(`/revenue-trend/?period=${period}&granularity=${granularity}`);
  },

  getReportSchedules() {
    return fetchWithAuth('/report-schedules/');
  },

  async createReportSchedule(data: {
    name: string;
    frequency: string;
    report_type: string;
    recipients: string[];
    is_active: boolean;
  }) {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_BASE_URL}/insights/report-schedules/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`Analytics API error: ${res.status}`);
    }
    return res.json();
  },
};
