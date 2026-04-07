import { useState } from 'react';
import { CapitalCustomer } from '@/services/capital.service';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const inp = 'w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary';

const INTEREST_OPTIONS = [
  { value: 'none', label: 'Not Decided' },
  { value: 'loan', label: 'Loan' },
  { value: 'gst', label: 'GST Service' },
  { value: 'msme', label: 'MSME Service' },
  { value: 'itr', label: 'Income Tax Filing' },
];

const INTEREST_COLORS: Record<string, string> = {
  loan: 'bg-blue-100 text-blue-700',
  gst: 'bg-orange-100 text-orange-700',
  msme: 'bg-teal-100 text-teal-700',
  itr: 'bg-indigo-100 text-indigo-700',
  none: 'bg-gray-100 text-gray-500',
};

export { INTEREST_OPTIONS, INTEREST_COLORS };

interface Props {
  customer: CapitalCustomer | null;
  employees: { id: string; name: string }[];
  currentUserId: string;
  currentUserRole: string;
  onClose: () => void;
  onSave: (data: Partial<CapitalCustomer>) => Promise<void>;
}

export default function CapitalCustomerModal({ customer, employees, currentUserId, currentUserRole, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    company_name: customer?.company_name || '',
    call_status: customer?.call_status || 'pending',
    interest: customer?.interest || 'none',
    notes: customer?.notes || '',
    assigned_to: customer?.assigned_to?.toString() || currentUserId,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone) return;
    setSaving(true);
    await onSave({ ...form, assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{customer ? 'Edit Customer' : 'Add Customer'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="text-sm font-medium">Name</label>
            <input className={inp} value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><label className="text-sm font-medium">Phone *</label>
            <input required className={inp} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div><label className="text-sm font-medium">Email</label>
            <input type="email" className={inp} value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div><label className="text-sm font-medium">Company Name</label>
            <input className={inp} value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} /></div>

          {/* Interest — what service does the customer want */}
          <div>
            <label className="text-sm font-medium">Interested In</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({...form, interest: opt.value})}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    form.interest === opt.value
                      ? `${INTEREST_COLORS[opt.value]} border-transparent ring-2 ring-offset-1 ring-primary`
                      : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div><label className="text-sm font-medium">Call Status</label>
            <select className={inp} value={form.call_status} onChange={e => setForm({...form, call_status: e.target.value})}>
              <option value="pending">Pending</option>
              <option value="answered">Answered</option>
              <option value="not_answered">Not Answered</option>
              <option value="busy">Busy</option>
              <option value="not_interested">Not Interested</option>
            </select></div>
          <div><label className="text-sm font-medium">Assigned To</label>
            {currentUserRole === 'employee' ? (
              <input readOnly className={`${inp} bg-muted cursor-not-allowed`} value={employees.find(e => e.id === currentUserId)?.name || 'You'} />
            ) : (
              <select className={inp} value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})}>
                <option value="">Unassigned</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}{e.id === currentUserId ? ' (You)' : ''}</option>)}
              </select>
            )}
          </div>
          <div><label className="text-sm font-medium">Notes</label>
            <textarea rows={2} className={inp} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
