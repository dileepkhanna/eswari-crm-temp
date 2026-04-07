import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useCapital } from '@/contexts/CapitalCustomerContext';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, RefreshCw, Upload, Download } from 'lucide-react';
import { CapitalTask } from '@/services/capital.service';
import CapitalTaskModal from '@/components/capital/CapitalTaskModal';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const STATUS_COLORS: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  follow_up: 'bg-yellow-100 text-yellow-700',
  document_collection: 'bg-orange-100 text-orange-700',
  processing: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600', medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700',
};

export default function AdminCapitalTasks() {
  const { tasks, loans, services, employees, currentUserId, currentUserRole,
    loadingTasks, addTask, updateTask, deleteTask, refreshTasks, bulkImportTasks } = useCapital();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [linkFilter, setLinkFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CapitalTask | null>(null);

  const filtered = tasks.filter(t => {
    const matchSearch = !search || [t.title, t.loan_name, t.service_name, t.assigned_to_name].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !statusFilter || t.status === statusFilter;
    const matchPriority = !priorityFilter || t.priority === priorityFilter;
    const matchAssignee = !assigneeFilter || String(t.assigned_to) === assigneeFilter;
    const matchLink = !linkFilter
      || (linkFilter === 'loan' && t.loan)
      || (linkFilter === 'service' && t.service)
      || (linkFilter === 'none' && !t.loan && !t.service);
    return matchSearch && matchStatus && matchPriority && matchAssignee && matchLink;
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(t => t.id)));
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} task(s)?`)) return;
    await Promise.all([...selected].map(id => deleteTask(id)));
    setSelected(new Set());
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(id);
  };

  const handleExport = () => {
    const data = filtered.map(t => ({
      Title: t.title, Description: t.description || '',
      Status: t.status.replace(/_/g, ' '), Priority: t.priority,
      'Linked Loan': t.loan_name || '', 'Loan Phone': t.loan_phone || '',
      'Linked Service': t.service_name || '', 'Service Type': t.service_type_display || '',
      'Assigned To': t.assigned_to_name || '',
      'Due Date': t.due_date ? format(new Date(t.due_date), 'yyyy-MM-dd HH:mm') : '',
      'Created At': format(new Date(t.created_at), 'yyyy-MM-dd'),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, `capital-tasks-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      Title: 'Follow up with client', Description: 'Call and confirm documents',
      Status: 'in progress', Priority: 'medium',
      'Due Date': '2025-06-01 10:00',
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, 'tasks-template.xlsx');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      await bulkImportTasks(rows.map(r => ({
        title: r['Title'] || '',
        description: r['Description'] || '',
        status: r['Status']?.toLowerCase().replace(/ /g, '_') || 'in_progress',
        priority: r['Priority']?.toLowerCase() || 'medium',
        due_date: r['Due Date'] || undefined,
      })));
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Eswari Capital — Tasks" subtitle="Follow-up tasks for loans and services" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="px-3 py-1.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Status</option>
              <option value="in_progress">In Progress</option>
              <option value="follow_up">Follow Up</option>
              <option value="document_collection">Document Collection</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}
              className="px-3 py-1.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Assignees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={linkFilter} onChange={e => setLinkFilter(e.target.value)}
              className="px-3 py-1.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Links</option>
              <option value="loan">Linked to Loan</option>
              <option value="service">Linked to Service</option>
              <option value="none">Unlinked</option>
            </select>
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
              <span className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-full text-sm hover:bg-muted cursor-pointer"><Upload className="w-3.5 h-3.5" />Import</span>
            </label>
            <Button variant="outline" size="sm" className="rounded-full" onClick={downloadTemplate}><Download className="w-3.5 h-3.5 mr-1" />Template</Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1" />Export ({filtered.length})</Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={refreshTasks}><RefreshCw className="w-3.5 h-3.5" /></Button>
            <Button size="sm" className="rounded-full" onClick={() => { setEditing(null); setIsModalOpen(true); }}><Plus className="w-3.5 h-3.5 mr-1" />Add Task</Button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button size="sm" variant="destructive" className="rounded-full h-7 text-xs" onClick={handleBulkDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
            </Button>
            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        <div className="glass-card rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground text-xs">
              <th className="py-3 px-4 w-8"><input type="checkbox" className="rounded" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} /></th>
              <th className="text-left py-3 px-4">Title</th>
              <th className="text-left py-3 px-4">Linked To</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Priority</th>
              <th className="text-left py-3 px-4">Assigned To</th>
              <th className="text-left py-3 px-4">Due Date</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr></thead>
            <tbody>
              {loadingTasks ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No tasks found</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className={`border-b hover:bg-muted/30 transition-colors ${selected.has(t.id) ? 'bg-primary/5' : ''}`}>
                  <td className="py-3 px-4"><input type="checkbox" className="rounded" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} /></td>
                  <td className="py-3 px-4 font-medium">{t.title || '—'}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    {t.loan_name && <div><span className="font-medium text-blue-600">Loan:</span> {t.loan_name} · {t.loan_phone}</div>}
                    {t.service_name && <div><span className="font-medium text-orange-600">Service:</span> {t.service_name} · {t.service_type_display}</div>}
                    {!t.loan_name && !t.service_name && '—'}
                  </td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-700'}`}>{t.status.replace(/_/g, ' ')}</span></td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[t.priority] || ''}`}>{t.priority}</span></td>
                  <td className="py-3 px-4 text-muted-foreground">{t.assigned_to_name || '—'}</td>
                  <td className="py-3 px-4 text-muted-foreground">{t.due_date ? format(new Date(t.due_date), 'MMM dd, yyyy') : '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(t); setIsModalOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <CapitalTaskModal
          task={editing}
          loans={loans}
          services={services}
          employees={employees}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => { setIsModalOpen(false); setEditing(null); }}
          onSave={async (data) => {
            if (editing) await updateTask(editing.id, data);
            else await addTask(data);
            setIsModalOpen(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}
