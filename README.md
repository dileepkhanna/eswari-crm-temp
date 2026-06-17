# Eswari CRM

A full-stack CRM platform for Eswari Group, ASE Technologies, and Eswari Capital — built with Django (backend) and React + TypeScript (frontend).

---

## Project Structure

```
eswari-crm-temp/
├── backend/          # Django + DRF API server
└── frontend/         # React + Vite + TypeScript SPA
```

---

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your values
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # starts on http://localhost:8080
```

The Vite dev server proxies `/api` and `/media` requests to `http://localhost:8000`.

The dev server also sets `Cache-Control: no-cache, no-store, must-revalidate` on all responses, forcing the browser to always revalidate assets. This prevents stale builds from being served during development.

---

## Modules

| Module | Path | Description |
|--------|------|-------------|
| Leads (Eswari Group) | `/leads/` | Standard CRM lead management |
| Customers | `/customers/` | Customer call tracking |
| ASE Leads | `/ase-leads/` | ASE Technologies lead pipeline |
| ASE Customers | `/ase-customers/` | ASE call management |
| Capital | `/capital/` | Eswari Capital loans & services |
| Tasks | `/tasks/` | Task management |
| Projects | `/projects/` | Project tracking |
| Technical Team | `/tech/` | Tech project & Kanban board |
| Teams | `/teams/` | Team management |

---

## ASE Customers

### Activity Logging

When a customer record is created or updated, an activity log entry is recorded via `logCustomerActivity()` in `ASECustomerContext`. The user context passed to this function includes the authenticated user's actual company ID (`user.company.id`), so activity log entries are always scoped to the correct company. If the company ID is unavailable it defaults to `0`.

> Previously the update path hardcoded `company: { id: 3 }`, which incorrectly attributed activity logs to a fixed company regardless of which company the acting user belonged to. This has been corrected to use the dynamic company ID from the auth context.

### Real-Time WebSocket Events

Mutating operations on ASE customer records broadcast a WebSocket notification to the `company_2` channel group so connected clients can refetch:

| Operation | Event Type | Payload |
|-----------|-----------|---------|
| Bulk assign (`assigned_to`) | `ase_data_changed` | `{ entity: "calls", action: "bulk_updated", count: <n>, field: "assigned_to" }` |

These are emitted via `notify_ase_data_changed()` in `eswari_crm/ws_utils.py`.

### Bulk Assign Calls

`POST /api/ase-customers/bulk_assign/` assigns multiple customer records to a single employee in one request.

**Request body:**
```json
{ "customer_ids": [1, 2, 3], "assigned_to": <user_id> }
```

**Behavior:**
- The assignee must be active and belong to the same company as the selected customers.
- Admin accounts cannot be used as an assignee.
- After a successful update, a `calls / bulk_updated` WebSocket event is broadcast so all open browser sessions reflect the change immediately.

### Convert Call to Lead

The `POST /api/ase-customers/{id}/convert_to_lead/` action converts a customer call record into an ASE lead.

**Assignment behavior after conversion:**

- The converted call is marked as converted and linked to the new lead.
- **Remaining calls are NOT reassigned.** All other calls that belong to the converting employee stay with that employee unchanged.
- Only a manager can explicitly reassign calls via the standard update endpoint.

> Previous versions automatically redistributed the employee's remaining calls to other team members after a conversion. This auto-reassignment has been removed to give managers full control over call assignment.

**Email handling during conversion:**

The customer's email is only copied to the new lead if it passes a basic format check (`name@domain.tld`). Placeholder values commonly entered in call records — such as `N/A`, `-`, `none`, or any string without an `@` — are silently dropped rather than carried over to the lead. This prevents lead records from being polluted with non-email values that would fail delivery or validation downstream.

---

## ASE Leads

### Lead Status Options

The ASE lead pipeline supports the following statuses (defined in `frontend/src/components/ase-leads/ASELeadList.tsx`):

