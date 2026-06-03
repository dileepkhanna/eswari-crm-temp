# Task List Component — Frontend Documentation

## Overview

The `TaskList` component (`frontend/src/components/tasks/TaskList.tsx`) is the primary UI for browsing, filtering, and managing tasks in the Eswari CRM web frontend.

---

## Filter Bar

The filter bar is rendered as a single responsive row (stacks vertically on mobile, horizontal on large screens). All filters are always visible — there is no hidden advanced-filters modal.

### Search Input

- Placeholder: `Search tasks by title, company, contact...`
- Full-width on mobile, flex-1 on large screens.
- Searches task title, company name, and contact fields.

### Inline Filter Dropdowns

All dropdowns sit in a flex-wrap row alongside the search box.

| Dropdown | Width | Options |
|---|---|---|
| **Status** | 140 px | All Status · In Progress · Site Visit · Family Visit · Perfect F. Visit · Completed · Rejected |
| **Project** | 140 px | All Projects · (dynamic list from `projects` prop) |
| **Assigned To** | 140 px | All Assignees · (dynamic list from `employees` prop) |
| **Due Date** | 140 px (Popover) | All Dates · Overdue · Today · This Week · Upcoming |

The Due Date filter opens a small popover with radio-style buttons rather than a native `<select>`.

### Task Count

A `{filteredTasks.length} task(s)` label is displayed in the action buttons row, to the left of the Excel import/export control.

---

## Action Buttons Row

Below the filter bar, a second row contains:

- Task count label
- Excel import/export (`TaskExcelImportExport`)
- Bulk delete button (shown only when rows are selected and user has delete permission)
- Any additional context actions

---

## Responsive Behaviour

| Breakpoint | Layout |
|---|---|
| `< lg` | Filters stack vertically; dropdowns wrap |
| `≥ lg` | Search + dropdowns in a single horizontal row |

---

## State Variables (filter-related)

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `searchQuery` | `string` | `""` | Free-text search |
| `statusFilter` | `string` | `"all"` | Task status |
| `projectFilter` | `string` | `"all"` | Project association |
| `assignedToFilter` | `string` | `"all"` | Assigned employee |
| `dueDateFilter` | `string` | `"all"` | Due-date bucket |
| `dateRange` | `{ from?, to? }` | `{}` | Custom date range (used internally) |

---

## Change History

### 2025 — Advanced Filters Sheet removed

Removed the remaining `<Sheet>` component stub (`advancedFilterOpen` / `SheetContent`) that was left over from the previous advanced-filters pattern. All filtering is now handled exclusively through the inline dropdowns and Due Date popover described above. No behaviour change — the sheet was already non-functional.

### 2025 — Inline filter redesign

Replaced the previous "Filters" button + advanced-filter modal pattern with always-visible inline `<Select>` dropdowns and a Due Date popover. Active filter badge row was removed. Search placeholder updated to reflect searchable fields (title, company, contact).


---

## AdminASETasks Page (`pages/admin/AdminASETasks.tsx`)

The ASE Technologies task admin page is a separate component from the general `TaskList`. It fetches tasks from the ASE leads task endpoint (`/ase-leads/tasks/my-tasks/`) and includes its own filter UI.

### Filter Layout

The filter UI uses a **search bar + slide-out Sheet panel** pattern:

1. **Top bar** — a full-width search input and a "Filters" button sit side by side.
   - The Filters button shows a count badge (`activeFilterCount`) when any filter is active.
2. **Active filter badges** — when filters are applied, a row of dismissible pill badges appears below the search bar, one per active filter. A "Clear all" button resets everything at once.
3. **Sheet panel** — clicking the Filters button opens a wider `<Sheet>` (`sm:max-w-md`, up from `sm:max-w-sm`), titled **"Advanced Filters"**. Sections are:
   - **Quick Select** — a 3×2 grid of toggle buttons for common time ranges (Today, This Week, This Month, Last Month, Last 3 Months, All Time).
   - **Task Status** — full-width `<Select>` for status values.
   - **Priority** — full-width `<Select>` for priority levels.
   - **Task Type** — full-width `<Select>` for task type.
   - **Created By** (admin/manager only, only shown when the `employees` list is non-empty) — full-width `<Select>` filtered to employees.
   - **Filter by Month** — full-width `<Select>` using `MONTH_OPTIONS`.
   - **Custom Date Range** — split into two side-by-side `<Popover>` + `<Calendar>` pickers (From / To), each using `mode="single"`. A "Clear custom dates" ghost button appears below when either date is set.
   - **Footer** — "Clear All" and "Apply" buttons.

