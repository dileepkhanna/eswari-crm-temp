import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useASELead } from '@/contexts/ASELeadContext';
import { ASELead } from '@/types/ase-customer';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EditIcon, TrashIcon, PhoneIcon, MailIcon, BuildingIcon, EyeIcon, XIcon, ListTodo, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface ASELeadListProps {
  onEditLead?: (lead: ASELead) => void;
  onDeleteLead?: (lead: ASELead) => void;
  selectedIds: Set<string>;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'demo_done', label: 'Demo Done' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'custom', label: 'Custom' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'new': return 'bg-blue-50 text-blue-700 border-blue-300';
    case 'demo_done': return 'bg-green-50 text-green-700 border-green-300';
    case 'presentation': return 'bg-purple-50 text-purple-700 border-purple-300';
    case 'custom': return 'bg-orange-50 text-orange-700 border-orange-300';
    default: return 'bg-gray-50 text-gray-700 border-gray-300';
  }
}

function getStatusDot(status: string) {
  switch (status) {
    case 'new': return 'bg-blue-500';
    case 'demo_done': return 'bg-green-500';
    case 'presentation': return 'bg-purple-500';
    case 'custom': return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
}

// ── View Details Modal ──────────────────────────────────────────────────────
function LeadDetailModal({ lead, onClose }: { lead: ASELead; onClose: () => void }) {
  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{lead.company_name}</h2>
            <p className="text-sm text-muted-foreground">{lead.contact_person}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors ml-4 shrink-0">
            <XIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-6 py-4">
          {/* Status + Priority badges */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(lead.status)}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(lead.status)}`} />
              {STATUS_OPTIONS.find(s => s.value === lead.status)?.label || lead.status}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium ${
              lead.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-300' :
              lead.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-300' :
              lead.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
              'bg-gray-50 text-gray-600 border-gray-300'
            }`}>
              {PRIORITY_OPTIONS.find(p => p.value === lead.priority)?.label || lead.priority}
            </span>
            {lead.industry && (
              <span className="inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium bg-muted text-muted-foreground border-border">
                {lead.industry.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
            <Detail label="Email" value={lead.email} />
            <Detail label="Phone" value={lead.phone} />
            <Detail label="Website" value={lead.website} />
            <Detail label="Company Size" value={lead.company_size} />
            <Detail label="Annual Revenue" value={lead.annual_revenue} />
            <Detail label="Budget" value={lead.budget_amount} />
            <Detail label="Est. Project Value" value={lead.estimated_project_value ? `₹${lead.estimated_project_value}` : undefined} />
            <Detail label="Monthly Retainer" value={lead.monthly_retainer ? `₹${lead.monthly_retainer}/mo` : undefined} />
            <Detail label="Lead Source" value={lead.lead_source} />
            <Detail label="Assigned To" value={lead.assigned_to_name} />
            <Detail label="Created By" value={lead.created_by_name} />
            <Detail label="Next Follow-up" value={lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleDateString() : undefined} />
            <Detail label="Has Website" value={lead.has_website ? 'Yes' : 'No'} />
            <Detail label="Has Social Media" value={lead.has_social_media ? 'Yes' : 'No'} />
            <Detail label="Current SEO Agency" value={lead.current_seo_agency} />
          </div>

          {/* Services */}
          {Array.isArray(lead.service_interests_display) && lead.service_interests_display.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Services Interested</p>
              <div className="flex flex-wrap gap-1.5">
                {lead.service_interests_display.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Marketing Goals */}
          {lead.marketing_goals && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Marketing Goals</p>
              <p className="text-sm text-foreground bg-muted/50 rounded-lg px-3 py-2">{lead.marketing_goals}</p>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/50 rounded-lg px-3 py-2">{lead.notes}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 pb-5 border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="font-medium text-sm text-foreground">{value}</p>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function ASELeadList({ onEditLead, onDeleteLead, selectedIds, onToggleAll, onToggleOne }: ASELeadListProps) {
  const { leads, loading, error, updateLead } = useASELead();
  const [viewLead, setViewLead] = useState<ASELead | null>(null);

  // Convert to Task state
  const [convertLead, setConvertLead] = useState<ASELead | null>(null);
  const [convertLoading, setConvertLoading] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState('followup');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  const openConvertToTask = (lead: ASELead) => {
    setConvertLead(lead);
    setTaskTitle(`Follow up with ${lead.company_name}`);
    setTaskType('followup');
    setTaskPriority(lead.priority || 'medium');
    setTaskDescription(`Contact: ${lead.contact_person}\nPhone: ${lead.phone || ''}\nEmail: ${lead.email || ''}\nServices: ${Array.isArray(lead.service_interests_display) ? lead.service_interests_display.join(', ') : ''}`);
    // Default due date: tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setTaskDueDate(tomorrow.toISOString().slice(0, 16));
  };

  const handleConvertToTask = async () => {
    if (!convertLead) return;
    if (!taskTitle.trim()) { toast.error('Title is required'); return; }
    if (!taskDueDate) { toast.error('Due date is required'); return; }
    try {
      setConvertLoading(true);
      await apiClient.post('/ase-leads/tasks/', {
        lead_id: parseInt(convertLead.id),
        title: taskTitle.trim(),
        task_type: taskType,
        priority: taskPriority,
        due_date: new Date(taskDueDate).toISOString(),
        description: taskDescription.trim(),
      });
      // Update lead status to indicate it's been converted
      await updateLead(convertLead.id, { status: 'demo_done' as any });
      toast.success('Lead converted to task successfully');
      setConvertLead(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert lead to task');
    } finally {
      setConvertLoading(false);
    }
  };

  const allSelected = leads.length > 0 && selectedIds.size === leads.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < leads.length;

  // Custom status dialog state
  const [customStatusLead, setCustomStatusLead] = useState<string | null>(null);
  const [customStatusText, setCustomStatusText] = useState('');
  const [customStatusLoading, setCustomStatusLoading] = useState(false);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      if (newStatus === 'custom') {
        setCustomStatusLead(leadId);
        setCustomStatusText('');
        return; // don't update yet — wait for dialog submit
      }
      await updateLead(leadId, { status: newStatus as any });
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleCustomStatusSubmit = async () => {
    if (!customStatusLead || !customStatusText.trim()) {
      toast.error('Please enter a custom status');
      return;
    }
    try {
      setCustomStatusLoading(true);
      await updateLead(customStatusLead, { status: 'custom' as any, custom_status: customStatusText.trim() } as any);
      toast.success('Status updated');
      setCustomStatusLead(null);
      setCustomStatusText('');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setCustomStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">Error loading leads: {error}</div>;
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
          <BuildingIcon className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-base font-semibold mb-1">No Leads Found</h3>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or add a new lead.</p>
      </div>
    );
  }

  return (
    <>
      {viewLead && <LeadDetailModal lead={viewLead} onClose={() => setViewLead(null)} />}

      {/* Convert to Task Dialog */}
      <Dialog open={!!convertLead} onOpenChange={(open) => { if (!open) setConvertLead(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary" />
              Convert Lead to Task
            </DialogTitle>
          </DialogHeader>
          {convertLead && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p className="font-medium">{convertLead.company_name}</p>
                <p className="text-muted-foreground text-xs">{convertLead.contact_person} · {convertLead.phone}</p>
              </div>
              <div className="space-y-2">
                <Label>Title <span className="text-red-500">*</span></Label>
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={taskType} onValueChange={setTaskType}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="followup">Follow Up</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={taskPriority} onValueChange={setTaskPriority}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Due Date <span className="text-red-500">*</span></Label>
                <input
                  type="datetime-local"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertLead(null)} disabled={convertLoading}>Cancel</Button>
            <Button onClick={handleConvertToTask} disabled={convertLoading || !taskTitle.trim() || !taskDueDate}>
              {convertLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Convert to Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Status Dialog */}
      <Dialog open={!!customStatusLead} onOpenChange={(open) => { if (!open) setCustomStatusLead(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter Custom Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Custom Status</Label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                placeholder="e.g., Follow Up Call, Site Visit..."
                value={customStatusText}
                onChange={(e) => setCustomStatusText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCustomStatusSubmit(); }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomStatusLead(null)}>Cancel</Button>
            <Button onClick={handleCustomStatusSubmit} disabled={customStatusLoading || !customStatusText.trim()}>
              {customStatusLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile card view */}
      <div className="block md:hidden space-y-2">
        {leads.map((lead) => {
          const statusDotColor = getStatusDot(lead.status);
          const barColor = lead.status === 'new' ? 'bg-blue-500'
            : lead.status === 'demo_done' ? 'bg-green-500'
            : lead.status === 'presentation' ? 'bg-purple-500'
            : 'bg-orange-500';

          return (
            <div
              key={lead.id}
              className={`relative overflow-hidden border rounded-xl transition-colors ${
                selectedIds.has(lead.id) ? 'bg-primary/5 border-primary/30' : 'bg-card border-border'
              }`}
            >
              {/* left status color bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColor}`} />

              <div className="pl-3 pr-2.5 py-2.5">
                {/* Top row: checkbox + name + actions */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="rounded cursor-pointer mt-0.5 flex-shrink-0"
                    checked={selectedIds.has(lead.id)}
                    onChange={() => onToggleOne(lead.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm leading-tight truncate">{lead.company_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{lead.contact_person}</div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500" onClick={() => setViewLead(lead)}>
                      <EyeIcon className="w-3.5 h-3.5" />
                    </Button>
                    {onEditLead && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => onEditLead(lead)}>
                        <EditIcon className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {onDeleteLead && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => onDeleteLead(lead)}>
                        <TrashIcon className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" title="Convert to Task" onClick={() => openConvertToTask(lead)}>
                      <ListTodo className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Bottom row: phone + budget + priority + status */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 ml-5">
                  {lead.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <PhoneIcon className="w-3 h-3 flex-shrink-0" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                  {(lead.budget_amount || lead.estimated_project_value) && (
                    <span className="text-xs font-medium text-foreground">₹{lead.budget_amount || lead.estimated_project_value}</span>
                  )}
                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] border font-medium ${
                    lead.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-300' :
                    lead.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-300' :
                    lead.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                    'bg-gray-50 text-gray-600 border-gray-300'
                  }`}>
                    {PRIORITY_OPTIONS.find(p => p.value === lead.priority)?.label || lead.priority}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${getStatusColor(lead.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotColor}`} />
                        {STATUS_OPTIONS.find(s => s.value === lead.status)?.label || lead.status}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44 z-50">
                      {STATUS_OPTIONS.map((opt) => (
                        <DropdownMenuItem key={opt.value} onClick={() => handleStatusChange(lead.id, opt.value)} className={`cursor-pointer text-xs ${lead.status === opt.value ? 'bg-primary/10 text-primary' : ''}`}>
                          <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${getStatusDot(opt.value)}`} />
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Services */}
                {Array.isArray(lead.service_interests_display) && lead.service_interests_display.length > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1 ml-5 truncate">
                    {lead.service_interests_display.slice(0, 3).join(' · ')}
                    {lead.service_interests_display.length > 3 && ` +${lead.service_interests_display.length - 3}`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block border rounded-lg">
        <div className="overflow-y-auto" style={{ maxHeight: '65vh' }}>
          <table className="w-full text-sm table-fixed">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="border-b text-muted-foreground text-xs">
              <th className="text-left py-2 px-2 font-medium w-8">
                <input
                  type="checkbox"
                  className="rounded cursor-pointer"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={onToggleAll}
                />
              </th>
              <th className="text-left py-2 px-2 font-medium w-[18%]">Name</th>
              <th className="text-left py-2 px-2 font-medium w-[13%]">Phone</th>
              <th className="text-left py-2 px-2 font-medium w-[16%]">Services</th>
              <th className="text-left py-2 px-2 font-medium w-[12%]">Budget</th>
              <th className="text-left py-2 px-2 font-medium w-[9%]">Priority</th>
              <th className="text-left py-2 px-2 font-medium w-[13%]">Status</th>
              <th className="text-left py-2 px-2 font-medium w-[10%]">Assigned</th>
              <th className="text-left py-2 px-2 font-medium w-[7%]">Created</th>
              <th className="text-left py-2 px-2 font-medium w-[9%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className={`border-b transition-colors ${selectedIds.has(lead.id) ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                <td className="py-2.5 px-2">
                  <input type="checkbox" className="rounded cursor-pointer" checked={selectedIds.has(lead.id)} onChange={() => onToggleOne(lead.id)} />
                </td>
                <td className="py-2.5 px-2">
                  <div className="font-medium text-sm leading-tight truncate">{lead.company_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{lead.contact_person}</div>
                </td>
                <td className="py-2.5 px-2">
                  {lead.phone ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <PhoneIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="text-xs truncate">{lead.phone}</span>
                    </div>
                  ) : <span className="text-muted-foreground text-xs">-</span>}
                </td>
                <td className="py-2.5 px-2">
                  <div className="text-xs text-muted-foreground truncate">
                    {Array.isArray(lead.service_interests_display) && lead.service_interests_display.length > 0
                      ? lead.service_interests_display.join(', ')
                      : lead.industry || '-'}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-xs">
                  {lead.budget_amount ? <span className="truncate block">₹{lead.budget_amount}</span>
                    : lead.estimated_project_value ? <span className="truncate block">₹{lead.estimated_project_value}</span>
                    : <span className="text-muted-foreground">-</span>}
                </td>
                <td className="py-2.5 px-2">
                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] border font-medium whitespace-nowrap ${
                    lead.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-300' :
                    lead.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-300' :
                    lead.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                    'bg-gray-50 text-gray-600 border-gray-300'
                  }`}>
                    {PRIORITY_OPTIONS.find(p => p.value === lead.priority)?.label || lead.priority}
                  </span>
                </td>
                <td className="py-2.5 px-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium cursor-pointer hover:opacity-80 whitespace-nowrap ${getStatusColor(lead.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDot(lead.status)}`} />
                        <span>{STATUS_OPTIONS.find(s => s.value === lead.status)?.label || lead.status}</span>
                        <svg className="w-2.5 h-2.5 opacity-60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44 z-50">
                      {STATUS_OPTIONS.map((opt) => (
                        <DropdownMenuItem key={opt.value} onClick={() => handleStatusChange(lead.id, opt.value)} className={`cursor-pointer text-xs ${lead.status === opt.value ? 'bg-primary/10 text-primary' : ''}`}>
                          <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${getStatusDot(opt.value)}`} />
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                      {(lead.assigned_to_name || lead.created_by_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium leading-tight truncate" title={lead.assigned_to_name || 'Unassigned'}>
                        {lead.assigned_to_name ? lead.assigned_to_name.split(' ')[0] : 'Unassigned'}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate" title={lead.created_by_name || '-'}>
                        by {lead.created_by_name ? lead.created_by_name.split(' ')[0] : '-'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                  </span>
                </td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700" title="View Details" onClick={() => setViewLead(lead)}>
                      <EyeIcon className="w-3.5 h-3.5" />
                    </Button>
                    {onEditLead && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit" onClick={() => onEditLead(lead)}>
                        <EditIcon className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {onDeleteLead && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" title="Delete" onClick={() => onDeleteLead(lead)}>
                        <TrashIcon className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600 hover:text-green-800" title="Convert to Task" onClick={() => openConvertToTask(lead)}>
                      <ListTodo className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
