/**
 * Custom hooks for ASE Marketing Panel API integration.
 * 
 * Provides data fetching hooks and action functions for:
 * - Dashboard statistics (role-specific)
 * - Lead queue management
 * - Task management
 * - Activity logging
 * - Lead qualification, assignment, and deal management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface DashboardStats {
  role: string;
  role_display: string;
  [key: string]: any;
}

export interface LeadQueueItem {
  id: number;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  status: string;
  priority: string;
  lead_score: number;
  engagement_level: string;
  industry: string;
  researched_by: number | null;
  contacted_by: number | null;
  managed_by: number | null;
  created_at: string;
  [key: string]: any;
}

export interface Activity {
  id: number;
  activity_type: string;
  title: string;
  description: string;
  user: number;
  lead: number;
  created_at: string;
  call_duration_minutes: number | null;
  call_outcome: string | null;
  email_subject: string | null;
  meeting_date: string | null;
  requires_followup: boolean;
  followup_date: string | null;
  [key: string]: any;
}

export interface Task {
  id: number;
  title: string;
  task_type: string;
  priority: string;
  status: string;
  due_date: string;
  completed_at: string | null;
  lead: number;
  assigned_to: number;
  created_by: number;
  description: string | null;
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  page: number;
  total_pages: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════════════════════════════════════════

/** Fetch role-specific dashboard statistics */
export function useDashboardStats() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/ase-leads/dashboard-stats/');
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return { data, loading, error, refetch: fetchStats };
}

/** Fetch the current user's lead queue with optional filters */
export function useMyLeadQueue(params?: Record<string, any>) {
  const [data, setData] = useState<PaginatedResponse<LeadQueueItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchQueue = useCallback(async () => {
    try {
      // Only show loading on first fetch — silent on subsequent polls
      if (!hasFetched.current) setLoading(true);
      setError(null);
      // Support custom endpoint via _endpoint param
      const endpoint = params?._endpoint || '/ase-leads/my-queue/';
      const filteredParams = { ...params };
      delete filteredParams._endpoint;
      
      // Build query string from params
      let url = endpoint;
      if (filteredParams && Object.keys(filteredParams).length > 0) {
        const queryString = Object.entries(filteredParams)
          .filter(([_, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&');
        if (queryString) url += `?${queryString}`;
      }
      const response = await apiClient.get(url);
      setData(response);
      hasFetched.current = true;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch lead queue');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { hasFetched.current = false; fetchQueue(); }, [fetchQueue]);

  // Silent auto-poll every 5 seconds for live updates
  useEffect(() => {
    const interval = setInterval(() => { fetchQueue(); }, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  return { data, loading, error, refetch: fetchQueue };
}

/** Fetch the current user's tasks with optional filters */
export function useMyTasks(params?: Record<string, any>) {
  const [data, setData] = useState<PaginatedResponse<Task> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Build query string from params
      let url = '/ase-leads/tasks/my-tasks/';
      if (params && Object.keys(params).length > 0) {
        const queryString = Object.entries(params)
          .filter(([_, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&');
        if (queryString) url += `?${queryString}`;
      }
      const response = await apiClient.get(url);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  return { data, loading, error, refetch: fetchTasks };
}

/** Fetch overdue tasks for the current user */
export function useOverdueTasks() {
  const [data, setData] = useState<PaginatedResponse<Task> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverdue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/ase-leads/tasks/overdue/');
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch overdue tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverdue(); }, [fetchOverdue]);

  return { data, loading, error, refetch: fetchOverdue };
}

/** Fetch activities for a specific lead */
export function useLeadActivities(leadId: number | null, params?: Record<string, any>) {
  const [data, setData] = useState<PaginatedResponse<Activity> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!leadId) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/ase-leads/${leadId}/activities/`, params);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  }, [leadId, JSON.stringify(params)]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  return { data, loading, error, refetch: fetchActivities };
}

/** Fetch timeline for a specific lead */
export function useLeadTimeline(leadId: number | null, params?: Record<string, any>) {
  const [data, setData] = useState<PaginatedResponse<Activity> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!leadId) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/ase-leads/${leadId}/timeline/`, params);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch timeline');
    } finally {
      setLoading(false);
    }
  }, [leadId, JSON.stringify(params)]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  return { data, loading, error, refetch: fetchTimeline };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Action Functions (called imperatively, not hooks)
// ═══════════════════════════════════════════════════════════════════════════════

export const marketingActions = {
  // BRE Actions
  qualifyLead: (leadId: number, data: { lead_score: number; qualification_notes?: string }) =>
    apiClient.post(`/ase-leads/${leadId}/qualify/`, data),

  disqualifyLead: (leadId: number, data: { disqualification_reason: string }) =>
    apiClient.post(`/ase-leads/${leadId}/disqualify/`, data),

  // BOE Actions
  logCall: (leadId: number, data: { title: string; call_duration_minutes?: number; call_outcome?: string; description?: string; requires_followup?: boolean; followup_date?: string }) =>
    apiClient.post(`/ase-leads/${leadId}/log-call/`, data),

  logEmail: (leadId: number, data: { title: string; email_subject: string; description?: string; requires_followup?: boolean; followup_date?: string }) =>
    apiClient.post(`/ase-leads/${leadId}/log-email/`, data),

  // CRE Actions
  sendProposal: (leadId: number, data?: { proposal_value?: number; notes?: string }) =>
    apiClient.post(`/ase-leads/${leadId}/send-proposal/`, data || {}),

  scheduleMeeting: (leadId: number, data: { title: string; meeting_date: string; description?: string; meeting_attendees?: string[] }) =>
    apiClient.post(`/ase-leads/${leadId}/schedule-meeting/`, data),

  updateDealStage: (leadId: number, data: { stage: string }) =>
    apiClient.post(`/ase-leads/${leadId}/update-stage/`, data),

  // Assignment Actions
  assignToBOE: (leadId: number, data: { user_id: number }) =>
    apiClient.post(`/ase-leads/${leadId}/assign-to-boe/`, data),

  assignToCRE: (leadId: number, data: { user_id: number }) =>
    apiClient.post(`/ase-leads/${leadId}/assign-to-cre/`, data),

  // Task Actions
  completeTask: (taskId: number) =>
    apiClient.post(`/ase-leads/tasks/${taskId}/complete/`, {}),

  createTask: (data: { lead_id: number; assigned_to: number; task_type: string; title: string; due_date: string; description?: string; priority?: string }) =>
    apiClient.post('/ase-leads/tasks/', data),

  updateTask: (taskId: number, data: Record<string, any>) =>
    apiClient.patch(`/ase-leads/tasks/${taskId}/`, data),

  // Activity Actions
  createActivity: (leadId: number, data: { activity_type: string; title: string; description?: string; [key: string]: any }) =>
    apiClient.post(`/ase-leads/${leadId}/activities/create/`, data),

  updateActivity: (activityId: number, data: Record<string, any>) =>
    apiClient.patch(`/ase-leads/activities/${activityId}/update/`, data),

  deleteActivity: (activityId: number) =>
    apiClient.delete(`/ase-leads/activities/${activityId}/delete/`),
};
