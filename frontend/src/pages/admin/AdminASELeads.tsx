import { useState, useRef, useMemo } from 'react';
import { useASELead } from '@/contexts/ASELeadContext';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useCompany } from '@/contexts/CompanyContext';
import TopBar from '@/components/layout/TopBar';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import ASELeadList from '@/components/ase-leads/ASELeadList';
import LeadKanbanBoard from '@/components/ase-leads/LeadKanbanBoard';
import ASELeadFormModal from '@/components/ase-leads/ASELeadFormModal';
import { Button } from '@/components/ui/button';
import { PlusIcon, SearchIcon, FilterIcon, DownloadIcon, UploadIcon, Trash2Icon, ChevronLeftIcon, ChevronRightIcon, LayoutListIcon, KanbanIcon } from 'lucide-react';
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
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    priorityFilter, setPriorityFilter,
    industryFilter, setIndustryFilter,
    createdByFilter, setCreatedByFilter,
    creators,
    clearFilters,
    createLead, updateLead, deleteLead, refreshData,
    currentPage, setCurrentPage, totalPages, totalCount,
  } = useASELead();

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedLead, setSelectedLead] = useState<ASELead | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

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
      // Fetch all pages
      let allLeads: any[] = [];
      let page = 1;
      while (true) {
        const res = await aseLeadService.getLeads({
          search: searchTerm,
          status: statusFilter,
          priority: priorityFilter,
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
        'Email': lead.email,
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
      XLSX.writeFile(wb, `ase-leads-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        <AnnouncementBanner userRole={user?.role || 'admin'} maxDisplay={2} />

        <div className="glass-card p-3 md:p-6">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Lead Management</h2>
            <p className="text-sm text-muted-foreground mt-1">Track and convert digital marketing leads</p>
          </div>

          {/* Row 1: Search */}
          <div className="relative w-full mb-3">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search leads by name, company, service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Row 2: Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-32 md:w-36"
              style={{ appearance: 'auto' }}
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="negotiating">Negotiating</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="on_hold">On Hold</option>
              <option value="nurturing">Nurturing</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-32 md:w-36"
              style={{ appearance: 'auto' }}
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-36 md:w-40"
              style={{ appearance: 'auto' }}
            >
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

            {(user?.role === 'admin' || user?.role === 'manager') && (
              <select
                value={createdByFilter}
                onChange={(e) => setCreatedByFilter(e.target.value)}
                className="px-3 py-1.5 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary w-36 md:w-40"
                style={{ appearance: 'auto' }}
              >
                <option value="">All Creators</option>
                {uniqueCreators.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            )}

            {(searchTerm || statusFilter || priorityFilter || industryFilter || createdByFilter) && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-full h-7 px-3 text-xs">
                <FilterIcon className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Row 3: Action buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            {/* Left: import/export/bulk */}
            <div className="flex flex-wrap items-center gap-2">
              <input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />

              <Button variant="outline" size="sm" className="rounded-full h-8 px-3 text-xs gap-1.5" onClick={handleDownloadTemplate}>
                <DownloadIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download Template</span>
                <span className="sm:hidden">Template</span>
              </Button>
              <Button variant="outline" size="sm" className="rounded-full h-8 px-3 text-xs gap-1.5" onClick={() => importInputRef.current?.click()}>
                <UploadIcon className="w-3.5 h-3.5" />
                Import
              </Button>
              <Button variant="outline" size="sm" className="rounded-full h-8 px-3 text-xs gap-1.5" onClick={handleExportExcel} disabled={exporting}>
                <DownloadIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{exporting ? 'Exporting...' : `Export (${totalCount})`}</span>
                <span className="sm:hidden">Export</span>
              </Button>

              {/* Bulk delete — only visible when rows are selected */}
              {selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full h-8 px-3 text-xs gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                >
                  <Trash2Icon className="w-3.5 h-3.5" />
                  {bulkDeleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
                </Button>
              )}
            </div>

            {/* Right: view toggle + add */}
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center border border-border rounded-full overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors ${viewMode === 'table' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                >
                  <LayoutListIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors ${viewMode === 'kanban' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                >
                  <KanbanIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kanban</span>
                </button>
              </div>

              <Button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                <PlusIcon className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Add Lead</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>

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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
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
      </div>
    </div>
  );
}
