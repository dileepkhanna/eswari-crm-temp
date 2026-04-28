import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useCapital } from '@/contexts/CapitalCustomerContext';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, RefreshCw, ClipboardList, Upload, Download, Eye } from 'lucide-react';
import { CapitalLoan, capitalLoanService } from '@/services/capital.service';
import CapitalLoanModal from '@/components/capital/CapitalLoanModal';
import CapitalLoanDetailsModal from '@/components/capital/CapitalLoanDetailsModal';
import CapitalTaskModal from '@/components/capital/CapitalTaskModal';
import { Pagination } from '@/components/common/Pagination';
import { toast } from 'sonner';
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
  const { 
    loans, 
    employees, 
    currentUserId, 
    currentUserRole, 
    loadingLoans, 
    addLoan, 
    updateLoan, 
    deleteLoan, 
    refreshLoans, 
    bulkImportLoans, 
    addTask,
    loansPage,
    loansTotalPages,
    loansTotalCount,
    loadLoansPage,
    searchLoans,
    filterLoans
  } = useCapital();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CapitalLoan | null>(null);
  const [viewing, setViewing] = useState<CapitalLoan | null>(null);
  const [taskLoan, setTaskLoan] = useState<CapitalLoan | null>(null);

  // Get unique loan types from actual data
  const uniqueLoanTypes = [...new Set(loans.map(l => l.loan_type).filter(Boolean))] as string[];
  const uniqueBanks = [...new Set(loans.map(l => l.bank_name).filter(Boolean))] as string[];

  // Use loans directly from context (already filtered by backend)
  const filtered = loans;
  
  // Handle search
  const handleSearch = (value: string) => {
    setSearch(value);
    searchLoans(value);
  };
  
  // Handle filter
  const handleFilter = () => {
    const filters: any = {};
    if (statusFilter) filters.status = statusFilter;
    if (typeFilter) filters.loan_type = typeFilter;
    if (assigneeFilter) filters.assigned_to = assigneeFilter;
    filterLoans(filters);
  };

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

  const handleExport = async () => {
    try {
      // Fetch ALL loans with current filters (no pagination limit)
      const params: any = { page_size: 10000 }; // Large number to get all records
      
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.loan_type = typeFilter;
      if (assigneeFilter) params.assigned_to = assigneeFilter;
      
      const res = await capitalLoanService.list(params) as any;
      const allLoans = Array.isArray(res) ? res : res.results || [];
      
      const data = allLoans.map((l: any) => ({
        'Applicant Name': l.applicant_name, Phone: l.phone, Email: l.email || '',
        Address: l.address || '', 'Loan Type': formatLoanType(l.loan_type),
        'Loan Amount': l.loan_amount || '', 'Tenure (Months)': l.tenure_months || '',
        'Interest Rate': l.interest_rate || '', 'Bank Name': l.bank_name || '',
        Status: l.status_display || l.status, Notes: l.notes || '',
        'Assigned To': l.assigned_to_name || '',
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Loans');
      XLSX.writeFile(wb, `capital-loans-${new Date().toISOString().slice(0, 10)}.xlsx`);
      
      toast.success(`Exported ${data.length} loans`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export loans');
    }
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
    mortgage: 'mortgage', property: 'property', other: 'other',
    'personal loan': 'personal', 'business loan': 'business', 'home loan': 'home',
    'vehicle loan': 'vehicle', 'education loan': 'education', 'gold loan': 'gold',
    'mortgage loan': 'mortgage', 'property loan': 'property',
  };

  // Helper function to format loan type for display
  const formatLoanType = (type: string) => {
    return LOAN_TYPE_LABELS[type] || type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
            <input type="text" placeholder="Search..." value={search} onChange={e => handleSearch(e.target.value)}
              className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-48" />
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); handleFilter(); }}
              className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto">
              <option value="">All Types</option>
              {uniqueLoanTypes.sort().map(type => (
                <option key={type} value={type}>{formatLoanType(type)}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); handleFilter(); }}
              className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto">
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
              className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto">
              <option value="">All Assignees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            {uniqueBanks.length > 0 && (
              <select value={bankFilter} onChange={e => setBankFilter(e.target.value)}
                className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto">
                <option value="">All Banks</option>
                {uniqueBanks.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <label className="cursor-pointer flex-1 sm:flex-none">
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
              <span className="inline-flex items-center justify-center gap-1 px-3 py-2 border rounded-full text-sm hover:bg-muted cursor-pointer w-full sm:w-auto">
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Import</span>
              </span>
            </label>
            <Button variant="outline" size="sm" className="rounded-full flex-1 sm:flex-none" onClick={downloadTemplate}>
              <Download className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Template</span>
            </Button>
            <Button variant="outline" size="sm" className="rounded-full flex-1 sm:flex-none" onClick={handleExport}>
              <Download className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Export ({loansTotalCount})</span>
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={refreshLoans}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" className="rounded-full w-full sm:w-auto" onClick={() => { setEditing(null); setIsModalOpen(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add Loan
            </Button>
          </div>
        </div>

        {/* Pagination - Top */}
        <Pagination
          currentPage={loansPage}
          totalPages={loansTotalPages}
          totalCount={loansTotalCount}
          onPageChange={loadLoansPage}
          loading={loadingLoans}
          itemName="loans"
        />

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button size="sm" variant="destructive" className="rounded-full h-7 text-xs" onClick={handleBulkDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
            </Button>
            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden md:block glass-card rounded-2xl overflow-x-auto">
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
                  <td className="py-3 px-4 text-muted-foreground">{formatLoanType(l.loan_type)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{fmt(l.loan_amount)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{l.bank_name || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[l.status] || 'bg-gray-100 text-gray-700'}`}>
                      {l.status_display || l.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground" title={l.assigned_to_name || 'Unassigned'}>
                    {l.assigned_to_name ? l.assigned_to_name.split(' ')[0] : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" title="View Details" onClick={() => setViewing(l)}><Eye className="w-3.5 h-3.5" /></Button>
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

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {loadingLoans ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No loans found</div>
          ) : filtered.map(l => (
            <div key={l.id} className={`glass-card rounded-xl p-4 ${selected.has(l.id) ? 'ring-2 ring-primary' : ''}`}>
              <div className="flex items-start gap-3 mb-3">
                <input type="checkbox" className="rounded mt-1" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base mb-1">{l.applicant_name}</div>
                  <a href={`tel:${l.phone}`} className="text-sm text-muted-foreground hover:text-primary">{l.phone}</a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Loan Type</div>
                  <div className="font-medium">{formatLoanType(l.loan_type)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Amount</div>
                  <div className="font-medium text-green-600">{fmt(l.loan_amount)}</div>
                </div>
                {l.bank_name && (
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">Bank</div>
                    <div className="font-medium">{l.bank_name}</div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[l.status] || 'bg-gray-100 text-gray-700'}`}>
                  {l.status_display || l.status.replace(/_/g, ' ')}
                </span>
              </div>

              {l.assigned_to_name && (
                <div className="text-xs text-muted-foreground mb-3">
                  Assigned to: <span className="font-medium text-foreground">{l.assigned_to_name}</span>
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs rounded-full gap-1" onClick={() => setViewing(l)}>
                  <Eye className="w-3.5 h-3.5" />View
                </Button>
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs rounded-full gap-1" onClick={() => setTaskLoan(l)}>
                  <ClipboardList className="w-3.5 h-3.5" />Task
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => { setEditing(l); setIsModalOpen(true); }}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full text-red-500" onClick={() => handleDelete(l.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination - Bottom */}
        <Pagination
          currentPage={loansPage}
          totalPages={loansTotalPages}
          totalCount={loansTotalCount}
          onPageChange={loadLoansPage}
          loading={loadingLoans}
          itemName="loans"
        />
      </div>

      {isModalOpen && (
        <CapitalLoanModal
          loan={editing}
          employees={employees}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          allLoanTypes={uniqueLoanTypes}
          onClose={() => { setIsModalOpen(false); setEditing(null); }}
          onSave={async (data) => {
            if (editing) await updateLoan(editing.id, data);
            else await addLoan(data);
            setIsModalOpen(false); setEditing(null);
          }}
        />
      )}

      {viewing && (
        <CapitalLoanDetailsModal
          loan={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
            setIsModalOpen(true);
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
