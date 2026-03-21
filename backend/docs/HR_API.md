# HR Panel API Documentation

## Overview

This document provides comprehensive documentation for all HR-related API endpoints in the Eswari CRM system. The HR role has specific permissions to manage employees, leaves, holidays, and announcements while being restricted from accessing sales-related modules (leads, customers, projects, tasks).

## Authentication

All HR endpoints require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Base URL

```
http://localhost:8000/api
```

## Permission Levels

| Role | User Management | Leave Management | Holiday Management | Announcement Management | Reports | Sales Modules |
|------|----------------|------------------|-------------------|------------------------|---------|---------------|
| Admin | Full | Full | Full | Full | Full | Full |
| HR | Manager/Employee only | Full | Full | Full | Full | Blocked |
| Manager | None | Team only | View only | Own team | Limited | Full |
| Employee | None | Own only | View only | View only | None | Limited |

---

## User Management Endpoints

### 1. List All Users

**Endpoint**: `GET /api/auth/users/`

**Description**: Retrieve a list of all users in the system.

**Permissions**: Admin, HR

**Query Parameters**: None

**Request Example**:
```http
GET /api/auth/users/
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):
```json
[
  {
    "id": 1,
    "username": "john_employee_1",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "role": "employee",
    "manager": 2,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "username": "jane_manager_1",
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "phone": "+1234567891",
    "role": "manager",
    "manager": null,
    "created_at": "2024-01-10T09:00:00Z",
    "updated_at": "2024-01-10T09:00:00Z"
  }
]
```

**Error Responses**:
- `403 Forbidden`: User does not have permission to access this endpoint
```json
{
  "error": "Only administrators and HR can access this endpoint"
}
```

---

### 2. Create New User

**Endpoint**: `POST /api/auth/register/`

**Description**: Create a new user account. HR can only create manager and employee users.

**Permissions**: Admin (all roles), HR (manager/employee only)

**Request Body**:
```json
{
  "first_name": "Alice",
  "last_name": "Johnson",
  "email": "alice@example.com",
  "phone": "+1234567892",
  "password": "SecurePass123!",
  "role": "employee",
  "manager": 2
}
```

**Request Example**:
```http
POST /api/auth/register/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "first_name": "Alice",
  "last_name": "Johnson",
  "email": "alice@example.com",
  "phone": "+1234567892",
  "password": "SecurePass123!",
  "role": "employee",
  "manager": 2
}
```

**Response Example** (201 Created):
```json
{
  "user": {
    "id": 3,
    "username": "alice_employee_2",
    "first_name": "Alice",
    "last_name": "Johnson",
    "email": "alice@example.com",
    "phone": "+1234567892",
    "role": "employee",
    "manager": 2,
    "created_at": "2024-01-20T14:00:00Z",
    "updated_at": "2024-01-20T14:00:00Z"
  },
  "message": "User created successfully"
}
```

**Error Responses**:
- `403 Forbidden`: HR trying to create admin or HR user
```json
{
  "error": "HR can only create manager and employee users"
}
```

- `400 Bad Request`: Validation failed
```json
{
  "error": "Validation failed",
  "details": {
    "email": ["User with this email already exists."],
    "password": ["This password is too short."]
  }
}
```

---

### 3. Update User

**Endpoint**: `PUT /api/auth/users/<user_id>/update/`

**Description**: Update user information. HR can only update manager and employee users.

**Permissions**: Admin (all users), HR (manager/employee only)

**Path Parameters**:
- `user_id` (integer): ID of the user to update

**Request Body**:
```json
{
  "name": "Alice Marie Johnson",
  "phone": "+1234567899",
  "address": "123 Main St",
  "managerId": 2,
  "newPassword": "NewSecurePass123!"
}
```

**Request Example**:
```http
PUT /api/auth/users/3/update/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Alice Marie Johnson",
  "phone": "+1234567899",
  "managerId": 2
}
```

**Response Example** (200 OK):
```json
{
  "message": "User \"Alice Marie Johnson\" updated successfully",
  "user": {
    "id": 3,
    "username": "alice_employee_2",
    "first_name": "Alice",
    "last_name": "Marie Johnson",
    "email": "alice@example.com",
    "phone": "+1234567899",
    "role": "employee",
    "manager": 2,
    "created_at": "2024-01-20T14:00:00Z",
    "updated_at": "2024-01-20T15:30:00Z"
  }
}
```

**Error Responses**:
- `403 Forbidden`: HR trying to update admin or HR user
```json
{
  "error": "HR cannot modify admin or HR users"
}
```

- `404 Not Found`: User does not exist
```json
{
  "error": "User not found"
}
```

---

### 4. Delete User

**Endpoint**: `DELETE /api/auth/users/<user_id>/delete/`

**Description**: Delete a user account. HR can only delete manager and employee users.

**Permissions**: Admin (all users), HR (manager/employee only)

**Path Parameters**:
- `user_id` (integer): ID of the user to delete

**Request Example**:
```http
DELETE /api/auth/users/3/delete/
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):
```json
{
  "message": "User \"Alice Marie Johnson\" has been deleted successfully",
  "deleted_related_objects": {
    "customers_created": 5,
    "customers_assigned": 3,
    "leads_created": 10,
    "tasks_created": 8,
    "leaves": 2,
    "activity_logs": 45,
    "announcements": 0,
    "announcement_reads": 12,
    "holidays": 0
  }
}
```

