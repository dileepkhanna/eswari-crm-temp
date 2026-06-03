import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useASEWebSocket } from '@/hooks/useASEWebSocket';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Plus, Trash2, MoreHorizontal, Eye, Edit, Calendar, CheckCircle,
  ListTodo, Loader2, ChevronLeft, ChevronRight, X, SlidersHorizontal } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, subMonths } from 'date-fns';
import { toast } from 'sonner';

interface ASETask {
  id: number;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  status: string;
  due_date: string;
  completed_at: string | null;
  assigned_to: number;
  assigned_to_name: string | null;
  created_by_name: string | null;
  assigned_by_name: string | null;
  closed_by_name: string | null;
  lead: number | null;
  lead_company_name?: string;
  lead_contact_person?: string;
  lead_phone?: string;
  is_overdue: boolean;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-orange-50 text-orange-700 border-orange-300' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  { value: 'completed', label: 'Completed', color: 'bg-green-50 text-green-700 border-green-300' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-50 text-gray-500 border-gray-300' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-gray-50 text-gray-600 border-gray-300' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
  { value: 'high', label: 'High', color: 'bg-orange-50 text-orange-700 border-orange-300' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-50 text-red-700 border-red-300' },
];

const TASK_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'research', label: 'Research' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'followup', label: 'Follow Up' },
  { value: 'other', label: 'Other' },
];

function StatusChip({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find(s => s.value === status);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${opt?.color || 'bg-gray-50 text-gray-600 border-gray-300'}`}>
      {opt?.label || status}
    </span>
  );
}

function PriorityChip({ priority }: { priority: string }) {
  const opt = PRIORITY_OPTIONS.find(p => p.value === priority);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${opt?.color || ''}`}>
      {opt?.label || priority}
    </span>
  );
}

// Generate last 12 months options
function getMonthOptions() {
  const options = [{ value: 'all', label: 'All Months' }];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    options.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMM yyyy'),
    });
  }
  return options;
}
const MONTH_OPTIONS = getMonthOptions();

