import { useMemo, useState } from "react";
import { Lead } from "@/types";
import LeadStatusChip from "./LeadStatusChip";
import LeadFormModal from "./LeadFormModal";
import LeadDetailsModal from "./LeadDetailsModal";
import ExcelImportExport from "./ExcelImportExport";
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
import { useData } from "@/contexts/DataContextDjango";
import { canDeleteLeadsAndTasks } from "@/lib/permissions";

interface LeadListProps {
  canCreate?: boolean;
  canEdit?: boolean;
  canConvert?: boolean;
  isManagerView?: boolean;
}

export default function LeadList({
  canCreate = true,
  canEdit = true,
  canConvert = true,
  isManagerView = false,
}: LeadListProps) {
  const { user } = useAuth();
  const { leads, projects, addLead, updateLead, deleteLead, addTask } = useData();

  // Check if user can delete leads and tasks
  const canDelete = user ? canDeleteLeadsAndTasks(user.role) : false;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery);

      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      
      // Updated project filtering to handle multiple projects
      const matchesProject = projectFilter === "all" || 
        (lead.assignedProjects && lead.assignedProjects.includes(projectFilter)) ||
        lead.assignedProject === projectFilter;

      let matchesDate = true;
      if (dateRange.from && dateRange.to) {
        matchesDate = isWithinInterval(new Date(lead.createdAt), {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      } else if (dateRange.from) {
        matchesDate = new Date(lead.createdAt) >= startOfDay(dateRange.from);
      }

      return matchesSearch && matchesStatus && matchesProject && matchesDate;
    });
  }, [leads, searchQuery, statusFilter, projectFilter, dateRange]);

  const allSelected = filteredLeads.length > 0 && filteredLeads.every(lead => selectedIds.has(lead.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(lead => lead.id)));
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
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await deleteLead(id);
      }
      toast.success(`${selectedIds.size} lead(s) deleted successfully`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error("Failed to delete some leads");
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
    } catch (error) {
      // Error already shown by DataContext
    }
  };

  const handleConvertToTask = async (lead: Lead) => {
    try {
      // Use first assigned project or fallback to single project
      const projectId = (lead.assignedProjects && lead.assignedProjects.length > 0) 
        ? lead.assignedProjects[0] 
        : lead.assignedProject;
        
      await addTask({
        leadId: lead.id,
        lead: lead,
        status: "in_progress",
        notes: [],
        attachments: [],
        assignedTo: user?.id || "unknown",
        assignedProject: projectId,
      });
      toast.success(`Lead "${lead.name}" converted to task`, {
        description: "You can now track this lead in the Tasks module.",
      });
    } catch (error) {
      toast.error("Failed to convert lead to task");
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    try {
      await deleteLead(lead.id);
      toast.success("Lead deleted successfully");
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
    // Handle both new multiple projects and old single project
    let projectIds: string[] = [];
    
    if (assignedProjects && assignedProjects.length > 0) {
      projectIds = assignedProjects;
    } else if (assignedProject && assignedProject !== 'none') {
      projectIds = [assignedProject];
    }
    
    if (projectIds.length === 0) {
      return '-';
    }
    
    const projectNames = projectIds
      .map(id => projects.find(p => p.id === id)?.name)
      .filter(name => name);
    
    if (projectNames.length === 0) {
      return '-';
    }
    
    if (projectNames.length === 1) {
      return projectNames[0];
    }
    
    if (projectNames.length <= 2) {
      return projectNames.join(', ');
    }
    
    return `${projectNames[0]} +${projectNames.length - 1} more`;
  };

  const handleStatusChange = async (leadId: string, newStatus: Lead["status"]) => {
    try {
      await updateLead(leadId, { status: newStatus });
      toast.success("Lead status updated");
    } catch (error) {
      // Error already shown by DataContext
    }
  };

  const handleImportLeads = async (importedLeads: Partial<Lead>[]) => {
    for (const leadData of importedLeads) {
      try {
        await addLead({
          ...(leadData as Lead),
          notes: [],
          createdBy: user?.id || "unknown",
        });
      } catch (error) {
        // Continue with next lead
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-field w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            <ExcelImportExport leads={filteredLeads} onImport={handleImportLeads} />
            {someSelected && canDelete && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedIds.size})
              </Button>
            )}
          </div>
          {canCreate && (
            <Button onClick={() => setIsFormOpen(true)} className="btn-accent shrink-0 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredLeads.map((lead, index) => (
          <div
            key={lead.id}
            className="glass-card rounded-xl p-4 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{lead.name}</p>
                <p className="text-xs text-muted-foreground capitalize truncate">{lead.source || "Direct"}</p>
              </div>
              <LeadStatusChip status={lead.status} />
            </div>
            {!isManagerView && (
              <div className="grid grid-cols-1 gap-2 text-sm mb-3">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="truncate">{lead.phone}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{lead.email}</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 gap-2">
              <span className="truncate">{getProjectNames(lead.assignedProjects, lead.assignedProject)}</span>
              {!isManagerView && <span className="shrink-0">{formatBudget(lead.budgetMin, lead.budgetMax)}</span>}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="flex-1 min-w-[70px]" onClick={() => setViewingLead(lead)}>
                <Eye className="w-3.5 h-3.5 mr-1" />
                View
              </Button>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-[70px]"
                  onClick={() => {
                    setEditingLead(lead);
                    setIsFormOpen(true);
                  }}
                >
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
              )}
              {canConvert && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 min-w-[100px]"
                  onClick={() => handleConvertToTask(lead)}
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1" />
                  Convert
                </Button>
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
              {!isManagerView && <TableHead className="font-semibold">Phone</TableHead>}
              {!isManagerView && <TableHead className="font-semibold">Contact</TableHead>}
              {!isManagerView && <TableHead className="font-semibold">Requirement</TableHead>}
              <TableHead className="font-semibold">Budget</TableHead>
              <TableHead className="font-semibold">Project</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Created By</TableHead>
              {!isManagerView && <TableHead className="font-semibold">Follow-up</TableHead>}
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
                    {!isManagerView && (
                      <p className="text-xs text-muted-foreground capitalize">{lead.source || "Direct"}</p>
                    )}
                  </div>
                </TableCell>
                {!isManagerView && (
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      {lead.phone}
                    </div>
                  </TableCell>
                )}
                {!isManagerView && (
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      {lead.email}
                    </div>
                  </TableCell>
                )}
                {!isManagerView && (
                  <TableCell>
                    <div>
                      <p className="text-sm capitalize">{lead.requirementType}</p>
                      <p className="text-xs text-muted-foreground">{lead.bhkRequirement} BHK</p>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <p className="text-sm font-medium">{formatBudget(lead.budgetMin, lead.budgetMax)}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium">{getProjectNames(lead.assignedProjects, lead.assignedProject)}</p>
                </TableCell>
                <TableCell>
                  <Select value={lead.status} onValueChange={(value) => handleStatusChange(lead.id, value as Lead["status"])}>
                    <SelectTrigger className="w-36 h-8">
                      <LeadStatusChip status={lead.status} />
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
                  <StaffProfileChip userId={lead.createdBy} showDetails={!isManagerView} />
                </TableCell>
                {!isManagerView && (
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
                )}
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
                      {canConvert && (
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

      <LeadFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingLead(null);
        }}
        onSave={handleSaveLead}
        lead={editingLead}
        projects={projects}
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
              Are you sure you want to delete {selectedIds.size} lead(s)? This action cannot be undone.
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
    </div>
  );
}
