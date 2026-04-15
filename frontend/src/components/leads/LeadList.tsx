import { useMemo, useState, useEffect } from "react";
import { Lead, User } from "@/types";
import LeadStatusChip from "./LeadStatusChip";
import LeadFormModal from "./LeadFormModal";
import LeadDetailsModal from "./LeadDetailsModal";
import ExcelImportExport from "./ExcelImportExport";
import TaskFormModal from "@/components/tasks/TaskFormModal";
import StaffProfileChip from "@/components/common/StaffProfileChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  CheckSquare,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContextDjango";
import { useData, apiToLead } from "@/contexts/DataContextDjango";
import { canDeleteLeadsAndTasks, canViewCustomerPhone, maskPhoneNumber, maskEmail } from "@/lib/permissions";
import { apiClient } from "@/lib/api";

import { logger } from '@/lib/logger';
interface LeadListProps {
  canCreate?: boolean;
  canEdit?: boolean;
  canConvert?: boolean;
  isManagerView?: boolean;
  employees?: User[]; // Add employees for assignment
}

export default function LeadList({
  canCreate = true,
  canEdit = true,
  canConvert = true,
  isManagerView = false,
  employees = [],
}: LeadListProps) {
  const { user } = useAuth();
  const { leads, leadsPage, leadsTotalPages, leadsTotalCount, leadsSearch, leadsStatus, leadsUser, setLeadsPage, setLeadsSearch, setLeadsStatus, setLeadsUser, projects, tasks, addLead, updateLead, deleteLead, bulkDeleteLeads, bulkDeleteLeadsByFilter, addTask, refreshData } = useData();
  // Check if user can delete leads and tasks
  const canDelete = user ? canDeleteLeadsAndTasks(user.role, (user.company as any)?.code) : false;

  // Helper function to check if current user can see a lead's phone number
  const canSeePhoneNumber = (lead: Lead) => {
    return canViewCustomerPhone(user?.role, user?.id, lead.createdBy);
  };

  // Local-only filters (project, user, task, date) — applied client-side on current page
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteAllMatching, setDeleteAllMatching] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  // Auto-refresh when leads array changes (optimistic updates)
  useEffect(() => {
    setLastUpdateTime(new Date());
  }, [leads.length]);

  // Client-side filter for project/user/task/date (search & status are server-side)
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesProject = projectFilter === "all" || 
        (lead.assignedProjects && lead.assignedProjects.map(id => String(id)).includes(projectFilter)) ||
        String(lead.assignedProject) === projectFilter;

      const matchesUser = true; // now server-side via leadsUser

      let matchesTask = true;
      if (taskFilter === "converted") {
        matchesTask = tasks.some(task => task.leadId === lead.id);
      } else if (taskFilter === "not_converted") {
        matchesTask = !tasks.some(task => task.leadId === lead.id);
      }

      let matchesDate = true;
      if (dateRange.from && dateRange.to) {
        matchesDate = isWithinInterval(new Date(lead.createdAt), {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      } else if (dateRange.from) {
        matchesDate = new Date(lead.createdAt) >= startOfDay(dateRange.from);
      }

      return matchesProject && matchesUser && matchesTask && matchesDate;
    });
  }, [leads, projectFilter, taskFilter, dateRange, tasks]);

  // Check if user can see any phone numbers (for table headers)
  const canSeeAnyPhoneNumbers = useMemo(() => {
    return filteredLeads.some(lead => canSeePhoneNumber(lead));
  }, [filteredLeads, user]);

  const allSelected = filteredLeads.length > 0 && filteredLeads.every(lead => selectedIds.has(lead.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      setDeleteAllMatching(false);
    } else {
      setSelectedIds(new Set(filteredLeads.map(lead => lead.id)));
      setDeleteAllMatching(false); // never auto-enable filter-based delete
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
    setDeleteAllMatching(false);
  };

  const handleBulkDelete = async () => {
    try {
      if (deleteAllMatching) {
        // Delete all records matching current filters across all pages
        await bulkDeleteLeadsByFilter({ search: leadsSearch, status: leadsStatus });
      } else {
        logger.log('🗑️ Starting bulk delete for selected leads:', Array.from(selectedIds));
        await bulkDeleteLeads(Array.from(selectedIds));
      }
      setSelectedIds(new Set());
      setDeleteAllMatching(false);
      setShowDeleteDialog(false);
      setTimeout(() => refreshData(false), 500);
    } catch (error) {
      logger.error('❌ Bulk delete failed:', error);
    }
  };

  const handleSaveLead = async (leadData: Partial<Lead>) => {
    try {
      if (editingLead) {
        await updateLead(editingLead.id, leadData);
        toast.success("Lead updated successfully");
      } else {
        await addLead({
          ...(leadData as Lead),
          notes: [],
          createdBy: user?.id || "unknown",
        });
        toast.success("Lead created successfully");
      }
      setIsFormOpen(false);
      setEditingLead(null);
      
      // Trigger immediate UI update
      setLastUpdateTime(new Date());
    } catch (error) {
      // Error already shown by DataContext
    }
  };

  const handleConvertToTask = (lead: Lead) => {
    setConvertingLead(lead);
  };

  const handleConvertToTaskSave = async (taskData: any) => {
    if (!convertingLead) return;
    try {
      await addTask({
        leadId: convertingLead.id,
        lead: convertingLead,
        status: taskData.status || 'in_progress',
        priority: taskData.priority || 'medium',
        notes: taskData.notes || [],
        attachments: [],
        assignedTo: taskData.assignedTo || user?.id || 'unknown',
        assignedProject: taskData.assignedProject,
        nextActionDate: taskData.nextActionDate,
      });
      toast.success(`Lead "${convertingLead.name}" converted to task`, {
        description: 'You can now track this lead in the Tasks module.',
      });
      setConvertingLead(null);
      setLastUpdateTime(new Date());
    } catch (error) {
      toast.error('Failed to convert lead to task');
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    try {
      await deleteLead(lead.id);
      toast.success("Lead deleted successfully");
      
      // Trigger immediate UI update
      setLastUpdateTime(new Date());
    } catch (error) {
      // Error already shown by DataContext
    }
  };

  const formatBudget = (min: number, max: number) => {
    const formatValue = (val: number) => {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(0)} L`;
      if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
      return `₹${val}`;
    };
    return `${formatValue(min)} - ${formatValue(max)}`;
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return "-";
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : "-";
  };

  // Helper function to get project names for multiple projects
  const getProjectNames = (assignedProjects?: string[], assignedProject?: string) => {
    let projectIds: string[] = [];
    
    if (assignedProjects && assignedProjects.length > 0) {
      projectIds = assignedProjects.map(id => String(id));
    } else if (assignedProject && assignedProject !== 'none') {
      projectIds = [String(assignedProject)];
    }
    
    if (projectIds.length === 0) return '-';
    
    const projectNames = projectIds
      .map(id => projects.find(p => String(p.id) === id)?.name)
      .filter(Boolean);
    
    if (projectNames.length === 0) return '-';
    if (projectNames.length === 1) return projectNames[0];
    if (projectNames.length <= 2) return projectNames.join(', ');
    return `${projectNames[0]} +${projectNames.length - 1} more`;
  };

  const handleStatusChange = async (leadId: string, newStatus: Lead["status"]) => {
    try {
      await updateLead(leadId, { status: newStatus });
      toast.success("Lead status updated");
      
      // Trigger immediate UI update
      setLastUpdateTime(new Date());
    } catch (error) {
      // Error already shown by DataContext
    }
  };

  const handleImportLeads = async (importedLeads: Partial<Lead>[]) => {
    let successCount = 0;
    for (const leadData of importedLeads) {
      try {
        await addLead({
          ...(leadData as Lead),
          notes: [],
          createdBy: user?.id || "unknown",
        });
        successCount++;
      } catch (error) {
        // Continue with next lead
      }
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} leads imported successfully`);
      setLastUpdateTime(new Date());
    }
  };

  // Fetch all pages for export
  const fetchAllLeadsForExport = async (): Promise<Lead[]> => {
    const PAGE_SIZE = 200;
    let allLeads: Lead[] = [];
    let page = 1;
    while (true) {
      const params: Record<string, any> = { page, page_size: PAGE_SIZE };
      if (leadsSearch) params.search = leadsSearch;
      if (leadsStatus) params.status = leadsStatus;
      if (leadsUser) params.user = leadsUser;
      const response = await apiClient.getLeads(params);
      const results = Array.isArray(response) ? response : (response.results || []);
      allLeads = allLeads.concat(results.map(apiToLead));
      if (Array.isArray(response) || !response.next) break;
      page++;
    }
    return allLeads;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, email..."
              value={leadsSearch}
              onChange={(e) => setLeadsSearch(e.target.value)}
              className="pl-10 input-field w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
            <Select value={leadsStatus || "all"} onValueChange={(v) => setLeadsStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
                <SelectItem value="not_interested">Not Interested</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={leadsUser || "all"} onValueChange={(v) => { setLeadsUser(v === "all" ? "" : v); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={taskFilter} onValueChange={setTaskFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Task Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="converted">Converted to Task</SelectItem>
                <SelectItem value="not_converted">Not Converted</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal w-full"
                >
                  <Calendar className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate text-xs">
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM dd")
                      )
                    ) : (
                      "Date"
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={1}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {dateRange.from && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateRange({})}
                className="w-full"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap justify-between items-start sm:items-center">
          <div className="flex gap-2 items-center flex-wrap">
            <ExcelImportExport leads={filteredLeads} totalCount={leadsTotalCount} onExportAll={fetchAllLeadsForExport} onImport={handleImportLeads} />
            {canCreate && (
              <Button onClick={() => setIsFormOpen(true)} className="btn-primary shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            )}
          </div>
          
          {/* Right side actions */}
          <div className="flex gap-2 items-center flex-wrap">
            {someSelected && (
              <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg border">
                <span className="text-sm text-muted-foreground">
                  {deleteAllMatching ? `All ${leadsTotalCount}` : selectedIds.size} selected
                </span>
                {canDelete && (
                  <>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="h-7"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {deleteAllMatching ? `Delete All (${leadsTotalCount})` : `Delete (${selectedIds.size})`}
                    </Button>
                    {/* Show "Select All" across pages only when current page is fully selected */}
                    {allSelected && leadsTotalCount > filteredLeads.length && !deleteAllMatching && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setDeleteAllMatching(true)}
                      >
                        Select all {leadsTotalCount}
                      </Button>
                    )}
                    {deleteAllMatching && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setDeleteAllMatching(false)}
                      >
                        Clear
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-2">
        {filteredLeads.map((lead, index) => (
          <div
            key={lead.id}
            className="glass-card rounded-lg p-3 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-2 gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedIds.has(lead.id)} 
                    onCheckedChange={() => toggleSelect(lead.id)}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate text-sm">{lead.name}</p>
                    <p className="text-xs text-muted-foreground capitalize truncate">{lead.source || "Direct"}</p>
                  </div>
                </div>
              </div>
              <LeadStatusChip status={lead.status} />
            </div>
            {canSeeAnyPhoneNumbers && (
              <div className="grid grid-cols-1 gap-1 text-xs mb-2">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  <span className="truncate">
                    {canSeePhoneNumber(lead) ? lead.phone : maskPhoneNumber(lead.phone)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">
                    {canSeePhoneNumber(lead) ? lead.email : maskEmail(lead.email)}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 gap-2">
              <span className="truncate">{getProjectNames(lead.assignedProjects, lead.assignedProject)}</span>
              {!isManagerView && <span className="shrink-0">{formatBudget(lead.budgetMin, lead.budgetMax)}</span>}
            </div>
            <div className="flex items-center justify-between text-xs mb-2 gap-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-3 h-3" />
                <span className="truncate">
                  {lead.assignedToName ? `Assigned: ${lead.assignedToName}` : 'Unassigned'}
                </span>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              <Button variant="outline" size="sm" className="flex-1 min-w-[60px] h-7 text-xs" onClick={() => setViewingLead(lead)}>
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-[60px] h-7 text-xs"
                  onClick={() => {
                    setEditingLead(lead);
                    setIsFormOpen(true);
                  }}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
              {canConvert && (
                tasks.some(t => t.leadId === lead.id) ? (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-medium flex-1 min-w-[80px] h-7 justify-center">
                    <CheckSquare className="w-3 h-3" />
                    Task Created
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 min-w-[80px] h-7 text-xs"
                    onClick={() => handleConvertToTask(lead)}
                  >
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Convert
                  </Button>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="glass-card rounded-2xl overflow-hidden hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox 
                  checked={allSelected} 
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="font-semibold">
                <div className="flex items-center gap-2">
                  Name
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="font-semibold">Project</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Assigned To</TableHead>
              <TableHead className="font-semibold">Follow-up</TableHead>
              <TableHead className="font-semibold w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead, index) => (
              <TableRow
                key={lead.id}
                className="table-row-hover animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.has(lead.id)} 
                    onCheckedChange={() => toggleSelect(lead.id)}
                    aria-label={`Select ${lead.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{lead.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{lead.source || "Direct"}</p>
                    {tasks.some(t => t.leadId === lead.id) && (
                      <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        <CheckSquare className="w-3 h-3" />
                        Task Created
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" />
                    {lead.phone}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" />
                    {lead.email || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium">{getProjectNames(lead.assignedProjects, lead.assignedProject)}</p>
                </TableCell>
                <TableCell>
                  <Select value={lead.status} onValueChange={(value) => handleStatusChange(lead.id, value as Lead["status"])}>
                    <SelectTrigger className={`w-36 border rounded-full px-3 text-xs font-medium flex items-center justify-between gap-1 ${
                      lead.status === 'new' ? 'bg-green-100 border-green-300 text-green-700' :
                      lead.status === 'hot' ? 'bg-red-100 border-red-300 text-red-700' :
                      lead.status === 'warm' ? 'bg-yellow-100 border-yellow-300 text-yellow-700' :
                      lead.status === 'cold' ? 'bg-blue-100 border-blue-300 text-blue-700' :
                      lead.status === 'not_interested' ? 'bg-gray-100 border-gray-300 text-gray-700' :
                      lead.status === 'reminder' ? 'bg-purple-100 border-purple-300 text-purple-700' :
                      'bg-gray-100 border-gray-300 text-gray-700'
                    }`}>
                      <span className="truncate">
                        {lead.status === 'not_interested' ? 'Not Interested' :
                         lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="hot">Hot</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="cold">Cold</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {lead.assignedTo ? (
                    <StaffProfileChip userId={lead.assignedTo} userName={lead.assignedToName} showDetails={true} />
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {lead.followUpDate ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(lead.followUpDate, "MMM dd, yyyy")}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewingLead(lead)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingLead(lead);
                            setIsFormOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Lead
                        </DropdownMenuItem>
                      )}
                      {canConvert && !tasks.some(t => t.leadId === lead.id) && (
                        <DropdownMenuItem onClick={() => handleConvertToTask(lead)}>
                          <CheckSquare className="w-4 h-4 mr-2" />
                          Convert to Task
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteLead(lead)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Lead
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredLeads.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No leads found</p>
        </div>
      )}

      {/* Pagination */}
      {leadsTotalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {(leadsPage - 1) * 50 + 1} - {Math.min(leadsPage * 50, leadsTotalCount)} of {leadsTotalCount} leads
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setLeadsPage(1)} disabled={leadsPage === 1}>{'«'}</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setLeadsPage(leadsPage - 1)} disabled={leadsPage === 1}>{'‹'}</Button>
            {(() => {
              const pages = Array.from({ length: leadsTotalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === leadsTotalPages || Math.abs(p - leadsPage) <= 2);
              const items: (number | string)[] = [];
              pages.forEach((p, i) => {
                if (i > 0 && p - pages[i - 1] > 1) items.push('...');
                items.push(p);
              });
              return items.map((p, i) =>
                p === '...' ? (
                  <span key={`e-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                ) : (
                  <Button key={p} variant={leadsPage === p ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setLeadsPage(p as number)}>{p}</Button>
                )
              );
            })()}
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setLeadsPage(leadsPage + 1)} disabled={leadsPage === leadsTotalPages}>{'›'}</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setLeadsPage(leadsTotalPages)} disabled={leadsPage === leadsTotalPages}>{'»'}</Button>
          </div>
        </div>
      )}

      <LeadFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingLead(null);
        }}
        onSave={handleSaveLead}
        lead={editingLead}
        projects={projects}
        employees={employees}
        showAssignment={true} // Always show assignment for regular lead creation/editing
      />

      <LeadDetailsModal
        open={!!viewingLead}
        onClose={() => setViewingLead(null)}
        lead={viewingLead}
        isManagerView={isManagerView}
        canEdit={canEdit}
        onEdit={() => {
          if (viewingLead) {
            setEditingLead(viewingLead);
            setViewingLead(null);
            setIsFormOpen(true);
          }
        }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Leads</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAllMatching
                ? `Are you sure you want to delete all ${leadsTotalCount} matching leads? This action cannot be undone.`
                : `Are you sure you want to delete ${selectedIds.size} lead(s)? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task form modal for converting lead to task */}
      <TaskFormModal
        open={!!convertingLead}
        onClose={() => setConvertingLead(null)}
        onSave={handleConvertToTaskSave}
        task={null}
        isCreating={false}
        projects={projects}
        convertingLead={convertingLead}
      />
    </div>
  );
}