**Error Responses**:
- `403 Forbidden`: HR trying to delete admin or HR user
```json
{
  "error": "HR can only delete manager and employee users"
}
```

- `400 Bad Request`: Trying to delete self
```json
{
  "error": "Cannot delete yourself"
}
```

- `404 Not Found`: User does not exist
```json
{
  "error": "User not found"
}
```

---

### 5. Get Managers List

**Endpoint**: `GET /api/auth/managers/`

**Description**: Retrieve a list of all managers for assignment purposes.

**Permissions**: Admin, HR

**Request Example**:
```http
GET /api/auth/managers/
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):
```json
[
  {
    "id": 2,
    "username": "jane_manager_1",
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "phone": "+1234567891",
    "role": "manager",
    "manager": null,
    "created_at": "2024-01-10T09:00:00Z",
    "updated_at": "2024-01-10T09:00:00Z"
  }
]
```

---

## Leave Management Endpoints

### 6. List All Leaves

**Endpoint**: `GET /api/leaves/`

**Description**: Retrieve a list of all leave requests. HR can see all leaves.

**Permissions**: Admin, HR (all leaves), Manager (team leaves), Employee (own leaves)

**Query Parameters**:
- `status` (string, optional): Filter by status (pending, approved, rejected)
- `leave_type` (string, optional): Filter by type (sick, casual, annual, other)
- `user` (integer, optional): Filter by user ID
- `search` (string, optional): Search by user name or reason
- `ordering` (string, optional): Order by field (created_at, start_date, end_date)

**Request Example**:
```http
GET /api/leaves/?status=pending&ordering=-created_at
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):
```json
[
  {
    "id": 1,
    "user": 1,
    "user_name": "John Doe",
    "leave_type": "sick",
    "start_date": "2024-02-01",
    "end_date": "2024-02-03",
    "reason": "Medical appointment",
    "status": "pending",
    "approved_by": null,
    "rejection_reason": null,
    "created_at": "2024-01-25T10:00:00Z",
    "updated_at": "2024-01-25T10:00:00Z"
  }
]
```

---

### 7. Approve Leave

**Endpoint**: `PATCH /api/leaves/<leave_id>/approve/`

**Description**: Approve a pending leave request.

**Permissions**: Admin, HR, Manager (team leaves only)

**Path Parameters**:
- `leave_id` (integer): ID of the leave to approve

