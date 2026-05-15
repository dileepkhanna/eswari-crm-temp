import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMyTasks, marketingActions } from '@/hooks/ase-marketing/useASEMarketing';
import { useAuth } from '@/contexts/AuthContextDjango';
import { PriorityBadge } from '@/components/ase-marketing/shared';
import { CheckCircle, Clock, ListTodo, ChevronLeft, ChevronRight, AlertTriangle, XCircle, Eye, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Task } from '@/hooks/ase-marketing/useASEMarketing';

interface TaskListProps {
  title?: string;
  showFilters?: boolean;
}

export function TaskList({ title = 'My Tasks', showFilters = true }: TaskListProps) {
  const { user } = useAuth();
  const canDelete = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'team_lead';
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [viewTask, setViewTask] = useState<Task | null>(null);

  // Build params from filters
  const params: Record<string, any> = { page };
  if (statusFilter !== 'all') params.status = statusFilter;
  if (priorityFilter !== 'all') params.priority = priorityFilter;

  // Add Task
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addType, setAddType] = useState('call');
  const [addPriority, setAddPriority] = useState('medium');
  const [addDueDate, setAddDueDate] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit Task
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const { data, loading, error, refetch } = useMyTasks(params);

  const handleComplete = async (taskId: number) => {
    try {
      setCompletingId(taskId);
      await marketingActions.completeTask(taskId);
      toast.success('Task completed');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete task');
    } finally {
      setCompletingId(null);
    }
  };

  const handleReject = async (taskId: number) => {
    try {
      setRejectingId(taskId);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/ase-leads/tasks/${taskId}/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!response.ok) throw new Error('Failed');
      toast.success('Task rejected');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject task');
    } finally {
      setRejectingId(null);
    }
  };

  // Add Task handler
  const handleAddTask = async () => {
    if (!addTitle.trim()) { toast.error('Title is required'); return; }
    try {
      setAddLoading(true);
      const token = localStorage.getItem('access_token');
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const response = await fetch('http://localhost:8000/api/ase-leads/tasks/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: addTitle.trim(),
          task_type: addType,
          priority: addPriority,
          due_date: addDueDate || new Date(Date.now() + 86400000).toISOString(),
          description: addDescription.trim(),
          assigned_to: currentUser?.id,
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create task');
      }
      toast.success('Task created');
      setAddModalOpen(false);
      setAddTitle(''); setAddType('call'); setAddPriority('medium'); setAddDueDate(''); setAddDescription('');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    } finally {
      setAddLoading(false);
    }
  };

  // Edit Task handlers
  const handleOpenEdit = (task: Task) => {
    setEditTask(task);
    setEditTitle(task.title);
    setEditType(task.task_type);
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditDueDate(task.due_date ? task.due_date.slice(0, 16) : '');
    setEditDescription(task.description || '');
    setEditModalOpen(true);
  };

  const handleEditTask = async () => {
    if (!editTask || !editTitle.trim()) { toast.error('Title is required'); return; }
    try {
      setEditLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/ase-leads/tasks/${editTask.id}/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          task_type: editType,
          priority: editPriority,
          status: editStatus,
          due_date: editDueDate || undefined,
          description: editDescription.trim(),
        }),
      });
      if (!response.ok) throw new Error('Failed to update');
      toast.success('Task updated');
      setEditModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Task handler
  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/ase-leads/tasks/${taskId}/delete/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete');
      toast.success('Task deleted');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete task');
    }
  };

  const isOverdue = (task: Task) => {
    return task.status !== 'completed' && task.status !== 'cancelled' && new Date(task.due_date) < new Date();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            {title} {data?.count ? `(${data.count})` : ''}
          </CardTitle>

          <div className="flex items-center gap-2 flex-wrap">
            {showFilters && (
              <>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            <Button size="sm" onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Task
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-red-500 text-sm mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
          </div>
        ) : !data?.results?.length ? (
          <p className="text-center text-muted-foreground py-8">No tasks found</p>
        ) : (
          <div className="space-y-2">
            {/* Top Pagination */}
            {data && data.count > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between pb-3 border-b gap-2">
                <p className="text-xs text-muted-foreground">
                  Showing {data.results?.length || 0} of {data.count} tasks (Page {page} of {data.total_pages})
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {data.results.map((task) => (
              <div
                key={task.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg transition-colors gap-2 ${
                  isOverdue(task) ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20' : 'hover:bg-muted/50'
                } ${task.status === 'completed' ? 'opacity-70 border-green-200 bg-green-50/30' : ''} ${task.status === 'cancelled' ? 'opacity-70 border-red-200 bg-red-50/30' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through decoration-green-500 decoration-2' : ''} ${task.status === 'cancelled' ? 'line-through decoration-red-500 decoration-2' : ''}`}>
                      {task.title}
                    </p>
                    <PriorityBadge priority={task.priority} />
                    <Badge variant="outline" className="text-xs capitalize">{task.task_type}</Badge>
                    {isOverdue(task) && (
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </span>
                    <span className="capitalize">{task.status.replace('_', ' ')}</span>
                    {task.assigned_to_name && <span>Assigned: <strong>{task.assigned_to_name}</strong></span>}
                    {task.assigned_by_name && <span>Assigned By: {task.assigned_by_name}</span>}
                    {task.created_by_name && <span>Created By: {task.created_by_name}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => setViewTask(task)} title="View">
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => handleOpenEdit(task)} title="Edit">
                    <Edit className="w-3.5 h-3.5 text-blue-500" />
                  </Button>
                  {canDelete && (
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => handleDeleteTask(task.id)} title="Delete">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  )}
                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <>
                      <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => handleComplete(task.id)} disabled={completingId === task.id}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1 text-green-600" /> {completingId === task.id ? '...' : 'Done'}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2 text-xs text-red-500" onClick={() => handleReject(task.id)} disabled={rejectingId === task.id}>
                        <XCircle className="w-3.5 h-3.5 mr-1" /> {rejectingId === task.id ? '...' : 'Reject'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {data && data.count > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t mt-3 gap-2">
                <p className="text-xs text-muted-foreground">
                  Showing {data.results?.length || 0} of {data.count} tasks (Page {page} of {data.total_pages})
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* View Task Modal */}
      <Dialog open={!!viewTask} onOpenChange={(open) => { if (!open) setViewTask(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Task Details</DialogTitle></DialogHeader>
          {viewTask && (
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">Title</Label><p className="text-sm font-medium">{viewTask.title}</p></div>
                <div><Label className="text-xs text-muted-foreground">Status</Label><Badge variant="outline" className="mt-1 capitalize">{viewTask.status.replace('_', ' ')}</Badge></div>
                <div><Label className="text-xs text-muted-foreground">Type</Label><p className="text-sm capitalize">{viewTask.task_type_display || viewTask.task_type}</p></div>
                <div><Label className="text-xs text-muted-foreground">Priority</Label><div className="mt-1"><PriorityBadge priority={viewTask.priority} /></div></div>
                <div><Label className="text-xs text-muted-foreground">Created By</Label><p className="text-sm">{viewTask.created_by_name || '—'}{viewTask.created_by_details?.marketing_category && <span className="text-xs text-muted-foreground ml-1">({viewTask.created_by_details.marketing_category.toUpperCase()})</span>}</p></div>
                <div><Label className="text-xs text-muted-foreground">Assigned By</Label><p className="text-sm">{viewTask.assigned_by_name || '—'}{viewTask.assigned_by_details?.marketing_category && <span className="text-xs text-muted-foreground ml-1">({viewTask.assigned_by_details.marketing_category.toUpperCase()})</span>}</p></div>
                <div><Label className="text-xs text-muted-foreground">Closed By</Label><p className="text-sm">{viewTask.status === 'completed' && viewTask.closed_by_name ? <>{viewTask.closed_by_name}{viewTask.closed_by_details?.marketing_category && <span className="text-xs text-muted-foreground ml-1">({viewTask.closed_by_details.marketing_category.toUpperCase()})</span>}</> : '—'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Due Date</Label><p className="text-sm">{new Date(viewTask.due_date).toLocaleString()}</p></div>
                <div><Label className="text-xs text-muted-foreground">Created Date</Label><p className="text-sm">{viewTask.created_at ? new Date(viewTask.created_at).toLocaleString() : '—'}</p></div>
                {viewTask.completed_at && <div><Label className="text-xs text-muted-foreground">Completed Date</Label><p className="text-sm text-green-600">{new Date(viewTask.completed_at).toLocaleString()}</p></div>}
              </div>
              {viewTask.description && (
                <div><Label className="text-xs text-muted-foreground">Description / Client Requirements</Label><p className="text-sm mt-1 whitespace-pre-wrap bg-muted p-3 rounded-lg">{viewTask.description}</p></div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewTask(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add New Task</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Task title" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={addType} onChange={(e) => setAddType(e.target.value)}>
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="email">Email</option>
                  <option value="followup">Follow Up</option>
                  <option value="proposal">Proposal</option>
                  <option value="research">Research</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={addPriority} onChange={(e) => setAddPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <input type="datetime-local" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={addDueDate} onChange={(e) => setAddDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Task description..." value={addDescription} onChange={(e) => setAddDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={addLoading || !addTitle.trim()}>
              {addLoading && <span className="animate-spin mr-2">⏳</span>}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={editType} onChange={(e) => setEditType(e.target.value)}>
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="email">Email</option>
                  <option value="followup">Follow Up</option>
                  <option value="proposal">Proposal</option>
                  <option value="research">Research</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <input type="datetime-local" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEditTask} disabled={editLoading || !editTitle.trim()}>
              {editLoading && <span className="animate-spin mr-2">⏳</span>}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
