# ASE Marketing Panel - API Documentation

## Overview

The ASE Marketing Panel provides role-based API endpoints for managing the marketing pipeline at ASE Technologies. The system supports 4 marketing roles: BRE (Business Research Executive), BOE (Business Outreach Executive), CRE (Client Research Executive), and Marketing Lead.

**Base URL:** `/api/ase-leads/`

## Authentication

All endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

The authenticated user's `team_info` response includes `marketing_category` and `marketing_category_display` fields **only** when the user belongs to a marketing team (`team_type == "marketing"`). These fields are omitted for technical teams.

## Permissions

- **Admin**: Full access to all endpoints
- **Manager**: Access to all marketing endpoints for their company (ASE/ASE_TECH). Bypasses team/category checks but requires company membership.
- **Marketing Lead**: Full access to all marketing endpoints
- **BRE**: Access to qualification endpoints and new/qualified leads
- **BOE**: Access to assigned data view, call/email logging, and qualified/contacted leads
- **CRE**: Access to proposal/meeting/deal endpoints and contacted/proposal/negotiating leads

---

## Common Data Structures

### Nested User Object

When a user is referenced in API responses (e.g., `researched_by`, `contacted_by`, `managed_by`, `assignee`), the following structure is returned:

```json
{
  "id": 5,
  "username": "john_employee_01",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "role": "employee",
  "marketing_category": "BOE"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | User ID |
| `username` | string | Login username |
| `first_name` | string | First name |
| `last_name` | string | Last name |
| `email` | string | Email address |
| `full_name` | string | Combined first + last name (falls back to username) |
| `role` | string | User role (`admin`, `manager`, `team_lead`, `employee`, `hr`) |
| `marketing_category` | string | Marketing team category in uppercase (`BRE`, `BOE`, `CRE`, `MARKETING_LEAD`) or empty string if not in a marketing team |

---

## Endpoints

### Dashboard & Queue

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/my-queue/` | Get role-filtered lead queue | All marketing |
| GET | `/dashboard-stats/` | Get role-specific dashboard stats | All marketing |

#### GET `/my-queue/`

Returns leads filtered by the user's marketing role.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search across company name, contact person, phone, and notes |
| `status` | string | Filter by lead status (comma-separated, e.g. `qualified,disqualified`) |
| `priority` | string | Filter by priority |
| `ordering` | string | Sort field (e.g. `-created_at`, `lead_score`) |
| `page` | int | Page number for pagination |

### BRE Actions

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/{id}/qualify/` | Qualify a lead (score 0-100) | BRE, Lead, Admin |
| POST | `/{id}/disqualify/` | Disqualify a lead (reason required) | BRE, Lead, Admin |

### BOE Assigned Data

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/boe-assigned/` | List records assigned to the BOE user | BOE, Manager, Lead, Admin |

#### GET `/boe-assigned/`

Returns paginated BRE research records that have been assigned to the authenticated BOE user. This is the primary data source for the BOE Dashboard.

**Data Scoping:**
- **Admin / Manager with company**: Sees all assigned/converted records within their company
- **Admin without company**: Sees all assigned/converted records across all companies
- **BOE user**: Sees only records assigned to them

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search across name, phone_number, location |
| `call_status` | string | Filter by call status: `pending`, `no_answer`, `not_interested`, `interested` |
| `date_from` | string (YYYY-MM-DD) | Filter entries created on or after this date |
| `date_to` | string (YYYY-MM-DD) | Filter entries created on or before this date |
| `page` | int | Page number (default: 1) |

**Frontend Filter Controls (BOE Dashboard - Assigned Data tab):**

| Control | Maps to | Options |
|---------|---------|---------|
| Search input | `search` | Free text — searches name, phone, location |
| Date range dropdown | `date_from` + `date_to` | All Time · Today · This Week · This Month · Custom |
| Call Status dropdown | `call_status` | All Status · Pending · No Answer · Not Interested · Interested |
| Custom date pickers | `date_from` / `date_to` | Shown only when "Custom" is selected |

**Response (200):**
```json
{
  "count": 50,
  "total_pages": 3,
  "results": [
    {
      "id": 1,
      "name": "John Doe",
      "phone_number": "9876543210",
      "location": "Mumbai",
      "notes": "Interested in services",
      "status": "assigned",
      "created_by_name": "BRE User",
      "assigned_to_name": "BOE User",
      "created_at": "2026-05-08T10:00:00Z"
    }
  ],
  "stats": {
    "total_assigned": 50,
    "today_assigned": 5,
    "this_week_assigned": 12,
    "this_month_assigned": 30
  }
}
```

