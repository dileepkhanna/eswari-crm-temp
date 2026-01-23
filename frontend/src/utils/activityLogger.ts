// Activity Logger Utility for Manager Panel
export interface ActivityLogData {
  module: 'leads' | 'customers' | 'tasks' | 'projects' | 'leaves' | 'announcements' | 'users' | 'reports';
  action: 'create' | 'update' | 'delete' | 'view' | 'approve' | 'reject' | 'assign' | 'complete';
  details: string;
  user_name?: string;
  user_role?: string;
}

export class ActivityLogger {
  private static baseUrl = '/api/activity-logs/';

  static async log(activityData: ActivityLogData): Promise<boolean> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No auth token found, skipping activity log');
        return false;
      }

      console.log('🔄 Attempting to log activity:', activityData);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Activity logged successfully:', result);
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to log activity:', response.status, response.statusText, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error logging activity:', error);
      return false;
    }
  }

  // Convenience methods for common activities
  static async logLeadAction(action: 'create' | 'update' | 'delete' | 'view', leadTitle: string) {
    return this.log({
      module: 'leads',
      action,
      details: `${action.charAt(0).toUpperCase() + action.slice(1)} lead: ${leadTitle}`,
    });
  }

  static async logTaskAction(action: 'create' | 'update' | 'delete' | 'complete' | 'assign', taskTitle: string, assignee?: string) {
    let details = `${action.charAt(0).toUpperCase() + action.slice(1)} task: ${taskTitle}`;
    if (action === 'assign' && assignee) {
      details += ` to ${assignee}`;
    }
    
    return this.log({
      module: 'tasks',
      action,
      details,
    });
  }

  static async logCustomerAction(action: 'create' | 'update' | 'delete' | 'view', customerName: string) {
    return this.log({
      module: 'customers',
      action,
      details: `${action.charAt(0).toUpperCase() + action.slice(1)} customer: ${customerName}`,
    });
  }

  static async logProjectAction(action: 'create' | 'update' | 'delete' | 'view', projectName: string) {
    return this.log({
      module: 'projects',
      action,
      details: `${action.charAt(0).toUpperCase() + action.slice(1)} project: ${projectName}`,
    });
  }

  static async logLeaveAction(action: 'create' | 'approve' | 'reject' | 'view', leaveType: string, employeeName?: string) {
    let details = `${action.charAt(0).toUpperCase() + action.slice(1)} ${leaveType} leave`;
    if (employeeName && action !== 'create') {
      details += ` for ${employeeName}`;
    }
    
    return this.log({
      module: 'leaves',
      action,
      details,
    });
  }

  static async logReportView(reportType: string) {
    return this.log({
      module: 'reports',
      action: 'view',
      details: `Viewed ${reportType} report`,
    });
  }

  // Test method to create sample activities
  static async createTestActivities() {
    console.log('🧪 Creating test activities...');
    
    const testActivities = [
      { module: 'leads' as const, action: 'create' as const, details: 'Created lead: John Doe - Apartment inquiry' },
      { module: 'customers' as const, action: 'update' as const, details: 'Updated customer: Jane Smith - Phone number changed' },
      { module: 'tasks' as const, action: 'complete' as const, details: 'Completed task: Follow up with client' },
      { module: 'projects' as const, action: 'view' as const, details: 'Viewed project: Sunset Apartments' },
      { module: 'reports' as const, action: 'view' as const, details: 'Viewed monthly sales report' },
    ];

    for (const activity of testActivities) {
      await this.log(activity);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('🧪 Test activities creation completed');
  }
}

export default ActivityLogger;