| Value | Label | Badge Color | Description |
|-------|-------|-------------|-------------|
| `new` | New | Blue | Freshly created lead, not yet actioned |
| `demo_done` | Demo Done | Green | Product demo has been completed |
| `presentation` | Presentation | Purple | Presentation delivered to prospect |
| `quotation` | Quotation | Red | Quotation sent to prospect |
| `custom` | Custom | Orange | User-defined custom status |

All status values use lowercase (snake_case) consistently.

### Lead Priority Options

| Value | Label |
|-------|-------|
| `low` | Low |
| `medium` | Medium |
| `high` | High |
| `urgent` | Urgent |

### Lead Creation — Company Assignment

When creating a lead via `ASELeadContext.createLead()`, the `company` field is resolved as follows:

| Role | Behavior |
|------|----------|
| `admin` / `hr` | Must supply a company explicitly (via `aseCompanyId` or `selectedCompany`). If no company can be resolved, creation is blocked with an error toast. |
| `employee` / `manager` | Company is optional on the frontend payload. If not supplied, the backend automatically assigns `user.company`. The frontend no longer blocks submission for these roles when no company context is set. |

The resolution order for the company ID is: `aseCompanyId` → `user.company.id` → `selectedCompany.id`.

### Role-Based Data Access

The `ASELeadViewSet.get_queryset()` method applies role-based filtering to ensure users only see leads appropriate to their role:

| Role | Access |
|------|--------|
| **Superuser** | All leads across all companies (optional `?company=<id>` filter) |
| **Admin** | All leads in their company (or filtered by `?company=<id>`) |
| **HR** | All leads in their company |
| **Employee** | Only leads assigned to them OR created by them |
| **Manager** | All leads in their company where assigned_to or created_by is the manager OR any of their team members |
| **Other roles** | All leads in their company (fallback behavior) |

> **Note**: Previously, users with unrecognized roles received no data (`qs.none()`). Now they receive company-scoped data as a safer fallback.

### Key API Endpoints

```
GET    /api/ase-leads/                        List leads (role-filtered)
POST   /api/ase-leads/                        Create lead
PATCH  /api/ase-leads/{id}/                   Update lead
DELETE /api/ase-leads/{id}/                   Delete lead
GET    /api/ase-leads/stats/                  Lead statistics
GET    /api/ase-leads/my-queue/               Role-based lead queue
GET    /api/ase-leads/dashboard-stats/        Dashboard metrics
POST   /api/ase-leads/bulk-import/            Bulk import leads
POST   /api/ase-leads/bulk-delete-by-ids/     Bulk delete by explicit ID list
POST   /api/ase-leads/bulk-delete-by-filter/  Bulk delete all leads matching filters
POST   /api/ase-leads/export-by-ids/          Export leads as Excel
```

**`bulk_delete_by_filter`** accepts an optional JSON body with `search`, `status`, and/or `priority` fields. It deletes all leads in the user's company that match the supplied filters and is restricted to `admin` and `manager` roles.

### Bulk Import Assignment Behavior

**`POST /api/ase-leads/bulk-import/`** assigns all imported leads to the importing user.

**Request body:**
```json
{
  "leads": [
    {
      "company_name": "Example Corp",
      "contact_person": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "status": "new",
      "priority": "medium"
    }
  ]
}
```

**Assignment behavior:**
- All imported leads are assigned to the user who performs the import (`assigned_to = importing_user`)
- No round-robin distribution or team-based assignment
- Users can manually reassign leads after import if needed

**Response:**
```json
{
  "imported": 10,
  "errors": []
}
```

> **Note**: Previous versions attempted round-robin assignment across team members. This has been simplified so all imports are assigned to the importing user first, giving managers full control over subsequent reassignment.

### Real-Time WebSocket Events

All mutating operations on ASE leads broadcast a WebSocket notification to the `company_2` channel group, triggering connected clients to refetch:

