import { apiClient } from './api';

import { logger } from '@/lib/logger';
export interface ActivityLogData {
  userId: string;
  userName: string;
  userRole: string;
  companyId: number;
  module: 'leads' | 'tasks' | 'projects' | 'leaves' | 'users' | 'announcements' | 'reports' | 'customers';
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'converted' | 'assigned' | 'completed' | 'viewed';
  details: string;
}

export const logActivity = async (activityData: ActivityLogData): Promise<void> => {
  try {
    logger.log('=== ACTIVITY LOGGER DEBUG ===');
    logger.log('Logging activity:', activityData);
    logger.log('API Client available:', !!apiClient);
    
    // Check if we have a valid token before attempting to log
    const token = localStorage.getItem('access_token');
    if (!token) {
      logger.warn('No access token available, skipping activity logging');
      return;
    }
    
    const result = await apiClient.createActivityLog({
      user_name: activityData.userName,
      user_role: activityData.userRole,
      module: activityData.module,
      action: activityData.action,
      details: activityData.details,
      company: activityData.companyId, // Add required company field
    });
    
    logger.log('Activity logged successfully, result:', result);
    
    // Trigger a custom event to notify AdminActivity to refresh
    window.dispatchEvent(new CustomEvent('activityLogged', { 
      detail: activityData 
    }));
    logger.log('Activity logged event dispatched');
  } catch (error: any) {
    logger.error('=== ACTIVITY LOGGER ERROR ===');
    logger.error('Failed to log activity:', error);
    logger.error('Error details:', error.message, error.status);
    
    // Handle authentication errors
    if (error.message?.includes('401')) {
      logger.warn('Activity logging failed due to authentication. User may need to refresh.');
      // Clear invalid tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } else if (error.message?.includes('403')) {
      logger.warn('Activity logging failed due to permissions.');
    } else if (error.message?.includes('405')) {
      logger.error('Method not allowed - this should be fixed now');
    }
    
    // Don't throw error to avoid breaking the main functionality
  }
};

// Helper functions for common activities
export const logLeadActivity = (user: { id: string; name: string; role: string; company?: { id: number } }, action: string, leadName: string) => {
  return logActivity({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    companyId: user.company?.id || 1, // Default to company 1 if not available
    module: 'leads',
    action: action as any,
    details: `${action} lead: ${leadName}`,
  });
};

export const logTaskActivity = (user: { id: string; name: string; role: string; company?: { id: number } }, action: string, taskDetails: string) => {
  return logActivity({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    companyId: user.company?.id || 1, // Default to company 1 if not available
    module: 'tasks',
    action: action as any,
    details: `${action} task: ${taskDetails}`,
  });
};

export const logProjectActivity = (user: { id: string; name: string; role: string; company?: { id: number } }, action: string, projectName: string) => {
  return logActivity({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    companyId: user.company?.id || 1, // Default to company 1 if not available
    module: 'projects',
    action: action as any,
    details: `${action} project: ${projectName}`,
  });
};

export const logLeaveActivity = (user: { id: string; name: string; role: string; company?: { id: number } }, action: string, leaveDetails: string) => {
  return logActivity({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    companyId: user.company?.id || 1, // Default to company 1 if not available
    module: 'leaves',
    action: action as any,
    details: `${action} leave: ${leaveDetails}`,
  });
};

export const logUserActivity = (user: { id: string; name: string; role: string; company?: { id: number } }, action: string, userDetails: string) => {
  return logActivity({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    companyId: user.company?.id || 1, // Default to company 1 if not available
    module: 'users',
    action: action as any,
    details: `${action} user: ${userDetails}`,
  });
};

export const logCustomerActivity = (user: { id: string; name: string; role: string; company?: { id: number } }, action: string, customerDetails: string) => {
  return logActivity({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    companyId: user.company?.id || 1,
    module: 'customers',
    action: action as any,
    details: `${action} customer: ${customerDetails}`,
  });
};
