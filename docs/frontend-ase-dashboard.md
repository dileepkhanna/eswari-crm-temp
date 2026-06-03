# ASE Technologies Dashboard — Frontend Documentation

## Overview

The `AdminASEDashboard` component (`frontend/src/pages/admin/AdminASEDashboard.tsx`) provides a comprehensive overview of ASE Technologies' digital marketing operations, combining call activity metrics and lead pipeline statistics in a single unified dashboard view.

---

## Purpose

This dashboard serves as the primary landing page for administrators monitoring ASE Technologies operations. It aggregates data from two main sources:

1. **ASE Customer Calls** — Call tracking and customer engagement data
2. **ASE Leads** — Lead generation and conversion pipeline

---

## Data Sources

### ASE Customer Context

The dashboard uses the `useASECustomers()` hook to access customer/call data and fetches additional statistics via `aseCustomerService.getStats()`.

**Call Metrics:**
- Total calls
- Answered calls
- Pending calls (requires action)
- Not answered calls
- Busy calls
- Not interested calls

### ASE Lead Context

The dashboard uses the `useASELead()` hook to access lead data, including:
- Total leads count
- Lead status breakdown (new, demo_done, presentation, etc.)
- Lead statistics

---

## Layout Structure

### Top Section
- **TopBar** component with title "ASE Technologies Dashboard" and subtitle "Digital Marketing Operations Overview"
- **AnnouncementBanner** (displays up to 2 announcements for admin role)

### Call Activity Section
Title: "Call Activity" with phone icon

**4 Stat Cards:**
1. **Total Calls**
   - Value: Total count of all calls
   - Change indicator: Answer rate percentage
   - Color coding: Green (≥70%), Orange (50-69%), Red (<50%)
   - Links to: `/admin/ase-customers`

2. **Answered**
   - Value: Count of answered calls
   - Change indicator: Percentage of total calls
   - Icon: CheckCircle (green)
   - Links to: `/admin/ase-customers?status=answered`

3. **Pending**
   - Value: Count of pending calls
   - Change indicator: "Requires action" or "All handled"
   - Icon: Clock (orange)
   - Links to: `/admin/ase-customers?status=pending`

4. **Not Answered**
   - Value: Sum of not_answered + busy calls
   - Change indicator: Breakdown of both categories
   - Icon: XCircle (red)
   - Links to: `/admin/ase-customers?status=not_answered`

### Lead Pipeline Section
Title: "Lead Pipeline" with briefcase icon

**4 Stat Cards:**
1. **Total Leads**
   - Value: Total lead count
   - Change indicator: Conversion rate from calls
   - Color coding: Green (≥20%), Orange (10-19%), Red (<10%)
   - Icon: Briefcase (indigo)
   - Links to: `/admin/ase-leads`

2. **New Leads**
   - Value: Count of new leads
   - Change indicator: Percentage of total leads
   - Icon: AlertCircle (blue)
   - Links to: `/admin/ase-leads?status=new`

3. **Demo Done**
   - Value: Count of leads with demo completed
   - Change indicator: Percentage of total leads
   - Icon: CheckCircle (green)
   - Links to: `/admin/ase-leads?status=demo_done`

4. **Presentation**
   - Value: Count of leads in presentation stage
   - Change indicator: Percentage of total leads
   - Icon: TrendingUp (purple)
   - Links to: `/admin/ase-leads?status=presentation`

### Charts Row

Two side-by-side charts (stacked on mobile, 2 columns on lg+):

1. **Lead Status Distribution**
   - Component: `ASELeadStatusChart`
   - Props: `leads`, `totalCount`, `stats`, `title`
   - Shows breakdown of leads by status

2. **Call Status Distribution**
   - Custom chart component (inline)
   - Displays 5 status categories with:
     - Color-coded indicators
     - Absolute counts
     - Percentage bars
     - Progress bar visualization

### Bottom Section
- **RemindersWidget** — Displays upcoming reminders and tasks
- **BirthdayWidget** — Displays upcoming team member birthdays

---

## Calculated Metrics

### Conversion Rate
```
conversionRate = (demoDoneLeads / totalCalls) × 100
```
Measures how many calls result in successful demos.

### Answer Rate
```
answerRate = (answeredCalls / totalCalls) × 100
```
Measures call connection success rate.