| Operation | Event Type | Payload |
|-----------|-----------|---------|
| Create lead | `ase_data_changed` | `{ entity: "leads", action: "created" }` |
| Update lead | `ase_data_changed` | `{ entity: "leads", action: "updated", record_id: <id> }` |
| Delete lead | `ase_data_changed` | `{ entity: "leads", action: "deleted", record_id: <id> }` |
| Bulk import | `ase_data_changed` | `{ entity: "leads", action: "bulk_imported", count: <n> }` |
| Bulk delete (by IDs) | `ase_data_changed` | `{ entity: "leads", action: "bulk_deleted", count: <n> }` |
| Bulk delete (by filter) | `ase_data_changed` | `{ entity: "leads", action: "bulk_deleted", count: <n> }` |

These are emitted via `notify_ase_data_changed()` in `eswari_crm/ws_utils.py`. The frontend listens using the `useASEWebSocket` hook and calls `refreshData()` on receipt.

---

## Frontend API Client (`src/lib/api.ts`)

The `apiClient` singleton handles all HTTP requests from the React frontend. Key behaviors:

### Authentication Headers

All requests automatically attach a `Bearer` token from `localStorage`. The following endpoints are treated as **public** and never receive an `Authorization` header, even if a token exists in storage:

| Endpoint | Purpose |
|----------|---------|
| `/auth/login/` | Initial login |
| `/auth/register/` | New user registration |
| `/auth/setup/` | First-time setup |
| `/auth/invite/register/` | Invite-based registration |

This prevents a stale/expired token from triggering a `401 → refresh` loop on auth endpoints, which would abort the request before the response could be processed.

### Auth Initialization & Proactive Token Refresh (`src/contexts/AuthContextDjango.tsx`)

On app load, the auth context checks for a stored `access_token` in `localStorage`. Before making any API calls, it now **proactively inspects the token's expiry**:

1. If the access token is expired **and** a `refresh_token` is present, it attempts a silent refresh before fetching the user profile.
2. If the refresh succeeds, the new access token is stored and the normal `fetchUserData()` flow continues.
3. If the refresh fails (e.g. the refresh token is also expired or revoked), both tokens are removed, the session is cleared, and the user is redirected to `/login`.

This eliminates the burst of `401` responses that previously fired on page load when a session had expired overnight — the token is refreshed once, silently, before any authenticated requests go out.

**Behavior summary:**

| Scenario | Outcome |
|---|---|
| Access token valid | Proceeds directly to `fetchUserData()` |
| Access token expired, refresh token valid | Refreshes silently, then fetches user |
| Access token expired, no refresh token | Clears tokens, redirects to login |
| Access token expired, refresh fails | Clears tokens, redirects to login |

---

### Token Cleaner (`src/lib/tokenCleaner.ts`)

A lightweight utility that guards against stale or corrupted tokens in `localStorage`.

**`clearInvalidTokens()`** — Removes `access_token`, `refresh_token`, and related keys from both `localStorage` and `sessionStorage`.

**`handleAuthError(error)`** — Called whenever a 401 response is received. Clears tokens **only if tokens were already present in storage** before the error occurred. This prevents a valid session from being wiped when unauthenticated API calls fire during initial page load (before the auth context has fully initialised). Returns `true` if tokens were cleared, `false` otherwise.

**`initTokenCleaner()`** — Call once at app startup. Attaches a global `unhandledrejection` listener that invokes `handleAuthError` on any unhandled promise rejection, suppressing the browser error log when the rejection is a genuine stale-token situation.

**Behaviour summary**:

| Scenario | Tokens in storage? | Action |
|---|---|---|
| 401 on a protected API call with an expired token | Yes | Clears tokens → user redirected to login |
| 401 on a public/unauthenticated call before auth init | No | Does nothing — session is preserved |

---

## Real-Time Updates

WebSocket notifications are sent on data changes. Connect to:

```
ws://host/ws/notifications/?token=<jwt>
```

See `DATA_VISIBILITY_RULES.md` for event types and `WEBSOCKET_TESTING_GUIDE.md` for testing instructions.

---

## Frontend Routing

### Team Panel Routes

Team-specific routes redirect to the admin tech panel (`/admin/tech-panel`):

| Route Pattern | Redirects To | Notes |
|---------------|-------------|-------|
| `/team/marketing/*` | `/admin/tech-panel` | Previously redirected to `/staff` |
| `/team/technical/*` | `/admin/tech-panel` | Previously redirected to `/staff` |
| `/team/*` | `/admin/tech-panel` | Catch-all for any team sub-path |

