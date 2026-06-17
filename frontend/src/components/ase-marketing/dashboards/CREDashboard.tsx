import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Phone,
  MapPin,
  Loader2,
  Search,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  User,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import TopBar from '@/components/layout/TopBar';
import { TaskList } from '@/components/ase-marketing/tasks/TaskList';
import { apiClient, API_BASE_URL } from '@/lib/api';

interface CRELead {
  id: number;
  name: string;
  phone_number: string;
  location: string;
  notes: string;
  call_notes: string;
  status: string;
  created_by_name: string;
  assigned_to_cre_name: string;
  created_at: string;
}

interface CREStats {
  total: number;
  cold: number;
  warm: number;
  hot: number;
  completed: number;
  rejected: number;
  today_assigned: number;
  this_week: number;
  this_month: number;
}

export default function CREDashboard() {
  const location = useLocation();
  const isLeadsPage = location.pathname.includes('/research') || location.pathname.includes('/leads');
  const isTasksPage = location.pathname.includes('/tasks');
  const isDashboardPage = !isLeadsPage && !isTasksPage;

  const [leads, setLeads] = useState<CRELead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CREStats | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const hasFetchedRef = useRef(false);

  // View detail modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<CRELead | null>(null);

  // Update status modal
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateRecord, setUpdateRecord] = useState<CRELead | null>(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  // Add Lead modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addLocation, setAddLocation] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit Lead modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<CRELead | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Convert to Task modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskRecord, setTaskRecord] = useState<CRELead | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState('call');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskLoading, setTaskLoading] = useState(false);

  const fetchLeads = async () => {
    try {
      if (!hasFetchedRef.current) setLoading(true);
      let endpoint = `/ase-leads/cre-leads/?page=${currentPage}&page_size=50`;
      if (debouncedSearch) endpoint += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (statusFilter && statusFilter !== 'all') endpoint += `&status=${statusFilter}`;
      if (dateFrom) endpoint += `&date_from=${dateFrom}`;
      if (dateTo) endpoint += `&date_to=${dateTo}`;
      const data = await apiClient.get(endpoint);
      setLeads(data.results || []);
      setTotalCount(data.count || 0);
      setTotalPages(data.total_pages || 1);
      if (data.stats) setStats(data.stats);
      hasFetchedRef.current = true;
    } catch (err) {
      if (!hasFetchedRef.current) toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [currentPage, debouncedSearch, statusFilter, dateFrom, dateTo]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchQuery); setCurrentPage(1); }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Silent poll every 5 seconds - DISABLED due to data refresh issues
  // useEffect(() => {
  //   const interval = setInterval(fetchLeads, 5000);
  //   return () => clearInterval(interval);
  // }, []);

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

  // Update lead status
  const handleOpenUpdate = (record: CRELead) => {
    setUpdateRecord(record);
    setUpdateStatus(record.status);
    setUpdateNotes(record.call_notes || '');
    setUpdateModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!updateRecord) return;
    try {
      setUpdateLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ase-leads/cre-leads/${updateRecord.id}/update-status/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: updateStatus, call_notes: updateNotes }),
      });
      if (!response.ok) throw new Error('Failed to update');
      toast.success('Lead updated successfully');
      setUpdateModalOpen(false);
      fetchLeads();
    } catch (err) {
      toast.error('Failed to update lead');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Add Lead handler
  const handleAddLead = async () => {
    if (!addName.trim() || !addPhone.trim()) { toast.error('Name and phone are required'); return; }
    try {
      setAddLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ase-leads/cre-leads/create/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName.trim(), phone_number: addPhone.trim(), location: addLocation.trim(), notes: addNotes.trim() }),
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
  const handleOpenEdit = (record: CRELead) => {
    setEditRecord(record);
    setEditName(record.name);
    setEditPhone(record.phone_number);
    setEditLocation(record.location);
    setEditNotes(record.notes || record.call_notes || '');
    setEditModalOpen(true);
  };

  const handleEditLead = async () => {
    if (!editRecord || !editName.trim() || !editPhone.trim()) { toast.error('Name and phone are required'); return; }
    try {
      setEditLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ase-leads/cre-leads/${editRecord.id}/edit/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), phone_number: editPhone.trim(), location: editLocation.trim(), notes: editNotes.trim() }),
      });
      if (!response.ok) throw new Error('Failed to update');
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
  const handleDeleteLead = async (record: CRELead) => {
    if (!confirm(`Delete lead "${record.name}"? This cannot be undone.`)) return;
    try {
      setDeleteLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ase-leads/cre-leads/${record.id}/delete/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete');
      toast.success('Lead deleted');
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Convert to Task handler
  const handleOpenTaskModal = (record: CRELead) => {
    setTaskRecord(record);
    setTaskTitle(`Follow up with ${record.name}`);
    setTaskType('call');
    setTaskPriority('medium');
    setTaskDueDate('');
    setTaskDescription(`Client: ${record.name}\nPhone: ${record.phone_number}\nLocation: ${record.location || 'N/A'}\n\nRequirements:\n${record.notes || record.call_notes || ''}`);
    setTaskModalOpen(true);
  };

  const handleConvertToTask = async () => {
    if (!taskRecord) { toast.error('No lead selected'); return; }
    try {
      setTaskLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ase-leads/cre-leads/${taskRecord.id}/convert-task/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle.trim(),
          task_type: taskType,
          priority: taskPriority,
          due_date: taskDueDate,
          description: taskDescription.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed');
      toast.success('Task created from lead');
      setTaskModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    } finally {
      setTaskLoading(false);
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cold': return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Cold</Badge>;
      case 'warm': return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Warm</Badge>;
      case 'hot': return <Badge className="bg-red-100 text-red-700 border-red-300">Hot</Badge>;
      case 'completed': return <Badge className="bg-green-100 text-green-700 border-green-300">Completed</Badge>;
      case 'rejected': return <Badge className="bg-gray-100 text-gray-700 border-gray-300">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar title={isLeadsPage ? "Assigned Leads" : isTasksPage ? "My Tasks" : "CRE Dashboard"} subtitle="Client Relationship Executive" />
      <div className="space-y-4 p-3 sm:p-4 md:p-6">

      {/* Dashboard - Professional Layout */}
      {isDashboardPage && (
      <>
        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total Leads</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-sky-400">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats?.cold || 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Cold</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-sky-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats?.warm || 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Warm</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats?.hot || 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Hot</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <Target className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats?.completed || 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats?.rejected || 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Rejected</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Progress Bar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Lead Pipeline Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center gap-1 h-6 rounded-full overflow-hidden bg-muted">
              {(stats?.total || 0) > 0 && (
                <>
                  {(stats?.cold || 0) > 0 && (
                    <div className="h-full bg-sky-400 flex items-center justify-center text-[10px] text-white font-medium px-1"
                      style={{ width: `${((stats?.cold || 0) / (stats?.total || 1)) * 100}%`, minWidth: (stats?.cold || 0) > 0 ? '24px' : '0' }}>
                      {stats?.cold}
                    </div>
                  )}
                  {(stats?.warm || 0) > 0 && (
                    <div className="h-full bg-yellow-400 flex items-center justify-center text-[10px] text-white font-medium px-1"
                      style={{ width: `${((stats?.warm || 0) / (stats?.total || 1)) * 100}%`, minWidth: (stats?.warm || 0) > 0 ? '24px' : '0' }}>
                      {stats?.warm}
                    </div>
                  )}
                  {(stats?.hot || 0) > 0 && (
                    <div className="h-full bg-red-400 flex items-center justify-center text-[10px] text-white font-medium px-1"
                      style={{ width: `${((stats?.hot || 0) / (stats?.total || 1)) * 100}%`, minWidth: (stats?.hot || 0) > 0 ? '24px' : '0' }}>
                      {stats?.hot}
                    </div>
                  )}
                  {(stats?.completed || 0) > 0 && (
                    <div className="h-full bg-green-400 flex items-center justify-center text-[10px] text-white font-medium px-1"
                      style={{ width: `${((stats?.completed || 0) / (stats?.total || 1)) * 100}%`, minWidth: (stats?.completed || 0) > 0 ? '24px' : '0' }}>
                      {stats?.completed}
                    </div>
                  )}
                  {(stats?.rejected || 0) > 0 && (
                    <div className="h-full bg-gray-400 flex items-center justify-center text-[10px] text-white font-medium px-1"
                      style={{ width: `${((stats?.rejected || 0) / (stats?.total || 1)) * 100}%`, minWidth: (stats?.rejected || 0) > 0 ? '24px' : '0' }}>
                      {stats?.rejected}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>Cold</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>Warm</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>Hot</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>Completed</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>Rejected</span>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout: Recent Leads + Activity Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Leads - Takes 2 columns */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Recent Leads
                </CardTitle>
                <Badge variant="outline" className="text-xs">{leads.length} shown</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No leads assigned yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Leads will appear when BOE assigns them to you</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leads.slice(0, 8).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => { setViewRecord(record); setViewModalOpen(true); }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
                          {record.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{record.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{record.phone_number}</span>
                            {record.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{record.location}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusBadge(record.status)}
                        <a href={`tel:${record.phone_number}`} onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Phone className="w-3.5 h-3.5 text-green-600" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                  {leads.length > 8 && (
                    <p className="text-xs text-center text-muted-foreground pt-2">
                      +{leads.length - 8} more leads. Go to <span className="text-blue-600 font-medium">Leads</span> tab to see all.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Activity & Quick Stats */}
          <div className="space-y-4">
            {/* Time-based Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  Activity Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Today</span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{stats?.today_assigned || 0} new</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">This Week</span>
                  <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{stats?.this_week || 0} leads</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">This Month</span>
                  <span className="text-sm font-bold text-green-700 dark:text-green-300">{stats?.this_month || 0} leads</span>
                </div>
              </CardContent>
            </Card>

            {/* Conversion Rate */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center py-2">
                  <p className="text-3xl font-bold text-green-600">
                    {(stats?.total || 0) > 0 ? Math.round(((stats?.completed || 0) / (stats?.total || 1)) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Conversion Rate</p>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
                    style={{ width: `${(stats?.total || 0) > 0 ? ((stats?.completed || 0) / (stats?.total || 1)) * 100 : 0}%` }}>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{stats?.completed || 0} completed</span>
                  <span>{stats?.total || 0} total</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start h-9 text-xs" onClick={() => setAddModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-2" /> Add New Lead
                </Button>
                <Button variant="outline" className="w-full justify-start h-9 text-xs" onClick={() => { setStatusFilter('hot'); setCurrentPage(1); }}>
                  <Target className="w-3.5 h-3.5 mr-2 text-red-500" /> View Hot Leads ({stats?.hot || 0})
                </Button>
                <Button variant="outline" className="w-full justify-start h-9 text-xs" onClick={() => { setStatusFilter('cold'); setCurrentPage(1); }}>
                  <Clock className="w-3.5 h-3.5 mr-2 text-sky-500" /> Follow Up Cold ({stats?.cold || 0})
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
      )}

      {/* Assigned Leads Section */}
      {isLeadsPage && (
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="w-5 h-5 text-blue-600" />
              My Leads
            </CardTitle>
            <Button size="sm" onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Lead
            </Button>
          </div>
          {/* Filters */}
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
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
              <option value="hot">Hot</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
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
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No leads assigned to you yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Leads will appear here when BOE assigns them to you.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Top Pagination */}
              {totalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between pb-3 border-b gap-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {leads.length} of {totalCount} (Page {currentPage}/{totalPages})
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

              {leads.map((record) => (
                <div key={record.id} className="p-3 sm:p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setViewRecord(record); setViewModalOpen(true); }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm sm:text-base">{record.name}</h4>
                        {getStatusBadge(record.status)}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs sm:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{record.phone_number}</span>
                        {record.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{record.location}</span>}
                      </div>
                      {record.call_notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-[300px]">Notes: {record.call_notes}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-muted-foreground">
                        <span>From: {record.created_by_name}</span>
                        <span>Date: {new Date(record.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        value={record.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                          e.stopPropagation();
                          const newStatus = e.target.value;
                          try {
                            const token = localStorage.getItem('access_token');
                            const response = await fetch(`${API_BASE_URL}/ase-leads/cre-leads/${record.id}/update-status/`, {
                              method: 'PATCH',
                              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: newStatus }),
                            });
                            if (!response.ok) throw new Error('Failed');
                            toast.success(`Status changed to ${newStatus}`);
                            fetchLeads();
                          } catch (err) {
                            toast.error('Failed to update status');
                          }
                        }}
                      >
                        <option value="cold">Cold</option>
                        <option value="warm">Warm</option>
                        <option value="hot">Hot</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <a href={`tel:${record.phone_number}`} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="h-8 px-2" title="Call">
                          <Phone className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                      </a>
                      <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => { setViewRecord(record); setViewModalOpen(true); }} title="View">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => handleOpenEdit(record)} title="Edit">
                        <Edit className="w-3.5 h-3.5 text-blue-500" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => handleDeleteLead(record)} title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                      {record.status === 'completed' ? (
                        <div className="h-8 px-2 flex items-center gap-1 text-xs text-green-600 font-medium" title="Converted to Task">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Done</span>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => handleOpenTaskModal(record)} title="Convert to Task">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Task
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
                {leads.length} of {totalCount} (Page {currentPage}/{totalPages})
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
      )}

      {/* My Tasks Section */}
      {isTasksPage && (
        <TaskList title="My Tasks" showFilters={true} />
      )}

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
                  <div className="mt-1">{getStatusBadge(viewRecord.status)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="text-sm">{new Date(viewRecord.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Assigned By</Label>
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
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>Close</Button>
            {viewRecord && (
              <>
                <a href={`tel:${viewRecord.phone_number}`}>
                  <Button><Phone className="w-4 h-4 mr-2" /> Call</Button>
                </a>
                <Button variant="outline" onClick={() => { setViewModalOpen(false); handleOpenUpdate(viewRecord); }}>
                  <Edit className="w-4 h-4 mr-2" /> Update Status
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Modal */}
      <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Lead Status</DialogTitle>
          </DialogHeader>
          {updateRecord && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{updateRecord.name}</p>
                <p className="text-sm text-muted-foreground">{updateRecord.phone_number}</p>
                {updateRecord.location && <p className="text-sm text-muted-foreground">{updateRecord.location}</p>}
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                >
                  <option value="cold">Cold</option>
                  <option value="warm">Warm</option>
                  <option value="hot">Hot</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add notes about this lead..."
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={updateLoading}>
              {updateLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
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
              <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Contact name" value={addName} onChange={(e) => setAddName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <input type="tel" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Phone number" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="City / Area" value={addLocation} onChange={(e) => setAddLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes..." value={addNotes} onChange={(e) => setAddNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLead} disabled={addLoading || !addName.trim() || !addPhone.trim()}>
              {addLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
              <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Contact name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <input type="tel" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Phone number" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="City / Area" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Notes..." value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEditLead} disabled={editLoading || !editName.trim() || !editPhone.trim()}>
              {editLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Task Modal */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Convert to Task — Client Requirement</DialogTitle>
          </DialogHeader>
          {taskRecord && (
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              {/* Client Info (pre-filled from lead) */}
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{taskRecord.name}</p>
                <p className="text-sm text-muted-foreground">{taskRecord.phone_number}</p>
                {taskRecord.location && <p className="text-sm text-muted-foreground">{taskRecord.location}</p>}
              </div>

              <div className="space-y-2">
                <Label>Task Title *</Label>
                <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Service Required</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                    <option value="call">Follow Up Call</option>
                    <option value="meeting">Client Meeting</option>
                    <option value="proposal">Send Proposal</option>
                    <option value="email">Send Email</option>
                    <option value="followup">Follow Up</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Follow Up Date</Label>
                <input type="datetime-local" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Client Requirements / Notes</Label>
                <Textarea placeholder="What does the client need? Budget, services, timeline..." value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} rows={4} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConvertToTask} disabled={taskLoading || !taskTitle.trim()}>
              {taskLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
