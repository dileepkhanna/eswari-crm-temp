# Unified Analytics API

Cross-company reporting and analytics dashboard endpoints for the Eswari CRM platform.

> **Note:** The URL prefix was renamed from `/api/analytics/` to `/api/insights/` to avoid being blocked by browser ad-blocker extensions that filter requests containing "analytics" in the path.

## Overview

The Analytics module provides admin-only endpoints for:
- Cross-company revenue and activity overview (Eswari Group, ASE Technologies, Eswari Capital)
- Lead-to-conversion funnel with time-in-stage metrics
- Employee performance scorecards across all business units
- Revenue/activity trends over time
- Scheduled report configuration

**All endpoints require authentication and admin role.**

## Base URL

```
/api/insights/
```

## Endpoints

### 1. Cross-Company Overview

```
GET /api/insights/overview/
```

Returns aggregated metrics for all 3 business units in a single response.

**Query Parameters:**
| Param  | Type   | Default | Options                              |
|--------|--------|---------|--------------------------------------|
| period | string | month   | today, week, month, quarter, year    |

**Response Structure:**
```json
{
  "period": "month",
  "period_start": "2026-05-01",
  "period_end": "2026-05-15",
  "eswari_group": {
    "leads_total": 150,
    "leads_period": 25,
    "leads_hot": 12,
    "customers_total": 80,
    "customers_period": 5
  },
  "ase_technologies": {
    "leads_total": 200,
    "leads_period": 40,
    "deals_won": 8,
    "revenue": 450000.0,
    "pipeline_value": 1200000.0
  },
  "eswari_capital": {
    "customers_total": 300,
    "customers_period": 30,
    "loans_total": 50,
    "loans_period": 10,
    "loans_disbursed": 6,
    "loan_value_disbursed": 2500000.0,
    "services_total": 120,
    "services_period": 15,
    "services_completed": 10
  },
  "team": {
    "total_employees": 45,
    "pending_leaves": 3,
    "total_tasks": 200,
    "tasks_completed_period": 35
  }
}
```

---

### 2. Conversion Funnel

```
GET /api/insights/funnel/
```

Lead-to-conversion funnel with time-in-stage metrics and conversion rates.

**Query Parameters:**
| Param   | Type   | Default | Options                           |
|---------|--------|---------|-----------------------------------|
| period  | string | month   | today, week, month, quarter, year |
| company | string | all     | all, eswari, ase, capital         |

**Response includes:**
- **Eswari Group**: Lead status distribution + conversion rate to customers
- **ASE Technologies**: Full funnel with time-in-stage (days) and stage-to-stage conversion rates
- **Eswari Capital**: Loan funnel + service funnel by status

**ASE Time-in-Stage Metrics:**
- `new_to_qualified_days` — Average days from lead creation to qualification
- `qualified_to_contacted_days` — Average days from qualification to first contact
- `contacted_to_proposal_days` — Average days from contact to proposal sent
- `proposal_to_won_days` — Average days from proposal to deal close
- `total_sales_cycle_days` — Average total sales cycle length

---

### 3. Employee Scorecards

```
GET /api/insights/scorecards/
```

Per-employee performance metrics across all companies.

**Query Parameters:**
| Param   | Type   | Default | Options                           |
|---------|--------|---------|-----------------------------------|
| period  | string | month   | today, week, month, quarter, year |
| company | string | all     | all, eswari, ase, capital         |
| role    | string | all     | all, manager, employee            |

**Response:**
```json
{
  "period": "month",
  "period_start": "2026-05-01",
  "total_employees": 25,
  "scorecards": [
    {
      "id": 5,
      "name": "John Doe",
      "role": "employee",
      "company": "ASE Technologies",
      "company_code": "ASE",
      "team": "Marketing Team A",
      "designation": "BDE",
      "eswari_leads_created": 0,
      "ase_leads_created": 12,
      "ase_deals_won": 2,
      "ase_revenue": 150000.0,
      "ase_calls_made": 45,
      "capital_customers_created": 0,
      "tasks_completed": 8,
      "leaves_taken": 1,
      "total_score": 27
    }
  ]
}
```

Scorecards are sorted by `total_score` (weighted composite of activity metrics). Limited to top 50 employees for performance.