**Request Example**:
```http
PATCH /api/leaves/1/approve/
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):
```json
{
  "id": 1,
  "user": 1,
  "user_name": "John Doe",
  "leave_type": "sick",
  "start_date": "2024-02-01",
  "end_date": "2024-02-03",
  "reason": "Medical appointment",
  "status": "approved",
  "approved_by": 4,
  "rejection_reason": null,
  "created_at": "2024-01-25T10:00:00Z",
  "updated_at": "2024-01-26T09:00:00Z"
}
```

**Error Responses**:
- `403 Forbidden`: User does not have permission
```json
{
  "error": "You do not have permission to approve leaves"
}
```

---

### 8. Reject Leave

**Endpoint**: `PATCH /api/leaves/<leave_id>/reject/`

**Description**: Reject a pending leave request with a reason.

**Permissions**: Admin, HR, Manager (team leaves only)

**Path Parameters**:
- `leave_id` (integer): ID of the leave to reject

**Request Body**:
```json
{
  "rejection_reason": "Insufficient leave balance"
}
```

**Request Example**:
```http
PATCH /api/leaves/1/reject/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rejection_reason": "Insufficient leave balance"
}
```

**Response Example** (200 OK):
```json
{
  "id": 1,
  "user": 1,
  "user_name": "John Doe",
  "leave_type": "sick",
  "start_date": "2024-02-01",
  "end_date": "2024-02-03",
  "reason": "Medical appointment",
  "status": "rejected",
  "approved_by": 4,
  "rejection_reason": "Insufficient leave balance",
  "created_at": "2024-01-25T10:00:00Z",
  "updated_at": "2024-01-26T09:15:00Z"
}
```

---

### 9. Delete Leave

**Endpoint**: `DELETE /api/leaves/<leave_id>/`

**Description**: Delete a leave request. HR can delete any leave.

**Permissions**: Admin, HR

**Path Parameters**:
- `leave_id` (integer): ID of the leave to delete

**Request Example**:
```http
DELETE /api/leaves/1/
Authorization: Bearer <access_token>
```

**Response Example** (204 No Content)

**Error Responses**:
- `403 Forbidden`: User does not have permission
```json
{
  "error": "Only admins and HR can delete leaves"
}
```

---

## Holiday Management Endpoints

### 10. List All Holidays

**Endpoint**: `GET /api/holidays/`

**Description**: Retrieve a list of all company holidays.

**Permissions**: All authenticated users

**Query Parameters**:
- `year` (integer, optional): Filter by year
- `month` (integer, optional): Filter by month
- `holiday_type` (string, optional): Filter by type
- `is_recurring` (boolean, optional): Filter by recurring status
- `search` (string, optional): Search by name or description
- `ordering` (string, optional): Order by field (start_date, created_at)

**Request Example**:
```http
GET /api/holidays/?year=2024&ordering=start_date
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):
```json
[
  {
    "id": 1,
    "name": "New Year's Day",
    "description": "First day of the year",
    "start_date": "2024-01-01",
    "end_date": "2024-01-01",
    "holiday_type": "public",
    "is_recurring": true,
    "created_by": 4,
    "created_at": "2023-12-01T10:00:00Z",
    "updated_at": "2023-12-01T10:00:00Z"
  }
]
```

---

### 11. Create Holiday

**Endpoint**: `POST /api/holidays/`

**Description**: Create a new company holiday.

**Permissions**: Admin, HR, Manager

**Request Body**:
```json
{
  "name": "Independence Day",
  "description": "National holiday",
  "start_date": "2024-07-04",
  "end_date": "2024-07-04",
  "holiday_type": "public",
  "is_recurring": true
}
```

**Request Example**:
```http
POST /api/holidays/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Independence Day",
  "description": "National holiday",
  "start_date": "2024-07-04",
  "end_date": "2024-07-04",
  "holiday_type": "public",
  "is_recurring": true
}
```

**Response Example** (201 Created):
```json
{
  "id": 2,
  "name": "Independence Day",
  "description": "National holiday",
  "start_date": "2024-07-04",
  "end_date": "2024-07-04",
  "holiday_type": "public",
  "is_recurring": true,
  "created_by": 4,
  "created_at": "2024-01-26T10:00:00Z",
  "updated_at": "2024-01-26T10:00:00Z"
}
```

