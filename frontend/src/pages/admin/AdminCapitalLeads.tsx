import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useCapital } from '@/contexts/CapitalCustomerContext';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, RefreshCw, Upload, Download, ClipboardList } from 'lucide-react';
import { CapitalLead } from '@/services/capital.service';
import CapitalLeadModal from '@/components/capital/CapitalLeadModal';
import CapitalTaskModal from '@/components/capital/CapitalTaskModal';
import * as XLSX from 'xlsx';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', hot: 'bg-red-100 text-red-700',
  warm: 'bg-yellow-100 text-yellow-700', cold: 'bg-sky-100 text-sky-700',
  not_interested: 'bg-gray-100 text-gray-700', reminder: 'bg-purple-100 text-purple-700',
};

export default function AdminCapitalLeads() {
  const { leads, tasks, employees, currentUserId, currentUserRole, loadingLeads, addLead, updateLead, deleteLead, bulkImportLeads, refreshLeads, addTask } = useCapital();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CapitalLead | null>(null);
  const [taskLead, setTaskLead] = useState<CapitalLead | null>(null);

  const filtered = leads.filter(l => {
    const matchSearch = !search || [l.name, l.phone, l.email].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    await deleteLead(id);
  };

  const handleExport = () => {
    const data = filtered.map(l => ({ Name: l.name, Phone: l.phone, Email: l.email, Status: l.status, Source: l.source, Address: l.address, Notes: l.description, 'Assigned To': l.assigned_to_name }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, `capital-leads-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      await bulkImportLeads(rows.map(r => ({ name: r['Name'] || '', phone: String(r['Phone'] || ''), email: r['Email'] || '', address: r['Address'] || '', status: r['Status'] || 'new', source: r['Source'] || 'website', description: r['Notes'] || '' })));
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Eswari Capital — Leads" subtitle="View and manage all leads" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="px-3 py-1.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
              <option value="not_interested">Not Interested</option>
              <option value="reminder">Reminder</option>
            </select>
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
              <span className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-full text-sm hover:bg-muted cursor-pointer"><Upload className="w-3.5 h-3.5" />Import</span>
            </label>
            <Button variant="outline" size="sm" className="rounded-full" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1" />Export ({filtered.length})</Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={refreshLeads}><RefreshCw className="w-3.5 h-3.5" /></Button>
            <Button size="sm" className="rounded-full" onClick={() => { setEditing(null); setIsModalOpen(true); }}><Plus className="w-3.5 h-3.5 mr-1" />Add Lead</Button>
          </div>
        </div>

        <div className="glass-card rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground text-xs">
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Phone</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Source</th>
              <th className="text-left py-3 px-4">Tasks</th>
              <th className="text-left py-3 px-4">Assigned To</th>
              <th className="text-left py-3 px-4">Created By</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr></thead>
            <tbody>
              {loadingLeads ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No leads found</td></tr>
              ) : filtered.map(l => {
                const taskCount = tasks.filter(t => t.lead === Number(l.id)).length;
                return (
                <tr key={l.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium">{l.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{l.phone}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[l.status] || 'bg-gray-100 text-gray-700'}`}>{l.status.replace('_', ' ')}</span></td>
                  <td className="py-3 px-4 text-muted-foreground capitalize">{l.source.replace('_', ' ')}</td>
                  <td className="py-3 px-4">
                    {taskCount > 0
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{taskCount} task{taskCount > 1 ? 's' : ''}</span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{l.assigned_to_name || '—'}</td>
                  <td className="py-3 px-4 text-muted-foreground">{l.created_by_name || '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Create Task" onClick={() => setTaskLead(l)}><ClipboardList className="w-3.5 h-3.5 text-blue-500" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(l); setIsModalOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(l.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <CapitalLeadModal
          lead={editing}
          employees={employees}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => { setIsModalOpen(false); setEditing(null); }}
          onSave={async (data) => {
            if (editing) await updateLead(editing.id, data);
            else await addLead(data);
            setIsModalOpen(false); setEditing(null);
          }}
        />
      )}

      {taskLead && (
        <CapitalTaskModal
          task={null}
          leads={leads}
          employees={employees}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setTaskLead(null)}
          onSave={async (data) => {
            await addTask({ ...data, lead: Number(taskLead.id), assigned_to: data.assigned_to || taskLead.assigned_to });
            setTaskLead(null);
          }}
        />
      )}
    </div>
  );
}