export default function AdminASETasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ASETask[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [quickDateFilter, setQuickDateFilter] = useState<string>('all');

  // Employees list for filter
  const [employees, setEmployees] = useState<{ id: number; name: string }[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Create/Edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ASETask | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('followup');
  const [formPriority, setFormPriority] = useState('medium');
  const [formDueDate, setFormDueDate] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Detail view
  const [viewingTask, setViewingTask] = useState<ASETask | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      // my-tasks handles role-based visibility: admin/manager see all, employees see their own
      let url = `/ase-leads/tasks/my-tasks/?page=${page}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (priorityFilter !== 'all') url += `&priority=${priorityFilter}`;
      if (typeFilter !== 'all') url += `&task_type=${typeFilter}`;
      if (employeeFilter !== 'all') url += `&assigned_to=${employeeFilter}`;
      const res = await apiClient.get(url);
      setTasks(res.results || []);
      setCount(res.count || 0);
      setTotalPages(res.total_pages || Math.ceil((res.count || 0) / 20) || 1);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  }, [page, statusFilter, priorityFilter, typeFilter, employeeFilter, user?.role]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Build employees list from tasks that have been loaded (only users who have tasks)
  useEffect(() => {
    if (tasks.length === 0) return;
    const seen = new Map<number, string>();
    tasks.forEach(task => {
      if (task.assigned_to && task.assigned_to_name) {
        // Extract first name only (before first space)
        const firstName = task.assigned_to_name.split(' ')[0];
        seen.set(task.assigned_to, firstName);
      }
    });
    const mapped = Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
    setEmployees(mapped);
  }, [tasks]);

  // Real-time updates via WebSocket
  useASEWebSocket('tasks', () => { fetchTasks(); });

  // Client-side filters (search + date + month + quickDate)
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        task.title.toLowerCase().includes(q) ||
        (task.lead_company_name || '').toLowerCase().includes(q) ||
        (task.lead_contact_person || '').toLowerCase().includes(q) ||
        (task.assigned_to_name || '').toLowerCase().includes(q);

      // Quick date filter
      let matchesQuick = true;
      if (quickDateFilter !== 'all' && task.due_date) {
        const now = new Date();
        const d = new Date(task.due_date);
        if (quickDateFilter === 'today') {
          matchesQuick = format(d, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
        } else if (quickDateFilter === 'this_week') {
          const weekStart = startOfDay(new Date(now.setDate(now.getDate() - now.getDay())));
          const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
          matchesQuick = d >= weekStart && d <= weekEnd;
        } else if (quickDateFilter === 'this_month') {
          matchesQuick = format(d, 'yyyy-MM') === format(new Date(), 'yyyy-MM');
        } else if (quickDateFilter === 'last_month') {
          const lm = subMonths(new Date(), 1);
          matchesQuick = format(d, 'yyyy-MM') === format(lm, 'yyyy-MM');
        } else if (quickDateFilter === 'last_3_months') {
          const threeAgo = subMonths(new Date(), 3);
          matchesQuick = d >= startOfDay(threeAgo);
        }
      }

      // Month filter
      let matchesMonth = true;
      if (monthFilter !== 'all' && task.due_date) {
        matchesMonth = format(new Date(task.due_date), 'yyyy-MM') === monthFilter;
      }

      // Date range filter
      let matchesDate = true;
      if (dateRange.from && dateRange.to) {
        matchesDate = isWithinInterval(new Date(task.due_date), { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
      } else if (dateRange.from) {
        matchesDate = new Date(task.due_date) >= startOfDay(dateRange.from);
      }

      return matchesSearch && matchesQuick && matchesMonth && matchesDate;
    });
  }, [tasks, searchQuery, dateRange, monthFilter, quickDateFilter]);

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      if (newStatus === 'completed') {
        await apiClient.post(`/ase-leads/tasks/${taskId}/complete/`, {});
      } else {
        await apiClient.patch(`/ase-leads/tasks/${taskId}/`, { status: newStatus });
      }
      toast.success('Status updated');
      fetchTasks();
    } catch { toast.error('Failed to update status'); }
  };

  const handleDelete = async (taskId: number) => {
    try {
      await apiClient.delete(`/ase-leads/tasks/${taskId}/delete/`);
      toast.success('Task deleted');
      fetchTasks();
    } catch { toast.error('Failed to delete'); }
  };

  const handleBulkDelete = async () => {
    let success = 0;
    for (const id of selectedIds) {
      try { await apiClient.delete(`/ase-leads/tasks/${id}/delete/`); success++; } catch {}
    }
    toast.success(`${success} task(s) deleted`);
    setSelectedIds(new Set());
    setShowDeleteDialog(false);
    fetchTasks();
  };

  const openCreateForm = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormType('followup');
    setFormPriority('medium');
    setFormDescription('');
    const t = new Date(); t.setDate(t.getDate() + 1);
    setFormDueDate(t.toISOString().slice(0, 16));
    setFormOpen(true);
  };

  const openEditForm = (task: ASETask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormType(task.task_type);
    setFormPriority(task.priority);
    setFormDueDate(task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '');
    setFormDescription(task.description || '');
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formTitle.trim()) { toast.error('Title is required'); return; }
    if (!formDueDate) { toast.error('Due date is required'); return; }
    try {
      setFormLoading(true);
      if (editingTask) {
        await apiClient.patch(`/ase-leads/tasks/${editingTask.id}/`, {
          title: formTitle.trim(),
          task_type: formType,
          priority: formPriority,
          due_date: new Date(formDueDate).toISOString(),
          description: formDescription.trim() || undefined,
        });
        toast.success('Task updated');
      } else {
        await apiClient.post('/ase-leads/tasks/', {
          title: formTitle.trim(),
          task_type: formType,
          priority: formPriority,
          due_date: new Date(formDueDate).toISOString(),
          description: formDescription.trim() || undefined,
        });
        toast.success('Task created');
      }
      setFormOpen(false);
      fetchTasks();
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setFormLoading(false); }
  };

  const allSelected = filteredTasks.length > 0 && filteredTasks.every(t => selectedIds.has(t.id));
  const someSelected = selectedIds.size > 0;
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredTasks.map(t => t.id)));
  };
  const toggleSelect = (id: number) => {
    const s = new Set(selectedIds);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelectedIds(s);
  };

  const activeFilterCount = [
    statusFilter !== 'all',
    priorityFilter !== 'all',
    typeFilter !== 'all',
    employeeFilter !== 'all',
    monthFilter !== 'all',
    quickDateFilter !== 'all',
    !!(dateRange.from),
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen">
      <TopBar title="ASE Tasks" subtitle="Manage tasks converted from leads" />
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">

        {/* Stat Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: count, color: 'text-blue-600', bg: 'bg-blue-50', icon: <ListTodo className="w-4 h-4 text-blue-600" /> },
            { label: 'Pending', value: tasks.filter(t => t.status === 'pending').length, color: 'text-orange-600', bg: 'bg-orange-50', icon: <Calendar className="w-4 h-4 text-orange-600" /> },
            { label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: 'text-blue-700', bg: 'bg-blue-50', icon: <Loader2 className="w-4 h-4 text-blue-700" /> },
            { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: 'text-green-600', bg: 'bg-green-50', icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
          ].map(card => (
            <div key={card.label} className="bg-white dark:bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
              <div className={`w-9 h-9 rounded-full ${card.bg} flex items-center justify-center shrink-0`}>
                {card.icon}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-none mb-0.5">{card.label}</p>
                <p className={`text-2xl font-bold leading-none ${card.color}`}>{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Top bar: Search + Filter button */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks by title, company, contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 w-full"
            />
          </div>

          {/* Filter button */}
          <Button
            variant={activeFilterCount > 0 ? 'default' : 'outline'}
            className="h-10 px-4 gap-2 shrink-0"
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-white/25 text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Active filter badges */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {statusFilter !== 'all' && (
              <span className="h-6 px-2 text-[10px] rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                {STATUS_OPTIONS.find(s => s.value === statusFilter)?.label}
                <button onClick={() => setStatusFilter('all')}><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
            {priorityFilter !== 'all' && (
              <span className="h-6 px-2 text-[10px] rounded-full bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1">
                {PRIORITY_OPTIONS.find(p => p.value === priorityFilter)?.label}
                <button onClick={() => setPriorityFilter('all')}><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
            {typeFilter !== 'all' && (
              <span className="h-6 px-2 text-[10px] rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                {TASK_TYPES.find(t => t.value === typeFilter)?.label}
                <button onClick={() => setTypeFilter('all')}><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
            {employeeFilter !== 'all' && (
              <span className="h-6 px-2 text-[10px] rounded-full bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                {employees.find(e => String(e.id) === employeeFilter)?.name || 'Employee'}
                <button onClick={() => setEmployeeFilter('all')}><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
            {monthFilter !== 'all' && (
              <span className="h-6 px-2 text-[10px] rounded-full bg-teal-100 text-teal-700 border border-teal-200 flex items-center gap-1">
                {MONTH_OPTIONS.find(m => m.value === monthFilter)?.label}
                <button onClick={() => setMonthFilter('all')}><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
            {dateRange.from && (
              <span className="h-6 px-2 text-[10px] rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                {format(dateRange.from, 'MMM dd')}{dateRange.to && ` - ${format(dateRange.to, 'MMM dd')}`}
                <button onClick={() => setDateRange({})}><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
            <button
              className="h-6 px-2 text-[10px] rounded-full bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-colors"
              onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setTypeFilter('all'); setEmployeeFilter('all'); setMonthFilter('all'); setQuickDateFilter('all'); setDateRange({}); setPage(1); }}
            >
              Clear all
            </button>
          </div>
        )}

        {/* Filter Sheet Panel */}
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <SlidersHorizontal className="w-5 h-5" />
                Advanced Filters
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6">
              {/* Quick Select buttons */}
              <div>
                <label className="text-sm font-medium mb-3 block">Quick Select</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={quickDateFilter === 'this_month' ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => { setQuickDateFilter('this_month'); setMonthFilter('all'); setDateRange({}); }}
                  >
                    This Month
                  </Button>
                  <Button
                    variant={quickDateFilter === 'last_month' ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => { setQuickDateFilter('last_month'); setMonthFilter('all'); setDateRange({}); }}
                  >
                    Last Month
                  </Button>
                  <Button
                    variant={quickDateFilter === 'last_3_months' ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => { setQuickDateFilter('last_3_months'); setMonthFilter('all'); setDateRange({}); }}
                  >
                    Last 3 Months
                  </Button>
                  <Button
                    variant={quickDateFilter === 'this_week' ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => { setQuickDateFilter('this_week'); setMonthFilter('all'); setDateRange({}); }}
                  >
                    This Week
                  </Button>
                  <Button
                    variant={quickDateFilter === 'today' ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => { setQuickDateFilter('today'); setMonthFilter('all'); setDateRange({}); }}
                  >
                    Today
                  </Button>
                  <Button
                    variant={quickDateFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => { setQuickDateFilter('all'); setMonthFilter('all'); setDateRange({}); }}
                  >
                    All Time
                  </Button>
                </div>
              </div>

              {/* Task Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Task Status</label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="h-10 w-full"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
                  <SelectTrigger className="h-10 w-full"><SelectValue placeholder="All Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Task Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Task Type</label>
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                  <SelectTrigger className="h-10 w-full"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Employee / Created By — admin & manager only */}
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Created By</label>
                  <Select value={employeeFilter} onValueChange={(v) => { setEmployeeFilter(v); setPage(1); }}>
                    <SelectTrigger className="h-10 w-full"><SelectValue placeholder="All Creators" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Creators</SelectItem>
                      {employees.length === 0 && (
                        <SelectItem value="loading" disabled>Loading employees...</SelectItem>
                      )}
                      {employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filter by Month */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by Month</label>
                <Select value={monthFilter} onValueChange={(v) => { setMonthFilter(v); setQuickDateFilter('all'); setDateRange({}); setPage(1); }}>
                  <SelectTrigger className="h-10 w-full"><SelectValue placeholder="All Months" /></SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-10 justify-start text-left font-normal">
                        <span className="text-xs truncate">
                          {dateRange.from ? format(dateRange.from, 'MMM dd, yyyy') : 'From'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => { setDateRange({ ...dateRange, from: date }); setQuickDateFilter('all'); setMonthFilter('all'); }}
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-10 justify-start text-left font-normal">
                        <span className="text-xs truncate">
                          {dateRange.to ? format(dateRange.to, 'MMM dd, yyyy') : 'To'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => { setDateRange({ ...dateRange, to: date }); setQuickDateFilter('all'); setMonthFilter('all'); }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {(dateRange.from || dateRange.to) && (
                  <Button variant="ghost" size="sm" className="w-full h-8 text-xs mt-1" onClick={() => setDateRange({})}>
                    <X className="w-3 h-3 mr-1" /> Clear custom dates
                  </Button>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setTypeFilter('all'); setEmployeeFilter('all'); setMonthFilter('all'); setQuickDateFilter('all'); setDateRange({}); setPage(1); }}
                >
                  Clear All
                </Button>
                <Button className="flex-1" onClick={() => setFilterOpen(false)}>
                  Apply
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Actions bar */}
        <div className="flex gap-2 flex-wrap justify-between items-center">
          <div className="flex gap-2 items-center">
            {someSelected && (
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete ({selectedIds.size})
              </Button>
            )}
            <span className="text-sm text-muted-foreground">{count} task(s)</span>
          </div>
          <Button onClick={openCreateForm} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Add Task
          </Button>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No tasks found</p>
            </div>
          ) : filteredTasks.map((task) => (
            <div key={task.id} className={`glass-card rounded-xl p-4 animate-fade-in ${task.is_overdue && task.status !== 'completed' ? 'border-red-300 bg-red-50/20' : ''}`}>
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{task.title}</p>
                  {task.lead_company_name && <p className="text-xs text-muted-foreground">{task.lead_company_name}</p>}
                </div>
                <StatusChip status={task.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                <div><p className="text-xs text-muted-foreground">Type</p><p className="text-xs font-medium">{TASK_TYPES.find(t => t.value === task.task_type)?.label || task.task_type}</p></div>
                <div><p className="text-xs text-muted-foreground">Due</p><p className="text-xs font-medium">{task.due_date ? format(new Date(task.due_date), 'MMM dd') : '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Priority</p><PriorityChip priority={task.priority} /></div>
                <div><p className="text-xs text-muted-foreground">Assigned To</p><p className="text-xs font-medium">{task.assigned_to_name?.split(' ')[0] || '-'}</p></div>
              </div>
              {task.is_overdue && task.status !== 'completed' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded mb-2 inline-block">Overdue</span>}
              <div className="flex gap-2 flex-wrap items-center mt-2">
                {/* Compact status badge dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium cursor-pointer hover:opacity-80 ${STATUS_OPTIONS.find(s => s.value === task.status)?.color || 'bg-gray-50 text-gray-600 border-gray-300'}`}>
                      {STATUS_OPTIONS.find(s => s.value === task.status)?.label || task.status}
                      <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40 z-50">
                    {STATUS_OPTIONS.map(s => (
                      <DropdownMenuItem
                        key={s.value}
                        onClick={() => handleStatusChange(task.id, s.value)}
                        className={`cursor-pointer text-xs ${task.status === s.value ? 'bg-primary/10 text-primary font-medium' : ''}`}
                      >
                        {s.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-blue-500" onClick={() => setViewingTask(task)}>
                  <Eye className="w-3.5 h-3.5 mr-1" /> View
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={() => openEditForm(task)}>
                  <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="glass-card rounded-2xl overflow-hidden hidden md:block">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No tasks found. Create one or convert a lead to a task.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 p-2"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} /></TableHead>
                <TableHead className="font-semibold p-2 text-xs">Title</TableHead>
                <TableHead className="font-semibold p-2 text-xs">Company</TableHead>
                <TableHead className="font-semibold p-2 text-xs">Type</TableHead>
                <TableHead className="font-semibold p-2 text-xs">Status</TableHead>
                <TableHead className="font-semibold p-2 text-xs">Priority</TableHead>
                <TableHead className="font-semibold p-2 text-xs">Assigned To</TableHead>
                <TableHead className="font-semibold p-2 text-xs">Due Date</TableHead>
                <TableHead className="font-semibold p-2 text-xs">Created</TableHead>
                <TableHead className="font-semibold p-2 text-xs w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.id} className={`hover:bg-muted/50 ${task.is_overdue && task.status !== 'completed' ? 'bg-red-50/30' : ''}`}>
                  <TableCell className="p-2"><Checkbox checked={selectedIds.has(task.id)} onCheckedChange={() => toggleSelect(task.id)} /></TableCell>
                  <TableCell className="p-2">
                    <p className="font-medium text-sm truncate max-w-[180px]">{task.title}</p>
                    {task.is_overdue && task.status !== 'completed' && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Overdue</span>}
                  </TableCell>
                  <TableCell className="p-2"><p className="text-xs truncate max-w-[120px]">{task.lead_company_name || '-'}</p></TableCell>
                  <TableCell className="p-2"><span className="text-xs">{TASK_TYPES.find(t => t.value === task.task_type)?.label || task.task_type}</span></TableCell>
                  <TableCell className="p-2">
                    <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                      <SelectTrigger className="w-28 h-7 text-xs"><StatusChip status={task.status} /></SelectTrigger>
                      <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-2"><PriorityChip priority={task.priority} /></TableCell>
                  <TableCell className="p-2"><span className="text-xs text-muted-foreground truncate block max-w-[100px]">{task.assigned_to_name?.split(' ')[0] || '-'}</span></TableCell>
                  <TableCell className="p-2">
                    {task.due_date ? <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="w-3 h-3" />{format(new Date(task.due_date), 'MMM dd')}</div> : '-'}
                  </TableCell>
                  <TableCell className="p-2"><span className="text-xs text-muted-foreground">{format(new Date(task.created_at), 'MMM dd')}</span></TableCell>
                  <TableCell className="p-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-3 h-3" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingTask(task)}><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditForm(task)}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                        {task.status !== 'completed' && <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'completed')}><CheckCircle className="w-4 h-4 mr-2" /> Complete</DropdownMenuItem>}
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(task.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, count)} of {count} tasks
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(1)}>«</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`e-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={page === p ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => setPage(p as number)}
                    >{p}</Button>
                  )
                )}
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</Button>
            </div>
          </div>
        )}

        {/* Create/Edit Task Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Task title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formPriority} onValueChange={setFormPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Due Date <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={handleFormSubmit} disabled={formLoading}>
                {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingTask ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Task Detail Dialog */}
        <Dialog open={!!viewingTask} onOpenChange={(open) => { if (!open) setViewingTask(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Task Details</DialogTitle></DialogHeader>
            {viewingTask && (
              <div className="space-y-4 py-2">
                <div>
                  <p className="text-lg font-semibold">{viewingTask.title}</p>
                  {viewingTask.lead_company_name && <p className="text-sm text-muted-foreground">{viewingTask.lead_company_name} · {viewingTask.lead_contact_person}</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <StatusChip status={viewingTask.status} />
                  <PriorityChip priority={viewingTask.priority} />
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-300">{TASK_TYPES.find(t => t.value === viewingTask.task_type)?.label || viewingTask.task_type}</span>
                  {viewingTask.is_overdue && viewingTask.status !== 'completed' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Overdue</span>}
                </div>
                {viewingTask.description && (
                  <div><p className="text-xs font-medium text-muted-foreground mb-1">Description</p><p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{viewingTask.description}</p></div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Due Date</p><p className="font-medium">{viewingTask.due_date ? format(new Date(viewingTask.due_date), 'MMM dd, yyyy hh:mm a') : '-'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Created</p><p className="font-medium">{format(new Date(viewingTask.created_at), 'MMM dd, yyyy')}</p></div>
                  <div><p className="text-xs text-muted-foreground">Assigned To</p><p className="font-medium">{viewingTask.assigned_to_name || '-'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Created By</p><p className="font-medium">{viewingTask.created_by_name || '-'}</p></div>
                  {viewingTask.completed_at && <div><p className="text-xs text-muted-foreground">Completed</p><p className="font-medium">{format(new Date(viewingTask.completed_at), 'MMM dd, yyyy')}</p></div>}
                  {viewingTask.closed_by_name && <div><p className="text-xs text-muted-foreground">Closed By</p><p className="font-medium">{viewingTask.closed_by_name}</p></div>}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingTask(null)}>Close</Button>
              {viewingTask && viewingTask.status !== 'completed' && (
                <Button onClick={() => { handleStatusChange(viewingTask.id, 'completed'); setViewingTask(null); }}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.size} task(s)?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}
