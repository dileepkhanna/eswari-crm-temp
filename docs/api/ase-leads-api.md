# ASE Leads API Reference

Base URL: `/api/ase-leads/`

All endpoints require authentication via JWT Bearer token.

---

## List ASE Leads

```
GET /api/ase-leads/
```

Returns a paginated list of ASE leads scoped by the authenticated user's role.

### Role-Based Access

| Role | Scope |
|------|-------|
| Superuser | All leads (optional `?company=` filter) |
| Admin | All leads in user's company (or specify `?company=`) |
| HR | All leads in user's company |
| Manager | Leads assigned to or created by themselves and their direct reports |
| Employee | Leads assigned to or created by themselves only |

### Lead Status Values

| Value | Display |
|-------|---------|
| `new` | New Lead |
| `demo_done` | Demo Done |
| `presentation` | Presentation |
| `custom` | Custom |

When `status` is set to `custom`, provide a `custom_status` field (string, max 100 chars) with the custom status text. This field is optional for all other status values.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | int | Page number (default: 1) |
| `page_size` | int | Results per page (default: 50, max: 2000) |
| `search` | string | Search across company_name, contact_person, email, phone, industry, notes |
| `status` | string | Filter by lead status (new, demo_done, presentation, custom) |
| `priority` | string | Filter by priority (low, medium, high, urgent) |
| `industry` | string | Filter by industry |
| `assigned_to` | int | Filter by assigned user ID |
| `created_by` | int | Filter by creator user ID |
| `has_website` | bool | Filter by website presence |
| `has_social_media` | bool | Filter by social media presence |
| `company` | int | Filter by company ID (admin/superuser only) |
| `ordering` | string | Sort field (prefix `-` for descending). Options: created_at, updated_at, company_name, status, priority, next_follow_up, estimated_project_value |

#### Date Filters

| Parameter | Type | Format | Description |
|-----------|------|--------|-------------|
| `month` | string | `YYYY-MM` | Filter leads created in a specific month (e.g., `2026-06`) |
| `date_from` | string | `YYYY-MM-DD` | Filter leads created on or after this date |
| `date_to` | string | `YYYY-MM-DD` | Filter leads created on or before this date |

Date filters can be combined. The `month` filter takes effect independently of `date_from`/`date_to`. Invalid date formats are silently ignored.

### Response

```json
{
  "count": 150,
  "next": "http://host/api/ase-leads/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "company_name": "Example Corp",
      "contact_person": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "status": "new",
      "custom_status": null,
      "priority": "medium",
      "industry": "technology",
      "assigned_to": 5,
      "assigned_to_name": "Jane Smith",
      "created_by": 3,
      "created_by_name": "Admin User",
      "created_at": "2026-05-15T10:30:00Z",
      "updated_at": "2026-05-16T08:00:00Z"
    }
  ]
}
```

---

## Create ASE Lead

```
POST /api/ase-leads/
```

### Behavior by Role

- **Employee**: Lead is always assigned to themselves regardless of `assigned_to` in request body.
- **Manager**: If `assigned_to` not provided, defaults to themselves.
- **Admin/HR**: Must provide `company` field; if `assigned_to` not provided, defaults to themselves.

### Request Body

```json
{
  "company_name": "Example Corp",
  "contact_person": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "website": "https://example.com",
  "industry": "technology",
  "status": "new",
  "custom_status": null,
  "priority": "medium",
  "marketing_goals": "Increase online visibility",
  "service_interests": ["seo", "ppc"],
  "has_website": true,
  "has_social_media": true,
  "budget_amount": "50000",
  "notes": "Initial contact via referral",
  "company": 2,
  "assigned_to": 5
}
```

> **Note:** When `status` is `"custom"`, include `custom_status` with a descriptive text (e.g., `"Awaiting Legal Review"`). The field is ignored for other status values.

---

## Retrieve ASE Lead

```
GET /api/ase-leads/{id}/
```

Returns full lead details including all fields.

---

## Update ASE Lead

```
PUT /api/ase-leads/{id}/
PATCH /api/ase-leads/{id}/
```

---

## Delete ASE Lead

```
DELETE /api/ase-leads/{id}/
```

---

## Custom Actions

### Get Lead Statistics

```
GET /api/ase-leads/stats/
```

Returns aggregated statistics for the user's accessible leads including status breakdown, priority breakdown, total estimated value, and total monthly retainer.

### Get Follow-up Leads

```
GET /api/ase-leads/follow_ups/
```

Returns leads with `next_follow_up` date on or before today.

### Get High Priority Leads

```
GET /api/ase-leads/high_priority/
```

Returns leads with priority `high` or `urgent`.

### Get Lead Creators

```
GET /api/ase-leads/creators/
```

Returns a list of unique users who have created leads (for filter dropdowns). No pagination.

```json
[
  { "id": 3, "name": "Admin User" },
  { "id": 5, "name": "Jane Smith" }
]
```

### Check Phone Duplicate

```
GET /api/ase-leads/check_phone/?phone=9876543210&exclude_id=1&company=2
```

Returns `{"exists": true}` or `{"exists": false}`.

### Bulk Import

```
POST /api/ase-leads/bulk_import/
```

Import multiple leads in one request. Leads are round-robin assigned for managers.

**Request:**
```json
{
  "leads": [
    { "company_name": "Corp A", "phone": "111", "status": "new" },
    { "company_name": "Corp B", "phone": "222", "status": "new" }
  ]
}
```

**Response:**
```json
{ "imported": 2, "errors": [] }
```

### Export by IDs

```
POST /api/ase-leads/export_by_ids/
```

Export specific leads as an Excel file.

**Request:**
```json
{ "ids": [1, 2, 3] }
```

**Response:** Excel file download.

### Bulk Delete by IDs

```
POST /api/ase-leads/bulk_delete_by_ids/
```

Admin/Manager only. Delete specific leads by ID list.

**Request:**
```json
{ "ids": [1, 2, 3] }
```

**Response:**
```json
{ "deleted_count": 3 }
```

### Bulk Delete by Filter

```
POST /api/ase-leads/bulk_delete_by_filter/
```

Admin/Manager only. Delete all leads matching the given filters.

**Request:**
```json
{
  "search": "example",
  "status": "lost",
  "priority": "low"
}
```

**Response:**
```json
{ "deleted_count": 12 }
```