**Error Responses**:
- `403 Forbidden`: User does not have permission
```json
{
  "error": "Only administrators, HR, and managers can create holidays"
}
```

---

### 12. Update Holiday

**Endpoint**: `PUT /api/holidays/<holiday_id>/`

**Description**: Update an existing holiday.

**Permissions**: Admin, HR, Manager

**Path Parameters**:
- `holiday_id` (integer): ID of the holiday to update

**Request Body**:
```json
{
  "name": "Independence Day (Updated)",
  "description": "National holiday - updated",
  "start_date": "2024-07-04",
  "end_date": "2024-07-05",
  "holiday_type": "public",
  "is_recurring": true
}
```

**Response Example** (200 OK):
```json
{
  "id": 2,
  "name": "Independence Day (Updated)",
  "description": "National holiday - updated",
  "start_date": "2024-07-04",
  "end_date": "2024-07-05",
  "holiday_type": "public",
  "is_recurring": true,
  "created_by": 4,
  "created_at": "2024-01-26T10:00:00Z",
  "updated_at": "2024-01-26T11:00:00Z"
}
```

---

### 13. Delete Holiday

**Endpoint**: `DELETE /api/holidays/<holiday_id>/`

**Description**: Delete a holiday.

**Permissions**: Admin, HR, Manager

**Path Parameters**:
- `holiday_id` (integer): ID of the holiday to delete

**Request Example**:
```http
DELETE /api/holidays/2/
Authorization: Bearer <access_token>
```

**Response Example** (204 No Content)

---

## Announcement Management Endpoints

### 14. List All Announcements

**Endpoint**: `GET /api/announcements/`

**Description**: Retrieve a list of announcements. HR can see all announcements.

**Permissions**: All authenticated users (filtered by role and assignment)

**Query Parameters**:
- `search` (string, optional): Search by title or message
- `ordering` (string, optional): Order by field

