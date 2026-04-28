import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useCapital } from '@/contexts/CapitalCustomerContext';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, RefreshCw, ClipboardList, Upload, Download, Eye } from 'lucide-react';
import { CapitalService, capitalServiceService } from '@/services/capital.service';
import CapitalServiceModal from '@/components/capital/CapitalServiceModal';
import CapitalServiceDetailsModal from '@/components/capital/CapitalServiceDetailsModal';
import CapitalTaskModal from '@/components/capital/CapitalTaskModal';
import { Pagination } from '@/components/common/Pagination';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-blue-100 text-blue-700',
  documents_pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const SERVICE_CATEGORY: Record<string, string> = {
  gst_registration: 'GST', gst_filing_monthly: 'GST', gst_filing_quarterly: 'GST',
  gst_amendment: 'GST', gst_cancellation: 'GST', lut_filing: 'GST',
  eway_bill: 'GST', gst_consultation: 'GST',
  msme_registration: 'MSME', msme_certificate: 'MSME', msme_amendment: 'MSME',
  itr_filing: 'ITR', itr_notice: 'ITR',
};

const CATEGORY_COLORS: Record<string, string> = {
  GST: 'bg-orange-100 text-orange-700',
  MSME: 'bg-teal-100 text-teal-700',
  ITR: 'bg-indigo-100 text-indigo-700',
};