---

### 4. Revenue Trend

```
GET /api/insights/revenue-trend/
```

Revenue and activity trends over time with configurable granularity.

**Query Parameters:**
| Param       | Type   | Default | Options                           |
|-------------|--------|---------|-----------------------------------|
| period      | string | month   | week, month, quarter, year        |
| granularity | string | daily   | daily, weekly, monthly            |

**Response:**
```json
{
  "period": "month",
  "granularity": "daily",
  "period_start": "2026-05-01",
  "ase_revenue_trend": [
    {"date": "2026-05-03", "deals": 1, "revenue": 75000.0},
    {"date": "2026-05-10", "deals": 2, "revenue": 180000.0}
  ],
  "capital_loan_trend": [
    {"date": "2026-05-05", "count": 2, "value": 500000.0}
  ],
  "eswari_lead_trend": [
    {"date": "2026-05-01", "count": 5},
    {"date": "2026-05-02", "count": 3}
  ]
}
```

---

### 5. Report Schedules

```
GET  /api/insights/report-schedules/
POST /api/insights/report-schedules/
```

Manage automated report configurations.

**GET Response:**
```json
[
  {
    "id": 1,
    "name": "Weekly Overview",
    "frequency": "weekly",
    "report_type": "overview",
    "recipients": ["admin@eswari.com", "ceo@eswari.com"],
    "is_active": true,
    "last_sent_at": null,
    "next_send_at": "2026-05-19T00:00:00Z",
    "created_at": "2026-05-15T10:00:00Z"
  }
]
```

**POST Body:**
```json
{
  "name": "Monthly Revenue Report",
  "frequency": "monthly",
  "report_type": "revenue",
  "recipients": ["admin@eswari.com"],
  "is_active": true
}
```

**Frequency options:** `daily`, `weekly`, `monthly`

**Report type options:** `overview`, `funnel`, `scorecards`, `revenue`, `capital`

---

## Management Commands

### send_scheduled_reports

Sends all due scheduled reports via email. Checks for active `ReportSchedule` entries whose `next_send_at` has passed, generates the report data, emails it to the configured recipients, and updates `next_send_at` for the next cycle.

**Usage:**
```bash
python manage.py send_scheduled_reports
```

**Cron Setup (recommended):**
```bash
# Run daily at 8 AM
0 8 * * * cd /path/to/backend && python manage.py send_scheduled_reports
```

**Behavior:**
- Queries `ReportSchedule` where `is_active=True` and `next_send_at <= now`
- Generates report data based on `report_type` (overview, revenue, scorecards)
- Sends a plain-text email summary to all configured `recipients`
- Updates `last_sent_at` and calculates the next `next_send_at` based on frequency
- Logs errors for individual report failures without stopping the batch

**Email Content:**
- `overview` / `revenue` reports include metrics for all 3 business units (Eswari Group, ASE Technologies, Eswari Capital)
- `scorecards` reports include top 5 performers ranked by lead creation

**Requirements:**
- Django email backend must be configured (`DEFAULT_FROM_EMAIL`, SMTP settings, etc.)
- The `ReportSchedule` must have at least one recipient email address

---

## Caching

All analytics endpoints are cached for 5 minutes (300 seconds) to reduce database load. Cache keys are scoped by query parameters.

## Models

### ReportSchedule

| Field       | Type         | Description                          |
|-------------|--------------|--------------------------------------|
| name        | CharField    | Report name/title                    |
| frequency   | CharField    | daily, weekly, monthly               |
| report_type | CharField    | overview, funnel, scorecards, etc.   |
| recipients  | JSONField    | List of email addresses              |
| is_active   | BooleanField | Whether the schedule is active       |
| last_sent_at| DateTime     | When the report was last sent        |
| next_send_at| DateTime     | Auto-calculated next send time       |
| created_by  | ForeignKey   | Admin who created the schedule       |

## Dependencies

The analytics module queries across multiple apps:
- `accounts` (User, Company)
- `leads` (Lead)
- `ase_leads` (ASELead, ASELeadActivity)
- `capital` (CapitalLead, CapitalLoan, CapitalService, CapitalCustomer)
- `customers` (Customer)
- `tasks` (Task)
- `leaves` (Leave)