---

## State Management

| State Variable | Type | Source | Purpose |
|---|---|---|---|
| `leads` | `Lead[]` | `useASELead()` | Array of lead records |
| `leadsTotalCount` | `number` | `useASELead()` | Total lead count |
| `leadsStats` | `object` | `useASELead()` | Lead status breakdown |
| `customers` | `Customer[]` | `useASECustomers()` | Array of customer/call records |
| `customerStats` | `object` | Local state | Fetched call statistics |
| `teamPerformance` | `object` | Local state | Team performance data |
| `tasks` | `object[]` | Local state | ASE lead tasks list |
| `todayFollowUps` | `number` | Local state | Count of follow-ups due today |
| `overdueCount` | `number` | Local state | Count of overdue items |
| `teamCount` | `number` | Local state | Manager + employee count |

---

## Animations

All stat cards and charts use staggered animation delays for smooth entry:
- Stat cards: 0ms, 50ms, 100ms, 150ms (first row), 200ms, 250ms, 300ms, 350ms (second row)
- Charts: 0ms (lead chart), 150ms (call chart)
- Animation class: `animate-slide-up`

---

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| `< md` | Single column, reduced padding (p-3), smaller spacing |
| `md - lg` | Stat cards: 2 columns, charts: stacked |
| `≥ lg` | Stat cards: 4 columns, charts: 2 columns side-by-side |

---

## Color Coding

### Call Status Colors
- **Answered**: Green (`bg-green-500`)
- **Pending**: Orange (`bg-orange-500`)
- **Not Answered**: Red (`bg-red-500`)
- **Busy**: Yellow (`bg-yellow-500`)
- **Not Interested**: Gray (`bg-gray-500`)

### Performance Indicators
- **Positive**: Green (high answer rate, good conversion)
- **Neutral**: Orange (medium performance)
- **Negative**: Red (low performance)

---

## Navigation

All stat cards are clickable and navigate to filtered views:
- `/admin/ase-customers` — All calls
- `/admin/ase-customers?status={status}` — Filtered by call status
- `/admin/ase-leads` — All leads
- `/admin/ase-leads?status={status}` — Filtered by lead status

---

## Error Handling

- Call statistics fetch errors are logged to console via `logger.error()`
- Failed stats fetch falls back to calculating from in-memory customer data
- No UI error state displayed (graceful degradation)

---

## Dependencies

### External Components
- `TopBar` — Page header
- `StatCard` — Metric display cards
- `ASELeadStatusChart` — Lead status chart component
- `RemindersWidget` — Reminder/task widget
- `BirthdayWidget` — Birthday calendar widget
- `AnnouncementBanner` — System announcements

### Contexts
- `useASELead()` — Lead data and statistics
- `useASECustomers()` — Customer/call data

### Services
- `ASECustomerService.getStats()` — Fetch call statistics from API
- `ASECustomerService.getTeamPerformance()` — Fetch team performance metrics
- `ASECustomerService.getOverdueCount()` — Fetch count of overdue items
- `ASECustomerService.getFollowUps()` — Fetch today's follow-up count
- `apiClient.get('/accounts/users/')` — Fetch team member list
- `apiClient.get('/ase-leads/tasks/')` — Fetch ASE lead tasks

### Icons (lucide-react)
- `PhoneCall`, `CheckCircle`, `XCircle`, `Clock`, `Briefcase`, `Users`, `TrendingUp`, `AlertCircle`, `ListChecks`, `CalendarCheck`, `Target`

---

## Future Enhancements

1. **Real-time Updates** — WebSocket integration for live metric updates
2. **Date Range Filters** — Add time period selection (today, week, month)
3. **Export Functionality** — Add dashboard data export options
4. **Drill-down Charts** — Make chart segments clickable for filtered views

---

## Change History

**2026-01** — Initial implementation. Created unified ASE Technologies dashboard combining call activity and lead pipeline metrics with clickable stat cards, status distribution charts, and responsive layout.

**2026-05** — Added `BirthdayWidget` to bottom section for upcoming team birthdays. Added `apiClient` for direct API calls (users list, tasks). Expanded state to include `teamPerformance`, `tasks`, `todayFollowUps`, and `overdueCount`. Added new icons: `ListChecks`, `CalendarCheck`, `Target`.