The marketing team panel is accessible at `/admin/marketing-team` for admin users and retains role-based dashboard routing internally (BRE / BOE / CRE / Marketing Lead views).

### Other Legacy Redirects

| Route Pattern | Redirects To |
|---------------|-------------|
| `/employee/*` | `/staff` |

---

## Role-Based Access

See `DATA_VISIBILITY_RULES.md` for full details.

| Role | Access Level |
|------|-------------|
| `admin` | All data across all companies |
| `manager` | Own data + managed employees' data |
| `employee` | Only own assigned data |
| `hr` | Employee/leave/holiday management only |

---

## Frontend Type System

The frontend uses two separate user type representations:

### `User` (`src/types/index.ts`)
The primary frontend model used in contexts, state, and UI components. Uses camelCase fields and `Date` objects.

### `DBUser` (`src/types/user.ts`)
Maps directly to the backend API response shape for user records. Used when consuming the `/api/auth/users/` endpoint. Key differences from `User`:

| Field | Type | Notes |
|-------|------|-------|
| `id` / `user_id` | `string` | Backend-assigned IDs |
| `name` | `string` | Full name as single field |
| `email`, `phone`, `address` | `string \| null` | Nullable |
| `designation`, `joining_date` | `string \| null` | Optional HR fields |
| `team` | `number \| null` | Team ID reference |
| `bank_name`, `bank_account_number`, `bank_ifsc` | `string \| null` | Optional banking info |
| `blood_group`, `aadhar_number` | `string \| null` | Optional personal info |
| `emergency_contact1_*` / `emergency_contact2_*` | `string \| null` | Up to 2 emergency contacts |
| `manager_id`, `manager_name` | `string \| null` | Manager reference |
| `company` | `Company` | Nested company object |
| `role` | `UserRole` | Same union type as `User` |
| `created_at`, `updated_at` | `string` | ISO datetime strings |

Import it from `@/types/user`:
```typescript
import type { DBUser } from '@/types/user';
```

---

## Authentication

### Login API Endpoint

`POST /api/auth/login/`

**Request body:**
```json
{
  "email": "username_or_email",
  "password": "your_password"
}
```

> **Note**: Despite the field name being `email`, the backend accepts both email addresses and usernames. Use this field for any identifier (email, username, or user ID) when authenticating.

**Response (success):**
```json
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": { ... },
  "company": { ... }
}
```

**Example (Python):**
```python
import requests

response = requests.post(
    'http://127.0.0.1:8000/api/auth/login/',
    json={'email': 'your_username', 'password': 'your_password'}
)

if response.status_code == 200:
    data = response.json()
    access_token = data['access']
    # Use token in subsequent requests
```

---

## Testing

### Backend Test Scripts

The backend includes several standalone test scripts for verifying specific functionality:

| Script | Purpose |
|--------|---------|
| `test_bulk_import_assignment.py` | Verifies that managers can bulk import ASE customer calls and all records are correctly assigned to the importing manager |
| `test_api_bulk_import.py` | Tests bulk import API endpoint with authentication and self-assignment verification |
| `test_websocket_setup.py` | Tests WebSocket connection and notification delivery |
| `smoke_test_ase_data_isolation.py` | Validates ASE data isolation between companies |

**Running a test script:**

```bash
cd backend
python test_bulk_import_assignment.py
```

These scripts use real API endpoints and require:
- The Django server running on `http://127.0.0.1:8000`
- Valid user credentials (configured in the script)
- `pandas` installed for CSV generation (`pip install pandas`)

> **Authentication in test scripts**: All test scripts now use the correct login payload format with the `email` field for the username/identifier, as the backend expects. See the Authentication section above for the correct format.

---

## Tech Stack

**Backend**: Django 4.2, Django REST Framework, Django Channels (WebSockets), PostgreSQL, Redis, JWT auth

**Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Query, React Router

**Mobile**: Flutter (see `../eswari_crm_mobile/`)
