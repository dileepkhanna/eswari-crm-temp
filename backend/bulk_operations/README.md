# Bulk Operations API

Provides bulk assign, bulk status update, and bulk delete operations across all entity types. All endpoints require **admin** or **manager** role.

**Base URL:** `/api/bulk/` (also available at `/api/v1/bulk/`)

---

## Endpoints

### Bulk Assign

#### `POST /api/bulk/assign/leads/`

Bulk assign Eswari Group leads to an employee.

**Request Body:**
```json
{
  "lead_ids": [1, 2, 3],
  "assigned_to_id": 5
}
```

**Response:**
```json
{
  "updated": 3,
  "assigned_to": "John Doe"
}
```

---

#### `POST /api/bulk/assign/ase-leads/`

Bulk assign ASE Technology leads to a team member.

**Request Body:**
```json
{
  "lead_ids": [1, 2, 3],
  "assigned_to_id": 5
}
```

**Response:**
```json
{
  "updated": 3,
  "assigned_to": "Jane Smith"
}
```

---

#### `POST /api/bulk/assign/capital-customers/`

Bulk assign Capital customers to an employee.

**Request Body:**
```json
{
  "customer_ids": [1, 2, 3],
  "assigned_to_id": 5
}
```

**Response:**
```json
{
  "updated": 3,
  "assigned_to": "Jane Smith"
}
```

---

### Bulk Status Update

#### `POST /api/bulk/status/leads/`

Bulk update status for Eswari Group leads.

**Request Body:**
```json
{
  "lead_ids": [1, 2, 3],
  "status": "hot"
}
```

**Response:**
```json
{
  "updated": 3,
  "new_status": "hot"
}
```

---

#### `POST /api/bulk/status/ase-leads/`

Bulk update status for ASE Technology leads.

**Request Body:**
```json
{
  "lead_ids": [1, 2, 3],
  "status": "qualified"
}
```

**Response:**
```json
{
  "updated": 3,
  "new_status": "qualified"
}
```

---

#### `POST /api/bulk/status/tasks/`

Bulk update status for tasks.

**Request Body:**
```json
{
  "task_ids": [1, 2, 3],
  "status": "completed"
}
```

**Response:**
```json
{
  "updated": 3,
  "new_status": "completed"
}
```

---

#### `POST /api/bulk/status/capital-loans/`

Bulk update status for Capital loans.

**Request Body:**
```json
{
  "loan_ids": [1, 2, 3],
  "status": "approved"
}
```

**Response:**
```json
{
  "updated": 3,
  "new_status": "approved"
}
```

---

## Error Responses

| Status | Description |
|--------|-------------|
| `400` | Missing required fields or invalid status value |
| `403` | User is not admin or manager |
| `404` | Assignee user not found or inactive |

**Example error:**
```json
{
  "detail": "Invalid status. Must be one of: ['new', 'hot', 'warm', 'cold', 'converted', 'lost']"
}
```

---

## Notes

- All operations run inside a database transaction for atomicity.
- The `updated` field in responses indicates how many records were actually modified.
- Status values are validated against each model's `STATUS_CHOICES`.
- Assignees must be active users (`is_active=True`).
