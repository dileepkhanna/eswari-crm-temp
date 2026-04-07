import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { CapitalTask, CapitalLoan, CapitalService } from '@/services/capital.service';

interface Employee { id: string; name: string; role: string; }

interface Props {
  task: CapitalTask | null;
  loans: CapitalLoan[];
  services: CapitalService[];
  employees: Employee[];
  currentUserId: string;
  currentUserRole: string;
  preselectedLoan?: string;
  preselectedService?: string;
  onClose: () => void;
  onSave: (data: Partial<CapitalTask>) => Promise<void>;
}

const STATUS_OPTIONS = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'document_collection', label: 'Document Collection' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function CapitalTaskModal({
  task, loans, services, employees, currentUserId, currentUserRole,
  preselectedLoan, preselectedService, onClose, onSave,
}: Props) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'in_progress',
    priority: 'medium',
    link_type: 'none' as 'none' | 'loan' | 'service',
    loan: '' as string | number,
    service: '' as string | number,
    assigned_to: '' as string | number,
    due_date: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'in_progress',
        priority: task.priority || 'medium',
        link_type: task.loan ? 'loan' : task.service ? 'service' : 'none',
        loan: task.loan ?? '',
        service: task.service ?? '',
        assigned_to: task.assigned_to ?? '',
        due_date: task.due_date ? task.due_date.slice(0, 16) : '',
      });
    } else if (preselectedLoan) {
      setForm(f => ({ ...f, link_type: 'loan', loan: preselectedLoan, assigned_to: currentUserId }));
    } else if (preselectedService) {
      setForm(f => ({ ...f, link_type: 'service', service: preselectedService, assigned_to: currentUserId }));
    } else {
      setForm(f => ({ ...f, assigned_to: currentUserId }));
    }
  }, [task, currentUserId, preselectedLoan, preselectedService]);

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleLinkTypeChange = (type: 'none' | 'loan' | 'service') => {
    setForm(f => ({ ...f, link_type: type, loan: '', service: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: Partial<CapitalTask> = {
      title: form.title,
      description: form.description,
      status: form.status,
      priority: form.priority,
      loan: form.link_type === 'loan' && form.loan ? Number(form.loan) : undefined,
      service: form.link_type === 'service' && form.service ? Number(form.service) : undefined,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
      due_date: form.due_date || undefined,
    };
    await onSave(payload);
    setSaving(false);
  };

  const inputCls = 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title" required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className={inputCls} rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional notes..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Link To</label>
            <div className="flex gap-2 mb-2">
              {(['none', 'loan', 'service'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => handleLinkTypeChange(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.link_type === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}>
                  {t === 'none' ? 'None' : t === 'loan' ? 'Loan' : 'Service'}
                </button>
              ))}
            </div>
            {form.link_type === 'loan' && (
              <select className={inputCls} value={form.loan} onChange={e => set('loan', e.target.value)}>
                <option value="">Select loan...</option>
                {loans.map(l => <option key={l.id} value={l.id}>{l.applicant_name} · {l.phone}</option>)}
              </select>
            )}
            {form.link_type === 'service' && (
              <select className={inputCls} value={form.service} onChange={e => set('service', e.target.value)}>
                <option value="">Select service...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.client_name} · {s.service_type_display || s.service_type}</option>)}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Assigned To</label>
              <select className={inputCls} value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                <option value="">Unassigned</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input type="datetime-local" className={inputCls} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving...' : task ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
