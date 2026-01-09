interface LogActivityParams {
  userId: string;
  userName: string;
  userRole: 'admin' | 'manager' | 'employee';
  module: 'leads' | 'tasks' | 'projects' | 'leaves' | 'users' | 'announcements';
  action: string;
  details: string;
}

export async function logActivity({
  userId,
  userName,
  userRole,
  module,
  action,
  details,
}: LogActivityParams): Promise<void> {
  try {
    const { apiClient } = await import('@/lib/api');
    
    await apiClient.createActivityLog({
      user_name: userName,
      user_role: userRole,
      module,
      action,
      details,
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Still log to console as fallback
    console.log('Activity logged (fallback):', { userId, userName, userRole, module, action, details });
  }
}
