import { useState, useRef, useMemo } from 'react';
import { useASELead } from '@/contexts/ASELeadContext';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useCompany } from '@/contexts/CompanyContext';
import { useASEWebSocket } from '@/hooks/useASEWebSocket';
import TopBar from '@/components/layout/TopBar';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import ASELeadList from '@/components/ase-leads/ASELeadList';
import LeadKanbanBoard from '@/components/ase-leads/LeadKanbanBoard';
import ASELeadFormModal from '@/components/ase-leads/ASELeadFormModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusIcon, SearchIcon, FilterIcon, DownloadIcon, UploadIcon, Trash2Icon, ChevronLeftIcon, ChevronRightIcon, LayoutListIcon, KanbanIcon, XIcon, PhoneCallIcon, CheckCircleIcon, ArrowRightIcon, CalendarClockIcon, MoreHorizontalIcon } from 'lucide-react';
import { ASELead, ASELeadFormData } from '@/types/ase-customer';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { aseLeadService } from '@/services/ase-lead.service';

import { logger } from '@/lib/logger';
export default function AdminASELeads() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const {
    leads,
    stats,
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    priorityFilter, setPriorityFilter,
    industryFilter, setIndustryFilter,
    createdByFilter, setCreatedByFilter,
    dateFromFilter, setDateFromFilter,
    dateToFilter, setDateToFilter,
    creators,
    clearFilters,
    createLead, updateLead, deleteLead, refreshData,
    currentPage, setCurrentPage, totalPages, totalCount,
  } = useASELead();

  // Real-time updates via WebSocket
  useASEWebSocket('leads', () => { refreshData(); });

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedLead, setSelectedLead] = useState<ASELead | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);

  // Fetch all creators from API (not just current page)
  const uniqueCreators = useMemo(() => {
    return creators.map(c => [String(c.id), c.name] as [string, string])
      .sort((a, b) => a[1].localeCompare(b[1]));
  }, [creators]);

  // ── Selection helpers ──────────────────────────────────────────────────
  const toggleAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Bulk delete ────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} lead(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const companyId = selectedCompany?.id || (user?.company as any)?.id;
      await aseLeadService.bulkDeleteByIds(Array.from(selectedIds), companyId);
      toast.success(`Deleted ${selectedIds.size} lead(s)`);
      await refreshData();
    } catch {
      toast.error('Failed to delete leads');
    } finally {
      setSelectedIds(new Set());
      setBulkDeleting(false);
    }
  };

  // ── Template download ──────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const template = [{
      'Company Name': 'Example Corp',
      'Contact Person': 'John Doe',
      'Email': 'john@example.com',
      'Phone': '9876543210',
      'Website': 'https://example.com',
      'Industry': 'technology',
      'Services': 'SEO, Social Media Marketing',
      'Budget': '50000',
      'Status': 'new',
      'Priority': 'medium',
      'Marketing Goals': 'Increase brand awareness',
      'Notes': 'Interested in monthly retainer',
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'ase-leads-import-template.xlsx');
    toast.success('Template downloaded');
  };

  // ── Export (all pages) ────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      // Fetch ALL pages respecting every active filter
      const companyId = selectedCompany?.id || (user?.company as any)?.id;
      let allLeads: any[] = [];
      let page = 1;
      while (true) {
        const res = await aseLeadService.getLeads({
          search: searchTerm || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          industry: industryFilter || undefined,
          created_by: createdByFilter || undefined,
          date_from: dateFromFilter || undefined,
          date_to: dateToFilter || undefined,
          company: companyId || undefined,
          page,
          page_size: 200,
        });
        allLeads = allLeads.concat(res.results);
        if (!res.next) break;
        page++;
      }

      const exportData = allLeads.map((lead) => ({
        'Company Name': lead.company_name,
        'Contact Person': lead.contact_person,
        'Email': lead.email || '',
        'Phone': lead.phone,
        'Website': lead.website || '',
        'Industry': lead.industry,
        'Services': Array.isArray(lead.service_interests_display) ? lead.service_interests_display.join(', ') : '',
        'Budget': lead.budget_amount || '',
        'Status': lead.status,
        'Priority': lead.priority,
        'Marketing Goals': lead.marketing_goals || '',
        'Notes': lead.notes || '',
        'Assigned To': lead.assigned_to_name || '',
        'Created By': lead.created_by_name || '',
        'Created At': new Date(lead.created_at).toLocaleDateString(),
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ASE Leads');
      const dateStr = new Date().toISOString().slice(0, 10);
      const filterTag = [statusFilter, priorityFilter, industryFilter].filter(Boolean).join('_');
      const filename = 'ase-leads' + (filterTag ? '_' + filterTag : '') + '_' + dateStr + '.xlsx';
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${exportData.length} leads`);
    } catch {
      toast.error('Failed to export leads');
    } finally {
      setExporting(false);
    }
  };

  // ── Import ─────────────────────────────────────────────────────────────
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
          toast.error('No data found in file');
          return;
        }

        const leads = rows.map((row) => ({
          company_name: row['Company Name'] || '',
          contact_person: row['Contact Person'] || '',
          email: row['Email'] || '',
          phone: String(row['Phone'] || ''),
          website: row['Website'] || '',
          industry: row['Industry'] || 'other',
          service_interests: [],
          budget_amount: String(row['Budget'] || ''),
          status: row['Status'] || 'new',
          priority: row['Priority'] || 'medium',
          marketing_goals: row['Marketing Goals'] || '',
          notes: row['Notes'] || '',
          has_website: false,
          has_social_media: false,
        }));

        toast.info(`Uploading ${leads.length} leads...`);
        const result = await aseLeadService.bulkImportLeads(leads);
        toast.success(`Imported ${result.imported} leads${result.errors.length ? ` (${result.errors.length} skipped)` : ''}`);

        // Refresh the leads list
        window.location.reload();
      } catch {
        toast.error('Failed to import leads');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleEditLead = (lead: ASELead) => setSelectedLead(lead);

  const handleDeleteLead = async (lead: ASELead) => {
    if (!window.confirm(`Delete "${lead.company_name}"?`)) return;
    await deleteLead(lead.id);
  };

  const handleCreateLead = async (leadData: ASELeadFormData) => {
    const result = await createLead(leadData);
    if (!result) throw new Error('Failed to create lead');
    setIsCreateModalOpen(false);
  };

  const handleUpdateLead = async (leadData: ASELeadFormData) => {
    if (!selectedLead) return;
    const result = await updateLead(selectedLead.id, leadData);
    if (!result) throw new Error('Failed to update lead');
    setSelectedLead(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="ASE Leads" />

      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        <AnnouncementBanner userRole={(user?.role === 'team_lead' ? 'employee' : user?.role) || 'admin'} maxDisplay={2} />

        {/* ── Stats Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'Total Leads', value: totalCount, color: 'text-blue-600', bg: 'bg-blue-50', icon: <PhoneCallIcon className="w-5 h-5 text-blue-600" />, filter: '' },
            { label: 'New', value: stats?.by_status?.['new']?.count ?? leads.filter(l => l.status === 'new').length, color: 'text-green-600', bg: 'bg-green-50', icon: <CheckCircleIcon className="w-5 h-5 text-green-600" />, filter: 'new' },
            { label: 'Demo Done', value: stats?.by_status?.['demo_done']?.count ?? leads.filter(l => l.status === 'demo_done').length, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: <ArrowRightIcon className="w-5 h-5 text-indigo-600" />, filter: 'demo_done' },
            { label: 'Presentation', value: stats?.by_status?.['presentation']?.count ?? leads.filter(l => l.status === 'presentation').length, color: 'text-orange-500', bg: 'bg-orange-50', icon: <CalendarClockIcon className="w-5 h-5 text-orange-500" />, filter: 'presentation' },
          ].map(card => (
            <button
              key={card.label}
              onClick={() => { setStatusFilter(statusFilter === card.filter ? '' : card.filter); setCurrentPage(1); }}
              className={`bg-white dark:bg-card rounded-2xl border shadow-sm px-4 py-3 flex items-center gap-3 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                statusFilter === card.filter && card.filter !== ''
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border'
              }`}
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-full ${card.bg} flex items-center justify-center`}>
                {card.icon}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-none mb-1">{card.label}</p>
                <p className={`text-2xl md:text-3xl font-bold leading-none ${card.color}`}>{card.value}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="glass-card p-3 md:p-6">
          {/* Header: Search + Filters + View toggle + More actions + Add Lead */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, company, service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 rounded-full text-sm"
              />
            </div>

            {/* Filters Button */}
            <Button
              variant={(statusFilter || priorityFilter || industryFilter || createdByFilter || dateFromFilter || dateToFilter) ? 'default' : 'outline'}
              onClick={() => setAdvancedFilterOpen(true)}
              className="h-9 px-3 text-xs gap-1.5 shrink-0"
              size="sm"
            >
              <FilterIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {(() => {
                let count = 0;
                if (statusFilter) count++;
                if (priorityFilter) count++;
                if (industryFilter) count++;
                if (createdByFilter) count++;
                if (dateFromFilter || dateToFilter) count++;
                return count > 0 ? <span className="bg-white/25 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{count}</span> : null;
              })()}
            </Button>

            {/* View toggle */}
            <div className="flex items-center border rounded-full overflow-hidden shrink-0">
              <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" className="h-9 rounded-none px-3" onClick={() => setViewMode('table')}>
                <LayoutListIcon className="w-3.5 h-3.5" />
              </Button>
              <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" className="h-9 rounded-none px-3" onClick={() => setViewMode('kanban')}>
                <KanbanIcon className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Bulk delete (only when selection active) */}
            {selectedIds.size > 0 && (
              <Button variant="outline" size="sm" className="h-9 text-red-600 border-red-300 shrink-0" onClick={handleBulkDelete} disabled={bulkDeleting}>
                <Trash2Icon className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Delete</span> ({selectedIds.size})
              </Button>
            )}

            {/* More actions dropdown — Template / Import / Export */}
            <input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-3 shrink-0">
                  <MoreHorizontalIcon className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1 text-xs">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleDownloadTemplate}>
                  <DownloadIcon className="w-4 h-4 mr-2 text-purple-600" />
                  Download Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => importInputRef.current?.click()}>
                  <UploadIcon className="w-4 h-4 mr-2 text-blue-600" />
                  Import from Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportExcel} disabled={exporting}>
                  <DownloadIcon className="w-4 h-4 mr-2 text-green-600" />
                  {exporting ? 'Exporting...' : `Export All (${totalCount})`}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add Lead */}
            <Button className="h-9 shrink-0" onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Add Lead</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>

          {/* Active filter badges */}
          {(statusFilter || priorityFilter || industryFilter || createdByFilter || dateFromFilter) && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {statusFilter && (
                <span className="h-6 px-2 text-[10px] rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                  {statusFilter.replace('_', ' ')}
                  <button onClick={() => setStatusFilter('')}><XIcon className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {priorityFilter && (
                <span className="h-6 px-2 text-[10px] rounded-full bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1">
                  {priorityFilter}
                  <button onClick={() => setPriorityFilter('')}><XIcon className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {industryFilter && (
                <span className="h-6 px-2 text-[10px] rounded-full bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                  {industryFilter.replace('_', ' ')}
                  <button onClick={() => setIndustryFilter('')}><XIcon className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {createdByFilter && (
                <span className="h-6 px-2 text-[10px] rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                  {uniqueCreators.find(c => c[0] === createdByFilter)?.[1] || 'Creator'}
                  <button onClick={() => setCreatedByFilter('')}><XIcon className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {dateFromFilter && (
                <span className="h-6 px-2 text-[10px] rounded-full bg-teal-100 text-teal-700 border border-teal-200 flex items-center gap-1">
                  {dateFromFilter}{dateToFilter && dateToFilter !== dateFromFilter ? ` → ${dateToFilter}` : ''}
                  <button onClick={() => { setDateFromFilter(''); setDateToFilter(''); }}><XIcon className="w-2.5 h-2.5" /></button>
                </span>
              )}
            </div>
          )}

          {/* Lead List / Kanban */}
          {viewMode === 'kanban' ? (
            <LeadKanbanBoard />
          ) : (
            <>
              <ASELeadList
                onEditLead={handleEditLead}
                onDeleteLead={handleDeleteLead}
                selectedIds={selectedIds}
                onToggleAll={toggleAll}
                onToggleOne={toggleOne}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-row items-center justify-between gap-2 mt-4 pt-4 border-t w-full">
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    Showing {(currentPage - 1) * 50 + 1}–{Math.min(currentPage * 50, totalCount)} of {totalCount} leads
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >«</Button>
                    <Button
                      variant="outline" size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </Button>

                    {/* Page number buttons — show up to 5 around current */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                      .reduce<(number | '...')[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === '...' ? (
                          <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                        ) : (
                          <Button
                            key={p}
                            variant={currentPage === p ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 w-8 p-0 text-xs"
                            onClick={() => setCurrentPage(p as number)}
                          >{p}</Button>
                        )
                      )}

                    <Button
                      variant="outline" size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >»</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <ASELeadFormModal
          open={isCreateModalOpen || selectedLead !== null}
          onClose={() => { setIsCreateModalOpen(false); setSelectedLead(null); }}
          onSave={selectedLead ? handleUpdateLead : handleCreateLead}
          lead={selectedLead}
        />

        {/* Advanced Filters Sheet */}
        <Sheet open={advancedFilterOpen} onOpenChange={setAdvancedFilterOpen}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <FilterIcon className="w-5 h-5" />
                Advanced Filters
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              {/* Quick Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Quick Select</label>
                <div className="grid grid-cols-3 gap-2">
                  {['This Month', 'Last Month', 'Last 3 Months'].map((preset) => (
                    <Button key={preset} variant="outline" size="sm" className="text-xs" onClick={() => {
                      const now = new Date();
                      if (preset === 'This Month') {
                        setDateFromFilter(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
                        setDateToFilter(now.toISOString().split('T')[0]);
                      } else if (preset === 'Last Month') {
                        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
                        setDateFromFilter(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`);
                        setDateToFilter(`${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`);
                      } else {
                        const threeAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                        setDateFromFilter(`${threeAgo.getFullYear()}-${String(threeAgo.getMonth() + 1).padStart(2, '0')}-01`);
                        setDateToFilter(now.toISOString().split('T')[0]);
                      }
                    }}>{preset}</Button>
                  ))}
                  {['This Week', 'Today', 'All Time'].map((preset) => (
                    <Button key={preset} variant="outline" size="sm" className="text-xs" onClick={() => {
                      const now = new Date();
                      if (preset === 'Today') {
                        const today = now.toISOString().split('T')[0];
                        setDateFromFilter(today);
                        setDateToFilter(today);
                      } else if (preset === 'This Week') {
                        const day = now.getDay();
                        const monday = new Date(now);
                        monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
                        setDateFromFilter(monday.toISOString().split('T')[0]);
                        setDateToFilter(now.toISOString().split('T')[0]);
                      } else {
                        setDateFromFilter('');
                        setDateToFilter('');
                      }
                    }}>{preset}</Button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Lead Status</label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="new">New</option>
                  <option value="demo_done">Demo Done</option>
                  <option value="presentation">Presentation</option>
                  <option value="quotation">Quotation</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                  <option value="">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Industry</label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)}>
                  <option value="">All Industries</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance</option>
                  <option value="retail">Retail & E-commerce</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="education">Education</option>
                  <option value="hospitality">Hospitality</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="professional_services">Professional Services</option>
                  <option value="non_profit">Non-Profit</option>
                  <option value="automotive">Automotive</option>
                  <option value="food_beverage">Food & Beverage</option>
                  <option value="fashion">Fashion & Beauty</option>
                  <option value="sports_fitness">Sports & Fitness</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Created By */}
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Created By</label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={createdByFilter} onChange={(e) => setCreatedByFilter(e.target.value)}>
                    <option value="">All Creators</option>
                    {uniqueCreators.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Month Picker */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by Month</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={dateFromFilter && dateToFilter ? 'custom' : ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && v !== 'custom') {
                      const [y, m] = v.split('-');
                      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
                      setDateFromFilter(`${v}-01`);
                      setDateToFilter(`${v}-${String(lastDay).padStart(2, '0')}`);
                    } else if (!v) {
                      setDateFromFilter('');
                      setDateToFilter('');
                    }
                  }}
                >
                  <option value="">All Months</option>
                  {(() => {
                    const items: React.ReactElement[] = [];
                    const now = new Date();
                    for (let i = 0; i < 24; i++) {
                      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                      items.push(<option key={value} value={value}>{label}</option>);
                    }
                    return items;
                  })()}
                </select>
              </div>

              {/* Custom Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Date Range</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">From</label>
                    <Input type="date" value={dateFromFilter} onChange={(e) => setDateFromFilter(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">To</label>
                    <Input type="date" value={dateToFilter} onChange={(e) => setDateToFilter(e.target.value)} className="mt-1" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => { clearFilters(); }}>
                  Clear All
                </Button>
                <Button className="flex-1" onClick={() => setAdvancedFilterOpen(false)}>
                  Apply & Close
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
