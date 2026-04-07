import { useState } from 'react';
import { CapitalLoan } from '@/services/capital.service';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const inp = 'w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary';

interface Props {
  loan: CapitalLoan | null;
  employees: { id: string; name: string }[];
  currentUserId: string;
  currentUserRole: string;
  onClose: () => void;
  onSave: (data: Partial<CapitalLoan>) => Promise<void>;
}

export default function CapitalLoanModal({ loan, employees, currentUserId, currentUserRole, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    applicant_name: loan?.applicant_name || '',
    phone: loan?.phone || '',
    email: loan?.email || '',
    address: loan?.address || '',
    loan_type: loan?.loan_type || 'personal',
    loan_amount: loan?.loan_amount || '',
    tenure_months: loan?.tenure_months?.toString() || '',
    interest_rate: loan?.interest_rate || '',
    bank_name: loan?.bank_name || '',
    status: loan?.status || 'inquiry',
    notes: loan?.notes || '',
    // Auto-assign to current user when creating new
    assigned_to: loan?.assigned_to?.toString() || currentUserId,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      email: form.email || undefined,
      loan_amount: form.loan_amount || undefined,
      tenure_months: form.tenure_months ? Number(form.tenure_months) : undefined,
      interest_rate: form.interest_rate || undefined,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{loan ? 'Edit Loan' : 'Add Loan'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Applicant Name *</label>
              <input required className={inp} value={form.applicant_name} onChange={e => set('applicant_name', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Phone *</label>
              <input required className={inp} value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input type="email" className={inp} value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Loan Type</label>
              <select className={inp} value={form.loan_type} onChange={e => set('loan_type', e.target.value)}>
                <option value="personal">Personal Loan</option>
                <option value="business">Business Loan</option>
                <option value="home">Home Loan</option>
                <option value="vehicle">Vehicle Loan</option>
                <option value="education">Education Loan</option>
                <option value="gold">Gold Loan</option>
                <option value="mortgage">Mortgage Loan</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Address</label>
            <input className={inp} value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Loan Amount (₹)</label>
              <input type="number" className={inp} value={form.loan_amount} onChange={e => set('loan_amount', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium">Tenure (months)</label>
              <input type="number" className={inp} value={form.tenure_months} onChange={e => set('tenure_months', e.target.value)} placeholder="12" />
            </div>
            <div>
              <label className="text-sm font-medium">Interest Rate (%)</label>
              <input type="number" step="0.01" className={inp} value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} placeholder="10.5" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Bank Name</label>
            <input className={inp} value={form.bank_name} onChange={e => set('bank_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select className={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="inquiry">Inquiry</option>
                <option value="documents_pending">Documents Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="disbursed">Disbursed</option>
                <option value="rejected">Rejected</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Assigned To</label>
              {currentUserRole === 'employee' ? (
                <input readOnly className={`${inp} bg-muted cursor-not-allowed`} value={employees.find(e => e.id === currentUserId)?.name || 'You'} />
              ) : (
                <select className={inp} value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                  <option value="">Unassigned</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}{e.id === currentUserId ? ' (You)' : ''}</option>)}
                </select>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea rows={2} className={inp} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
