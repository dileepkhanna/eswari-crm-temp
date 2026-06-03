# ASE Customers — Frontend Context Reference

This document covers the `ASECustomerContext` React context used by the ASE Technologies customer management pages.

---

## Overview

`ASECustomerContext` manages all client-side state for ASE customers (calls). It wraps the customer list, pagination, filtering, and CRUD operations, and exposes them via a React context to the admin, manager, and staff views.

---

## Key Behaviors

### Bulk Delete

After a successful bulk delete, the context **re-fetches the full customer list from the server** rather than filtering the local state array.

```ts
const bulkDeleteCustomers = useCallback(async (customerIds: string[]) => {
  const result = await ASECustomerService.bulkDelete(customerIds);
  // Re-fetch to get accurate count and pagination
  await fetchCustomers();
  toast.success(`${result.deleted} customer(s) deleted successfully`);
}, [fetchCustomers]);
```

**Why this matters:** A local filter would leave the displayed total count and pagination state out of sync with the server. Re-fetching ensures:
- The displayed record count is accurate
- Pagination adjusts correctly (e.g., if the current page becomes empty)
- Any server-side side effects (cascaded deletes, audit logs) are reflected immediately

### Other Mutations

All other mutation operations (create, update, reassign) follow the same server-refetch pattern to keep local state consistent with the backend.

---

## Context Methods

| Method | Description |
|--------|-------------|
| `fetchCustomers()` | Fetches the current page of customers with active filters applied |
| `bulkDeleteCustomers(ids)` | Deletes multiple customers and re-fetches the list |
| `reassignCustomer(id, assignedTo, reason?)` | Reassigns a customer to a different user |

---

## Related Files

| File | Role |
|------|------|
| `frontend/src/contexts/ASECustomerContext.tsx` | Context provider and state management |
| `frontend/src/pages/admin/AdminASECustomers.tsx` | Admin view |
| `frontend/src/pages/manager/ManagerASECustomers.tsx` | Manager view |
| `frontend/src/pages/staff/StaffASECustomers.tsx` | Staff view |
| `frontend/src/components/ase-customers/` | Shared UI components (forms, modals) |
