import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Search,
  Phone,
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  PhoneOff,
  ArrowRight,
  Edit,
  Trash2,
  Plus,
  Eye,
  TrendingUp,
  Target,
  BarChart,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, API_BASE_URL } from '@/lib/api';
import TopBar from '@/components/layout/TopBar';

interface BOERecord {
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

interface BOEStats {
  total_assigned: number;
  today_assigned: number;
  this_week_assigned: number;
  this_month_assigned: number;
}

interface CREUser {
  id: number;
  name: string;
}

export default function BOEDashboard() {
  const location = useLocation();
  const isResearchPage = location.pathname.includes('/research');
  
  // State
  const [records, setRecords] = useState<BOERecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BOEStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [dateFilter, setDateFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [callStatusFilter, setCallStatusFilter] = useState('all');

  // Detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BOERecord | null>(null);

  // Call status & Convert to lead
  const [callStatusLoading, setCallStatusLoading] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertRecord, setConvertRecord] = useState<BOERecord | null>(null);
  const [creUsers, setCreUsers] = useState<CREUser[]>([]);
  const [selectedCre, setSelectedCre] = useState('');
  const [convertNotes, setConvertNotes] = useState('');
  const [convertLoading, setConvertLoading] = useState(false);

  // Add Data modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addLocation, setAddLocation] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<BOERecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchQuery); setCurrentPage(1); setSelectedIds(new Set()); }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch assigned records
  const hasFetchedRef = useRef(false);
  const fetchRecords = async () => {
    try {
      // Only show loading spinner on first fetch — silent on polls
      if (!hasFetchedRef.current) setLoading(true);
      const token = localStorage.getItem('access_token');
      let url = `${API_BASE_URL}/ase-leads/boe-assigned/?page=${currentPage}`;
      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
      if (callStatusFilter && callStatusFilter !== 'all') url += `&call_status=${callStatusFilter}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setRecords(data.results || []);
      setTotalCount(data.count || 0);
      setTotalPages(data.total_pages || 1);
      if (data.stats) setStats(data.stats);
      hasFetchedRef.current = true;
    } catch (err) {
      toast.error('Failed to load assigned data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [currentPage, debouncedSearch, dateFrom, dateTo, callStatusFilter]);

  // Auto-poll every 10 seconds for live updates
  useEffect(() => {
    const interval = setInterval(fetchRecords, 5000);
    return () => clearInterval(interval);
  }, [currentPage, debouncedSearch, dateFrom, dateTo, callStatusFilter]);

  // Date filter handler
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
  };

  // Update call status
  const handleCallStatus = async (recordId: number, callStatus: string) => {
    try {
      setCallStatusLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ase-leads/boe-assigned/${recordId}/call-status/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ call_status: callStatus }),
      });
      if (!response.ok) throw new Error('Failed to update');
      toast.success(`Marked as ${callStatus}`);
      fetchRecords();
    } catch (err) {
      toast.error('Failed to update call status');
    } finally {
      setCallStatusLoading(false);
    }
  };

  // Open convert to lead modal
  const handleOpenConvert = async (record: BOERecord) => {
    setConvertRecord(record);
    setConvertNotes('');
    setSelectedCre('');
    setConvertModalOpen(true);
    // Fetch CRE users
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ase-leads/cre-users/`, {
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

  // Convert to lead
  const handleConvertToLead = async () => {
    if (!convertRecord || !selectedCre) {
      toast.error('Please select a CRE employee');
      return;
    }
    try {
      setConvertLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ase-leads/boe-assigned/${convertRecord.id}/convert-to-lead/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to_cre: parseInt(selectedCre), call_notes: convertNotes }),
      });
      if (!response.ok) throw new Error('Failed to convert');
      const data = await response.json();
      toast.success(data.message || 'Converted to lead successfully');
      setConvertModalOpen(false);
      fetchRecords();
    } catch (err) {
      toast.error('Failed to convert to lead');
    } finally {
      setConvertLoading(false);
    }
  };