### Filter State Variables

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `searchQuery` | `string` | `""` | Free-text search |
| `statusFilter` | `string` | `"all"` | Task status (pending, in_progress, completed, cancelled) |
| `priorityFilter` | `string` | `"all"` | Priority level (low, medium, high, urgent) |
| `typeFilter` | `string` | `"all"` | Task type (followup, call, email, meeting, etc.) |
| `employeeFilter` | `string` | `"all"` | Filter by creator employee ID (admin/manager only) |
| `monthFilter` | `string` | `"all"` | Filter by month (uses `MONTH_OPTIONS` helper) |
| `quickDateFilter` | `string` | `"all"` | Quick time-range preset (today, this_week, this_month, last_month, last_3_months, all) |
| `dateRange` | `{ from?, to? }` | `{}` | Custom date range (From / To pickers) |
| `filterOpen` | `boolean` | `false` | Controls Sheet open/close state |
| `activeFilterCount` | `number` | computed | Count of non-default filter values; drives the badge on the Filters button |

### Employee / "Created By" Filter

The `employees` state (`{ id: number; name: string }[]`) is populated by a fetch on mount for **all authenticated users** (previously limited to admin/manager roles). The filter section is hidden when the `employees` list is empty.

**User list population:** The component fetches `/auth/users/`, which returns a plain JSON array (no pagination). The response is handled defensively — if the value is already an array it is used directly; otherwise `res.results` is used as a fallback. All returned users are mapped to `{ id, name }` regardless of their `is_active` status. Display names are built from `first_name` + `last_name`; if both are empty the fallback order is `username → email → "User {id}"`. Fetch errors are logged to the console but are non-fatal.

### Quick Select vs Month vs Custom Date Range

`quickDateFilter`, `monthFilter`, and `dateRange` are mutually exclusive — selecting one clears the others:

- Clicking a **Quick Select** button sets `quickDateFilter` and clears `monthFilter` and `dateRange`.
- Changing **Filter by Month** sets `monthFilter`, resets `quickDateFilter` to `'all'`, and clears `dateRange`.
- Picking a date in the **Custom Date Range** pickers sets `dateRange`, resets `quickDateFilter` to `'all'`, and sets `monthFilter` to `'all'`.
- **Clear All** in the Sheet footer resets all three to their defaults.

### API Query Construction

Active filters append query parameters to the base URL:

```
/ase-leads/tasks/my-tasks/?page={page}
  &status={statusFilter}         (if not 'all')
  &priority={priorityFilter}     (if not 'all')
  &task_type={typeFilter}        (if not 'all')
  &assigned_to={employeeFilter}  (if not 'all')
```

Time-range filters (`quickDateFilter`, `monthFilter`, `dateRange`) are applied client-side or translated to `created_at` / `due_date` query parameters depending on the backend support.

### UI Components Used

| Component | Source | Purpose |
|---|---|---|
| `Dialog` | `@/components/ui/dialog` | Create/Edit task form and task detail view |
| `AlertDialog` | `@/components/ui/alert-dialog` | Bulk delete confirmation |
| `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` | `@/components/ui/sheet` | Slide-out filter panel (`sm:max-w-md`) |
| `Popover` + `Calendar` | `@/components/ui/popover`, `@/components/ui/calendar` | Separate From/To date pickers inside the Sheet |
| `Button` (grid) | `@/components/ui/button` | Quick Select time-range toggle buttons |
| `DropdownMenu` | `@/components/ui/dropdown-menu` | Per-row action menu (View / Edit / Complete / Delete) |
| `SlidersHorizontal` | `lucide-react` | Icon on the Filters button |

### Change History

**2026-06** — Employee fetch now runs for all roles (no longer gated to admin/manager only). Removed the `is_active` filter from the user mapping so all returned users are included. Added defensive array handling for the `UserListView` response, which returns a plain array (not paginated).

**2026-06** — Enhanced Sheet filter panel: sheet width increased to `sm:max-w-md`; title changed to "Advanced Filters"; added Quick Select 3×2 button grid (Today / This Week / This Month / Last Month / Last 3 Months / All Time); split the single date-range calendar into two independent From/To single-date pickers rendered side by side; renamed "Employee (Assigned To)" label to "Created By"; employee filter section now additionally hidden when the `employees` list is empty; introduced `quickDateFilter` state with mutual-exclusion logic against `monthFilter` and `dateRange`; "Clear All" in footer also resets `quickDateFilter`.

**2026-06** — Refactored filter bar from inline dropdowns to a slide-out Sheet panel. Search + Filters button remain always visible; all filter controls (Status, Priority, Type, Employee, Month, Date Range) moved inside the Sheet. Active filter badges row added below the search bar for at-a-glance visibility and one-click removal of individual filters.

**2026-06** — Added `filterOpen` and `activeFilterCount` state. Sheet is now rendered and functional.

**2026-06** — Added `employeeFilter` and `monthFilter` state variables along with an `employees` list populated from the API. Enables admins and managers to filter ASE tasks by the assigned team member and by calendar month.
