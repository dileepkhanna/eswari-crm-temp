import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useDashboardStats,
  useMyLeadQueue,
  marketingActions,
} from '@/hooks/ase-marketing/useASEMarketing';
import type { LeadQueueItem } from '@/hooks/ase-marketing/useASEMarketing';
import { LeadStatusBadge, PriorityBadge } from '@/components/ase-marketing/shared';
import { ActivityTimeline } from '@/components/ase-marketing/activities/ActivityTimeline';
import { TaskList } from '@/components/ase-marketing/tasks/TaskList';
import {
  Search,
  CheckCircle,
  XCircle,
  Target,
  BarChart,
  Building2,
  User,
  Phone,
  Mail,
  Globe,
  Calendar,
  UserPlus,
  Loader2,
  Upload,
  Download,
  FileSpreadsheet,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, API_BASE_URL } from '@/lib/api';
import TopBar from '@/components/layout/TopBar';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface BOEUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function BREDashboard({ forceResearchView = false, hideTopBar = false }: { forceResearchView?: boolean; hideTopBar?: boolean } = {}) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const location = useLocation();
  const isResearchPage = forceResearchView || location.pathname.includes('/research');
  const [activeTab, setActiveTab] = useState(isResearchPage ? 'research-queue' : 'dashboard');

  // Sync tab with URL changes
  useEffect(() => {
    if (location.pathname.includes('/research')) {
      setActiveTab('research-queue');
    } else if (!location.pathname.includes('/research') && activeTab === 'research-queue') {
      // Only reset to dashboard if coming from research URL
    }
  }, [location.pathname]);
  const [selectedLead, setSelectedLead] = useState<LeadQueueItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Qualification modal
  const [qualifyModalOpen, setQualifyModalOpen] = useState(false);
  const [qualifyLeadId, setQualifyLeadId] = useState<number | null>(null);
  const [leadScore, setLeadScore] = useState<number[]>([50]);
  const [qualificationNotes, setQualificationNotes] = useState('');
  const [qualifyLoading, setQualifyLoading] = useState(false);

  // Disqualification modal
  const [disqualifyModalOpen, setDisqualifyModalOpen] = useState(false);
  const [disqualifyLeadId, setDisqualifyLeadId] = useState<number | null>(null);
  const [disqualifyReason, setDisqualifyReason] = useState('');
  const [disqualifyLoading, setDisqualifyLoading] = useState(false);

  // Assign to BOE modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignLeadId, setAssignLeadId] = useState<number | null>(null);
  const [boeUsers, setBoeUsers] = useState<BOEUser[]>([]);
  const [selectedBOEUser, setSelectedBOEUser] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [boeUsersLoading, setBoeUsersLoading] = useState(false);

  // Add Lead modal
  const [addLeadModalOpen, setAddLeadModalOpen] = useState(false);
  const [addLeadName, setAddLeadName] = useState('');
  const [addLeadPhone, setAddLeadPhone] = useState('');
  const [addLeadLocation, setAddLeadLocation] = useState('');
  const [addLeadNotes, setAddLeadNotes] = useState('');
  const [addLeadLoading, setAddLeadLoading] = useState(false);

  // Bulk Delete
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const handleBulkDeleteSubmit = async () => {
    if (!selectAllRecords && !selectedIds.length) {
      toast.error('Select records to delete');
      return;
    }
    try {
      setBulkDeleteLoading(true);
      const token = localStorage.getItem('access_token');
      const body: any = {};
      if (selectAllRecords) {
        body.select_all = true;
        if (debouncedSearch) body.search = debouncedSearch;
        if (statusFilter && statusFilter !== 'all') body.status = statusFilter;
        if (assignedToFilter) body.assigned_to = assignedToFilter;
        if (dateFrom) body.date_from = dateFrom;
        if (dateTo) body.date_to = dateTo;
      } else {
        body.ids = selectedIds;
      }
      const response = await fetch(`${API_BASE_URL}/ase-leads/bre-research/bulk-delete/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed');
      toast.success(result.message || `${result.deleted} records deleted`);
      setBulkDeleteModalOpen(false);
      setSelectedIds([]);
      setSelectAllRecords(false);
      refetchQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to bulk delete');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Bulk Upload modal
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState<any>(null);

  // ─── Data Hooks ──────────────────────────────────────────────────────────────
  const { data: stats, loading: statsLoading } = useDashboardStats();
  const [searchQuery, setSearchQuery] = useState('');

  // BRE Dashboard Stats
  const [breStats, setBreStats] = useState({
    total: 0, new_count: 0, assigned_count: 0, today_added: 0,
    this_week_added: 0, this_week_assigned: 0, this_month_added: 0, this_month_assigned: 0,
  });

  useEffect(() => {
    const fetchBreStats = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/ase-leads/bre-stats/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setBreStats(data);
        }
      } catch (err) {
        // silently fail
      }
    };
    fetchBreStats();
    // Auto-poll stats every 10 seconds for live updates
    const interval = setInterval(fetchBreStats, 5000);
    return () => clearInterval(interval);
  }, []);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [filterBoeUsers, setFilterBoeUsers] = useState<BOEUser[]>([]);
  const [filterBreUsers, setFilterBreUsers] = useState<BOEUser[]>([]);
  // Handle date filter preset changes
  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    setCurrentPage(1);
    const today = new Date();
    if (value === 'today') {
      const d = today.toISOString().split('T')[0];
      setDateFrom(d);
      setDateTo(d);
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
      setDateFrom('');
      setDateTo('');
    }
    // 'custom' keeps the current dateFrom/dateTo for manual input
  };

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLeadId, setEditLeadId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLeadId, setDeleteLeadId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAllRecords, setSelectAllRecords] = useState(false);
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [assignLimit, setAssignLimit] = useState('');
  
  // Debounce search - wait 500ms after typing stops
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchQuery); setCurrentPage(1); }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load BOE users and BRE users for filter dropdowns
  useEffect(() => {
    apiClient.get('/ase-leads/boe-users/').then((r: any) => {
      setFilterBoeUsers(Array.isArray(r) ? r : r?.results || []);
    }).catch(() => setFilterBoeUsers([]));
    apiClient.get('/ase-leads/bre-users/').then((r: any) => {
      setFilterBreUsers(Array.isArray(r) ? r : r?.results || []);
    }).catch(() => setFilterBreUsers([]));
  }, []);

  const { data: queue, loading: queueLoading, refetch: refetchQueue } = useMyLeadQueue({ 
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
    ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(assignedToFilter ? { assigned_to: assignedToFilter } : {}),
    ...(createdByFilter ? { created_by: createdByFilter } : {}),
    page: currentPage,
    _endpoint: '/ase-leads/bre-research/',
  });
  const { data: researchedLeads, loading: researchedLoading, refetch: refetchResearched } = useMyLeadQueue({ status: 'qualified,disqualified' });

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const openLeadDetail = (lead: LeadQueueItem) => {
    setSelectedLead(lead);
    setSheetOpen(true);
  };

  // Qualify
  const openQualifyModal = (leadId: number) => {
    setQualifyLeadId(leadId);
    setLeadScore([50]);
    setQualificationNotes('');
    setQualifyModalOpen(true);
  };

  const handleQualifySubmit = async () => {
    if (!qualifyLeadId) return;
    try {
      setQualifyLoading(true);
      await marketingActions.qualifyLead(qualifyLeadId, {
        lead_score: leadScore[0],
        qualification_notes: qualificationNotes || undefined,
      });
      toast.success('Lead qualified successfully');
      setQualifyModalOpen(false);
      refetchQueue();
      refetchResearched();
    } catch (err: any) {
      toast.error(err.message || 'Failed to qualify lead');
    } finally {
      setQualifyLoading(false);
    }
  };

  // Disqualify
  const openDisqualifyModal = (leadId: number) => {
    setDisqualifyLeadId(leadId);
    setDisqualifyReason('');
    setDisqualifyModalOpen(true);
  };

  const handleDisqualifySubmit = async () => {
    if (!disqualifyLeadId) return;
    if (!disqualifyReason.trim()) {
      toast.error('Disqualification reason is required');
      return;
    }
    try {
      setDisqualifyLoading(true);
      await marketingActions.disqualifyLead(disqualifyLeadId, {
        disqualification_reason: disqualifyReason,
      });
      toast.success('Lead disqualified');
      setDisqualifyModalOpen(false);
      refetchQueue();
      refetchResearched();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disqualify lead');
    } finally {
      setDisqualifyLoading(false);
    }
  };

  // Assign to BOE
  const openAssignModal = async (leadId: number) => {
    setAssignLeadId(leadId);
    setSelectedBOEUser('');
    setAssignModalOpen(true);
    setBoeUsersLoading(true);
    try {
      const response = await apiClient.get('/ase-leads/boe-users/');
      setBoeUsers(Array.isArray(response) ? response : response?.results || []);
    } catch (err: any) {
      toast.error('Failed to load BOE team members');
      setBoeUsers([]);
    } finally {
      setBoeUsersLoading(false);
    }
  };

  const handleAssignSubmit = async () => {
    if (!assignLeadId || !selectedBOEUser) {
      toast.error('Please select a BOE team member');
      return;
    }
    try {
      setAssignLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ase-leads/bre-research/${assignLeadId}/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: parseInt(selectedBOEUser) }),
      });
      if (!response.ok) throw new Error('Failed to assign');
      toast.success('Assigned to BOE successfully');
      setAssignModalOpen(false);
      refetchQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign');
    } finally {
      setAssignLoading(false);
    }
  };

  // Auto Assign modal state
  const [autoAssignModalOpen, setAutoAssignModalOpen] = useState(false);
  const [autoAssignLimit, setAutoAssignLimit] = useState('');
  const [autoAssignLoading, setAutoAssignLoading] = useState(false);
  const [autoAssignBoeUsers, setAutoAssignBoeUsers] = useState<any[]>([]);
  const [autoAssignSelectedUsers, setAutoAssignSelectedUsers] = useState<number[]>([]);

  // Auto Assign - distribute unassigned data equally to selected BOE employees
  const handleOpenAutoAssign = async () => {
    setAutoAssignModalOpen(true);
    setAutoAssignLimit('');
    setAutoAssignSelectedUsers([]);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/ase-leads/boe-users/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAutoAssignBoeUsers(Array.isArray(data) ? data : []);
        // Select all by default
        setAutoAssignSelectedUsers(data.map((u: any) => u.id));
      }
    } catch (err) {
      setAutoAssignBoeUsers([]);
    }
  };

  const handleAutoAssignSubmit = async () => {
    if (autoAssignSelectedUsers.length === 0) {
      toast.error('Select at least one BOE employee');
      return;
    }
    try {
      setAutoAssignLoading(true);
      const token = localStorage.getItem('access_token');
      const body: any = { boe_user_ids: autoAssignSelectedUsers, company: 2 };
      if (autoAssignLimit) body.limit = parseInt(autoAssignLimit);

      const response = await fetch(`${API_BASE_URL}/ase-leads/bre-research/auto-assign/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed');
      toast.success(`${result.message}\n${result.distribution?.join(' | ')}`);
      setAutoAssignModalOpen(false);
      refetchQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to auto-assign');
    } finally {
      setAutoAssignLoading(false);
    }
  };

  const handleAutoAssign = () => {
    handleOpenAutoAssign();
  };

  // Add Lead
  const handleAddLeadSubmit = async () => {
    if (!addLeadName.trim()) { toast.error('Name is required'); return; }
    if (!addLeadPhone.trim()) { toast.error('Phone is required'); return; }
    try {
      setAddLeadLoading(true);
      await apiClient.post('/ase-leads/add-lead/', {
        name: addLeadName.trim(),
        phone: addLeadPhone.trim(),
        location: addLeadLocation.trim(),
        notes: addLeadNotes.trim(),
      });
      toast.success('Lead added successfully');
      setAddLeadModalOpen(false);
      setAddLeadName('');
      setAddLeadPhone('');
      setAddLeadLocation('');
      setAddLeadNotes('');
      refetchQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add lead');
    } finally {
      setAddLeadLoading(false);
    }
  };

  // Edit Lead
  const openEditModal = (lead: LeadQueueItem) => {
    setEditLeadId(lead.id);
    setEditName(lead.name || lead.contact_person || '');
    setEditPhone(lead.phone_number || lead.phone || '');
    setEditLocation(lead.location || '');
    setEditNotes(lead.notes || '');
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editLeadId) return;
    try {
      setEditLoading(true);
      const token = localStorage.getItem('access_token');
      await fetch(`${API_BASE_URL}/ase-leads/bre-research/${editLeadId}/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          phone_number: editPhone.trim(),
          location: editLocation.trim(),
          notes: editNotes.trim(),
        }),
      });
      toast.success('Lead updated');
      setEditModalOpen(false);
      refetchQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Lead
  const openDeleteModal = (leadId: number) => {
    setDeleteLeadId(leadId);
    setDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!deleteLeadId) return;
    try {
      setDeleteLoading(true);
      const token = localStorage.getItem('access_token');
      await fetch(`${API_BASE_URL}/ase-leads/bre-research/${deleteLeadId}/delete/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      toast.success('Lead deleted');
      setDeleteModalOpen(false);
      refetchQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Bulk Assign
  const handleBulkAssignSubmit = async () => {
    if (!selectAllRecords && !selectedIds.length) {
      toast.error('Select records and a BOE member');
      return;
    }
    if (!selectedBOEUser) {
      toast.error('Please select a BOE member');
      return;
    }
    try {
      setAssignLoading(true);
      const token = localStorage.getItem('access_token');
      const body: any = { assigned_to: parseInt(selectedBOEUser) };
      if (selectAllRecords) {
        body.select_all = true;
        if (debouncedSearch) body.search = debouncedSearch;
        if (statusFilter && statusFilter !== 'all') body.status = statusFilter;
        if (assignedToFilter) body.assigned_to_filter = assignedToFilter;
        if (dateFrom) body.date_from = dateFrom;
        if (dateTo) body.date_to = dateTo;
        if (assignLimit) body.limit = parseInt(assignLimit);
      } else {
        body.ids = selectedIds;
      }
      const response = await fetch(`${API_BASE_URL}/ase-leads/bre-research/bulk-assign/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed');
      toast.success(result.message || `${result.updated} records assigned`);
      setBulkAssignModalOpen(false);
      setSelectedIds([]);
      setSelectAllRecords(false);
      refetchQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to bulk assign');
    } finally {
      setAssignLoading(false);
    }
  };

  const toggleSelectId = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (!queue?.results) return;
    if (selectedIds.length === queue.results.length) {
      setSelectedIds([]);
      setSelectAllRecords(false);
    } else {
      setSelectedIds(queue.results.map((l: any) => l.id));
      setSelectAllRecords(false);
    }
  };

  // Bulk Upload
  const handleBulkUpload = async () => {
    if (!bulkUploadFile) { toast.error('Please select a file'); return; }
    try {
      setBulkUploadLoading(true);
      setBulkUploadResult(null);
      const formData = new FormData();
      formData.append('file', bulkUploadFile);
      
      // Use fetch directly for file upload since apiClient.post sends JSON
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ase-leads/bulk-upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }
      setBulkUploadResult(result);
      toast.success(`${result.created} leads uploaded successfully`);
      refetchQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload file');
    } finally {
      setBulkUploadLoading(false);
    }
  };

  // ─── Render Helpers ──────────────────────────────────────────────────────────

  const renderLeadCard = (lead: LeadQueueItem, showActions: boolean = true) => (
    <div
      key={lead.id}
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => openLeadDetail(lead)}
    >
      {/* Checkbox */}
      <div className="mr-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-gray-300"
          checked={selectedIds.includes(lead.id)}
          onChange={() => toggleSelectId(lead.id)}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-medium truncate">{lead.name || lead.contact_person}</h4>
          {lead.status === 'assigned' && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              Assigned → {lead.assigned_to_name || 'BOE'}
            </span>
          )}
          {(!lead.status || lead.status === 'new') && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">New</span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-sm text-muted-foreground">
          <span>{lead.phone_number || lead.phone}</span>
          {lead.location && <span>{lead.location}</span>}
          {!lead.location && lead.notes && lead.notes.startsWith('Location:') && (
            <span>{lead.notes.replace('Location: ', '')}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
          {lead.created_by_name && <span>Created: {lead.created_by_name}</span>}
          {lead.assigned_to_name && <span>Assigned: {lead.assigned_to_name}</span>}
        </div>
      </div>

      {showActions && (lead.status === 'new' || !lead.status) && (
        <div className="flex items-center gap-1 ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditModal(lead)}>
            <Edit2 className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openDeleteModal(lead.id)}>
            <Trash2 className="w-4 h-4 text-red-400" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => openAssignModal(lead.id)}>
            <UserPlus className="w-4 h-4 mr-1" /> Assign
          </Button>
        </div>
      )}
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────

  return (
    <div className={hideTopBar ? "" : "min-h-screen"}>
      {!hideTopBar && <TopBar title={isResearchPage ? "Research Data" : "Dashboard"} subtitle="Business Research Executive" />}
      <div className={hideTopBar ? "space-y-4" : "space-y-4 p-3 sm:p-4 md:p-6"}>

      {/* Dashboard Content (shown when on /team/marketing) */}
      {!isResearchPage && (
        <div className="space-y-4">
          
          {/* BRE Stats Cards - Professional with colored borders */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{breStats.total}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Total Records</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Search className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{breStats.new_count}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Unassigned</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{breStats.assigned_count}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Assigned</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{breStats.today_added}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Today</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-indigo-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{breStats.this_week_added || 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">This Week</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                    <BarChart className="w-5 h-5 text-indigo-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-teal-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{breStats.this_month_added || 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">This Month</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
                    <Target className="w-5 h-5 text-teal-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assignment Progress Bar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart className="w-4 h-4 text-blue-600" />
                Assignment Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center gap-1 h-6 rounded-full overflow-hidden bg-muted">
                {breStats.total > 0 && (
                  <>
                    {breStats.assigned_count > 0 && (
                      <div className="h-full bg-green-500 flex items-center justify-center text-[10px] text-white font-medium px-1"
                        style={{ width: `${(breStats.assigned_count / breStats.total) * 100}%`, minWidth: '24px' }}>
                        {breStats.assigned_count}
                      </div>
                    )}
                    {breStats.new_count > 0 && (
                      <div className="h-full bg-orange-400 flex items-center justify-center text-[10px] text-white font-medium px-1"
                        style={{ width: `${(breStats.new_count / breStats.total) * 100}%`, minWidth: '24px' }}>
                        {breStats.new_count}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>Assigned ({breStats.total > 0 ? Math.round((breStats.assigned_count / breStats.total) * 100) : 0}%)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>Pending ({breStats.total > 0 ? Math.round((breStats.new_count / breStats.total) * 100) : 0}%)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* This Week Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Records Added</span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{breStats.this_week_added || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">Assigned to BOE</span>
                  <span className="text-sm font-bold text-green-700 dark:text-green-300">{breStats.this_week_assigned || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Pending Assignment</span>
                  <span className="text-sm font-bold text-orange-700 dark:text-orange-300">{(breStats.this_week_added || 0) - (breStats.this_week_assigned || 0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* This Month Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Records Added</span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{breStats.this_month_added || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">Assigned to BOE</span>
                  <span className="text-sm font-bold text-green-700 dark:text-green-300">{breStats.this_month_assigned || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Pending Assignment</span>
                  <span className="text-sm font-bold text-orange-700 dark:text-orange-300">{(breStats.this_month_added || 0) - (breStats.this_month_assigned || 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-green-600">
                    {breStats.total > 0 ? Math.round((breStats.assigned_count / breStats.total) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Assignment Rate</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-blue-600">{breStats.today_added}</p>
                  <p className="text-xs text-muted-foreground mt-1">Added Today</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-purple-600">{breStats.this_week_added || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Weekly Total</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-teal-600">{breStats.this_month_added || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Monthly Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Research Data Content (shown when on /team/marketing/research) */}
      {isResearchPage && (
        <>
          {/* Add Data & Bulk Upload Section */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setBulkUploadModalOpen(true)}>
                <Upload className="w-4 h-4 mr-1" /> Import
              </Button>
              <Button variant="outline" size="sm" onClick={async () => {
                try {
                  const token = localStorage.getItem('access_token');
                  const response = await fetch(`${API_BASE_URL}/ase-leads/bulk-upload/template/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                  });
                  if (!response.ok) throw new Error('Failed to export');
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'leads_export.xlsx';
                  a.click();
                  window.URL.revokeObjectURL(url);
                  toast.success('Export downloaded');
                } catch (err) {
                  toast.error('Failed to export');
                }
              }}>
                <Download className="w-4 h-4 mr-1" /> Export ({queue?.count || 0})
              </Button>
              <Button variant="outline" size="sm" onClick={async () => {
                try {
                  const token = localStorage.getItem('access_token');
                  const response = await fetch(`${API_BASE_URL}/ase-leads/bulk-upload/template/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                  });
                  if (!response.ok) throw new Error('Failed to download');
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'leads_upload_template.xlsx';
                  a.click();
                  window.URL.revokeObjectURL(url);
                  toast.success('Template downloaded');
                } catch (err) {
                  toast.error('Failed to download template');
                }
              }}>
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Download Template
              </Button>
            </div>
            <Button onClick={() => setAddLeadModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" /> Add Lead
            </Button>
            {statusFilter === 'new' && (
              <Button variant="outline" onClick={handleAutoAssign}>
                ⚡ Auto Assign ({queue?.count || 0})
              </Button>
            )}
          </div>

          {/* Summary Cards - based on current filter results */}
          {queue && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{queue.count || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Records</p>
                    </div>
                    <Search className="w-6 h-6 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{queue.results?.filter((r: any) => r.status === 'new' || !r.status).length || 0}</p>
                      <p className="text-xs text-muted-foreground">New (this page)</p>
                    </div>
                    <UserPlus className="w-6 h-6 text-gray-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{queue.results?.filter((r: any) => r.status === 'assigned').length || 0}</p>
                      <p className="text-xs text-muted-foreground">Assigned (this page)</p>
                    </div>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* New Leads - Research Queue */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  New Leads — Research Queue
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search name, phone, location..."
                      className="h-9 w-[220px] rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
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
                    value={statusFilter === 'assigned' && assignedToFilter ? `assigned_${assignedToFilter}` : statusFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCurrentPage(1);
                      if (val === 'all') {
                        setStatusFilter('all');
                        setAssignedToFilter('');
                      } else if (val === 'new') {
                        setStatusFilter('new');
                        setAssignedToFilter('');
                      } else if (val === 'assigned') {
                        setStatusFilter('assigned');
                        setAssignedToFilter('');
                      } else if (val.startsWith('assigned_')) {
                        setStatusFilter('assigned');
                        setAssignedToFilter(val.replace('assigned_', ''));
                      }
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="new">New</option>
                    <option value="assigned">Assigned (All)</option>
                    {filterBoeUsers.map((user) => (
                      <option key={user.id} value={`assigned_${user.id}`}>
                        Assigned → {user.first_name} {user.last_name}
                      </option>
                    ))}
                  </select>
                  {forceResearchView && (
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={createdByFilter}
                      onChange={(e) => { setCreatedByFilter(e.target.value); setCurrentPage(1); }}
                    >
                      <option value="">All Employees</option>
                      {filterBreUsers.map((user) => (
                        <option key={user.id} value={String(user.id)}>
                          {user.first_name} {user.last_name}
                        </option>
                      ))}
                    </select>
                  )}
                  {dateFilter === 'custom' && (
                    <>
                      <input
                        type="date"
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <input
                        type="date"
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                      />
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : !queue?.results?.length ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">{searchQuery ? 'No results found' : 'No data yet. Add leads using the buttons above.'}</p>
                </div>
              ) : (
                <>
                  {/* Top Pagination */}
                  {queue && queue.count > 0 && (
                    <div className="flex items-center justify-between pb-3 border-b mb-3">
                      <p className="text-xs text-muted-foreground">
                        Showing {queue.results?.length || 0} of {queue.count} records (Page {currentPage} of {queue.total_pages || Math.ceil(queue.count / 50)})
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)}>
                          <ChevronLeft className="w-4 h-4" /> Prev
                        </Button>
                        <Button variant="outline" size="sm" disabled={currentPage * 50 >= queue.count} onClick={() => setCurrentPage(currentPage + 1)}>
                          Next <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Select All + Bulk Actions */}
                  <div className="flex flex-col gap-2 mb-3 pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300"
                          checked={selectedIds.length === queue.results.length && queue.results.length > 0}
                          onChange={toggleSelectAll}
                        />
                        Select All ({selectedIds.length} selected)
                      </label>
                      {(selectedIds.length > 0 || selectAllRecords) && (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="destructive" onClick={() => setBulkDeleteModalOpen(true)}>
                            <Trash2 className="w-4 h-4 mr-1" /> Bulk Delete ({selectAllRecords ? queue.count : selectedIds.length})
                          </Button>
                          <Button size="sm" onClick={() => { setBulkAssignModalOpen(true); setBoeUsersLoading(true); apiClient.get('/ase-leads/boe-users/').then((r: any) => { setBoeUsers(Array.isArray(r) ? r : r?.results || []); }).catch(() => setBoeUsers([])).finally(() => setBoeUsersLoading(false)); }}>
                            <UserPlus className="w-4 h-4 mr-1" /> Bulk Assign ({selectAllRecords ? queue.count : selectedIds.length})
                          </Button>
                        </div>
                      )}
                    </div>
                    {/* Show "Select all X records" banner when page is fully selected */}
                    {selectedIds.length === queue.results.length && queue.count > queue.results.length && !selectAllRecords && (
                      <div className="text-sm text-center py-1.5 bg-blue-50 border border-blue-200 rounded-md">
                        All {queue.results.length} records on this page are selected.{' '}
                        <button
                          className="text-blue-600 font-medium underline hover:text-blue-800"
                          onClick={() => setSelectAllRecords(true)}
                        >
                          Select all {queue.count} records
                        </button>
                      </div>
                    )}
                    {selectAllRecords && (
                      <div className="text-sm text-center py-1.5 bg-blue-100 border border-blue-300 rounded-md">
                        All <strong>{queue.count}</strong> records are selected.{' '}
                        <button
                          className="text-blue-600 font-medium underline hover:text-blue-800"
                          onClick={() => { setSelectAllRecords(false); setSelectedIds([]); }}
                        >
                          Clear selection
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {queue.results.map((lead) => renderLeadCard(lead, true))}
                  </div>
                </>
              )}

              {/* Pagination */}
              {queue && queue.count > 0 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {queue.results?.length || 0} of {queue.count} records (Page {currentPage} of {queue.total_pages || Math.ceil(queue.count / 50)})
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)}>
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" disabled={currentPage * 50 >= queue.count} onClick={() => setCurrentPage(currentPage + 1)}>
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Lead Detail Sheet (Slide-over) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {selectedLead?.name || selectedLead?.contact_person || 'Lead Details'}
            </SheetTitle>
          </SheetHeader>

          {selectedLead && (
            <div className="mt-6 space-y-6">
              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact Info</h4>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedLead.name || selectedLead.contact_person || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedLead.phone_number || selectedLead.phone || '—'}</span>
                  </div>
                  {(selectedLead.location) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedLead.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedLead.notes && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notes</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">{selectedLead.notes}</p>
                </div>
              )}

              {/* Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Details</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Created: {new Date(selectedLead.created_at).toLocaleDateString()}</span>
                  </div>
                  {selectedLead.created_by_name && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>Created by: {selectedLead.created_by_name}</span>
                    </div>
                  )}
                  {selectedLead.assigned_to_name && (
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-muted-foreground" />
                      <span>Assigned to: {selectedLead.assigned_to_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setSheetOpen(false); openEditModal(selectedLead); }}
                >
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-500"
                  onClick={() => { setSheetOpen(false); openDeleteModal(selectedLead.id); }}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Qualification Modal */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={qualifyModalOpen} onOpenChange={setQualifyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Qualify Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Lead Score Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="lead-score">Lead Score</Label>
                <span className="text-sm font-semibold text-primary">{leadScore[0]}/100</span>
              </div>
              <Slider
                id="lead-score"
                min={0}
                max={100}
                step={1}
                value={leadScore}
                onValueChange={setLeadScore}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low (0)</span>
                <span>Medium (50)</span>
                <span>High (100)</span>
              </div>
            </div>

            {/* Qualification Notes */}
            <div className="space-y-2">
              <Label htmlFor="qual-notes">Qualification Notes</Label>
              <Textarea
                id="qual-notes"
                placeholder="Add notes about why this lead is qualified..."
                value={qualificationNotes}
                onChange={(e) => setQualificationNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQualifyModalOpen(false)} disabled={qualifyLoading}>
              Cancel
            </Button>
            <Button onClick={handleQualifySubmit} disabled={qualifyLoading} className="bg-green-600 hover:bg-green-700">
              {qualifyLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Qualify Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Disqualification Modal */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={disqualifyModalOpen} onOpenChange={setDisqualifyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disqualify Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disqualify-reason">
                Reason for Disqualification <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="disqualify-reason"
                placeholder="Explain why this lead is being disqualified..."
                value={disqualifyReason}
                onChange={(e) => setDisqualifyReason(e.target.value)}
                rows={4}
                required
              />
              {disqualifyReason.trim() === '' && (
                <p className="text-xs text-muted-foreground">A reason is required to disqualify a lead.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisqualifyModalOpen(false)} disabled={disqualifyLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisqualifySubmit}
              disabled={disqualifyLoading || !disqualifyReason.trim()}
            >
              {disqualifyLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Disqualify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Assign to BOE Modal */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={assignModalOpen || bulkAssignModalOpen} onOpenChange={(open) => { setAssignModalOpen(open); if (!open) setBulkAssignModalOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{bulkAssignModalOpen ? `Bulk Assign (${selectedIds.length} records)` : 'Assign to BOE Team Member'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select BOE Team Member</Label>
              {boeUsersLoading ? (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading team members...</span>
                </div>
              ) : boeUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3">No BOE team members available</p>
              ) : (
                <Select value={selectedBOEUser} onValueChange={setSelectedBOEUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {boeUsers.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.first_name} {user.last_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {(selectAllRecords || selectedIds.length > 0) && (
              <div className="space-y-2">
                <Label>Amount to Assign</Label>
                <input
                  type="number"
                  min="1"
                  placeholder={`Leave empty to assign all ${selectAllRecords ? (queue?.count || 0) : selectedIds.length}`}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={assignLimit}
                  onChange={(e) => setAssignLimit(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {assignLimit ? `Will assign first ${assignLimit} records` : `Will assign ${selectAllRecords ? `all ${queue?.count || 0}` : `${selectedIds.length} selected`} records`}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)} disabled={assignLoading}>
              Cancel
            </Button>
            <Button
              onClick={bulkAssignModalOpen ? handleBulkAssignSubmit : handleAssignSubmit}
              disabled={assignLoading || !selectedBOEUser || boeUsersLoading}
            >
              {assignLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {bulkAssignModalOpen ? `Assign ${selectedIds.length} Records` : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Add Lead Modal */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={addLeadModalOpen} onOpenChange={setAddLeadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name <span className="text-red-500">*</span></Label>
              <input
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Contact person name"
                value={addLeadName}
                onChange={(e) => setAddLeadName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number <span className="text-red-500">*</span></Label>
              <input
                type="tel"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="10-digit phone number"
                value={addLeadPhone}
                onChange={(e) => setAddLeadPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <input
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="City / Area"
                value={addLeadLocation}
                onChange={(e) => setAddLeadLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                placeholder="Additional notes..."
                value={addLeadNotes}
                onChange={(e) => setAddLeadNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLeadModalOpen(false)} disabled={addLeadLoading}>
              Cancel
            </Button>
            <Button onClick={handleAddLeadSubmit} disabled={addLeadLoading || !addLeadName.trim() || !addLeadPhone.trim()}>
              {addLeadLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Bulk Upload Modal */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={bulkUploadModalOpen} onOpenChange={(open) => { setBulkUploadModalOpen(open); if (!open) { setBulkUploadFile(null); setBulkUploadResult(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Upload Leads</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Upload an Excel (.xlsx) or CSV file with columns: <strong>name</strong>, <strong>phone</strong>, <strong>location</strong>
            </p>
            <div className="space-y-2">
              <Label>Select File</Label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)}
              />
            </div>
            {bulkUploadResult && (
              <div className="p-3 rounded-lg bg-muted space-y-1">
                <p className="text-sm font-medium text-green-600">✓ {bulkUploadResult.created} leads created</p>
                {bulkUploadResult.duplicates > 0 && (
                  <p className="text-sm text-yellow-600">⚠ {bulkUploadResult.duplicates} duplicates skipped</p>
                )}
                {bulkUploadResult.errors?.length > 0 && (
                  <div className="text-sm text-red-500">
                    <p>✗ {bulkUploadResult.errors.length} errors:</p>
                    {bulkUploadResult.errors.slice(0, 5).map((err: string, i: number) => (
                      <p key={i} className="text-xs ml-2">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkUploadModalOpen(false)} disabled={bulkUploadLoading}>
              {bulkUploadResult ? 'Close' : 'Cancel'}
            </Button>
            {!bulkUploadResult && (
              <Button onClick={handleBulkUpload} disabled={bulkUploadLoading || !bulkUploadFile}>
                {bulkUploadLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Upload
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Edit Lead Modal */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <input type="tel" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" placeholder="Additional notes..." value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={editLoading}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={editLoading}>
              {editLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Delete Confirm Modal */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">Are you sure you want to delete this lead? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={deleteLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSubmit} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Bulk Delete Confirm Modal */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bulk Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to delete <strong>{selectAllRecords ? queue?.count : selectedIds.length}</strong> {selectAllRecords ? 'total' : 'selected'} records? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteModalOpen(false)} disabled={bulkDeleteLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDeleteSubmit} disabled={bulkDeleteLoading}>
              {bulkDeleteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete {selectAllRecords ? queue?.count : selectedIds.length} Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto Assign Modal */}
      <Dialog open={autoAssignModalOpen} onOpenChange={setAutoAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>⚡ Auto Assign to BOE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Distribute unassigned (New) records equally among selected BOE employees.
            </p>

            <div className="space-y-2">
              <Label>Select BOE Employees</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                {autoAssignBoeUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                  <>
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer pb-2 border-b">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded"
                        checked={autoAssignSelectedUsers.length === autoAssignBoeUsers.length}
                        onChange={() => {
                          if (autoAssignSelectedUsers.length === autoAssignBoeUsers.length) {
                            setAutoAssignSelectedUsers([]);
                          } else {
                            setAutoAssignSelectedUsers(autoAssignBoeUsers.map((u: any) => u.id));
                          }
                        }}
                      />
                      Select All ({autoAssignBoeUsers.length})
                    </label>
                    {autoAssignBoeUsers.map((u: any) => (
                      <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded"
                          checked={autoAssignSelectedUsers.includes(u.id)}
                          onChange={() => {
                            setAutoAssignSelectedUsers(prev =>
                              prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                            );
                          }}
                        />
                        {u.first_name} {u.last_name} ({u.username})
                      </label>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount to Assign</Label>
              <input
                type="number"
                min="1"
                placeholder="Leave empty to assign all unassigned"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={autoAssignLimit}
                onChange={(e) => setAutoAssignLimit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {autoAssignLimit
                  ? `Will distribute ${autoAssignLimit} records equally among ${autoAssignSelectedUsers.length} employees (~${Math.ceil(parseInt(autoAssignLimit) / Math.max(autoAssignSelectedUsers.length, 1))} each)`
                  : `Will distribute all unassigned records equally among ${autoAssignSelectedUsers.length} employees`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoAssignModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAutoAssignSubmit} disabled={autoAssignLoading || autoAssignSelectedUsers.length === 0}>
              {autoAssignLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Auto Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}