**Request Example**:
```http
GET /api/announcements/?ordering=-created_at
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):
```json
[
  {
    "id": 1,
    "title": "Office Closure Notice",
    "message": "Office will be closed on Independence Day",
    "priority": "high",
    "target_roles": ["admin", "manager", "employee", "hr"],
    "assigned_employees": [],
    "is_active": true,
    "expires_at": "2024-07-05T00:00:00Z",
    "created_by": 4,
    "created_at": "2024-06-01T10:00:00Z",
    "updated_at": "2024-06-01T10:00:00Z"
  }
]
```

---

### 15. Create Announcement

**Endpoint**: `POST /api/announcements/`

**Description**: Create a new announcement. HR has full access.

**Permissions**: Admin, HR, Manager

**Request Body**:
```json
{
  "title": "Team Meeting",
  "message": "Monthly team meeting scheduled for next Monday",
  "priority": "medium",
  "target_roles": ["manager", "employee"],
  "assigned_employee_ids": [1, 3, 5],
  "is_active": true,
  "expires_at": "2024-02-15T00:00:00Z"
}
```

**Request Example**:
```http
POST /api/announcements/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Team Meeting",
  "message": "Monthly team meeting scheduled for next Monday",
  "priority": "medium",
  "target_roles": ["manager", "employee"],
  "assigned_employee_ids": [1, 3, 5],
  "is_active": true,
  "expires_at": "2024-02-15T00:00:00Z"
}
```

**Response Example** (201 Created):
```json
{
  "id": 2,
  "title": "Team Meeting",
  "message": "Monthly team meeting scheduled for next Monday",
  "priority": "medium",
  "target_roles": ["manager", "employee"],
  "assigned_employees": [1, 3, 5],
  "is_active": true,
  "expires_at": "2024-02-15T00:00:00Z",
  "created_by": 4,
  "created_at": "2024-01-26T12:00:00Z",
  "updated_at": "2024-01-26T12:00:00Z"
}
```

**Error Responses**:
- `403 Forbidden`: User does not have permission
```json
{
  "error": "Only admin, HR, and managers can create announcements."
}
```

---

### 16. Update Announcement

**Endpoint**: `PUT /api/announcements/<announcement_id>/`

**Description**: Update an existing announcement. HR can update any announcement.

**Permissions**: Admin, HR (all), Manager (own only)

**Path Parameters**:
- `announcement_id` (integer): ID of the announcement to update

**Request Body**:
```json
{
  "title": "Team Meeting (Updated)",
  "message": "Monthly team meeting rescheduled to Tuesday",
  "priority": "high",
  "target_roles": ["manager", "employee"],
  "assigned_employee_ids": [1, 3, 5, 7],
  "is_active": true,
  "expires_at": "2024-02-16T00:00:00Z"
}
```

**Response Example** (200 OK):
```json
{
  "id": 2,
  "title": "Team Meeting (Updated)",
  "message": "Monthly team meeting rescheduled to Tuesday",
  "priority": "high",
  "target_roles": ["manager", "employee"],
  "assigned_employees": [1, 3, 5, 7],
  "is_active": true,
  "expires_at": "2024-02-16T00:00:00Z",
  "created_by": 4,
  "created_at": "2024-01-26T12:00:00Z",
  "updated_at": "2024-01-26T13:00:00Z"
}
```

---

### 17. Delete Announcement

**Endpoint**: `DELETE /api/announcements/<announcement_id>/`

**Description**: Delete an announcement. HR can delete any announcement.

**Permissions**: Admin, HR (all), Manager (own only)

**Path Parameters**:
- `announcement_id` (integer): ID of the announcement to delete

**Request Example**:
```http
DELETE /api/announcements/2/
Authorization: Bearer <access_token>
```

**Response Example** (204 No Content)

---

### 18. Mark Announcement as Read

**Endpoint**: `POST /api/announcements/<announcement_id>/mark_read/`

**Description**: Mark an announcement as read by the current user.

**Permissions**: All authenticated users

**Path Parameters**:
- `announcement_id` (integer): ID of the announcement to mark as read

**Request Example**:
```http
POST /api/announcements/1/mark_read/
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):
```json
{
  "message": "Announcement marked as read",
  "already_read": false
}
```

---

### 19. Get Unread Announcements

**Endpoint**: `GET /api/announcements/unread/`

**Description**: Retrieve only unread announcements for the current user.

**Permissions**: All authenticated users

**Request Example**:
```http
GET /api/announcements/unread/
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):
```json
[
  {
    "id": 1,
    "title": "Office Closure Notice",
    "message": "Office will be closed on Independence Day",
    "priority": "high",
    "target_roles": ["admin", "manager", "employee", "hr"],
    "assigned_employees": [],
    "is_active": true,
    "expires_at": "2024-07-05T00:00:00Z",
    "created_by": 4,
    "created_at": "2024-06-01T10:00:00Z",
    "updated_at": "2024-06-01T10:00:00Z"
  }
]
```

---

## HR Reports Endpoints

### 20. Get Dashboard Metrics

**Endpoint**: `GET /api/hr/reports/dashboard/`

**Description**: Retrieve key metrics for the HR dashboard.

**Permissions**: Admin, HR

**Request Example**:
```http
GET /api/hr/reports/dashboard/
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):
```json
{
  "total_employees": 150,
  "pending_leaves": 12,
  "upcoming_holidays": 5,
  "active_announcements": 3
}
```

**Error Responses**:
- `403 Forbidden`: User does not have permission
```json
{
  "error": "Permission denied. Only admin and HR roles can access this endpoint."
}
```

- `500 Internal Server Error`: Database error
```json
{
  "error": "Database error occurred while fetching dashboard metrics. Please try again later."
}
```

---

### 21. Get Employee Statistics

**Endpoint**: `GET /api/hr/reports/employees/`

**Description**: Retrieve detailed employee statistics for HR reports.

**Permissions**: Admin, HR