export default function AdminCapitalServices() {
  const { 
    services, 
    employees, 
    currentUserId, 
    currentUserRole, 
    loadingServices, 
    addService, 
    updateService, 
    deleteService, 
    refreshServices, 
    bulkImportServices, 
    addTask,
    servicesPage,
    servicesTotalPages,
    servicesTotalCount,
    loadServicesPage,
    searchServices,
    filterServices
  } = useCapital();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CapitalService | null>(null);
  const [viewing, setViewing] = useState<CapitalService | null>(null);
  const [taskService, setTaskService] = useState<CapitalService | null>(null);

  // Use services directly from context (already filtered by backend)
  const filtered = services;
  
  // Handle search
  const handleSearch = (value: string) => {
    setSearch(value);
    searchServices(value);
  };
  
  // Handle filter
  const handleFilter = () => {
    const filters: any = {};
    if (statusFilter) filters.status = statusFilter;
    if (serviceTypeFilter) filters.service_type = serviceTypeFilter;
    if (assigneeFilter) filters.assigned_to = assigneeFilter;
    filterServices(filters);
  };

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(s => s.id)));
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} service(s)?`)) return;
    await Promise.all([...selected].map(id => deleteService(id)));
    setSelected(new Set());
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service record?')) return;
    await deleteService(id);
  };

  const handleExport = async () => {
    try {
      // Fetch ALL services with current filters (no pagination limit)
      const params: any = { page_size: 10000 }; // Large number to get all records
      
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (serviceTypeFilter) params.service_type = serviceTypeFilter;
      if (assigneeFilter) params.assigned_to = assigneeFilter;
      
      const res = await capitalServiceService.list(params) as any;
      const allServices = Array.isArray(res) ? res : res.results || [];
      
      const data = allServices.map((s: any) => ({
        'Client Name': s.client_name, Phone: s.phone, Email: s.email || '',
        'Business Name': s.business_name || '', 'City/State': s.city_state || '',
        Category: SERVICE_CATEGORY[s.service_type] || 'Other',
        'Service Type': s.service_type_display || s.service_type,
        Status: s.status_display || s.status,
        'PAN Number': s.pan_number || '', 'Aadhaar Number': s.aadhaar_number || '',
        'Financial Year': s.financial_year || '', 'Service Fee': s.service_fee || '',
        Notes: s.notes || '', 'Assigned To': s.assigned_to_name || '',
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Services');
      XLSX.writeFile(wb, `capital-services-${new Date().toISOString().slice(0, 10)}.xlsx`);
      
      toast.success(`Exported ${data.length} services`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export services');
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Client Name': 'Jane Doe', Phone: '9876543210', Email: 'jane@example.com',
      'Business Name': 'ABC Traders', 'City/State': 'Chennai, TN',
      'Service Type': 'GST Registration (New)',
      'PAN Number': 'ABCDE1234F', 'Aadhaar Number': '123456789012',
      'Financial Year': '2024-25', 'Service Fee': '2000',
      Notes: 'Sample note',
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Services');
    XLSX.writeFile(wb, 'services-template.xlsx');
  };

  // Map exported display labels back to backend service_type keys
  const SERVICE_TYPE_KEY: Record<string, string> = {
    'gst registration (new)': 'gst_registration',
    'gst return filing (monthly)': 'gst_filing_monthly',
    'gst return filing (quarterly)': 'gst_filing_quarterly',
    'gst amendment / update': 'gst_amendment',
    'gst cancellation': 'gst_cancellation',
    'lut filing (exports)': 'lut_filing',
    'e-way bill generation': 'eway_bill',
    'gst consultation / advisory': 'gst_consultation',
    'msme / udyam registration': 'msme_registration',
    'msme certificate download': 'msme_certificate',
    'msme amendment': 'msme_amendment',
    'income tax filing': 'itr_filing',
    'income tax notice': 'itr_notice',
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      await bulkImportServices(rows.map(r => {
        const rawType = String(r['Service Type'] || '').toLowerCase().trim();
        const service_type = SERVICE_TYPE_KEY[rawType] || rawType.replace(/ /g, '_') || 'gst_registration';
        return {
          client_name: r['Client Name'] || '',
          phone: String(r['Phone'] || ''),
          email: r['Email'] || undefined,
          business_name: r['Business Name'] || '',
          city_state: r['City/State'] || '',
          service_type,
          pan_number: r['PAN Number'] || '',
          aadhaar_number: r['Aadhaar Number'] || '',
          financial_year: r['Financial Year'] || '',
          service_fee: r['Service Fee'] ? String(r['Service Fee']) : undefined,
          notes: r['Notes'] || '',
        };
      }));
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Service type options grouped by category
  const SERVICE_TYPE_OPTIONS = [
    { value: 'gst_registration', label: 'GST Registration', cat: 'GST' },
    { value: 'gst_filing_monthly', label: 'GST Filing (Monthly)', cat: 'GST' },
    { value: 'gst_filing_quarterly', label: 'GST Filing (Quarterly)', cat: 'GST' },
    { value: 'gst_amendment', label: 'GST Amendment', cat: 'GST' },
    { value: 'gst_cancellation', label: 'GST Cancellation', cat: 'GST' },
    { value: 'msme_registration', label: 'MSME Registration', cat: 'MSME' },
    { value: 'msme_amendment', label: 'MSME Amendment', cat: 'MSME' },
    { value: 'itr_filing', label: 'ITR Filing', cat: 'ITR' },
    { value: 'itr_notice', label: 'ITR Notice', cat: 'ITR' },
  ];

  return (
    <div className="min-h-screen">
      <TopBar title="Eswari Capital — Services" subtitle="GST, MSME & Income Tax services" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
            <input type="text" placeholder="Search..." value={search} onChange={e => handleSearch(e.target.value)}
              className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-48" />
            <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setServiceTypeFilter(''); }}
              className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto">
              <option value="">All Categories</option>
              <option value="GST">GST</option>
              <option value="MSME">MSME</option>
              <option value="ITR">Income Tax</option>
            </select>
            <select value={serviceTypeFilter} onChange={e => { setServiceTypeFilter(e.target.value); handleFilter(); }}
              className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto">
              <option value="">All Service Types</option>
              {SERVICE_TYPE_OPTIONS.filter(o => !categoryFilter || o.cat === categoryFilter).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); handleFilter(); }}
              className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto">
              <option value="">All Status</option>
              <option value="inquiry">Inquiry</option>
              <option value="documents_pending">Documents Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto">
              <option value="">All Assignees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
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
              <span className="hidden sm:inline">Export ({servicesTotalCount})</span>
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={refreshServices}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" className="rounded-full w-full sm:w-auto" onClick={() => { setEditing(null); setIsModalOpen(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add Service
            </Button>
          </div>
        </div>

        {/* Pagination - Top */}
        <Pagination
          currentPage={servicesPage}
          totalPages={servicesTotalPages}
          totalCount={servicesTotalCount}
          onPageChange={loadServicesPage}
          loading={loadingServices}
          itemName="services"
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
              <th className="text-left py-3 px-4">Client</th>
              <th className="text-left py-3 px-4">Phone</th>
              <th className="text-left py-3 px-4">Category</th>
              <th className="text-left py-3 px-4">Service</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Assigned To</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr></thead>
            <tbody>
              {loadingServices ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No services found</td></tr>
              ) : filtered.map(s => {
                const cat = SERVICE_CATEGORY[s.service_type] || 'Other';
                return (
                  <tr key={s.id} className={`border-b hover:bg-muted/30 transition-colors ${selected.has(s.id) ? 'bg-primary/5' : ''}`}>
                    <td className="py-3 px-4"><input type="checkbox" className="rounded" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} /></td>
                    <td className="py-3 px-4 font-medium">
                      <div>{s.client_name}</div>
                      {s.business_name && <div className="text-xs text-muted-foreground">{s.business_name}</div>}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{s.phone}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-700'}`}>{cat}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{s.service_type_display || s.service_type.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-700'}`}>
                        {s.status_display || s.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground" title={s.assigned_to_name || 'Unassigned'}>
                      {s.assigned_to_name ? s.assigned_to_name.split(' ')[0] : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" title="View Details" onClick={() => setViewing(s)}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500" title="Add Task" onClick={() => setTaskService(s)}><ClipboardList className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(s); setIsModalOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {loadingServices ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No services found</div>
          ) : filtered.map(s => {
            const cat = SERVICE_CATEGORY[s.service_type] || 'Other';
            return (
              <div key={s.id} className={`glass-card rounded-xl p-4 ${selected.has(s.id) ? 'ring-2 ring-primary' : ''}`}>
                <div className="flex items-start gap-3 mb-3">
                  <input type="checkbox" className="rounded mt-1" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base mb-1">{s.client_name}</div>
                    {s.business_name && <div className="text-sm text-muted-foreground mb-1">{s.business_name}</div>}
                    <a href={`tel:${s.phone}`} className="text-sm text-muted-foreground hover:text-primary">{s.phone}</a>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-muted-foreground mb-1">Service</div>
                  <div className="text-sm font-medium">{s.service_type_display || s.service_type.replace(/_/g, ' ')}</div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-700'}`}>
                    {cat}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-700'}`}>
                    {s.status_display || s.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {s.assigned_to_name && (
                  <div className="text-xs text-muted-foreground mb-3">
                    Assigned to: <span className="font-medium text-foreground">{s.assigned_to_name}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs rounded-full gap-1" onClick={() => setViewing(s)}>
                    <Eye className="w-3.5 h-3.5" />View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs rounded-full gap-1" onClick={() => setTaskService(s)}>
                    <ClipboardList className="w-3.5 h-3.5" />Task
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => { setEditing(s); setIsModalOpen(true); }}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full text-red-500" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination - Bottom */}
        <Pagination
          currentPage={servicesPage}
          totalPages={servicesTotalPages}
          totalCount={servicesTotalCount}
          onPageChange={loadServicesPage}
          loading={loadingServices}
          itemName="services"
        />
      </div>

      {isModalOpen && (
        <CapitalServiceModal
          service={editing}
          employees={employees}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => { setIsModalOpen(false); setEditing(null); }}
          onSave={async (data) => {
            if (editing) await updateService(editing.id, data);
            else await addService(data);
            setIsModalOpen(false); setEditing(null);
          }}
        />
      )}

      {viewing && (
        <CapitalServiceDetailsModal
          service={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
            setIsModalOpen(true);
          }}
        />
      )}

      {taskService && (
        <CapitalTaskModal
          task={null}
          loans={[]}
          services={services}
          employees={employees}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          preselectedService={taskService.id}
          onClose={() => setTaskService(null)}
          onSave={async (data) => {
            await addTask(data);
            setTaskService(null);
          }}
        />
      )}
    </div>
  );
}
