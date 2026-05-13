import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Phone,
  MapPin,
  Loader2,
  CheckCircle,
  ArrowRight,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import TopBar from '@/components/layout/TopBar';
import { useAuth } from '@/contexts/AuthContextDjango';

interface LeadRecord {
  id: number;
  name: string;
  phone_number: string;
  location: string;
  notes: string;
  status: string;
  call_status: string;
  call_notes: string;
  created_by_name: string;
  assigned_to_name: string;
  assigned_to_cre_name: string | null;
  created_at: string;
}

interface CREUser {
  id: number;
  name: string;
}

export default function BOELeads({ hideTopBar = false }: { hideTopBar?: boolean } = {}) {
  const { user } = useAuth();
  const canBulkAssign = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'team_lead' || user?.role === 'employee';
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [leadStats, setLeadStats] = useState({ total: 0, pending_cre: 0, assigned_cre: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [boeUsers, setBoeUsers] = useState<{id: number; first_name: string; last_name: string}[]>([]);
  const hasFetchedRef = useRef(false);

  // Bulk operations
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAllRecords, setSelectAllRecords] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);
  const [bulkCreUsers, setBulkCreUsers] = useState<{id: number; name: string}[]>([]);
  const [selectedBulkCre, setSelectedBulkCre] = useState('');

  // Assign CRE modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignRecord, setAssignRecord] = useState<LeadRecord | null>(null);
  const [creUsers, setCreUsers] = useState<CREUser[]>([]);
  const [selectedCre, setSelectedCre] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Add Lead modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addLocation, setAddLocation] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit Lead modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<LeadRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // View detail modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<LeadRecord | null>(null);

  // Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const fetchLeads = async () => {
    try {
      if (!hasFetchedRef.current) setLoading(true);
      const token = localStorage.getItem('access_token');
      let url = `http://localhost:8000/api/ase-leads/boe-leads/?page=${currentPage}&page_size=50`;
      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (statusFilter && statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
      if (createdByFilter) url += `&created_by=${createdByFilter}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setLeads(data.results || []);
      setTotalCount(data.count || 0);
      setTotalPages(data.total_pages || 1);
      if (data.stats) setLeadStats(data.stats);
      hasFetchedRef.current = true;
    } catch (err) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [currentPage, debouncedSearch, statusFilter, dateFrom, dateTo, createdByFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchQuery); setCurrentPage(1); }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Silent poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchLeads, 5000);
    return () => clearInterval(interval);
  }, [currentPage, debouncedSearch, statusFilter, dateFrom, dateTo, createdByFilter]);

  // Fetch BOE users for "Created By" filter
  useEffect(() => {
    const fetchBoeUsers = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/ase-leads/boe-leads/creators/', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setBoeUsers(Array.isArray(data) ? data : data?.results || []);
        }
      } catch (err) {
        setBoeUsers([]);
      }
    };
    fetchBoeUsers();
  }, []);

  // Date filter handler
  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    setCurrentPage(1);
    const today = new Date();
    if (value === 'today') {
      const d = today.toISOString().split('T')[0];
      setDateFrom(d); setDateTo(d);
    } else if (value === 'this_week') {
      const day = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
      setDateFrom(monday.toISOString().split('T')[0]);
      setDateTo(today.toISOString().split('T')[0]);
    } else if (value === 'this_month') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateFrom(first.toISOString().split('T')[0]);
      setDateTo(today.toISOString().split('T')[0]);
    } else if (value === 'all') {
      setDateFrom(''); setDateTo('');
    }
  };

  // Open assign CRE modal
  const handleOpenAssign = async (record: LeadRecord) => {
    setAssignRecord(record);
    setAssignNotes('');
    setSelectedCre('');
    setAssignModalOpen(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/ase-leads/cre-users/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCreUsers(data);
      }
    } catch (err) {
      setCreUsers([]);
    }
  };

  // Assign to CRE
  const handleAssignCRE = async () => {
    if (!assignRecord || !selectedCre) {
      toast.error('Please select a CRE employee');
      return;
    }
    try {
      setAssignLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/ase-leads/boe-leads/${assignRecord.id}/assign-cre/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to_cre: parseInt(selectedCre), call_notes: assignNotes }),
      });
      if (!response.ok) throw new Error('Failed to assign');
      const data = await response.json();
      toast.success(data.message || 'Assigned to CRE successfully');
      setAssignModalOpen(false);
      fetchLeads();
    } catch (err) {
      toast.error('Failed to assign to CRE');
    } finally {
      setAssignLoading(false);
    }
  };

  // Add Lead handler
  const handleAddLead = async () => {
    if (!addName.trim() || !addPhone.trim()) { toast.error('Name and phone are required'); return; }
    try {
      setAddLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/ase-leads/boe-leads/create/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName, phone_number: addPhone, location: addLocation, notes: addNotes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add');
      toast.success('Lead added successfully');
      setAddModalOpen(false);
      setAddName(''); setAddPhone(''); setAddLocation(''); setAddNotes('');
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add lead');
    } finally {
      setAddLoading(false);
    }
  };

  // Edit Lead handler
  const handleOpenEdit = (record: LeadRecord) => {
    setEditRecord(record);
    setEditName(record.name);
    setEditPhone(record.phone_number);
    setEditLocation(record.location);
    setEditNotes(record.call_notes || record.notes);
    setEditModalOpen(true);
  };

  const handleEditLead = async () => {
    if (!editRecord || !editName.trim() || !editPhone.trim()) { toast.error('Name and phone are required'); return; }
    try {
      setEditLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/ase-leads/boe-leads/${editRecord.id}/update/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, phone_number: editPhone, location: editLocation, notes: editNotes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update');
      toast.success('Lead updated');
      setEditModalOpen(false);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Lead handler
  const handleDeleteLead = async (record: LeadRecord) => {
    if (!confirm(`Delete lead "${record.name}"?`)) return;
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/ase-leads/boe-leads/${record.id}/delete/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success('Lead deleted');
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message || 'Cannot delete — only leads you created can be deleted');
    }
  };

  // Export leads
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/ase-leads/boe-leads/export/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'boe_leads.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Leads exported successfully');
    } catch (err) {
      toast.error('Failed to export leads');
    }
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/ase-leads/boe-leads/template/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'boe_leads_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (err) {
      toast.error('Failed to download template');
    }
  };

  // Import leads
  const handleImport = async () => {
    if (!importFile) { toast.error('Please select a file'); return; }
    try {
      setImportLoading(true);
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', importFile);
      const response = await fetch('http://localhost:8000/api/ase-leads/boe-leads/import/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import failed');
      setImportResult(data);
      toast.success(data.message);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const filteredLeads = leads;

  // Bulk select helpers
  const toggleSelectId = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
      setSelectAllRecords(false);
    } else {
      setSelectedIds(leads.map(l => parseInt(l.id as any)));
      setSelectAllRecords(false);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (!selectAllRecords && !selectedIds.length) { toast.error('Select records first'); return; }
    if (!confirm(`Delete ${selectAllRecords ? totalCount : selectedIds.length} records? This cannot be undone.`)) return;
    try {
      setBulkDeleteLoading(true);
      const token = localStorage.getItem('access_token');
      const body: any = {};
      if (selectAllRecords) {
        body.select_all = true;
        if (searchQuery) body.search = searchQuery;
        if (statusFilter && statusFilter !== 'all') body.status = statusFilter;
      } else {
        body.ids = selectedIds;
      }
      const response = await fetch('http://localhost:8000/api/ase-leads/boe-leads/bulk-delete/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed');
      toast.success(result.message || 'Records deleted');
      setSelectedIds([]);
      setSelectAllRecords(false);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Bulk Assign
  const handleOpenBulkAssign = async () => {
    setBulkAssignModalOpen(true);
    setSelectedBulkCre('');
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/ase-leads/cre-users/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBulkCreUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setBulkCreUsers([]);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedBulkCre) { toast.error('Select a CRE employee'); return; }
    try {
      setBulkAssignLoading(true);
      const token = localStorage.getItem('access_token');
      const body: any = { assigned_to_cre: parseInt(selectedBulkCre) };
      if (selectAllRecords) {
        body.select_all = true;
        if (searchQuery) body.search = searchQuery;
        if (statusFilter && statusFilter !== 'all') body.status = statusFilter;
      } else {
        body.ids = selectedIds;
      }
      const response = await fetch('http://localhost:8000/api/ase-leads/boe-leads/bulk-assign/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed');
      toast.success(result.message || 'Records assigned');
      setBulkAssignModalOpen(false);
      setSelectedIds([]);
      setSelectAllRecords(false);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign');
    } finally {
      setBulkAssignLoading(false);
    }
  };

  return (
    <div className={hideTopBar ? "" : "min-h-screen"}>
      {!hideTopBar && <TopBar title="Leads" subtitle="Converted leads & CRE assignment" />}
      <div className={hideTopBar ? "space-y-4" : "space-y-4 p-3 sm:p-4 md:p-6 pt-4"}>
      <h2 className="text-xl sm:text-2xl font-bold">Leads</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:pt-6">
            <p className="text-lg sm:text-2xl font-bold">{leadStats.total}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-6">
            <p className="text-lg sm:text-2xl font-bold text-green-600">{leadStats.pending_cre}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Pending CRE</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-6">
            <p className="text-lg sm:text-2xl font-bold text-purple-600">{leadStats.assigned_cre}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Assigned CRE</p>
          </CardContent>
        </Card>
      </div>

      {/* Leads List */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          {/* Top row: title + action buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Converted Leads
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-1" /> Template
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setImportFile(null); setImportResult(null); setImportModalOpen(true); }}>
                <Upload className="w-4 h-4 mr-1" /> Import
              </Button>
              <Button size="sm" variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-1" /> Export ({totalCount})
              </Button>
              <Button size="sm" onClick={() => setAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Lead
              </Button>
            </div>
          </div>
          {/* Filters row */}
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name, phone, location..."
                className="h-9 w-full sm:w-[220px] rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Status</option>
              <option value="interested">New Lead</option>
              <option value="assigned_cre">Assigned to CRE</option>
              <option value="in_progress">In Progress</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={dateFilter}
              onChange={(e) => handleDateFilterChange(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={createdByFilter}
              onChange={(e) => { setCreatedByFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Employees</option>
              {boeUsers.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.first_name} {u.last_name}
                </option>
              ))}
            </select>
            {dateFilter === 'custom' && (
              <>
                <input type="date" className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} />
                <span className="text-xs text-muted-foreground self-center">to</span>
                <input type="date" className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} />
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No leads yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Convert to Lead" in Research Data to move records here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Top Pagination */}
              {totalCount > 0 && (
                <div className="flex items-center justify-between pb-3 border-b">
                  <p className="text-xs text-muted-foreground">
                    Showing {leads.length} of {totalCount} records (Page {currentPage} of {totalPages})
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)}>
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Bulk Actions Bar */}
              <div className="flex flex-col gap-2 pb-3 border-b">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300"
                      checked={selectedIds.length === leads.length && leads.length > 0}
                      onChange={toggleSelectAll}
                    />
                    Select All ({selectedIds.length} selected)
                  </label>
                  {(selectedIds.length > 0 || selectAllRecords) && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleteLoading}>
                        <Trash2 className="w-4 h-4 mr-1" /> Delete ({selectAllRecords ? totalCount : selectedIds.length})
                      </Button>
                      {canBulkAssign && (
                        <Button size="sm" onClick={handleOpenBulkAssign}>
                          <UserPlus className="w-4 h-4 mr-1" /> Assign CRE ({selectAllRecords ? totalCount : selectedIds.length})
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {selectedIds.length === leads.length && totalCount > leads.length && !selectAllRecords && (
                  <div className="text-sm text-center py-1.5 bg-blue-50 border border-blue-200 rounded-md">
                    All {leads.length} on this page selected.{' '}
                    <button className="text-blue-600 font-medium underline" onClick={() => setSelectAllRecords(true)}>
                      Select all {totalCount} records
                    </button>
                  </div>
                )}
                {selectAllRecords && (
                  <div className="text-sm text-center py-1.5 bg-blue-100 border border-blue-300 rounded-md">
                    All <strong>{totalCount}</strong> records selected.{' '}
                    <button className="text-blue-600 font-medium underline" onClick={() => { setSelectAllRecords(false); setSelectedIds([]); }}>
                      Clear selection
                    </button>
                  </div>
                )}
              </div>

              {leads.map((record) => (
                <div key={record.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 mt-1 shrink-0"
                        checked={selectedIds.includes(parseInt(record.id as any))}
                        onChange={() => toggleSelectId(parseInt(record.id as any))}
                      />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{record.name}</h4>
                        {record.assigned_to_cre_name 
                          ? <Badge className="bg-purple-100 text-purple-700 border-purple-300">Assigned to CRE</Badge>
                          : <Badge className="bg-green-100 text-green-700 border-green-300">New Lead</Badge>
                        }
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{record.phone_number}</span>
                        {record.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{record.location}</span>}
                      </div>
                      {record.call_notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-[300px]">Notes: {record.call_notes}</p>
                      )}
                      {record.notes && !record.call_notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-[300px]">Notes: {record.notes}</p>
                      )}
                      {record.assigned_to_cre_name && (
                        <p className="text-xs text-purple-600 font-medium mt-1">→ CRE: {record.assigned_to_cre_name}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">Date: {new Date(record.created_at).toLocaleDateString()}</p>
                    </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => { setViewRecord(record); setViewModalOpen(true); }} title="View Details">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                      </Button>
                      <a href={`tel:${record.phone_number}`}>
                        <Button size="sm" variant="outline" className="h-8 px-2">
                          <Phone className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                      </a>
                      {!record.assigned_to_cre_name && canBulkAssign && (
                        <Button size="sm" className="h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => handleOpenAssign(record)}>
                          <ArrowRight className="w-3.5 h-3.5 mr-1" />
                          <span className="text-xs">Assign CRE</span>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => handleOpenEdit(record)} title="Edit">
                        <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => handleDeleteLead(record)} title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {leads.length} of {totalCount} records (Page {currentPage} of {totalPages})
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)}>
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Leads from Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!importResult ? (
              <>
                <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                  Upload an Excel file with columns: Name, Phone Number, Location, Notes, Call Notes.
                  <Button variant="link" className="p-0 h-auto ml-1 text-xs" onClick={handleDownloadTemplate}>
                    Download template
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Select Excel File (.xlsx)</Label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="w-full text-sm border rounded-md p-2"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-green-700 font-medium">{importResult.message}</p>
                  <p className="text-sm text-green-600">Created: {importResult.created} | Skipped: {importResult.skipped}</p>
                </div>
                {importResult.errors?.length > 0 && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-red-700 text-sm font-medium">Errors:</p>
                    {importResult.errors.map((e: string, i: number) => (
                      <p key={i} className="text-xs text-red-600">{e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModalOpen(false)}>
              {importResult ? 'Close' : 'Cancel'}
            </Button>
            {!importResult && (
              <Button onClick={handleImport} disabled={importLoading || !importFile}>
                {importLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Import
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Detail Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <div className="space-y-3 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="text-sm font-medium">{viewRecord.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <p className="text-sm font-medium">{viewRecord.phone_number}</p>
                </div>
                {viewRecord.location && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <p className="text-sm font-medium">{viewRecord.location}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge className="bg-green-100 text-green-700 border-green-300 mt-1">
                    {viewRecord.assigned_to_cre_name ? 'Assigned to CRE' : 'New Lead'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="text-sm">{new Date(viewRecord.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Created By</Label>
                  <p className="text-sm">{viewRecord.created_by_name}</p>
                </div>
              </div>
              {viewRecord.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap bg-muted p-2 rounded">{viewRecord.notes}</p>
                </div>
              )}
              {viewRecord.call_notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Call Notes</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap bg-muted p-2 rounded">{viewRecord.call_notes}</p>
                </div>
              )}
              {viewRecord.assigned_to_cre_name && (
                <div>
                  <Label className="text-xs text-muted-foreground">Assigned to CRE</Label>
                  <p className="text-sm font-medium text-purple-600">{viewRecord.assigned_to_cre_name}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>Close</Button>
            {viewRecord && (
              <a href={`tel:${viewRecord.phone_number}`}>
                <Button><Phone className="w-4 h-4 mr-2" /> Call</Button>
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign CRE Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to CRE</DialogTitle>
          </DialogHeader>
          {assignRecord && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{assignRecord.name}</p>
                <p className="text-sm text-muted-foreground">{assignRecord.phone_number}</p>
                {assignRecord.location && <p className="text-sm text-muted-foreground">{assignRecord.location}</p>}
              </div>

              <div className="space-y-2">
                <Label>Select CRE Employee *</Label>
                <Select value={selectedCre} onValueChange={setSelectedCre}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select CRE employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {creUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {creUsers.length === 0 && (
                  <p className="text-xs text-red-500">No CRE employees found.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Add notes..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleAssignCRE} disabled={assignLoading || !selectedCre}>
              {assignLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
              Assign to CRE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lead Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="Contact name" value={addName} onChange={(e) => setAddName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input placeholder="Phone number" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="City / Area" value={addLocation} onChange={(e) => setAddLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes..." value={addNotes} onChange={(e) => setAddNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLead} disabled={addLoading || !addName.trim() || !addPhone.trim()}>
              {addLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="Contact name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input placeholder="Phone number" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="City / Area" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Notes..." value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEditLead} disabled={editLoading || !editName.trim() || !editPhone.trim()}>
              {editLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign CRE Modal */}
      <Dialog open={bulkAssignModalOpen} onOpenChange={setBulkAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Assign to CRE ({selectAllRecords ? totalCount : selectedIds.length} records)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select CRE Employee *</Label>
              <Select value={selectedBulkCre} onValueChange={setSelectedBulkCre}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose CRE employee..." />
                </SelectTrigger>
                <SelectContent>
                  {bulkCreUsers.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAssignModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAssign} disabled={bulkAssignLoading || !selectedBulkCre}>
              {bulkAssignLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign {selectAllRecords ? totalCount : selectedIds.length} Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
