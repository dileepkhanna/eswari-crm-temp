import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useCapital } from '@/contexts/CapitalCustomerContext';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, RefreshCw, ClipboardList, Upload, Download } from 'lucide-react';
import { CapitalLoan } from '@/services/capital.service';
import CapitalLoanModal from '@/components/capital/CapitalLoanModal';
import CapitalTaskModal from '@/components/capital/CapitalTaskModal';
import * as XLSX from 'xlsx';

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-blue-100 text-blue-700',
  documents_pending: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  disbursed: 'bg-teal-100 text-teal-700',
  rejected: 'bg-red-100 text-red-700',
  closed: 'bg-gray-100 text-gray-700',
};

const LOAN_TYPE_LABELS: Record<string, string> = {
  personal: 'Personal', business: 'Business', home: 'Home',
  vehicle: 'Vehicle', education: 'Education', gold: 'Gold',
  mortgage: 'Mortgage', other: 'Other',
};

export default function AdminCapitalLoans() {
  const { loans, employees, currentUserId, currentUserRole, loadingLoans, addLoan, updateLoan, deleteLoan, refreshLoans, bulkImportLoans, addTask } = useCapital();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CapitalLoan | null>(null);
  const [taskLoan, setTaskLoan] = useState<CapitalLoan | null>(null);

  const uniqueBanks = [...new Set(loans.map(l => l.bank_name).filter(Boolean))] as string[];

  const filtered = loans.filter(l => {
    const matchSearch = !search || [l.applicant_name, l.phone, l.email, l.bank_name].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchType = !typeFilter || l.loan_type === typeFilter;
    const matchStatus = !statusFilter || l.status === statusFilter;
    const matchAssignee = !assigneeFilter || String(l.assigned_to) === assigneeFilter;
    const matchBank = !bankFilter || l.bank_name === bankFilter;
    return matchSearch && matchType && matchStatus && matchAssignee && matchBank;
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(l => l.id)));
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} loan(s)?`)) return;
    await Promise.all([...selected].map(id => deleteLoan(id)));
    setSelected(new Set());
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this loan record?')) return;
    await deleteLoan(id);
  };

  const fmt = (v?: string) => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—';

  const handleExport = () => {
    const data = filtered.map(l => ({
      'Applicant Name': l.applicant_name, Phone: l.phone, Email: l.email || '',
      Address: l.address || '', 'Loan Type': LOAN_TYPE_LABELS[l.loan_type] || l.loan_type,
      'Loan Amount': l.loan_amount || '', 'Tenure (Months)': l.tenure_months || '',
      'Interest Rate': l.interest_rate || '', 'Bank Name': l.bank_name || '',
      Status: l.status_display || l.status, Notes: l.notes || '',
      'Assigned To': l.assigned_to_name || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loans');
    XLSX.writeFile(wb, `capital-loans-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Applicant Name': 'John Doe', Phone: '9876543210', Email: 'john@example.com',
      Address: '123 Main St', 'Loan Type': 'Personal',
      'Loan Amount': '500000', 'Tenure (Months)': '36',
      'Interest Rate': '10.5', 'Bank Name': 'SBI',
      Notes: 'Sample note',
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loans');
    XLSX.writeFile(wb, 'loans-template.xlsx');
  };

  const LOAN_TYPE_KEY: Record<string, string> = {
    personal: 'personal', business: 'business', home: 'home',
    vehicle: 'vehicle', education: 'education', gold: 'gold',
    mortgage: 'mortgage', other: 'other',
    'personal loan': 'personal', 'business loan': 'business', 'home loan': 'home',
    'vehicle loan': 'vehicle', 'education loan': 'education', 'gold loan': 'gold',
    'mortgage loan': 'mortgage',
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      await bulkImportLoans(rows.map(r => ({
        applicant_name: r['Applicant Name'] || '',
        phone: String(r['Phone'] || ''),
        email: r['Email'] || undefined,
        address: r['Address'] || '',
        loan_type: LOAN_TYPE_KEY[String(r['Loan Type'] || '').toLowerCase()] || 'personal',
        loan_amount: r['Loan Amount'] ? String(r['Loan Amount']) : undefined,
        tenure_months: r['Tenure (Months)'] ? Number(r['Tenure (Months)']) : undefined,
        interest_rate: r['Interest Rate'] ? String(r['Interest Rate']) : undefined,
        bank_name: r['Bank Name'] || '',
        notes: r['Notes'] || '',
      })));
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Eswari Capital — Loans" subtitle="Manage loan applications" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="px-3 py-1.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48" />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Types</option>
              {Object.entries(LOAN_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Status</option>
              <option value="inquiry">Inquiry</option>
              <option value="documents_pending">Documents Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="disbursed">Disbursed</option>
              <option value="rejected">Rejected</option>
              <option value="closed">Closed</option>
            </select>
            <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}
              className="px-3 py-1.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Assignees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            {uniqueBanks.length > 0 && (
              <select value={bankFilter} onChange={e => setBankFilter(e.target.value)}
                className="px-3 py-1.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">All Banks</option>
                {uniqueBanks.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
              <span className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-full text-sm hover:bg-muted cursor-pointer"><Upload className="w-3.5 h-3.5" />Import</span>
            </label>
            <Button variant="outline" size="sm" className="rounded-full" onClick={downloadTemplate}><Download className="w-3.5 h-3.5 mr-1" />Template</Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1" />Export ({filtered.length})</Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={refreshLoans}><RefreshCw className="w-3.5 h-3.5" /></Button>
            <Button size="sm" className="rounded-full" onClick={() => { setEditing(null); setIsModalOpen(true); }}><Plus className="w-3.5 h-3.5 mr-1" />Add Loan</Button>
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
              <th className="text-left py-3 px-4">Applicant</th>
              <th className="text-left py-3 px-4">Phone</th>
              <th className="text-left py-3 px-4">Loan Type</th>
              <th className="text-left py-3 px-4">Amount</th>
              <th className="text-left py-3 px-4">Bank</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Assigned To</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr></thead>
            <tbody>
              {loadingLoans ? (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No loans found</td></tr>
              ) : filtered.map(l => (
                <tr key={l.id} className={`border-b hover:bg-muted/30 transition-colors ${selected.has(l.id) ? 'bg-primary/5' : ''}`}>
                  <td className="py-3 px-4"><input type="checkbox" className="rounded" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} /></td>
                  <td className="py-3 px-4 font-medium">{l.applicant_name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{l.phone}</td>
                  <td className="py-3 px-4 text-muted-foreground">{LOAN_TYPE_LABELS[l.loan_type] || l.loan_type}</td>
                  <td className="py-3 px-4 text-muted-foreground">{fmt(l.loan_amount)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{l.bank_name || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[l.status] || 'bg-gray-100 text-gray-700'}`}>
                      {l.status_display || l.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{l.assigned_to_name || '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500" title="Add Task" onClick={() => setTaskLoan(l)}><ClipboardList className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(l); setIsModalOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(l.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <CapitalLoanModal
          loan={editing}
          employees={employees}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => { setIsModalOpen(false); setEditing(null); }}
          onSave={async (data) => {
            if (editing) await updateLoan(editing.id, data);
            else await addLoan(data);
            setIsModalOpen(false); setEditing(null);
          }}
        />
      )}

      {taskLoan && (
        <CapitalTaskModal
          task={null}
          loans={loans}
          services={[]}
          employees={employees}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          preselectedLoan={taskLoan.id}
          onClose={() => setTaskLoan(null)}
          onSave={async (data) => {
            await addTask(data);
            setTaskLoan(null);
          }}
        />
      )}
    </div>
  );
}
