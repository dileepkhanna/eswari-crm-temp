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
  allLoanTypes?: string[]; // All unique loan types from the system
  onClose: () => void;
  onSave: (data: Partial<CapitalLoan>) => Promise<void>;
}

export default function CapitalLoanModal({ loan, employees, currentUserId, currentUserRole, allLoanTypes = [], onClose, onSave }: Props) {
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
  const [showCustomLoanType, setShowCustomLoanType] = useState(false);
  const [customLoanType, setCustomLoanType] = useState('');

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // Predefined loan types
  const predefinedTypes = [
    { value: 'personal', label: 'Personal Loan' },
    { value: 'business', label: 'Business Loan' },
    { value: 'home', label: 'Home Loan' },
    { value: 'vehicle', label: 'Vehicle Loan' },
    { value: 'education', label: 'Education Loan' },
    { value: 'gold', label: 'Gold Loan' },
    { value: 'mortgage', label: 'Mortgage Loan' },
    { value: 'property', label: 'Property Loan' },
    { value: 'other', label: 'Other' },
  ];

  // Get custom types (types that exist in system but not in predefined list)
  const predefinedValues = predefinedTypes.map(t => t.value);
  const customTypes = allLoanTypes
    .filter(type => !predefinedValues.includes(type))
    .map(type => ({
      value: type,
      label: type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const handleLoanTypeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomLoanType(true);
      setCustomLoanType('');
    } else {
      setShowCustomLoanType(false);
      setCustomLoanType('');
      set('loan_type', value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If custom loan type is selected, use the custom value
    const finalLoanType = showCustomLoanType && customLoanType.trim() 
      ? customLoanType.trim().toLowerCase().replace(/\s+/g, '_')
      : form.loan_type;
    
    setSaving(true);
    await onSave({
      ...form,
      loan_type: finalLoanType,
      email: form.email || undefined,
      address: form.address || undefined,
      loan_amount: form.loan_amount || undefined,
      tenure_months: form.tenure_months ? Number(form.tenure_months) : undefined,
      interest_rate: form.interest_rate || undefined,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{loan ? 'Edit Loan' : 'Add Loan'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Applicant Name *</label>
              <input required className={inp} value={form.applicant_name} onChange={e => set('applicant_name', e.target.value)} placeholder="Enter name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone *</label>
              <input required className={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Enter phone" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" className={inp} value={form.email} onChange={e => set('email', e.target.value)} placeholder="Enter email" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loan Type</label>
              {!showCustomLoanType ? (
                <select className={inp} value={form.loan_type} onChange={e => handleLoanTypeChange(e.target.value)}>
                  {/* Predefined types */}
                  {predefinedTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                  
                  {/* Custom types from system */}
                  {customTypes.length > 0 && (
                    <>
                      <option disabled>──────────</option>
                      {customTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </>
                  )}
                  
                  {/* Add new custom type option */}
                  <option disabled>──────────</option>
                  <option value="custom">+ Add Custom Type</option>
                </select>
              ) : (
                <div className="flex gap-1">
                  <input 
                    required
                    className={inp} 
                    value={customLoanType} 
                    onChange={e => setCustomLoanType(e.target.value)} 
                    placeholder="Enter custom loan type" 
                    autoFocus
                  />
                  <button 
                    type="button" 
                    onClick={() => { setShowCustomLoanType(false); set('loan_type', 'personal'); }}
                    className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input className={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Enter address" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Loan Amount (₹)</label>
              <input type="number" className={inp} value={form.loan_amount} onChange={e => set('loan_amount', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tenure (months)</label>
              <input type="number" className={inp} value={form.tenure_months} onChange={e => set('tenure_months', e.target.value)} placeholder="12" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
              <input type="number" step="0.01" className={inp} value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} placeholder="10.5" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bank Name</label>
            <input className={inp} value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="Enter bank name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
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
              <label className="block text-sm font-medium mb-1">Assigned To</label>
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
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea rows={2} className={inp} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Add notes..." />
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
