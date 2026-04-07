import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextDjango';
import TopBar from '@/components/layout/TopBar';
import { useCapital } from '@/contexts/CapitalCustomerContext';
import { Button } from '@/components/ui/button';
import { Plus, Phone, Mail, Trash2, Edit, RefreshCw, Upload, Download, ArrowRight } from 'lucide-react';
import { CapitalCustomer } from '@/services/capital.service';
import CapitalCustomerModal, { INTEREST_OPTIONS, INTEREST_COLORS } from '@/components/capital/CapitalCustomerModal';
import CapitalLoanModal from '@/components/capital/CapitalLoanModal';
import CapitalServiceModal from '@/components/capital/CapitalServiceModal';
import * as XLSX from 'xlsx';

const CALL_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  answered: 'bg-green-100 text-green-700',
  not_answered: 'bg-red-100 text-red-700',
  busy: 'bg-orange-100 text-orange-700',
  not_interested: 'bg-gray-100 text-gray-700',
  custom: 'bg-blue-100 text-blue-700',
};

// Map interest → service_type default for the service modal
const INTEREST_TO_SERVICE: Record<string, string> = {
  gst: 'gst_registration',
  msme: 'msme_registration',
  itr: 'itr_filing',
};

export default function AdminCapitalCustomers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { customers, employees, currentUserId, currentUserRole, loadingCustomers,
    addCustomer, updateCustomer, deleteCustomer, bulkImportCustomers,
    markCustomerConverted, refreshCustomers, addLoan, addService } = useCapital();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [convertedFilter, setConvertedFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CapitalCustomer | null>(null);

  // Quick-redirect modals pre-filled from customer
  const [loanCustomer, setLoanCustomer] = useState<CapitalCustomer | null>(null);
  const [serviceCustomer, setServiceCustomer] = useState<CapitalCustomer | null>(null);
  // Convert picker — ask loan or service before opening the right modal
  const [convertPicker, setConvertPicker] = useState<CapitalCustomer | null>(null);

  const basePath = user?.role === 'admin' ? '/admin' : user?.role === 'manager' ? '/manager' : '/staff';

  const filtered = customers.filter(c => {
    const matchSearch = !search || [c.name, c.phone, c.email, c.company_name].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !statusFilter || c.call_status === statusFilter;
    const matchInterest = !interestFilter || c.interest === interestFilter;
    const matchAssignee = !assigneeFilter || String(c.assigned_to) === assigneeFilter;
    const matchConverted = !convertedFilter || (convertedFilter === 'yes' ? c.is_converted : !c.is_converted);
    return matchSearch && matchStatus && matchInterest && matchAssignee && matchConverted;
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)));
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} customer(s)?`)) return;
    await Promise.all([...selected].map(id => deleteCustomer(id)));
    setSelected(new Set());
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    await deleteCustomer(id);
  };

  const handleExport = () => {
    const data = filtered.map(c => ({
      Name: c.name, Phone: c.phone, Email: c.email,
      Company: c.company_name, 'Call Status': c.call_status,
      'Interested In': c.interest, Notes: c.notes, 'Assigned To': c.assigned_to_name,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, `capital-customers-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      Name: 'John Doe', Phone: '9876543210', Email: 'john@example.com',
      Company: 'ABC Pvt Ltd', 'Call Status': 'pending',
      'Interested In': 'loan', Notes: 'Sample note',
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'customers-template.xlsx');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      await bulkImportCustomers(rows.map(r => ({
        name: r['Name'] || '', phone: String(r['Phone'] || ''),
        email: r['Email'] || '', company_name: r['Company'] || '', notes: r['Notes'] || '',
      })));
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Open the right modal based on customer's interest
  const handleGoToService = (c: CapitalCustomer) => {
    if (c.interest === 'loan') { setLoanCustomer(c); return; }
    if (c.interest === 'gst' || c.interest === 'msme' || c.interest === 'itr') { setServiceCustomer(c); return; }
    // fallback: navigate to loans page
    navigate(`${basePath}/capital-loans`);
  };

  const interestLabel = (val?: string) => INTEREST_OPTIONS.find(o => o.value === val)?.label || '—';

  // ── Counts (always based on filtered list) ──────────────────────────────
  const totalCount = customers.length;
  const filteredCount = filtered.length;
  const convertedCount = filtered.filter(c => c.is_converted).length;
  const pendingCount = filtered.filter(c => c.call_status === 'pending').length;
  const answeredCount = filtered.filter(c => c.call_status === 'answered').length;
  const notAnsweredCount = filtered.filter(c => c.call_status === 'not_answered').length;
  const notInterestedCount = filtered.filter(c => c.call_status === 'not_interested').length;

  return (
    <div className="min-h-screen">
      <TopBar title="Eswari Capital — Customers" subtitle="Manage customer database" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Filters - Stack on mobile, row on desktop */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-48" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="answered">Answered</option>
              <option value="not_answered">Not Answered</option>
              <option value="busy">Busy</option>
              <option value="not_interested">Not Interested</option>
            </select>
            <select value={interestFilter} onChange={e => setInterestFilter(e.target.value)}
              className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto">
              <option value="">All Interests</option>
              {INTEREST_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto">
              <option value="">All Assignees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={convertedFilter} onChange={e => setConvertedFilter(e.target.value)}
              className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto">
              <option value="">All Converted</option>
              <option value="yes">Converted</option>
              <option value="no">Not Converted</option>
            </select>
          </div>
          
          {/* Action buttons - Stack on mobile */}
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
              <span className="hidden sm:inline">Export ({filtered.length})</span>
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={refreshCustomers}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" className="rounded-full w-full sm:w-auto" onClick={() => { setEditing(null); setIsModalOpen(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add Customer
            </Button>
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

        {/* ── Count summary bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <div className="glass-card rounded-xl px-3 py-2 text-center col-span-2 sm:col-span-1">
            <div className="text-lg font-bold text-foreground">{filteredCount}</div>
            <div className="text-xs text-muted-foreground">{filteredCount === totalCount ? 'Total' : `of ${totalCount}`}</div>
          </div>
          <div className="glass-card rounded-xl px-3 py-2 text-center cursor-pointer hover:ring-2 hover:ring-green-300" onClick={() => setConvertedFilter(convertedFilter === 'yes' ? '' : 'yes')}>
            <div className="text-lg font-bold text-green-600">{convertedCount}</div>
            <div className="text-xs text-muted-foreground">Converted</div>
          </div>
          <div className="glass-card rounded-xl px-3 py-2 text-center cursor-pointer hover:ring-2 hover:ring-yellow-300" onClick={() => setStatusFilter(statusFilter === 'pending' ? '' : 'pending')}>
            <div className="text-lg font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="glass-card rounded-xl px-3 py-2 text-center cursor-pointer hover:ring-2 hover:ring-green-300" onClick={() => setStatusFilter(statusFilter === 'answered' ? '' : 'answered')}>
            <div className="text-lg font-bold text-green-600">{answeredCount}</div>
            <div className="text-xs text-muted-foreground">Answered</div>
          </div>
          <div className="glass-card rounded-xl px-3 py-2 text-center cursor-pointer hover:ring-2 hover:ring-red-300" onClick={() => setStatusFilter(statusFilter === 'not_answered' ? '' : 'not_answered')}>
            <div className="text-lg font-bold text-red-500">{notAnsweredCount}</div>
            <div className="text-xs text-muted-foreground">Not Answered</div>
          </div>
          <div className="glass-card rounded-xl px-3 py-2 text-center cursor-pointer hover:ring-2 hover:ring-gray-300" onClick={() => setStatusFilter(statusFilter === 'not_interested' ? '' : 'not_interested')}>
            <div className="text-lg font-bold text-gray-500">{notInterestedCount}</div>
            <div className="text-xs text-muted-foreground">Not Interested</div>
          </div>
        </div>

        {/* Desktop Table View - Hidden on mobile */}
        <div className="hidden md:block glass-card rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground text-xs">
              <th className="py-3 px-4 w-8"><input type="checkbox" className="rounded" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} /></th>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Phone</th>
              <th className="text-left py-3 px-4">Call Status</th>
              <th className="text-left py-3 px-4">Interested In</th>
              <th className="text-left py-3 px-4">Assigned To</th>
              <th className="text-left py-3 px-4">Converted</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr></thead>
            <tbody>
              {loadingCustomers ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No customers found</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className={`border-b hover:bg-muted/30 transition-colors ${selected.has(c.id) ? 'bg-primary/5' : ''}`}>
                  <td className="py-3 px-4"><input type="checkbox" className="rounded" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{c.name || '—'}</div>
                    {c.email && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</div>}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</div>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={c.call_status}
                      onChange={async e => { await updateCustomer(c.id, { call_status: e.target.value }); }}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${CALL_STATUS_COLORS[c.call_status] || 'bg-gray-100 text-gray-700'}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="answered">Answered</option>
                      <option value="not_answered">Not Answered</option>
                      <option value="busy">Busy</option>
                      <option value="not_interested">Not Interested</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    {c.interest && c.interest !== 'none' ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INTEREST_COLORS[c.interest] || 'bg-gray-100 text-gray-700'}`}>
                        {interestLabel(c.interest)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{c.assigned_to_name || '—'}</td>
                  <td className="py-3 px-4">
                    {c.is_converted
                      ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">✓ Converted</span>
                      : <Button size="sm" className="h-7 text-xs rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-3 shadow-sm" onClick={() => setConvertPicker(c)}>Convert →</Button>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      {c.interest && c.interest !== 'none' && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 px-2 text-xs gap-1 text-primary"
                          title={`Add to ${interestLabel(c.interest)}`}
                          onClick={() => handleGoToService(c)}
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          {interestLabel(c.interest)}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(c); setIsModalOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Visible only on mobile */}
        <div className="md:hidden space-y-3">
          {loadingCustomers ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No customers found</div>
          ) : filtered.map(c => (
            <div key={c.id} className={`glass-card rounded-xl p-4 ${selected.has(c.id) ? 'ring-2 ring-primary' : ''}`}>
              {/* Header with checkbox and name */}
              <div className="flex items-start gap-3 mb-3">
                <input type="checkbox" className="rounded mt-1" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base mb-1">{c.name || 'Unnamed'}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    <a href={`tel:${c.phone}`} className="hover:text-primary">{c.phone}</a>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <a href={`mailto:${c.email}`} className="hover:text-primary truncate">{c.email}</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Status and Interest badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                <select
                  value={c.call_status}
                  onChange={async e => { await updateCustomer(c.id, { call_status: e.target.value }); }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${CALL_STATUS_COLORS[c.call_status] || 'bg-gray-100 text-gray-700'}`}
                >
                  <option value="pending">Pending</option>
                  <option value="answered">Answered</option>
                  <option value="not_answered">Not Answered</option>
                  <option value="busy">Busy</option>
                  <option value="not_interested">Not Interested</option>
                </select>
                {c.interest && c.interest !== 'none' && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${INTEREST_COLORS[c.interest] || 'bg-gray-100 text-gray-700'}`}>
                    {interestLabel(c.interest)}
                  </span>
                )}
                {c.is_converted && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                    ✓ Converted
                  </span>
                )}
              </div>

              {/* Assigned to */}
              {c.assigned_to_name && (
                <div className="text-xs text-muted-foreground mb-3">
                  Assigned to: <span className="font-medium text-foreground">{c.assigned_to_name}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-3 border-t border-border">
                {!c.is_converted && (
                  <Button size="sm" className="flex-1 h-8 text-xs rounded-full" onClick={() => setConvertPicker(c)}>
                    Convert →
                  </Button>
                )}
                {c.interest && c.interest !== 'none' && (
                  <Button
                    variant="outline" size="sm"
                    className="flex-1 h-8 text-xs rounded-full gap-1"
                    onClick={() => handleGoToService(c)}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    {interestLabel(c.interest)}
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => { setEditing(c); setIsModalOpen(true); }}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full text-red-500" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer add/edit modal */}
      {isModalOpen && (
        <CapitalCustomerModal
          customer={editing}
          employees={employees}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => { setIsModalOpen(false); setEditing(null); }}
          onSave={async (data) => {
            if (editing) await updateCustomer(editing.id, data);
            else await addCustomer(data);
            setIsModalOpen(false); setEditing(null);
          }}
        />
      )}
      
      {/* Loan modal pre-filled from customer */}
      {loanCustomer && (
        <CapitalLoanModal
          loan={{
            id: '', applicant_name: loanCustomer.name || '',
            phone: loanCustomer.phone, email: loanCustomer.email,
            loan_type: 'personal', status: 'inquiry',
            assigned_to: loanCustomer.assigned_to,
            created_at: '', updated_at: '',
          }}
          employees={employees}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setLoanCustomer(null)}
          onSave={async (data) => {
            await addLoan(data);
            if (loanCustomer) {
              markCustomerConverted(loanCustomer.id);
              await updateCustomer(loanCustomer.id, { is_converted: true });
            }
            setLoanCustomer(null);
          }}
        />
      )}

      {/* Service modal pre-filled from customer */}
      {serviceCustomer && (
        <CapitalServiceModal
          service={{
            id: '', client_name: serviceCustomer.name || '',
            phone: serviceCustomer.phone, email: serviceCustomer.email,
            business_name: serviceCustomer.company_name || '',
            service_type: INTEREST_TO_SERVICE[serviceCustomer.interest || ''] || 'gst_registration',
            status: 'inquiry',
            assigned_to: serviceCustomer.assigned_to,
            created_at: '', updated_at: '',
          }}
          employees={employees}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setServiceCustomer(null)}
          onSave={async (data) => {
            await addService(data);
            if (serviceCustomer) {
              markCustomerConverted(serviceCustomer.id);
              await updateCustomer(serviceCustomer.id, { is_converted: true });
            }
            setServiceCustomer(null);
          }}
        />
      )}

      {/* Convert picker — ask loan or service */}
      {convertPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold mb-1">Convert Customer</h2>
            <p className="text-sm text-muted-foreground mb-5">
              What does <span className="font-medium text-foreground">{convertPicker.name || convertPicker.phone}</span> need?
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 transition-colors"
                onClick={() => { setLoanCustomer(convertPicker); setConvertPicker(null); }}
              >
                <span className="text-2xl">🏦</span>
                <span className="text-sm font-medium text-blue-700">Loan</span>
                <span className="text-xs text-blue-500">Personal, Home, Business…</span>
              </button>
              <button
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-orange-200 bg-orange-50 hover:border-orange-400 hover:bg-orange-100 transition-colors"
                onClick={() => { setServiceCustomer(convertPicker); setConvertPicker(null); }}
              >
                <span className="text-2xl">📋</span>
                <span className="text-sm font-medium text-orange-700">Service</span>
                <span className="text-xs text-orange-500">GST, MSME, Income Tax…</span>
              </button>
            </div>
            <Button variant="outline" size="sm" className="w-full rounded-full" onClick={() => setConvertPicker(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
