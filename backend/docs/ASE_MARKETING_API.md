# ASE Marketing API Reference

## Lead Assignment Endpoints

### Assign Lead to BOE

```
POST /api/ase-leads/{id}/assign-to-boe/
```

Assigns a lead to a BOE (Business Outreach Executive) team member.

**Request Body:**
```json
{
  "user_id": 123
}
```

**Validation:**
- Target user must be a BOE team member (team with `marketing_category = 'boe'`)
- OR target user must have a `manager`, `team_lead`, or `admin` role

**Responses:**
- `200 OK` — Lead assigned successfully
- `400 Bad Request` — Invalid target user or validation failure
- `404 Not Found` — Lead not found

---

### Assign Lead to CRE

```
POST /api/ase-leads/{id}/assign-to-cre/
```

Assigns a lead to a CRE (Client Relationship Executive) team member.

**Request Body:**
```json
{
  "user_id": 123
}
```

**Validation:**
- Target user must be a CRE team member (team with `marketing_category = 'cre'`)
- OR target user must have a `manager`, `team_lead`, or `admin` role

This allows managers, team leads, and admins to be assigned leads directly without requiring CRE team membership.

**Responses:**
- `200 OK` — Lead assigned successfully
- `400 Bad Request` — Target user must be a CRE team member or have manager/team_lead/admin role
- `404 Not Found` — Lead not found

---

## Permission Model

| Role | Access Level |
|------|-------------|
| Admin | Full access to all endpoints |
| Manager | Full access to CRE actions (send-proposal, schedule-meeting, update-stage) in addition to standard manager capabilities |
| Marketing Lead | Full access to all marketing leads and team data |
| BRE | Access new and qualified leads; can qualify/disqualify and assign to BOE |
| BOE | Access contacted leads; can log calls/emails and assign to CRE |
| CRE | Access proposal/negotiation leads; can send proposals and schedule meetings |

## BOE Leads Filter Endpoints

### BOE Leads Creators

```
GET /api/ase-leads/boe-leads/creators/
```

Returns distinct users who created or are assigned as CRE for BOE leads. Used to populate filter dropdowns in the BOE leads list.

**Access:**
- Admin/Manager/Team Lead: Returns all creators and CRE-assigned users across all BOE leads
- Other roles: Returns only the current user (their own created leads)

**Response:**
```json
[
  {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "name": "John Doe (Team Lead)"
  },
  {
    "id": 2,
    "first_name": "Jane",
    "last_name": "Smith",
    "name": "Jane Smith"
  }
]
```

**Notes:**
- The `name` field includes a role label in parentheses for non-employee roles (e.g., "Team Lead", "Manager", "Admin")
- Employee role users show just their name without a role label
- Results include both lead creators and users assigned via `assigned_to_cre` field
- Only active users are returned

---

## Other Endpoints

See the spec design document (`.kiro/specs/ase-marketing-panel/design.md`) for the full list of endpoints including:

- Lead queue: `GET /api/ase-leads/my-queue/`
- Dashboard stats: `GET /api/ase-leads/dashboard-stats/`
- BRE actions: qualify, disqualify
- BOE actions: log-call, log-email
- CRE actions: send-proposal, schedule-meeting, update-stage
- Activities: CRUD operations
- Tasks: CRUD operations
- Analytics: team-performance, my-performance, pipeline, conversion-rates
