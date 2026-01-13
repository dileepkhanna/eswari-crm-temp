import { apiClient } from './api';

export interface ActivityLogData {
  userId: string;
  userName: string;
  userRole: string;
  module: 'leads' | 'tasks' | 'projects' | 'leaves' | 'users' | 'announcements' | 'reports';
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'converted' | 'assigned' | 'completed' | 'viewed';
  details: string;
}

export const logActivity = async (activityData: ActivityLogData): Promise<void> => {
  try {
    console.log('=== ACTIVITY LOGGER DEBUG ===');
    console.log('Logging activity:', activityData);
    console.log('API Client available:', !!apiClient);
    
    // Check if we have a valid token before attempting to log
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No access token available, skipping activity logging');
      return;
    }
    
    const result = await apiClient.createActivityLog({
      user_name: activityData.userName,
      user_role: activityData.userRole,
      module: activityData.module,
      action: activityData.action,
      details: activityData.details,
    });
    
    console.log('Activity logged successfully, result:', result);
    
    // Trigger a custom event to notify AdminActivity to refresh
    window.dispatchEvent(new CustomEvent('activityLogged', { 
      detail: activityData 
    }));
    console.log('Activity logged event dispatched');
  } catch (error: any) {
    console.error('=== ACTIVITY LOGGER ERROR ===');
    console.error('Failed to log activity:', error);
    console.error('Error details:', error.message, error.status);
    
    // Handle authentication errors
    if (error.message?.includes('401')) {
      console.warn('Activity logging failed due to authentication. User may need to refresh.');
      // Clear invalid tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } else if (error.message?.includes('403')) {
      console.warn('Activity logging failed due to permissions.');
    } else if (error.message?.includes('405')) {
      console.error('Method not allowed - this should be fixed now');
    }
    
    // Don't throw error to avoid breaking the main functionality
  }
};

// Helper functions for common activities
export const logLeadActivity = (user: { id: string; name: string; role: string }, action: string, leadName: string) => {
  return logActivity({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    module: 'leads',
    action: action as any,
    details: `${action} lead: ${leadName}`,
  });
};

export const logTaskActivity = (user: { id: string; name: string; role: string }, action: string, taskDetails: string) => {
  return logActivity({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    module: 'tasks',
    action: action as any,
    details: `${action} task: ${taskDetails}`,
  });
};

export const logProjectActivity = (user: { id: string; name: string; role: string }, action: string, projectName: string) => {
  return logActivity({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    module: 'projects',
    action: action as any,
    details: `${action} project: ${projectName}`,
  });
};

export const logLeaveActivity = (user: { id: string; name: string; role: string }, action: string, leaveDetails: string) => {
  return logActivity({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    module: 'leaves',
    action: action as any,
    details: `${action} leave: ${leaveDetails}`,
  });
};

export const logUserActivity = (user: { id: string; name: string; role: string }, action: string, userDetails: string) => {
  return logActivity({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    module: 'users',
    action: action as any,
    details: `${action} user: ${userDetails}`,
  });
};