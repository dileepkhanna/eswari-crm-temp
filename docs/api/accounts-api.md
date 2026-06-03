# Accounts API

Base URL: `/api/auth/`

---

## Update User

**Endpoint:** `PATCH /api/auth/users/{id}/`  
**Permission:** Admin only

Updates a user's profile fields. Only fields present in the request body are modified — omitted fields are left unchanged.

### Request Body

All fields are optional. Send only the fields you want to update.

| Field | Type | Description |
|---|---|---|
| `name` | string | Full name |
| `email` | string | Email address |
| `phone` | string | Phone number |
| `designation` | string | Job designation |
| `joining_date` | string (date) | ISO date, e.g. `"2024-01-15"` |
| `company` | integer \| null | Company ID |
| `team` | integer \| null | Team ID (see behavior below) |
| `manager` | integer \| string \| null | Manager user ID, or `"none"` to clear |
| `present_address` | string | Present address |
| `permanent_address` | string | Permanent address |
| `bank_name` | string | Bank name |
| `bank_account_number` | string | Bank account number |
| `bank_ifsc` | string | IFSC code |
| `blood_group` | string | Blood group |
| `aadhar_number` | string | 12-digit Aadhar number |
| `emergency_contact1_name` | string | Emergency contact 1 name |
| `emergency_contact1_phone` | string | Emergency contact 1 phone |
| `emergency_contact1_relation` | string | Emergency contact 1 relation |
| `emergency_contact2_name` | string | Emergency contact 2 name |
| `emergency_contact2_phone` | string | Emergency contact 2 phone |
| `emergency_contact2_relation` | string | Emergency contact 2 relation |
| `new_password` | string | If provided, updates the user's password |

---

### Team Assignment Behavior

The `team` field follows **explicit-null semantics** — its behavior depends on whether the key is present in the request body at all:

| Request body | Effect |
|---|---|
| `team` key **absent** | Team is left unchanged |
| `"team": null` | Team assignment is **removed** (set to null) |
| `"team": 0` | Team assignment is **removed** (set to null) |
| `"team": 5` | User is assigned to team with ID 5 |

**Important:** Sending `"team": null` explicitly removes the user's team. Omitting the `team` key entirely leaves it as-is. This distinction matters when building partial update payloads from the frontend — only include `team` in the request if you intend to change it.

**Validation:** The assigned team must belong to the same company as the user. A mismatch returns `400 Bad Request`.

---

### Company Change Side Effects

When `company` is changed to a different company:
- The user's `manager` is automatically cleared (managers must be from the same company).
- The user's `team` is automatically cleared (teams must be from the same company).

---

### Response

**200 OK** — Returns the updated user object.

**400 Bad Request** — Validation error (e.g., team from a different company, invalid team ID).

**403 Forbidden** — Caller does not have admin privileges.

**404 Not Found** — User with given ID does not exist.

---

### Example: Remove a user's team

```json
PATCH /api/auth/users/42/
{
  "team": null
}
```

### Example: Assign a user to a team

```json
PATCH /api/auth/users/42/
{
  "team": 7
}
```

### Example: Update name only (team unchanged)

```json
PATCH /api/auth/users/42/
{
  "name": "Ramesh Kumar"
}
```
