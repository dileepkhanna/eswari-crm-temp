import { useState } from 'react';
import { CapitalService } from '@/services/capital.service';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const GST_SERVICES = [
  'gst_registration', 'gst_filing_monthly', 'gst_filing_quarterly',
  'gst_amendment', 'gst_cancellation', 'lut_filing', 'eway_bill', 'gst_consultation',
];
const MSME_SERVICES = ['msme_registration', 'msme_certificate', 'msme_amendment'];
const ITR_SERVICES = ['itr_filing', 'itr_notice'];

const INCOME_NATURE_OPTIONS = [
  { value: 'salaried', label: 'Salaried Income' },
  { value: 'shares', label: 'Shares Trading Profit/Loss' },
  { value: 'rental', label: 'Rental Income' },
  { value: 'other', label: 'Any Other Income' },
];

const inp = 'w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary';

interface Props {
  service: CapitalService | null;
  employees: { id: string; name: string }[];
  currentUserId: string;
  currentUserRole: string;
  onClose: () => void;
  onSave: (data: Partial<CapitalService>) => Promise<void>;
}

export default function CapitalServiceModal({ service, employees, currentUserId, currentUserRole, onClose, onSave }: Props) {
  const [form, setForm] = useState<Record<string, any>>({
    client_name: service?.client_name || '',
    phone: service?.phone || '',
    email: service?.email || '',
    business_name: service?.business_name || '',
    city_state: service?.city_state || '',
    service_type: service?.service_type || 'gst_registration',
    status: service?.status || 'inquiry',
    business_type: service?.business_type || '',
    turnover_range: service?.turnover_range || '',
    existing_gst_number: service?.existing_gst_number ?? '',
    gstin: service?.gstin || '',
    existing_msme_number: service?.existing_msme_number ?? '',
    udyam_number: service?.udyam_number || '',
    date_of_birth: service?.date_of_birth || '',
    income_nature: service?.income_nature || [],
    income_slab: service?.income_slab || '',
    pan_number: service?.pan_number || '',
    financial_year: service?.financial_year || '',
    notes: service?.notes || '',
    assigned_to: service?.assigned_to?.toString() || currentUserId,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const isGST = GST_SERVICES.includes(form.service_type);
  const isMSME = MSME_SERVICES.includes(form.service_type);
  const isITR = ITR_SERVICES.includes(form.service_type);

  const toggleIncomeNature = (val: string) => {
    const cur: string[] = form.income_nature;
    set('income_nature', cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: Partial<CapitalService> = {
      ...form,
      email: form.email || undefined,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
      existing_gst_number: form.existing_gst_number === '' ? null : form.existing_gst_number === 'true' || form.existing_gst_number === true,
      existing_msme_number: form.existing_msme_number === '' ? null : form.existing_msme_number === 'true' || form.existing_msme_number === true,
      date_of_birth: form.date_of_birth || undefined,
      income_nature: form.income_nature.length ? form.income_nature : undefined,
    };
    await onSave(payload);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{service ? 'Edit Service' : 'Add Service'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Service Type *</label>
            <select required className={inp} value={form.service_type} onChange={e => set('service_type', e.target.value)}>
              <optgroup label="GST Services">
                <option value="gst_registration">GST Registration (New)</option>
                <option value="gst_filing_monthly">GST Return Filing (Monthly)</option>
                <option value="gst_filing_quarterly">GST Return Filing (Quarterly)</option>
                <option value="gst_amendment">GST Amendment / Update</option>
                <option value="gst_cancellation">GST Cancellation</option>
                <option value="lut_filing">LUT Filing (Exports)</option>
                <option value="eway_bill">E-Way Bill Generation</option>
                <option value="gst_consultation">GST Consultation / Advisory</option>
              </optgroup>
              <optgroup label="MSME Services">
                <option value="msme_registration">MSME / Udyam Registration</option>
                <option value="msme_certificate">MSME Certificate Download</option>
                <option value="msme_amendment">MSME Amendment</option>
              </optgroup>
              <optgroup label="Income Tax">
                <option value="itr_filing">Income Tax Filing</option>
                <option value="itr_notice">Income Tax Notice</option>
              </optgroup>
              <optgroup label="Other">
                <option value="company_registration">Company Registration</option>
                <option value="trademark">Trademark Registration</option>
                <option value="other">Other</option>
              </optgroup>
            </select>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input required className={inp} value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Enter name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mobile *</label>
              <input required className={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Enter mobile" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" className={inp} value={form.email} onChange={e => set('email', e.target.value)} placeholder="Enter email" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City / State</label>
              <input className={inp} value={form.city_state} onChange={e => set('city_state', e.target.value)} placeholder="Enter city/state" />
            </div>
          </div>

          {/* Business Name — shown for GST & MSME */}
          {(isGST || isMSME) && (
            <div>
              <label className="block text-sm font-medium mb-1">Business Name</label>
              <input className={inp} value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Enter business name" />
            </div>
          )}

          {/* GST / MSME shared: Business Type */}
          {(isGST || isMSME) && (
            <div>
              <label className="text-sm font-medium">Type of Business</label>
              <select className={inp} value={form.business_type} onChange={e => set('business_type', e.target.value)}>
                <option value="">Select...</option>
                <option value="proprietor">Proprietor</option>
                <option value="partnership">Partnership</option>
                <option value="company">Company</option>
              </select>
            </div>
          )}

          {/* GST specific */}
          {isGST && (
            <>
              <div>
                <label className="text-sm font-medium">Turnover Range</label>
                <select className={inp} value={form.turnover_range} onChange={e => set('turnover_range', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="below_20l">Below ₹20 Lakhs</option>
                  <option value="20l_1cr">₹20L – ₹1 Cr</option>
                  <option value="above_1cr">Above ₹1 Cr</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Existing GST Number?</label>
                <select className={inp} value={String(form.existing_gst_number)} onChange={e => set('existing_gst_number', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              {(form.existing_gst_number === 'true' || form.existing_gst_number === true) && (
                <div>
                  <label className="text-sm font-medium">GSTIN</label>
                  <input className={inp} value={form.gstin} onChange={e => set('gstin', e.target.value)} placeholder="15-digit GSTIN" maxLength={15} />
                </div>
              )}
            </>
          )}

          {/* MSME specific */}
          {isMSME && (
            <>
              <div>
                <label className="text-sm font-medium">Existing MSME Number?</label>
                <select className={inp} value={String(form.existing_msme_number)} onChange={e => set('existing_msme_number', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              {(form.existing_msme_number === 'true' || form.existing_msme_number === true) && (
                <div>
                  <label className="text-sm font-medium">Udyam Number</label>
                  <input className={inp} value={form.udyam_number} onChange={e => set('udyam_number', e.target.value)} placeholder="UDYAM-XX-00-0000000" />
                </div>
              )}
            </>
          )}

          {/* Income Tax specific */}
          {isITR && (
            <>
              <div>
                <label className="text-sm font-medium">Date of Birth</label>
                <input type="date" className={inp} value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Income Nature</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {INCOME_NATURE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.income_nature.includes(opt.value)} onChange={() => toggleIncomeNature(opt.value)} className="rounded" />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Income Slab</label>
                <select className={inp} value={form.income_slab} onChange={e => set('income_slab', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="0_5l">0 to ₹5 Lakh</option>
                  <option value="5l_10l">₹5 Lakh to ₹10 Lakh</option>
                  <option value="10l_18l">₹10 Lakh to ₹18 Lakh</option>
                  <option value="above_18l">₹18 Lakh and above</option>
                </select>
              </div>
            </>
          )}

          {/* PAN & Financial Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">PAN Number</label>
              <input className={inp} value={form.pan_number} onChange={e => set('pan_number', e.target.value.toUpperCase())} maxLength={10} placeholder="ABCDE1234F" />
            </div>
            {isITR && (
              <div>
                <label className="text-sm font-medium">Financial Year</label>
                <input className={inp} value={form.financial_year} onChange={e => set('financial_year', e.target.value)} placeholder="2024-25" />
              </div>
            )}
          </div>

          {/* Status & Assigned To */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select className={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="inquiry">Inquiry</option>
                <option value="documents_pending">Documents Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
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