**Request Example**:
```http
GET /api/hr/reports/employees/
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):
```json
{
  "total_employees": 150,
  "by_role": [
    {"role": "admin", "count": 2},
    {"role": "hr", "count": 3},
    {"role": "manager", "count": 15},
    {"role": "employee", "count": 130}
  ],
  "with_manager": 130,
  "without_manager": 20
}
```

**Error Responses**:
- `403 Forbidden`: User does not have permission
```json
{
  "error": "Permission denied. Only admin and HR roles can access this endpoint."
}
```

---

### 22. Get Leave Statistics

**Endpoint**: `GET /api/hr/reports/leaves/`

**Description**: Retrieve detailed leave statistics for HR reports.

**Permissions**: Admin, HR

**Request Example**:
```http
GET /api/hr/reports/leaves/
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):
```json
{
  "total_leaves": 245,
  "by_status": [
    {"status": "pending", "count": 12},
    {"status": "approved", "count": 200},
    {"status": "rejected", "count": 33}
  ],
  "by_type": [
    {"leave_type": "sick", "count": 80},
    {"leave_type": "casual", "count": 90},
    {"leave_type": "annual", "count": 60},
    {"leave_type": "other", "count": 15}
  ],
  "pending_count": 12
}
```

**Error Responses**:
- `403 Forbidden`: User does not have permission
```json
{
  "error": "Permission denied. Only admin and HR roles can access this endpoint."
}
```

---

## Blocked Endpoints for HR

The following endpoints are **NOT accessible** to HR users and will return a `403 Forbidden` error:

### Sales Module Endpoints (Blocked)

- **Leads**: `/api/leads/*` - All lead-related endpoints
- **Customers**: `/api/customers/*` - All customer-related endpoints
- **Projects**: `/api/projects/*` - All project-related endpoints
- **Tasks**: `/api/tasks/*` - All task-related endpoints

**Error Response** (403 Forbidden):
```json
{
  "error": "HR role does not have access to this module"
}
```

---

## Common Error Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Resource deleted successfully |
| 400 | Bad Request | Invalid request data, validation errors |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User does not have permission for this action |
| 404 | Not Found | Resource does not exist |
| 500 | Internal Server Error | Server-side error, database issues |

---

## Rate Limiting

Currently, there are no rate limits implemented. This may be added in future versions.

---

## Pagination

Most list endpoints support pagination. By default, pagination is disabled for holidays and users. For other endpoints, use the following query parameters:

- `page` (integer): Page number (default: 1)
- `page_size` (integer): Number of items per page (default: 50)

**Example**:
```http
GET /api/leaves/?page=2&page_size=20
```

---

## Filtering and Searching

Most list endpoints support filtering and searching:

### Filtering
Use query parameters matching field names:
```http
GET /api/leaves/?status=pending&leave_type=sick
```

### Searching
Use the `search` query parameter:
```http
GET /api/leaves/?search=John
```

### Ordering
Use the `ordering` query parameter (prefix with `-` for descending):
```http
GET /api/leaves/?ordering=-created_at
```

---

## Best Practices

1. **Always include authentication**: All endpoints require a valid JWT token
2. **Handle errors gracefully**: Check response status codes and display user-friendly messages
3. **Validate input**: Ensure all required fields are provided before making requests
4. **Use appropriate HTTP methods**: GET for reading, POST for creating, PUT for updating, DELETE for deleting
5. **Check permissions**: Verify user role before attempting restricted operations
6. **Log errors**: Log API errors for debugging and monitoring

---

## Support

For questions or issues with the HR API, please contact:
- Technical Support: support@eswaricr m.com
- Developer Documentation: https://docs.eswaricrm.com

---

## Changelog

### Version 1.0.0 (2024-01-26)
- Initial HR API documentation
- All HR endpoints documented
- Request/response examples provided
- Permission requirements listed
- Error codes documented

---

**Last Updated**: January 26, 2024  
**API Version**: 1.0.0  
**Document Version**: 1.0.0
