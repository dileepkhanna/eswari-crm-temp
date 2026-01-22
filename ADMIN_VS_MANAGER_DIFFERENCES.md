# Admin vs Manager Panel Differences

## Overview
The manager panel now shows team-specific data instead of organization-wide data like the admin panel. This ensures managers only see information relevant to their team members.

## Key Differences

### **Reports Section**

#### Admin Reports (`/admin/reports`)
- **Scope**: Organization-wide data
- **Title**: "Reports - Team performance analytics and insights"
- **Data**: All users, leads, tasks, and activities in the system
- **Filtering**: Can filter by any user in the organization
- **Team Members**: Shows all managers and employees
- **Metrics**: System-wide statistics

#### Manager Reports (`/manager/reports`)
- **Scope**: Team-specific data only
- **Title**: "My Team Reports - Monitor your team's performance and productivity"
- **Data**: Only manager's own data + their direct team members (employees)
- **Filtering**: Can only filter by team members
- **Team Members**: Shows manager + their assigned employees only
- **Metrics**: Team-specific statistics

**Specific Changes:**
- "Total Leads" → "Team Leads"
- "Total Tasks" → "Team Tasks"
- "1 manager, X staff" → "You + X team members"
- Only shows leads created by team members
- Only shows tasks assigned to team members

### **Activity Section**

#### Admin Activity (`/admin/activity`)
- **Scope**: All system activities
- **Title**: "Activity Log - Track all system activities by staff and managers"
- **Data**: Activities from all users in the system
- **Filtering**: Can filter by any user
- **Backend**: Gets all activity logs (admin role)

#### Manager Activity (`/manager/activity`)
- **Scope**: Team activities only
- **Title**: "My Team Activity - Monitor your team's recent activities and actions"
- **Data**: Only activities from manager and their team members
- **Filtering**: Can only filter by team members
- **Backend**: Gets filtered activity logs (manager role - backend filters automatically)

**Specific Changes:**
- "Total Activities" → "Team Activities"
- "Active Users" → "Team Members Active"
- "Recent Activities" → "Team Activities"
- Backend automatically filters to show only manager's team activities

### **Customer Management**

#### Admin Customers (`/admin/customers`)
- **Full Access**: Can add, edit, delete customers
- **Phone Numbers**: Visible
- **Bulk Operations**: Available
- **Assignment**: Can assign to any employee

#### Manager Customers (`/manager/customers`)
- **Limited Access**: Can only edit assigned customers
- **Phone Numbers**: Hidden (`***-***-****`)
- **Bulk Operations**: Disabled
- **Assignment**: Cannot assign customers
- **Add Customers**: Disabled (admin-only function)

## Backend Filtering

### Activity Logs API
The backend automatically filters data based on user role:

```python
def get_queryset(self):
    user = self.request.user
    
    if user.role == 'admin':
        return ActivityLog.objects.all()  # All activities
    elif user.role == 'manager':
        # Only manager's activities + their employees' activities
        return ActivityLog.objects.filter(
            models.Q(user=user) | 
            models.Q(user__role='employee', user__manager=user)
        )
    else:
        return ActivityLog.objects.filter(user=user)  # Own activities only
```

### Frontend Filtering
The manager components additionally filter:
- **Leads**: Only shows leads created by team members
- **Tasks**: Only shows tasks assigned to team members
- **Team Members**: Only shows employees under the manager
- **Reports**: Calculates metrics based on team data only

## User Experience

### Manager Benefits
- **Focused View**: Only sees relevant team data
- **Privacy Protection**: Cannot see sensitive customer phone numbers
- **Team Management**: Clear view of team performance and activities
- **Appropriate Access**: Cannot perform admin-level operations

### Admin Benefits
- **Full Control**: Complete system oversight
- **All Data Access**: Can see organization-wide metrics
- **Management Functions**: Can add customers, assign tasks, etc.
- **System Administration**: Full access to all features

## Security & Privacy

### Data Isolation
- Managers cannot see data from other teams
- Phone numbers are protected from manager view
- Activity logs are filtered by backend
- Customer assignment is admin-controlled

### Role-Based Access
- UI elements are conditionally rendered based on role
- Backend APIs enforce role-based filtering
- Bulk operations are restricted appropriately
- Sensitive data is masked or hidden

This implementation ensures that managers have the right level of access to effectively manage their teams while maintaining appropriate data privacy and security boundaries.