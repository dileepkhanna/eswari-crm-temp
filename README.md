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
POST   /api/ase-leads/bulk-delete-by-ids/     Bulk delete by ID list
POST   /api/ase-leads/export-by-ids/          Export leads as Excel
```

---

## Real-Time Updates

WebSocket notifications are sent on data changes. Connect to:

```
ws://host/ws/notifications/?token=<jwt>
```

See `DATA_VISIBILITY_RULES.md` for event types and `WEBSOCKET_TESTING_GUIDE.md` for testing instructions.

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

## Tech Stack

**Backend**: Django 4.2, Django REST Framework, Django Channels (WebSockets), PostgreSQL, Redis, JWT auth

**Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Query, React Router

**Mobile**: Flutter (see `../eswari_crm_mobile/`)