### BOE Actions

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/{id}/log-call/` | Log a phone call (legacy pipeline) | BOE, Lead, Admin |
| POST | `/{id}/log-email/` | Log an email (legacy pipeline) | BOE, Lead, Admin |
| PATCH | `/boe-assigned/{id}/call-status/` | Update call status for an assigned record | BOE (assigned only) |
| POST | `/boe-assigned/{id}/convert-to-lead/` | Convert a positive call to a lead and assign to CRE | BOE (assigned only) |
| POST | `/boe-data/add/` | BOE adds their own research data | BOE |
| PATCH | `/boe-data/{id}/edit/` | BOE edits data assigned to them | BOE (assigned only) |
| DELETE | `/boe-data/{id}/delete/` | BOE deletes data they created | BOE (creator only) |
| POST | `/boe-data/bulk-delete/` | BOE bulk deletes data they created | BOE (creator only) |

#### PATCH `/boe-assigned/{id}/call-status/`

BOE employee updates the call status and notes for a BRE research record assigned to them.

**Request body:**
```json
{
  "call_status": "interested",
  "call_notes": "Client interested in web development services, wants a callback next week."
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call_status` | string | No | One of: `pending`, `no_answer`, `callback`, `not_interested`, `interested` |
| `call_notes` | string | No | Free-text notes about the call |

**Behavior:**
- Only the BOE user to whom the record is assigned (`assigned_to = current user`) can update it
- At least one of `call_status` or `call_notes` should be provided
- **Auto-lead creation:** When `call_status` is set to `interested`, a new `BOELead` record is automatically created in the BOE Leads table (if one doesn't already exist for this research record and user). The lead inherits the record's `name`, `phone_number`, `location`, `notes`, and `call_notes` fields, and is linked back to the source research record via `source_research`.

**Response (200):**
```json
{
  "id": 42,
  "call_status": "interested",
  "call_notes": "Client interested in web development services.",
  "message": "Call status updated successfully."
}
```

**Error — Not found or not assigned (404):**
```json
{
  "error": "Record not found or not assigned to you."
}
```

**Error — Invalid status (400):**
```json
{
  "error": "Invalid call_status. Must be one of: ['pending', 'no_answer', 'callback', 'not_interested', 'interested']"
}
```

#### POST `/boe-assigned/{id}/convert-to-lead/`

BOE employee converts a positive call into a lead and assigns it to a CRE team member. This changes the record's status to `converted`.

**Request body:**
```json
{
  "assigned_to_cre": 15,
  "call_notes": "Client confirmed interest, ready for proposal discussion."
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assigned_to_cre` | int | Yes | User ID of the CRE team member to assign |
| `call_notes` | string | No | Additional notes to attach before conversion |

**Behavior:**
- Only the BOE user to whom the record is assigned can convert it
- Sets `status` to `converted`, `call_status` to `interested`, and `assigned_to_cre` to the specified CRE user
- Use the `/cre-users/` endpoint to populate the CRE member dropdown

**Frontend Integration:**
- The BOE Dashboard has a dedicated **Converted Leads** tab (`BOELeads` component) that shows records with `call_status = interested` or `status = converted`
- From this Converted Leads view, BOE users can assign leads to CRE team members using this endpoint
- The Leads tab supports a **View Detail** modal that displays full lead information (name, phone, location, status, dates, notes, call notes, CRE assignment) and provides a click-to-call button
- The Leads tab also supports **Add**, **Edit**, and **Delete** operations for BOE-owned leads:
  - **Add Lead**: Creates a new lead via `POST /boe-leads/create/` with name, phone_number, location, and notes
  - **Edit Lead**: Updates name, phone, location, and notes via `PATCH /boe-leads/{id}/update/`
  - **Delete Lead**: Removes BOE-created leads via `DELETE /boe-leads/{id}/delete/` (only leads created by the BOE user can be deleted)
- The Leads tab polls `/boe-assigned/?page_size=200` every 5 seconds and filters client-side for interested/converted records
- Records already assigned to CRE display the CRE member's name and are no longer actionable

**Response (200):**
```json
{
  "id": 42,
  "status": "converted",
  "call_status": "interested",
  "assigned_to_cre_name": "Jane Smith",
  "message": "Lead converted and assigned to Jane Smith successfully."
}
```

**Error — Not found or not assigned (404):**
```json
{
  "error": "Record not found or not assigned to you."
}
```

**Error — Missing CRE user (400):**
```json
{
  "error": "assigned_to_cre is required."
}
```

**Error — Invalid CRE user (400):**
```json
{
  "error": "CRE user not found."
}
```

#### POST `/boe-data/add/`

BOE employee adds their own research data directly. The record is automatically assigned to the BOE user who created it (status: `assigned`).

**Request body:**
```json
{
  "name": "Jane Doe",
  "phone_number": "9876543210",
  "location": "Hyderabad",
  "notes": "Found via LinkedIn"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Contact person name |
| `phone_number` | string | Yes | Phone number (must be unique within company) |
| `location` | string | No | City / Area |
| `notes` | string | No | Additional notes |

**Behavior:**
- `status` is set to `assigned` and `assigned_to` is set to the current BOE user
- `created_by` is set to the current user
- Duplicate phone numbers within the same company are rejected

**Response (201):**
```json
{
  "id": 55,
  "name": "Jane Doe",
  "phone_number": "9876543210",
  "message": "Data added successfully."
}
```

**Error — Duplicate phone (400):**
```json
{
  "error": "Phone number 9876543210 already exists (created by John Doe)"
}
```

**Error — Missing required fields (400):**
```json
{
  "error": "Name and phone number are required."
}
```

#### PATCH `/boe-data/{id}/edit/`

BOE employee edits a record that is assigned to them.

**Request body (all fields optional):**
```json
{
  "name": "Jane Doe Updated",
  "phone_number": "9876543211",
  "location": "Chennai",
  "notes": "Updated notes"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Updated contact name |
| `phone_number` | string | No | Updated phone (checked for duplicates) |
| `location` | string | No | Updated location |
| `notes` | string | No | Updated notes |

**Behavior:**
- Only the BOE user to whom the record is assigned (`assigned_to = current user`) can edit it
- If `phone_number` is changed, duplicate check is performed within the company

**Response (200):**
```json
{
  "id": 55,
  "name": "Jane Doe Updated",
  "phone_number": "9876543211",
  "location": "Chennai",
  "notes": "Updated notes",
  "message": "Data updated successfully."
}
```

**Error — Not found or not assigned (404):**
```json
{
  "error": "Record not found or not assigned to you."
}
```

**Error — Duplicate phone (400):**
```json
{
  "error": "Phone number 9876543211 already exists."
}
```

#### DELETE `/boe-data/{id}/delete/`

BOE employee deletes a record they created themselves. Records assigned from BRE cannot be deleted by BOE.

**Behavior:**
- Only records where both `assigned_to = current user` AND `created_by = current user` can be deleted
- This prevents BOE from deleting data that was assigned to them by BRE

**Response (204):** No content on success.

**Error — Not found or cannot delete (404):**
```json
{
  "error": "Record not found or you cannot delete data assigned from BRE."
}
```

#### POST `/boe-data/bulk-delete/`

BOE employee bulk deletes multiple records they created themselves. Records assigned from BRE cannot be deleted.

**Request body:**
```json
{
  "ids": [1, 2, 3, 5]
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ids` | array of int | Yes | List of BREResearchData record IDs to delete |

**Behavior:**
- Only records where both `assigned_to = current user` AND `created_by = current user` are deleted
- Records assigned from BRE (where `created_by` differs from the current user) are silently skipped
- The response includes the count of actually deleted records

**Response (200):**
```json
{
  "message": "3 record(s) deleted successfully.",
  "deleted_count": 3
}
```

**Error — No IDs provided (400):**
```json
{
  "error": "No IDs provided."
}
```

**Frontend Integration (BOE Dashboard — Research Data tab):**

The research data list supports multi-select with bulk delete:

| UI Element | Behavior |
|------------|----------|
| Row checkbox | Toggles selection of an individual record. Only records created by the current BOE user (`created_by_name === assigned_to_name`) are selectable |
| "Select All" checkbox | Selects/deselects all selectable (BOE-created) records on the current page |
| Bulk Delete button | Calls `POST /boe-data/bulk-delete/` with the selected IDs. Prompts for confirmation before executing |

Records assigned from BRE (where `created_by_name` differs from `assigned_to_name`) do not show a checkbox and cannot be selected for deletion.

---

### BOE Leads Table (Separate CRUD)

The BOE Leads table (`BOELead`) stores leads that BOE employees create or convert from research data. These endpoints provide full CRUD operations scoped to the authenticated BOE user.

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/boe-leads/` | List BOE leads (paginated) | BOE (own leads), Admin (all) |
| POST | `/boe-leads/create/` | Create a new BOE lead | BOE, Admin |
| PATCH | `/boe-leads/{id}/update/` | Update a BOE lead | BOE (creator only) |
| DELETE | `/boe-leads/{id}/delete/` | Delete a BOE lead | BOE (creator only) |
| POST | `/boe-leads/{id}/assign-cre/` | Assign a lead to CRE | BOE (creator only), Admin |

#### GET `/boe-leads/`

Returns paginated leads from the `BOELead` table. Access is role-based:

- **Admin with company**: Sees all leads within their company
- **Admin without company**: Sees all leads across all companies
- **BOE user**: Sees only leads they created

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search across name, phone_number, location |
| `status` | string | Filter by status (e.g. `interested`, `assigned_cre`, `in_progress`, `converted`, `lost`). Use `all` or omit to show all |
| `date_from` | string (YYYY-MM-DD) | Filter leads created on or after this date |
| `date_to` | string (YYYY-MM-DD) | Filter leads created on or before this date |
| `created_by` | int | Filter by the BOE employee who created the lead (user ID). **Admin only** — ignored for non-admin users |
| `assigned_cre` | int or `"unassigned"` | Filter by assigned CRE user (user ID), or pass `unassigned` to show leads with no CRE assignment |
| `page` | int | Page number (default: 1) |
| `page_size` | int | Results per page (default: 50) |

**Frontend Filter Controls (BOELeads component):**

The BOE Leads table exposes the following filter controls in the UI:

| Control | Maps to | Options |
|---------|---------|---------|
| Search input | `search` | Free text — searches name, phone, location |
| Status dropdown | `status` | All Status · New Lead (`interested`) · Assigned to CRE (`assigned_cre`) · In Progress (`in_progress`) · Converted (`converted`) · Lost (`lost`) |
| Date range dropdown | `date_from` + `date_to` | All Time · Today · This Week · This Month · Custom |
| Employee dropdown | `created_by` | All Employees · {BOE member name} (populated from `/boe-leads/creators/`) |
| Custom date pickers | `date_from` / `date_to` | Shown only when "Custom" is selected |

**Bulk Selection & Actions (BOELeads component):**

The leads list supports multi-select with bulk operations:

| UI Element | Behavior |
|------------|----------|
| Row checkbox | Toggles selection of an individual lead |
| "Select All" checkbox | Selects/deselects all leads on the current page |
| "Select all N records" link | Appears when all page items are selected and more records exist server-side. Enables cross-page selection using filter-based bulk operations (`select_all: true`) |
| "Clear selection" link | Resets selection state |
| Bulk Delete button | Calls `POST /boe-leads/bulk-delete/` with selected IDs or `select_all` + current filters |
| Bulk Assign CRE button | Opens CRE assignment dialog, then calls `POST /boe-leads/bulk-assign/` with selected IDs or `select_all` + current filters. **Visible to admin, manager, team_lead, and employee roles.** |

The bulk action bar shows the count of selected records. When "select all records" is active, the count reflects `totalCount` (server-side total matching current filters) rather than just the visible page.

**Export count:** The Export button label reflects `totalCount` (the server-side total matching current filters), not just the number of records on the current page.

**Response (200):**
```json
{
  "results": [
    {
      "id": 1,
      "name": "John Doe",
      "phone_number": "9876543210",
      "location": "Mumbai",
      "notes": "Found via LinkedIn",
      "call_notes": "Interested in web services",
      "status": "interested",
      "created_by_name": "BOE User",
      "assigned_to_cre_name": null,
      "created_at": "2026-05-11T10:00:00Z"
    }
  ],
  "count": 25,
  "page": 1,
  "total_pages": 1,
  "stats": {
    "total": 25,
    "pending_cre": 10,
    "assigned_cre": 15
  }
}
```

| Stats Field | Description |
|-------------|-------------|
| `total` | Total leads matching the current filters (reflects applied search, status, date, and role-based scoping) |
| `pending_cre` | Leads with status `interested` (awaiting CRE assignment) within the filtered set |
| `assigned_cre` | Leads with any status other than `interested` within the filtered set |

---

#### POST `/boe-leads/create/`

BOE or Admin creates a new lead directly.

**Request body:**
```json
{
  "name": "Jane Doe",
  "phone_number": "9876543210",
  "location": "Hyderabad",
  "notes": "Found via cold call",
  "call_notes": "Interested in MSME services",
  "source_research_id": 42
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Contact person name |
| `phone_number` | string | Yes | Phone number |
| `location` | string | No | City / Area |
| `notes` | string | No | General notes |
| `call_notes` | string | No | Notes from the call |
| `source_research_id` | int | No | ID of the BREResearchData record this lead originated from |

**Behavior:**
- `created_by` is set to the authenticated user
- `company` is set to the authenticated user's company. If the user has no company assigned (e.g., a global admin), it defaults to ASE Technologies (company code `ASE`)
- If `source_research_id` is provided and valid, the `source_research` FK is linked

**Response (201):**
```json
{
  "id": 55,
  "name": "Jane Doe",
  "message": "Lead created successfully."
}
```

**Error — Missing required fields (400):**
```json
{
  "error": "Name and phone are required."
}
```

---

#### PATCH `/boe-leads/{id}/update/`

BOE updates a lead they created.

**Request body (all fields optional):**
```json
{
  "name": "Jane Doe Updated",
  "phone_number": "9876543211",
  "location": "Chennai",
  "notes": "Updated notes",
  "call_notes": "Follow-up scheduled",
  "status": "in_progress"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Updated contact name |
| `phone_number` | string | No | Updated phone number |
| `location` | string | No | Updated location |
| `notes` | string | No | Updated notes |
| `call_notes` | string | No | Updated call notes |
| `status` | string | No | Updated status |

**Behavior:**
- Only the BOE user who created the lead (`created_by = current user`) can update it

**Response (200):**
```json
{
  "id": 55,
  "message": "Lead updated."
}
```

**Error — Not found (404):**
```json
{
  "error": "Lead not found."
}
```

---

#### DELETE `/boe-leads/{id}/delete/`

BOE deletes a lead they created.

**Behavior:**
- Only the BOE user who created the lead (`created_by = current user`) can delete it

**Response (204):** No content on success.

**Error — Not found (404):**
```json
{
  "error": "Lead not found."
}
```

---

#### POST `/boe-leads/{id}/assign-cre/`

BOE or Admin assigns a lead to a CRE team member.

**Request body:**
```json
{
  "assigned_to_cre": 15,
  "call_notes": "Client ready for proposal discussion"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assigned_to_cre` | int | Yes | User ID of the CRE team member |
| `call_notes` | string | No | Additional notes to attach before assignment |

**Behavior:**
- Admin users can assign any lead regardless of creator
- BOE users can only assign leads they created (`created_by = current user`)
- Sets `status` to `assigned_cre` and `assigned_to_cre` to the specified user
- If `call_notes` is provided, updates the lead's call notes

**Response (200):**
```json
{
  "id": 55,
  "message": "Lead assigned to Jane Smith."
}
```

**Error — Not found (404):**
```json
{
  "error": "Lead not found."
}
```

**Error — Missing CRE user (400):**
```json
{
  "error": "assigned_to_cre is required."
}
```

**Error — Invalid CRE user (400):**
```json
{
  "error": "CRE user not found."
}
```

---

### BOE Leads Export / Import

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/boe-leads/export/` | Export BOE leads to Excel | BOE (own leads), Admin (all) |
| GET | `/boe-leads/template/` | Download blank Excel import template | Authenticated |
| POST | `/boe-leads/import/` | Bulk import BOE leads from Excel | BOE, Admin |

#### GET `/boe-leads/export/`

Exports BOE leads to an `.xlsx` file.

**Data Scoping:**
- **Admin with company**: Exports all leads within their company
- **Admin without company**: Exports all leads across all companies
- **BOE user**: Exports only leads they created

**Response:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` file download (`boe_leads.xlsx`).

**Columns exported:**

| Column | Description |
|--------|-------------|
| Name | Contact person name |
| Phone Number | Phone number (formatted as text to preserve leading zeros) |
| Location | City / Area |
| Notes | General notes |
| Call Notes | Notes from BOE outreach |
| Status | Lead status |
| Created By | Full name of the BOE employee who created the lead |
| Assigned to CRE | Full name of the assigned CRE user (blank if unassigned) |
| Date | Creation date (`YYYY-MM-DD`) |

---

#### GET `/boe-leads/template/`

Downloads a blank `.xlsx` template for bulk import. Includes a sample row to illustrate the expected format.

**Response:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` file download (`boe_leads_template.xlsx`).

**Template columns:**

| Column | Required | Description |
|--------|----------|-------------|
| Name * | Yes | Contact person name |
| Phone Number * | Yes | Phone number (text-formatted) |
| Location | No | City / Area |
| Notes | No | General notes |
| Call Notes | No | Notes from outreach |

---

#### POST `/boe-leads/import/`

Bulk imports BOE leads from an Excel file.

**Request:** `multipart/form-data` with a `file` field (`.xlsx`).

**Column mapping (by position):**

| Column Index | Field | Required |
|-------------|-------|----------|
| 1 | `name` | Yes |
| 2 | `phone_number` | Yes |
| 3 | `location` | No |
| 4 | `notes` | No |
| 5 | `call_notes` | No |

**Behavior:**
- Rows where both `name` and `phone_number` are present are created as `BOELead` records
- `created_by` is set to the authenticated user
- `company` is set to the authenticated user's company; falls back to the company with code `ASE` if the user has no company assigned
- Phone numbers ending in `.0` (Excel numeric artifact) are automatically cleaned
- Rows missing `name` or `phone_number` are skipped and counted in `skipped`
- Up to 10 row-level error messages are returned in the `errors` array

**Response (200):**
```json
{
  "message": "15 leads imported successfully.",
  "created": 15,
  "skipped": 2,
  "errors": [
    "Row 3: Name and phone are required",
    "Row 7: Name and phone are required"
  ]
}
```

**Error — No file provided (400):**
```json
{
  "error": "No file provided."
}
```

**Error — Invalid file (400):**
```json
{
  "error": "Failed to process file: <detail>"
}
```

---

### BOE Leads Bulk Operations & Utilities

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/boe-leads/bulk-delete/` | Bulk delete BOE leads | Admin, Manager, Team Lead |
| POST | `/boe-leads/bulk-assign/` | Bulk assign BOE leads to CRE | Admin, Manager, Team Lead, Employee (own leads only) |
| GET | `/boe-leads/creators/` | List distinct BOE lead creators (for filter dropdown) | Authenticated |

#### POST `/boe-leads/bulk-delete/`

Bulk delete BOE leads — either by specific IDs or by filter criteria (select all).

**Request body (by IDs):**
```json
{
  "ids": [1, 2, 3, 5]
}
```

**Request body (select all with filters):**
```json
{
  "select_all": true,
  "search": "Mumbai",
  "status": "interested"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ids` | array of int | Required if `select_all` is false/omitted | List of BOE lead IDs to delete |
| `select_all` | boolean | No | If `true`, delete all leads matching the filter criteria below |
| `search` | string | No | Search across name, phone_number, location (only used with `select_all`) |
| `status` | string | No | Filter by status, e.g. `interested`, `assigned_cre`. Use `all` or omit to match all statuses (only used with `select_all`) |

**Behavior:**
- Only users with `admin`, `manager`, or `team_lead` role can perform this action
- When `select_all` is `true`, leads are filtered by the authenticated user's company (admin without company sees all)
- When `select_all` is `false` or omitted, leads are deleted by the provided `ids` list

**Response (200):**
```json
{
  "message": "5 records deleted.",
  "deleted": 5
}
```

**Error — No records selected (400):**
```json
{
  "error": "No records selected."
}
```

**Error — Permission denied (403):**
```json
{
  "error": "Permission denied."
}
```

---

#### POST `/boe-leads/bulk-assign/`

Bulk assign BOE leads to a CRE team member — either by specific IDs or by filter criteria (select all). Sets the lead status to `assigned_cre`.

**Request body (by IDs):**
```json
{
  "ids": [1, 2, 3, 5],
  "assigned_to_cre": 15
}
```

**Request body (select all with filters):**
```json
{
  "select_all": true,
  "search": "Mumbai",
  "status": "interested",
  "assigned_to_cre": 15
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assigned_to_cre` | int | Yes | User ID of the CRE team member to assign |
| `ids` | array of int | Required if `select_all` is false/omitted | List of BOE lead IDs to assign |
| `select_all` | boolean | No | If `true`, assign all leads matching the filter criteria below |
| `search` | string | No | Search across name, phone_number, location (only used with `select_all`) |
| `status` | string | No | Filter by status, e.g. `interested`. Use `all` or omit to match all statuses (only used with `select_all`) |

**Behavior:**
- Users with `admin`, `manager`, or `team_lead` role can assign any leads within their company scope
- Users with `employee` role can only assign leads they created (`created_by = current user`)
- When `select_all` is `true`:
  - Admin/Manager/Team Lead: leads are filtered by the authenticated user's company (admin without company sees all)
  - Employee: leads are filtered to only those created by the current user
- When using `ids`: Employee users can only assign leads they created; other leads in the list are silently skipped
- Sets `status` to `assigned_cre` and `assigned_to_cre` to the specified CRE user for all matched leads

**Response (200):**
```json
{
  "message": "5 records assigned.",
  "updated": 5
}
```

**Error — Missing CRE user (400):**
```json
{
  "error": "assigned_to_cre is required."
}
```

**Error — Invalid CRE user (400):**
```json
{
  "error": "CRE user not found."
}
```

**Error — No records selected (400):**
```json
{
  "error": "No records selected."
}
```

**Error — Permission denied (403):**
```json
{
  "error": "Permission denied."
}
```

---

#### GET `/boe-leads/creators/`

Returns a list of distinct users who have created BOE leads. Used to populate the "Employee" filter dropdown in the BOE Leads table.

**Data Scoping:**
- **Admin / Manager / Team Lead**: Returns all users who have created BOE leads
- **Regular BOE user**: Returns only the current user (since they can only see their own leads)

**Response (200):**
```json
[
  {
    "id": 5,
    "first_name": "John",
    "last_name": "Doe",
    "name": "John Doe"
  },
  {
    "id": 8,
    "first_name": "Jane",
    "last_name": "Smith",
    "name": "Jane Smith"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | User ID (use as `created_by` filter value in `/boe-leads/`) |
| `first_name` | string | User's first name |
| `last_name` | string | User's last name |
| `name` | string | Display name (combined first + last, falls back to username) |

---

### CRE Actions

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/{id}/send-proposal/` | Send a proposal | CRE, Lead, Admin |
| POST | `/{id}/schedule-meeting/` | Schedule a meeting | CRE, Lead, Admin |
| POST | `/{id}/update-stage/` | Update deal stage | CRE, Lead, Admin |

### CRE Leads

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/cre-leads/` | List leads assigned to CRE | CRE (own leads), Team Lead (all), Admin (all) |
| POST | `/cre-leads/create/` | Create a new lead manually | CRE, Admin |
| PATCH | `/cre-leads/{id}/edit/` | Edit a lead assigned to CRE | CRE (assigned only), Admin |
| DELETE | `/cre-leads/{id}/delete/` | Delete a lead assigned to CRE | CRE (assigned only), Admin |
| PATCH | `/cre-leads/{id}/update-status/` | Update lead status and notes | CRE (assigned only), Admin |
| POST | `/cre-leads/{id}/convert-to-task/` | Convert a lead into a follow-up task | CRE (assigned only), Admin |

#### GET `/cre-leads/`

Returns paginated leads assigned to the current CRE user. Admin and team_lead users see all CRE-assigned leads within their company (or all companies if no company is set).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search across name, phone_number, location |
| `status` | string | Filter by lead status. Use `all` or omit to show all |
| `date_from` | string (YYYY-MM-DD) | Filter leads created on or after this date |
| `date_to` | string (YYYY-MM-DD) | Filter leads created on or before this date |
| `page` | int | Page number (default: 1) |
| `page_size` | int | Results per page (default: 50) |

**Response (200):**
```json
{
  "results": [
    {
      "id": 1,
      "name": "John Doe",
      "phone_number": "9876543210",
      "location": "Mumbai",
      "notes": "Interested in services",
      "call_notes": "Ready for proposal",
      "status": "assigned_cre",
      "created_by_name": "BOE User",
      "assigned_to_cre_name": "CRE User",
      "created_at": "2026-05-11T10:00:00Z"
    }
  ],
  "count": 25,
  "page": 1,
  "total_pages": 1,
  "stats": {
    "total": 25,
    "cold": 10,
    "warm": 6,
    "hot": 4,
    "completed": 3,
    "rejected": 2,
    "today_assigned": 3,
    "this_week": 12,
    "this_month": 20
  }
}
```

| Stats Field | Description |
|-------------|-------------|
| `total` | Total leads assigned to CRE (scoped by role) |
| `cold` | Leads with status `cold` |
| `warm` | Leads with status `warm` |
| `hot` | Leads with status `hot` |
| `completed` | Leads with status `completed` |
| `rejected` | Leads with status `rejected` |
| `today_assigned` | Leads assigned today |
| `this_week` | Leads assigned this week (Mon–today) |
| `this_month` | Leads assigned this month |

---

#### POST `/cre-leads/create/`

CRE creates a new lead manually. The lead is automatically assigned to the CRE user who creates it.

**Request body:**
```json
{
  "name": "John Doe",
  "phone_number": "9876543210",
  "location": "Mumbai",
  "notes": "Interested in web development services"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Contact person name |
| `phone_number` | string | Yes | Phone number |
| `location` | string | No | City / Area |
| `notes` | string | No | Additional notes |

**Behavior:**
- `status` is set to `assigned_cre`
- `assigned_to_cre` is set to the authenticated CRE user
- `created_by` is set to the authenticated user
- `company` is set to the authenticated user's company

**Response (201):**
```json
{
  "id": 42,
  "name": "John Doe",
  "message": "Lead created successfully."
}
```

**Error — Missing required fields (400):**
```json
{
  "error": "Name and phone number are required."
}
```

---

#### PATCH `/cre-leads/{id}/edit/`

CRE edits a lead assigned to them. Admin can edit any lead.

**Request body (all fields optional):**
```json
{
  "name": "John Doe Updated",
  "phone_number": "9876543211",
  "location": "Chennai",
  "notes": "Updated notes",
  "call_notes": "Follow-up scheduled",
  "status": "in_progress"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Updated contact name |
| `phone_number` | string | No | Updated phone number |
| `location` | string | No | Updated location |
| `notes` | string | No | Updated notes |
| `call_notes` | string | No | Updated call/meeting notes |
| `status` | string | No | Updated lead status |

**Behavior:**
- CRE users can only edit leads assigned to them (`assigned_to_cre = current user`)
- Admin users can edit any lead regardless of assignment

**Response (200):**
```json
{
  "id": 42,
  "message": "Lead updated."
}
```

**Error — Not found or not assigned (404):**
```json
{
  "error": "Lead not found."
}
```

---

#### DELETE `/cre-leads/{id}/delete/`

CRE deletes a lead assigned to them. Admin can delete any lead.

**Behavior:**
- CRE users can only delete leads assigned to them (`assigned_to_cre = current user`)
- Admin users can delete any lead regardless of assignment

**Response (204):** No content on success.

**Error — Not found or not assigned (404):**
```json
{
  "error": "Lead not found."
}
```

---

#### PATCH `/cre-leads/{id}/update-status/`

CRE updates the status and/or notes of a lead assigned to them. Admin can update any CRE-assigned lead.

**Request body (all fields optional):**
```json
{
  "status": "in_progress",
  "call_notes": "Proposal discussion scheduled for next week"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Updated lead status: `cold`, `warm`, `hot`, `completed`, `rejected` |
| `call_notes` | string | No | Updated call/meeting notes |

**Behavior:**
- CRE users can only update leads assigned to them (`assigned_to_cre = current user`)
- Admin users can update any lead regardless of assignment

**Response (200):**
```json
{
  "id": 42,
  "status": "in_progress",
  "message": "Lead updated."
}
```

**Error — Not found or not assigned (404):**
```json
{
  "error": "Lead not found."
}
```

**Frontend Integration (CRE Dashboard):**

The CRE Dashboard provides a full lead management interface with the following controls:

| Control | Maps to | Options |
|---------|---------|---------|
| Search input | `search` | Free text — searches name, phone, location |
| Status dropdown | `status` | All Status · Cold (`cold`) · Warm (`warm`) · Hot (`hot`) · Completed (`completed`) · Rejected (`rejected`) |
| Date range dropdown | `date_from` + `date_to` | All Time · Today · This Week · This Month · Custom |
| Custom date pickers | `date_from` / `date_to` | Shown only when "Custom" is selected |

**CRE Dashboard Features:**
- **Stats cards**: Total leads, Cold, Warm, Hot, Completed, Rejected, This Month (from `stats` in `/cre-leads/` response)
- **Lead list**: Paginated list with click-to-call, view detail, and update status actions
- **Add Lead**: CRE can create new leads manually via `POST /cre-leads/create/` with name, phone_number, location, and notes
- **Edit Lead**: CRE can edit leads assigned to them via `PATCH /cre-leads/{id}/edit/`
- **Delete Lead**: CRE can delete leads assigned to them via `DELETE /cre-leads/{id}/delete/`
- **View Detail modal**: Shows full lead info (name, phone, location, status, dates, notes, call notes, assigned by)
- **Inline Status Dropdown**: Each lead row has an inline `<select>` dropdown allowing CRE to change the lead's engagement level directly (options: Cold, Warm, Hot, Completed, Rejected) via `PATCH /cre-leads/{id}/update-status/`. No separate modal is needed for status changes.
- **Convert to Task**: CRE can convert a lead into a follow-up task via a dedicated modal. The modal displays the lead's name and phone for context, and collects:
  - **Task Title** (required): Free text input
  - **Type**: Dropdown — `call`, `meeting`, `email`, `followup`, `proposal`, `other`
  - **Priority**: Dropdown — `low`, `medium`, `high`, `urgent`
  - **Due Date** (required): Date-time picker (`datetime-local` input)
  - **Description**: Multi-line textarea (optional)
  
  Submits via `POST /cre-leads/{id}/convert-to-task/`
- **My Tasks section**: Displays the CRE user's assigned tasks inline on the dashboard with filtering support (uses `GET /ase-leads/tasks/my-tasks/`)
- **Auto-polling**: Silently refreshes data every 5 seconds

---

#### POST `/cre-leads/{id}/convert-to-task/`

CRE converts a lead into a follow-up task (e.g., scheduled call or meeting). Admin can convert any lead.

**Request body:**
```json
{
  "title": "Follow up with John Doe",
  "task_type": "call",
  "priority": "medium",
  "due_date": "2026-05-20",
  "description": "Discuss proposal details"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | No | Task title (defaults to "Follow up with {lead name}") |
| `task_type` | string | No | Type of task: `call`, `meeting`, `email`, `followup`, `proposal`, `other` (default: `call`) |
| `priority` | string | No | Priority level: `low`, `medium`, `high`, `urgent` (default: `medium`) |
| `due_date` | string (ISO 8601) | Yes | When the task is due (e.g. `2026-05-20` or `2026-05-20T14:30`) |
| `description` | string | No | Task description (defaults to lead's phone, location, and notes) |

**Behavior:**
- CRE users can only convert leads assigned to them (`assigned_to_cre = current user`)
- Admin users can convert any lead regardless of assignment
- Creates an `ASELeadTask` record assigned to the current user, with the `lead` field linked to the source lead
- The task `status` is set to `pending`
- Note: The `lead` field on `ASELeadTask` is optional — tasks created via `POST /tasks/` do not require a lead association

**Response (201):**
```json
{
  "id": 12,
  "title": "Follow up with John Doe",
  "message": "Task created from lead successfully."
}
```

**Error — Lead not found or not assigned (404):**
```json
{
  "error": "Lead not found."
}
```

**Error — Missing due_date (400):**
```json
{
  "error": "due_date is required."
}
```

---

### BRE Dashboard Stats

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/bre-stats/` | Get BRE research data statistics | BRE, Lead, Manager, Admin |

#### GET `/bre-stats/`

Returns aggregate statistics for BRE research data.

**Data Scoping:**
- **Admin without company**: Sees all records across all companies
- **Admin / Manager with company**: Sees all records within their company
- **Employees (BRE/BOE/etc.)**: Sees only records they personally created

**Response (200):**
```json
{
  "total": 150,
  "new_count": 80,
  "assigned_count": 60,
  "converted_count": 10,
  "today_added": 5,
  "this_week_added": 25,
  "this_week_assigned": 12,
  "this_month_added": 60,
  "this_month_assigned": 35
}
```

| Field | Description |
|-------|-------------|
| `total` | Total BRE research records (all companies for admin without company, company-scoped for admin/manager with company, own records for employees) |
| `new_count` | Records with status `new` (unassigned) |
| `assigned_count` | Records with status `assigned` |
| `converted_count` | Records with status `converted` (positive leads assigned to CRE) |
| `today_added` | Records created today |
| `this_week_added` | Records created this week (Mon–today) |
| `this_week_assigned` | Records assigned this week |
| `this_month_added` | Records created this month |
| `this_month_assigned` | Records assigned this month |

---

### BRE Research Data

A dedicated table (`BREResearchData`) for BRE employees to upload and manage research data independently from the main ASELead pipeline.

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/bre-research/` | List BRE research data (paginated) | Authenticated |
| POST | `/add-lead/` | Add a single research entry | BRE, Lead, Admin |
| PATCH | `/bre-research/{id}/` | Update a research entry | Creator/Admin |
| DELETE | `/bre-research/{id}/delete/` | Delete a research entry | See permissions below |
| POST | `/bre-research/bulk-assign/` | Bulk assign records to a BOE member | BRE, Lead, Admin |
| POST | `/bre-research/bulk-delete/` | Bulk delete multiple records | BRE, Lead, Admin |
| POST | `/bre-research/auto-assign/` | Auto-assign unassigned records equally to BOE members (round-robin) | Authenticated |
| POST | `/bulk-upload/` | Bulk upload research data from Excel/CSV | BRE, Lead, Admin |
| GET | `/bulk-upload/template/` | Download Excel template for bulk upload | Authenticated |

#### Model: `BREResearchData`

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Primary key |
| `name` | string | Contact person name (required) |
| `phone_number` | string | Phone number (required, unique per company) |
| `location` | string | City / Area / Location (optional) |
| `notes` | text | Additional notes (optional) |
| `status` | string | Record status: `new`, `assigned`, or `converted` |
| `call_status` | string | BOE call outcome: `pending`, `no_answer`, `callback`, `not_interested`, `interested` |
| `call_notes` | text | Notes from BOE call (optional) |
| `created_by` | FK → User | BRE employee who added this data |
| `assigned_to` | FK → User | BOE employee assigned to this data (nullable) |
| `assigned_to_cre` | FK → User | CRE employee assigned after a positive call (nullable) |
| `company` | FK → Company | Company this data belongs to |
| `created_at` | datetime | Auto-set on creation |
| `updated_at` | datetime | Auto-set on update |

**Status Values:**

| Status | Description |
|--------|-------------|
| `new` | Unassigned — freshly uploaded by BRE |
| `assigned` | Assigned to a BOE team member for outreach |
| `converted` | Positive lead — converted and optionally assigned to CRE |

**Call Status Values (set by BOE):**

| Call Status | Description |
|-------------|-------------|
| `pending` | Not yet called (default) |
| `called` | Called but no definitive outcome |
| `positive` | Interested — potential conversion to lead |
| `negative` | Not interested |
| `no_answer` | Call not answered |
| `callback` | Requested a call back later |

**Constraints:**
- `phone_number` + `company` must be unique (no duplicate phones within a company)

**Computed properties (read-only):**
- `created_by_name`: Full name of the creator
- `assigned_to_name`: Full name of the assigned BOE user

#### GET `/bre-research/`

Returns paginated BRE research data. Admin users without a company assignment see all records across all companies; admins and managers with a company see all records from their company; other users see only their company's records.

**Default Ordering:** Results are explicitly sorted so that `status='new'` records always appear first, followed by all other statuses. Within each group, records are ordered by `-created_at` (newest first).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search across name, phone_number, location |
| `status` | string | Filter by status (e.g. `new`, `assigned`). Use `all` or omit to show all statuses |
| `assigned_to` | int | Filter by assigned employee (user ID). Combine with `status=assigned` to see leads assigned to a specific BOE member |
| `created_by` | int | Filter by the employee who uploaded/created the data (user ID) |
| `date_from` | string (YYYY-MM-DD) | Filter entries created on or after this date |
| `date_to` | string (YYYY-MM-DD) | Filter entries created on or before this date |
| `page` | int | Page number (default: 1, page size: 50) |

**Frontend Status Filter:**

The BRE Dashboard status dropdown combines `status` and `assigned_to` filters into a single control:

| Dropdown Option | API Parameters Sent |
|-----------------|---------------------|
| All Status | (no status/assigned_to filter) |
| New | `status=new` |
| Assigned (All) | `status=assigned` |
| Assigned → {BOE Name} | `status=assigned&assigned_to={user_id}` |
| Converted | `status=converted` |

The per-BOE-member options are dynamically populated from the `/boe-users/` endpoint, allowing BRE users to quickly see which leads have been assigned to a specific BOE team member.

**Response (200):**
```json
{
  "count": 150,
  "results": [
    {
      "id": 1,
      "name": "John Doe",
      "phone_number": "9876543210",
      "location": "Mumbai",
      "notes": "Interested in services",
      "status": "new",
      "call_status": "pending",
      "call_notes": "",
      "created_by_name": "BRE User",
      "assigned_to_name": "BRE User",
      "created_at": "2026-05-08T10:00:00Z"
    }
  ]
}
```

#### DELETE `/bre-research/{id}/delete/`

Delete a single BRE research record. Permission is tiered by role:

| Role | Access |
|------|--------|
| Superuser | Can delete any record (no company restriction) |
| Admin | Can delete any record within their company |
| Employee (BRE, BOE, etc.) | Can only delete records they created (`created_by = current user`) within their company |

**Response (204):** No content on success.

**Error — Not found or no permission (404):**
```json
{
  "error": "Not found or you do not have permission."
}
```

---

#### POST `/bre-research/bulk-assign/`

Bulk assign multiple BRE research records to a BOE team member — either by specific IDs or by filter criteria (select all).

**Request body (by IDs):**
```json
{
  "ids": [1, 2, 3, 5],
  "assigned_to": 12
}
```

**Request body (select all with filters):**
```json
{
  "select_all": true,
  "assigned_to": 12,
  "search": "Mumbai",
  "status": "new",
  "date_from": "2026-05-01",
  "date_to": "2026-05-08",
  "limit": 50
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ids` | array of int | Required if `select_all` is false/omitted | List of record IDs to assign |
| `select_all` | boolean | No | If `true`, assign all records matching the filter criteria below |
| `assigned_to` | int | Required | User ID of the BOE team member to assign to |
| `search` | string | No | Search across name, phone_number, location (only used with `select_all`) |
| `status` | string | No | Filter by status, e.g. `new`, `assigned` (only used with `select_all`) |
| `assigned_to_filter` | string (user ID) | No | Filter by currently assigned employee (only used with `select_all`) |
| `date_from` | string (YYYY-MM-DD) | No | Filter entries created on or after this date (only used with `select_all`) |
| `date_to` | string (YYYY-MM-DD) | No | Filter entries created on or before this date (only used with `select_all`) |
| `limit` | int | No | Maximum number of records to assign (only used with `select_all`). If omitted, all matching records are assigned. |

**Behavior:**
- Only records belonging to the authenticated user's company are updated
- When `select_all` is `true`, the same filter logic as `GET /bre-research/` is applied to determine which records to assign
- When `limit` is provided with `select_all`, only the first N matching records are assigned (useful for distributing work in batches)
- When `select_all` is `false` or omitted, records are assigned by the provided `ids` list
- Records that don't exist or belong to a different company are silently skipped

**Response (200):**
```json
{
  "message": "3 records assigned to Jane Smith",
  "updated": 3
}
```

**Error — Missing fields (400):**
```json
{
  "error": "ids is required (list of record IDs)."
}
```

**Error — Invalid user (400):**
```json
{
  "error": "Assigned user not found."
}
```

#### POST `/bre-research/bulk-delete/`

Bulk delete BRE research records — either by specific IDs or by filter criteria (select all).

**Request body (by IDs):**
```json
{
  "ids": [1, 2, 3, 5]
}
```

**Request body (select all with filters):**
```json
{
  "select_all": true,
  "search": "Mumbai",
  "status": "new",
  "assigned_to": "12",
  "date_from": "2026-05-01",
  "date_to": "2026-05-08"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ids` | array of int | Required if `select_all` is false/omitted | List of record IDs to delete |
| `select_all` | boolean | No | If `true`, delete all records matching the filter criteria below |
| `search` | string | No | Search across name, phone_number, location (only used with `select_all`) |
| `status` | string | No | Filter by status, e.g. `new`, `assigned` (only used with `select_all`) |
| `assigned_to` | string (user ID) | No | Filter by assigned employee (only used with `select_all`) |
| `date_from` | string (YYYY-MM-DD) | No | Filter entries created on or after this date (only used with `select_all`) |
| `date_to` | string (YYYY-MM-DD) | No | Filter entries created on or before this date (only used with `select_all`) |

**Behavior:**
- Only records belonging to the authenticated user's company are deleted
- When `select_all` is `true`, the same filter logic as `GET /bre-research/` is applied to determine which records to delete
- When `select_all` is `false` or omitted, records are deleted by the provided `ids` list
- Records that don't exist or belong to a different company are silently skipped

**Response (200):**
```json
{
  "message": "3 records deleted successfully.",
  "deleted": 3
}
```

**Error — Missing fields (400):**
```json
{
  "error": "ids is required (list of record IDs)."
}
```

---

#### POST `/bre-research/auto-assign/`

Auto-assign all unassigned (`status='new'`) BRE research records equally to BOE team members using round-robin distribution.

**Request body:**
```json
{
  "boe_user_ids": [12, 15, 18],
  "limit": 100
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `boe_user_ids` | array of int | No | Specific BOE user IDs to distribute to. If empty or omitted, distributes to all active BOE team members in the company. |
| `limit` | int | No | Maximum number of records to assign. If omitted, all unassigned records are distributed. |
| `company` | int | No | Company ID (only needed if the authenticated user has no company assigned). |

**Behavior:**
- Fetches all records with `status='new'` in the user's company, ordered by `created_at`
- If `boe_user_ids` is provided, distributes only to those specific users
- If `boe_user_ids` is empty/omitted, finds all active users in BOE teams (`marketing_category='boe'`) within the company
- Distributes records in round-robin fashion (record 1 → user A, record 2 → user B, record 3 → user C, record 4 → user A, etc.)
- Sets `status` to `assigned` and `assigned_to` to the target BOE user for each record
- If `limit` is provided, only the first N unassigned records are distributed

**Response (200):**
```json
{
  "message": "150 records auto-assigned to 3 BOE employees.",
  "total_assigned": 150,
  "distribution": [
    "John Doe: 50",
    "Jane Smith: 50",
    "Bob Wilson: 50"
  ]
}
```

**Error — No BOE employees found (400):**
```json
{
  "error": "No BOE employees found to assign to."
}
```

**Error — No unassigned records (400):**
```json
{
  "error": "No unassigned records to distribute."
}
```

**Error — Company required (400):**
```json
{
  "error": "Company is required."
}
```

**Frontend Integration (BRE Dashboard — Auto Assign Modal):**

The BRE Dashboard includes an "⚡ Auto Assign to BOE" button that opens a modal dialog with the following controls:

| Control | Description |
|---------|-------------|
| BOE Employee checkboxes | Multi-select list of BOE team members (fetched from `/boe-users/`). Includes a "Select All" toggle at the top. |
| Amount input | Optional numeric field to limit how many unassigned records to distribute. If left empty, all unassigned records are assigned. |
| Distribution preview | Real-time text showing estimated per-employee distribution (total ÷ selected employees, rounded up). |

**Workflow:**
1. User clicks "⚡ Auto Assign" button in the BRE Dashboard header
2. Modal loads BOE team members from `/boe-users/` endpoint
3. User selects one or more BOE employees (or uses "Select All")
4. User optionally enters a limit for the number of records to assign
5. User clicks "Auto Assign" to submit
6. Frontend calls `POST /bre-research/auto-assign/` with `boe_user_ids` (selected user IDs) and `limit` (if provided)
7. On success, the research data table refreshes to reflect new assignments

---

### Lead Creation & Bulk Upload

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/add-lead/` | Add a single lead (name, phone, location) | All marketing |
| POST | `/bulk-upload/` | Bulk upload leads from Excel/CSV | All marketing |
| GET | `/bulk-upload/template/` | Download Excel template for bulk upload | Authenticated |

#### POST `/add-lead/`

Add a single lead with minimal fields. The lead is automatically assigned to the creator and `company_name` is set to "ASE Technologies".

**Request body:**
```json
{
  "name": "John Doe",
  "phone": "9876543210",
  "location": "Mumbai",
  "notes": "Interested in web development services"
}
```

- `name` (required): Contact person name
- `phone` (required): Phone number (checked for duplicates within company)
- `location` (optional): Location/city
- `notes` (optional): Additional notes about the lead
- `company` (required for admin users without a company): Company ID to scope the lead to

**Behavior:**
- The lead is auto-assigned to the creating user (`assigned_to = request.user`)
- The `location` and `notes` fields are combined into the lead's `notes` field (format: `Location: {location}\n{notes}`)
- Duplicate phone numbers are rejected with an error showing who originally created the lead
- **Company resolution:** The lead's company is determined by the authenticated user's assigned company. If the user has no company (e.g., a global admin), the `company` parameter (from request body or query params) is required. If neither is available, a `400` error is returned.

**Response (201):**
```json
{
  "id": 42,
  "name": "John Doe",
  "phone": "9876543210",
  "location": "Mumbai",
  "created_by": "John Doe",
  "assigned_to": "John Doe",
  "status": "new",
  "message": "Lead added successfully"
}
```

**Error — Duplicate phone (400):**
```json
{
  "error": "The number 9876543210 is already created by \"Jane Smith\""
}
```

**Error — Company not found (400):**
```json
{
  "error": "Company not found."
}
```

**Error — Company required for admin (400):**
```json
{
  "error": "Company is required for admin users."
}
```

#### POST `/bulk-upload/`

Upload an Excel (.xlsx/.xls) or CSV file to create multiple leads at once.

**Request:** `multipart/form-data` with a `file` field.

**Expected columns:** `name`, `phone`, `location` (column name matching is flexible — see below).

Recognized column names:
- Name: `name`, `contact_person`, `company_name`, `contact name`
- Phone: `phone`, `phone_number`, `phone number`, `mobile`, `contact number`
- Location: `location`, `city`, `address`, `area`

**Response (201):**
```json
{
  "message": "Upload complete. 15 leads created.",
  "created": 15,
  "duplicates": 3,
  "errors": ["Row 5: Missing name or phone"],
  "total_rows": 20
}
```

#### GET `/bulk-upload/template/`

Downloads an `.xlsx` export file containing existing BRE research data (columns: name, phone, location). The phone column is pre-formatted as text to preserve leading zeros.

**Data Scoping:**
- **Admin without company**: Sees all records across all companies
- **Admin with company**: Sees all records from their company
- **Employees (BRE/BOE/etc.)**: Sees only records they personally created (`created_by = current user`)

### Lead Assignment

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/{id}/assign-to-boe/` | Assign lead to BOE member | BRE, Lead, Admin |
| POST | `/{id}/assign-to-cre/` | Assign lead to CRE member | BOE, Lead, Admin |

### Team Member Lists

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/boe-users/` | List BOE team members (for assignment dropdowns) | All marketing |
| GET | `/boe-leads/creators/` | List users who created BOE leads (for filter dropdowns) | Authenticated |
| GET | `/bre-users/` | List BRE team members who have created research data (for filter dropdowns) | Authenticated |
| GET | `/cre-users/` | List CRE team members (for assignment dropdowns) | All marketing |

#### GET `/bre-users/`

Returns all users who have created BRE research data. Used in filter dropdowns to allow filtering research records by creator.

**Response (200):**
```json
[
  { "id": 1, "first_name": "John", "last_name": "Doe", "email": "john@example.com", "username": "john_employee_01", "name": "John Doe" }
]
```

Each object includes a computed `name` field (`first_name + last_name`, falling back to `username` if both are empty) for frontend display convenience.

#### GET `/boe-users/`

Returns all active BOE team members. Used in assignment dropdowns.

**Response (200):**
```json
[
  { "id": 1, "first_name": "John", "last_name": "Doe", "email": "john@example.com", "username": "john_employee_01", "name": "John Doe" }
]
```

Each object includes a computed `name` field (`first_name + last_name`, falling back to `username` if both are empty) for frontend display convenience. Results are scoped to the authenticated user's company (admin sees all).

#### GET `/boe-leads/creators/`

Returns distinct users who have created BOE leads. Used in filter dropdowns (e.g., the "Employee" filter on the BOE Leads table) to allow filtering leads by creator.

**Data Scoping:**
- **Admin / Manager / Team Lead**: Returns all users who have created BOE leads
- **Other roles (BOE)**: Returns only the authenticated user (since they can only see their own leads)

**Response (200):**
```json
[
  { "id": 5, "first_name": "John", "last_name": "Doe", "name": "John Doe" },
  { "id": 8, "first_name": "Jane", "last_name": "Smith", "name": "Jane Smith" }
]
```

Each object includes a computed `name` field (`first_name + last_name`, falling back to `username` if both are empty) for frontend display convenience.

#### GET `/cre-users/`

Returns all active CRE team members. Used in the BOE "Convert to Lead" flow to populate the CRE assignment dropdown.

**Response (200):**
```json
[
  { "id": 15, "first_name": "Jane", "last_name": "Smith", "email": "jane@example.com", "username": "jane_employee_01", "name": "Jane Smith" }
]
```

Each object includes a computed `name` field (`first_name + last_name`, falling back to `username` if both are empty) for frontend display convenience. Returns users from the active CRE team (`marketing_category='cre'`).

### Activities

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/{id}/activities/` | List lead activities | All marketing |
| POST | `/{id}/activities/create/` | Create activity | All marketing |
| PATCH | `/activities/{id}/update/` | Update activity | Creator/Admin |
| DELETE | `/activities/{id}/delete/` | Delete activity | Creator/Admin |
| GET | `/{id}/timeline/` | Get activity timeline | All marketing |

### Tasks

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/tasks/my-tasks/` | Get tasks (role-scoped) | All marketing |
| POST | `/tasks/` | Create a task | All marketing |
| PATCH | `/tasks/{id}/` | Update a task (including reject/cancel) | Creator/Assignee/Admin |
| POST | `/tasks/{id}/complete/` | Complete a task | Assignee/Admin |
| DELETE | `/tasks/{id}/` | Delete a task | Creator/Assignee/Admin/Manager/Team Lead |
| GET | `/tasks/overdue/` | Get overdue tasks | All marketing |

#### GET `/tasks/my-tasks/`

Returns tasks scoped by the authenticated user's role:

- **Admin / Manager / Team Lead**: Sees all tasks across the team
- **Other roles (BRE, BOE, CRE)**: Sees only tasks assigned to them

> **Note:** The `lead` field on `ASELeadTask` is optional (nullable). Tasks can be created as standalone items without being associated with a specific lead. When created via `/cre-leads/{id}/convert-to-task/`, the lead is automatically linked.

#### POST `/tasks/`

Creates a new task.

**Request body:**
```json
{
  "title": "Follow up with client",
  "task_type": "call",
  "priority": "high",
  "due_date": "2026-05-15T10:00:00Z",
  "description": "Discuss proposal details",
  "lead_id": 42,
  "assigned_to": 15
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Brief title of the task |
| `task_type` | string | Yes | One of: `call`, `email`, `meeting`, `research`, `proposal`, `followup`, `other` |
| `due_date` | string (ISO datetime) | Yes | When this task is due |
| `priority` | string | No | One of: `low`, `medium`, `high`, `urgent` (default: `medium`) |
| `description` | string | No | Detailed description |
| `lead_id` | int | No | ID of the lead this task is associated with. If omitted, a standalone task is created |
| `assigned_to` | int | No | User ID of the person assigned to this task. Defaults to the current user if not provided |

**Response (201):**
```json
{
  "id": 10,
  "title": "Follow up with client",
  "task_type": "call",
  "priority": "high",
  "status": "pending",
  "due_date": "2026-05-15T10:00:00Z",
  "assigned_to": 15,
  "created_by": 5,
  "created_at": "2026-05-11T08:00:00Z"
}
```

**Error — Missing required fields (400):**
```json
{
  "error": "title is required."
}
```

#### Rejecting a Task

To reject (cancel) a task, use `PATCH /tasks/{id}/` with `{ "status": "cancelled" }`. The frontend TaskList component provides a dedicated "Reject" button that sets the task status to `cancelled`.

#### DELETE `/tasks/{id}/`

Deletes a task. Only the task creator, the assigned user, or users with admin/manager/team_lead roles can delete.

**Behavior:**
- Admin, manager, and team_lead users can delete any task
- Other users can only delete tasks they created (`created_by = current user`) or tasks assigned to them (`assigned_to = current user`)

**Response (204):**
```json
{
  "message": "Task deleted."
}
```

**Error — Not found (404):**
```json
{
  "error": "Task not found."
}
```

**Error — Permission denied (403):**
```json
{
  "error": "Permission denied."
}
```

#### TaskList Component — Inline CRUD

The `TaskList` component provides full task management directly within the task list view:

**Add Task** — An "Add Task" button in the header opens a modal form with:
- Title (required)
- Type (call, meeting, email, followup, proposal, research, other)
- Priority (low, medium, high, urgent)
- Due Date (datetime picker)
- Description (textarea)

Creates a task via `POST /tasks/` assigned to the current user.

**Edit Task** — Each task row has an edit icon button that opens a modal pre-populated with the task's current data. Editable fields: title, type, priority, status, due date, and description. Saves via `PATCH /tasks/{id}/`.

**Delete Task** — Each task row has a delete icon button that prompts for confirmation before deleting via `DELETE /tasks/{id}/delete/`.

**Complete / Reject** — Active tasks (not completed or cancelled) show inline "Done" and "Reject" buttons for quick status changes.

#### View Task Detail Modal

The TaskList component includes a **View Task Detail** modal that displays comprehensive task information when a user clicks the view icon on a task row. The modal shows:

| Field | Description |
|-------|-------------|
| Title | Task title |
| Status | Current status badge (capitalized, underscores replaced with spaces) |
| Type | Task type (display name or raw value) |
| Priority | Priority badge (color-coded via `PriorityBadge` component) |
| Assigned To | Name of the assigned team member |
| Created By | Name of the user who created the task |
| Due Date | Formatted due date/time |
| Created Date | Formatted creation date/time |
| Completed Date | Shown only for completed tasks (green text) |
| Description | Full task description / client requirements (shown in a muted background block) |

### Analytics

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/analytics/team-performance/` | Team metrics by role | Lead, Admin |
| GET | `/analytics/my-performance/` | Individual performance | All marketing |
| GET | `/analytics/pipeline/` | Pipeline overview | Lead, Admin |
| GET | `/analytics/conversion-rates/` | Conversion funnel | Lead, Admin |

---

## Data Architecture

The ASE Marketing system uses three data stores:

1. **`ASELead`** — The main pipeline table tracking leads through the full lifecycle (New → Qualified → Contacted → Proposal → Won/Lost). Used by all roles for pipeline management.

2. **`BREResearchData`** — A dedicated table for BRE employees to upload and manage raw research data (name, phone, location). This is separate from the pipeline and serves as the initial data entry point before leads enter the qualification workflow. BRE users can assign records to BOE team members, who then view their assigned data via the `/boe-assigned/` endpoint.

3. **`BOELead`** — A separate table for leads converted from research data by BOE employees. When a BOE user marks a contact as "Interested", the data is copied here as a lead for further processing and CRE assignment. This keeps converted leads separate from raw research data for better performance and clearer ownership.

### Model: `BOELead`

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Primary key |
| `name` | string | Contact person name |
| `phone_number` | string | Phone number |
| `location` | string | City / Area (optional) |
| `notes` | text | General notes (optional) |
| `call_notes` | text | Notes from BOE call (optional) |
| `status` | string | Lead status (see below) |
| `source_research` | FK → BREResearchData | Original research data this lead came from (nullable) |
| `created_by` | FK → User | BOE employee who created this lead |
| `assigned_to_cre` | FK → User | CRE employee assigned to this lead (nullable) |
| `company` | FK → Company | Company this lead belongs to |
| `created_at` | datetime | Auto-set on creation |
| `updated_at` | datetime | Auto-set on update |

**Status Values:**

| Status | Description |
|--------|-------------|
| `interested` | Initial state — BOE marked contact as interested |
| `assigned_cre` | Assigned to a CRE team member |
| `in_progress` | CRE is actively working the lead |
| `converted` | Successfully converted to a deal |
| `lost` | Lead was lost / not interested |

**Computed properties (read-only):**
- `created_by_name`: Full name of the BOE employee who created the lead
- `assigned_to_cre_name`: Full name of the assigned CRE user

## Lead Lifecycle

```
BREResearchData (raw upload by BRE)
       ↓ (assign to BOE)
BOE views assigned data → makes calls/outreach
       ↓ (positive call → interested)
BOELead created (status: interested, source_research linked)
       ↓ (assign to CRE)
BOELead (status: assigned_cre) → CRE manages lead via `/cre-leads/`
       ↓ (proposals/meetings/deal closure)
BOELead (status: converted or lost)
```

**Full pipeline view:**
```
New → Qualified → Contacted → Proposal Sent → Negotiating → Won/Lost
 └── BRE ──┘      └── BOE ──┘    └────────── CRE ──────────┘
```

### BRE Research Data Flow (Detailed)

```
BRE uploads data (BREResearchData: status=new, call_status=pending)
       ↓
BRE assigns to BOE (BREResearchData: status=assigned)
       ↓
BOE calls the contact (call_status: no_answer/callback/not_interested/interested)
       ↓ (if interested)
BOELead record created (status=interested, source_research linked back)
BREResearchData marked as converted (status=converted)
       ↓
BOE assigns BOELead to CRE (status=assigned_cre)
       ↓
CRE takes over for proposals and deal closure (status=in_progress → converted/lost)
```

## Caching

Dashboard stats and analytics endpoints are cached for 5 minutes per user to reduce database load.

## Admin / Manager / Marketing Lead Panel Navigation

When an admin, manager, or Marketing Lead user accesses the Marketing Team Panel (`/admin/marketing-team`, `/manager/marketing-team`, or `/team/marketing`), the `MarketingTeamPanel` component renders a tabbed interface with 4 tabs:

| Tab | Component | Description |
|-----|-----------|-------------|
| Dashboard | `MarketingLeadDashboard` | Team-wide metrics, pipeline overview, action items, and BRE/BOE/CRE team performance cards |
| Research Data (BRE) | `BREDashboard` (research view) | View and manage all BRE research data with assign/qualify actions |
| Leads (BOE) | `BOELeadsAdmin` | View all BOE leads with filtering, assignment, and CRUD operations |
| Tasks (CRE) | `TaskList` | View and manage all marketing tasks with inline add, edit, delete, complete, and reject actions |

The panel header displays the current user's name, role, and total team count.

This gives admins, managers, and Marketing Leads full visibility into all stages of the marketing pipeline from a single panel.

---

## Real-Time Updates (Frontend)

All marketing dashboards use **5–10 second auto-polling** to provide near-real-time updates without requiring manual refresh.

### Dashboard-Level Polling

Each dashboard component runs its own polling interval for its primary data:

| Dashboard | Polled Data | Interval |
|-----------|-------------|----------|
| Marketing Lead Dashboard | BRE stats (`/bre-stats/`), BOE leads count (`/boe-leads/?page_size=1`), CRE leads count (`/cre-leads/?page_size=1`) | 10 seconds |
| BRE Dashboard | BRE stats (`/bre-stats/`) | 5 seconds |
| BOE Dashboard | Assigned records (`/boe-assigned/`) | 5 seconds |
| BOE Leads | Interested/converted records (`/boe-assigned/?page_size=200`) | 5 seconds |
| CRE Dashboard | CRE leads (`/cre-leads/`) | 5 seconds |

### Hook-Level Polling

The `useMyLeadQueue` hook also auto-polls the lead queue endpoint every **10 seconds**.

### Key Behaviors

- **Loading indicator**: Only shown on the initial data fetch. Subsequent background polls update data silently without triggering a loading state.
- **Polling interval**: 5–10 seconds (configurable per component).
- **Filter-aware**: Polling respects current search, date, and status filters — when filters change, the polling interval resets with the new parameters.
- **Automatic cleanup**: Polling stops when the component unmounts.

This ensures BRE, BOE, and CRE dashboards reflect newly assigned or updated leads within seconds of changes being made by other team members.
