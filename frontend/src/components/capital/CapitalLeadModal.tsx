import { useState } from 'react';
import { CapitalLead } from '@/services/capital.service';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const inp = 'w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary';

interface Props {
  lead: CapitalLead | null;
  employees: { id: string; name: string }[];
  currentUserId: string;
  currentUserRole: string;
  onClose: () => void;
  onSave: (data: Partial<CapitalLead>) => Promise<void>;
}

export default function CapitalLeadModal({ lead, employees, currentUserId, currentUserRole, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
    address: lead?.address || '',
    status: lead?.status || 'new',
    source: lead?.source || 'website',
    description: lead?.description || '',
    assigned_to: lead?.assigned_to?.toString() || currentUserId,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...form, assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{lead ? 'Edit Lead' : 'Add Lead'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input required className={inp} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Enter name" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input className={inp} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Enter phone" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className={inp} value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Enter email" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input className={inp} value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Enter address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select className={inp} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="new">New</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
                <option value="not_interested">Not Interested</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <select className={inp} value={form.source} onChange={e => setForm({...form, source: e.target.value})}>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="call">Call</option>
                <option value="walk_in">Walk-in</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Assigned To</label>
            {currentUserRole === 'employee' ? (
              <input readOnly className={`${inp} bg-muted cursor-not-allowed`} value={employees.find(e => e.id === currentUserId)?.name || 'You'} />
            ) : (
              <select className={inp} value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})}>
                <option value="">Unassigned</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}{e.id === currentUserId ? ' (You)' : ''}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea rows={2} className={inp} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Add notes..." />
          </div>
          <div className="flex gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