  // Call status badge
  const getCallStatusBadge = (callStatus: string, status: string) => {
    if (status === 'converted') return <Badge className="bg-purple-100 text-purple-700 border-purple-300">Converted</Badge>;
    switch (callStatus) {
      case 'interested': return <Badge className="bg-green-100 text-green-700 border-green-300">Converted to Lead</Badge>;
      case 'not_interested': return <Badge className="bg-red-100 text-red-700 border-red-300">Not Interested</Badge>;
      case 'no_answer': return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">No Answer</Badge>;
      case 'callback': return <Badge className="bg-orange-100 text-orange-700 border-orange-300">Call Back</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Add data handler
  const handleAddData = async () => {
    if (!addName.trim() || !addPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      setAddLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ase-leads/boe-data/add/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName, phone_number: addPhone, location: addLocation, notes: addNotes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add');
      toast.success('Data added successfully');
      setAddModalOpen(false);
      setAddName(''); setAddPhone(''); setAddLocation(''); setAddNotes('');
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add data');
    } finally {
      setAddLoading(false);
    }
  };

  // Edit handler
  const handleOpenEdit = (record: BOERecord) => {
    setEditRecord(record);
    setEditName(record.name);
    setEditPhone(record.phone_number);
    setEditLocation(record.location);
    setEditNotes(record.notes);
    setEditModalOpen(true);
  };

  const handleEditData = async () => {
    if (!editRecord || !editName.trim() || !editPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      setEditLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ase-leads/boe-data/${editRecord.id}/edit/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, phone_number: editPhone, location: editLocation, notes: editNotes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update');
      toast.success('Data updated successfully');
      setEditModalOpen(false);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update data');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete handler
  const handleDeleteData = async (record: BOERecord) => {
    if (!confirm(`Delete "${record.name}"? This cannot be undone.`)) return;
    try {
      setDeleteLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ase-leads/boe-data/${record.id}/delete/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success('Record deleted');
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Bulk select helpers
  const selectableRecords = records.filter(r => r.created_by_name === r.assigned_to_name);
  const allSelectableSelected = selectableRecords.length > 0 && selectableRecords.every(r => selectedIds.has(r.id));

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(selectableRecords.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected record(s)? This cannot be undone.`)) return;
    try {
      setBulkDeleteLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ase-leads/boe-data/bulk-delete/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to bulk delete');
      toast.success(data.message || `${selectedIds.size} record(s) deleted`);
      setSelectedIds(new Set());
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'Failed to bulk delete');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar title={isResearchPage ? "Research Data" : "BOE Dashboard"} subtitle="Business Outreach Executive" />
      <div className="space-y-4 p-3 sm:p-4 md:p-6">

      {/* Stats Cards - Professional Design */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total Assigned</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats?.today_assigned || 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Today</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats?.this_week_assigned || 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">This Week</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats?.this_month_assigned || 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">This Month</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                <Target className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Status Overview - only on dashboard page */}
      {!isResearchPage && (
      <>
        {/* Call Progress Bar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-600" />
              Call Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {(() => {
              const pending = records.filter(r => r.call_status === 'pending').length;
              const interested = records.filter(r => r.call_status === 'interested').length;
              const notInterested = records.filter(r => r.call_status === 'not_interested').length;
              const noAnswer = records.filter(r => r.call_status === 'no_answer').length;
              const callback = records.filter(r => r.call_status === 'callback').length;
              const total = records.length || 1;
              return (
                <>
                  <div className="flex items-center gap-1 h-6 rounded-full overflow-hidden bg-muted">
                    {pending > 0 && <div className="h-full bg-gray-400 flex items-center justify-center text-[10px] text-white font-medium px-1" style={{ width: `${(pending / total) * 100}%`, minWidth: '20px' }}>{pending}</div>}
                    {interested > 0 && <div className="h-full bg-green-500 flex items-center justify-center text-[10px] text-white font-medium px-1" style={{ width: `${(interested / total) * 100}%`, minWidth: '20px' }}>{interested}</div>}
                    {noAnswer > 0 && <div className="h-full bg-yellow-400 flex items-center justify-center text-[10px] text-white font-medium px-1" style={{ width: `${(noAnswer / total) * 100}%`, minWidth: '20px' }}>{noAnswer}</div>}
                    {callback > 0 && <div className="h-full bg-orange-400 flex items-center justify-center text-[10px] text-white font-medium px-1" style={{ width: `${(callback / total) * 100}%`, minWidth: '20px' }}>{callback}</div>}
                    {notInterested > 0 && <div className="h-full bg-red-400 flex items-center justify-center text-[10px] text-white font-medium px-1" style={{ width: `${(notInterested / total) * 100}%`, minWidth: '20px' }}>{notInterested}</div>}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>Pending ({pending})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>Interested ({interested})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>No Answer ({noAnswer})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>Callback ({callback})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>Not Interested ({notInterested})</span>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Performance & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Activity Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart className="w-4 h-4 text-indigo-600" />
                Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Total Assigned</span>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{stats?.total_assigned || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20">
                <span className="text-xs font-medium text-green-700 dark:text-green-300">Today's Records</span>
                <span className="text-sm font-bold text-green-700 dark:text-green-300">{stats?.today_assigned || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">This Week</span>
                <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{stats?.this_week_assigned || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">This Month</span>
                <span className="text-sm font-bold text-orange-700 dark:text-orange-300">{stats?.this_month_assigned || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Performance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600" />
                Conversion Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-2">
                <p className="text-3xl font-bold text-green-600">
                  {records.length > 0 ? Math.round((records.filter(r => r.call_status === 'interested').length / records.length) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Conversion Rate</p>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
                  style={{ width: `${records.length > 0 ? (records.filter(r => r.call_status === 'interested').length / records.length) * 100 : 0}%` }}>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold text-green-600">{records.filter(r => r.call_status === 'interested').length}</p>
                  <p className="text-[10px] text-muted-foreground">Converted</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold text-gray-600">{records.filter(r => r.call_status === 'pending').length}</p>
                  <p className="text-[10px] text-muted-foreground">Pending Calls</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
      )}

      {/* Data List - only on Research Data page */}
      {isResearchPage && (
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="w-5 h-5" />
              My Data
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="h-9 w-full sm:w-[180px] rounded-md border border-input bg-background pl-9 pr-3 text-sm"
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
                value={callStatusFilter}
                onChange={(e) => { setCallStatusFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="no_answer">No Answer</option>
                <option value="not_interested">Not Interested</option>
                <option value="interested">Interested</option>
              </select>
              {dateFilter === 'custom' && (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm flex-1"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input
                    type="date"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm flex-1"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              )}
            </div>
          </div>
          {/* Bulk actions bar */}
          {selectableRecords.length > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={allSelectableSelected}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
                <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                  Select All ({selectableRecords.length})
                </label>
              </div>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{selectedIds.size} selected</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 px-3 text-xs"
                    disabled={bulkDeleteLoading}
                    onClick={handleBulkDelete}
                  >
                    {bulkDeleteLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                    Delete Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !records.length ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">{debouncedSearch ? 'No results found' : 'No data assigned to you yet.'}</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {/* Top Pagination */}
              <div className="flex items-center justify-between pb-2 border-b">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Showing {records.length} of {totalCount} (Page {currentPage}/{totalPages})
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

              {records.map((record) => (
                <div
                  key={record.id}
                  className={`p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors ${selectedIds.has(record.id) ? 'bg-muted/70 border-primary/30' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Checkbox for selectable records */}
                    {record.created_by_name === record.assigned_to_name && (
                      <Checkbox
                        checked={selectedIds.has(record.id)}
                        onCheckedChange={() => handleToggleSelect(record.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedRecord(record); setDetailModalOpen(true); }}>
                      <h4 className="font-medium text-sm sm:text-base">{record.name}</h4>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{record.phone_number}</span>
                        {record.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{record.location}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a href={`tel:${record.phone_number}`} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="h-8 px-2" title="Call">
                          <Phone className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                      </a>
                      <Button size="sm" variant="outline" className="h-8 px-2" onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); setDetailModalOpen(true); }} title="View">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                      </Button>
                      <select
                        className={`h-8 rounded-md border px-2 text-xs font-medium ${
                          record.call_status === 'interested' ? 'bg-green-50 border-green-300 text-green-700' :
                          record.call_status === 'not_interested' ? 'bg-red-50 border-red-300 text-red-700' :
                          record.call_status === 'no_answer' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' :
                          record.call_status === 'callback' ? 'bg-orange-50 border-orange-300 text-orange-700' :
                          'bg-gray-50 border-gray-300 text-gray-700'
                        }`}
                        value={record.call_status || 'pending'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => { e.stopPropagation(); handleCallStatus(record.id, e.target.value); }}
                        disabled={callStatusLoading}
                      >
                        <option value="pending" style={{ backgroundColor: '#f9fafb', color: '#374151' }}>⚪ Pending</option>
                        <option value="no_answer" style={{ backgroundColor: '#fefce8', color: '#a16207' }}>🟡 No Answer</option>
                        <option value="not_interested" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>🔴 Not Interested</option>
                        <option value="interested" style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>🟢 Interested</option>
                      </select>
                      {record.call_status !== 'interested' ? (
                        <Button size="sm" className="h-8 px-2 bg-green-600 hover:bg-green-700 text-white text-xs" disabled={callStatusLoading}
                          onClick={(e) => { e.stopPropagation(); handleCallStatus(record.id, 'interested'); }}>
                          Convert to Lead
                        </Button>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 border-green-300 text-xs px-2 py-1">Converted</Badge>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={(e) => { e.stopPropagation(); handleOpenEdit(record); }} title="Edit">
                        <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      {record.created_by_name === record.assigned_to_name && (
                        <Button size="sm" variant="ghost" className="h-8 px-2" disabled={deleteLoading}
                          onClick={(e) => { e.stopPropagation(); handleDeleteData(record); }} title="Delete">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t mt-4 gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground">
                {records.length} of {totalCount} (Page {currentPage}/{totalPages})
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{selectedRecord.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${selectedRecord.phone_number}`} className="text-blue-600 hover:underline">{selectedRecord.phone_number}</a>
                </div>
                {selectedRecord.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedRecord.location}</span>
                  </div>
                )}
                {selectedRecord.notes && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="whitespace-pre-wrap">{selectedRecord.notes}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Created: {new Date(selectedRecord.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>Created by: {selectedRecord.created_by_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Call Status:</span>
                  {getCallStatusBadge(selectedRecord.call_status, selectedRecord.status)}
                </div>
                {selectedRecord.call_notes && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="whitespace-pre-wrap">Call Notes: {selectedRecord.call_notes}</span>
                  </div>
                )}
                {selectedRecord.assigned_to_cre_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowRight className="w-4 h-4 text-purple-500" />
                    <span>Assigned to CRE: <strong>{selectedRecord.assigned_to_cre_name}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Close</Button>
            {selectedRecord && (
              <a href={`tel:${selectedRecord.phone_number}`}>
                <Button>
                  <Phone className="w-4 h-4 mr-2" /> Call Now
                </Button>
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Lead Modal */}
      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert to Lead & Assign CRE</DialogTitle>
          </DialogHeader>
          {convertRecord && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{convertRecord.name}</p>
                <p className="text-sm text-muted-foreground">{convertRecord.phone_number}</p>
                {convertRecord.location && <p className="text-sm text-muted-foreground">{convertRecord.location}</p>}
              </div>

              <div className="space-y-2">
                <Label>Assign to CRE Employee *</Label>
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
                  <p className="text-xs text-red-500">No CRE employees found. Please add CRE team members first.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Call Notes (optional)</Label>
                <Textarea
                  placeholder="Add notes about the call..."
                  value={convertNotes}
                  onChange={(e) => setConvertNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertModalOpen(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleConvertToLead} disabled={convertLoading || !selectedCre}>
              {convertLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
              Convert & Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Data Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Data</DialogTitle>
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
            <Button onClick={handleAddData} disabled={addLoading || !addName.trim() || !addPhone.trim()}>
              {addLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Data Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data</DialogTitle>
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
              <Textarea placeholder="Additional notes..." value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEditData} disabled={editLoading || !editName.trim() || !editPhone.trim()}>
              {editLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
