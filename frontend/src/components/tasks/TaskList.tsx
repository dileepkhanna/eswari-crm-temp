import { useMemo, useState } from "react";
import { Task, TaskStatus, Lead } from "@/types";
import { useAuth } from '@/contexts/AuthContextDjango';
import { useData } from '@/contexts/DataContextDjango';
import { canViewCustomerPhone, isManagerView as isManagerRole, canDeleteLeadsAndTasks } from '@/lib/permissions';
import TaskStatusChip from "./TaskStatusChip";
import TaskFormModal from "./TaskFormModal";
import TaskDetailsModal from "./TaskDetailsModal";
import TaskExcelImportExport from "./TaskExcelImportExport";
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
import { Search, Calendar, MoreHorizontal, Eye, Edit, Plus, Phone, Mail, Trash2 } from "lucide-react";
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

interface TaskListProps {
  canEdit?: boolean;
  canCreate?: boolean;
  isManagerView?: boolean;
}

export default function TaskList({ canEdit = true, canCreate = true, isManagerView = false }: TaskListProps) {
  const { user } = useAuth();
  const { tasks, leads, projects, addTask, updateTask, deleteTask } = useData();
  
  // Use permission utility instead of prop for phone visibility
  const canViewPhone = user ? canViewCustomerPhone(user.role) : false;
  const isManager = user ? isManagerRole(user.role) : false;
  
  // Check if user can delete tasks
  const canDelete = user ? canDeleteLeadsAndTasks(user.role) : false;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.lead.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesProject = projectFilter === "all" || task.assignedProject === projectFilter;

      let matchesDate = true;
      if (dateRange.from && dateRange.to) {
        matchesDate = isWithinInterval(new Date(task.createdAt), {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      } else if (dateRange.from) {
        matchesDate = new Date(task.createdAt) >= startOfDay(dateRange.from);
      }

      return matchesSearch && matchesStatus && matchesProject && matchesDate;
    });
  }, [tasks, searchQuery, statusFilter, projectFilter, dateRange]);

  const allSelected = filteredTasks.length > 0 && filteredTasks.every(task => selectedIds.has(task.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map(task => task.id)));
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
        await deleteTask(id);
      }
      toast.success(`${selectedIds.size} task(s) deleted successfully`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error("Failed to delete some tasks");
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
      toast.success("Task status updated");
    } catch (error) {
      // Error already shown by DataContext
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleSaveTask = async (updatedTask: Partial<Task>) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, updatedTask);
        toast.success("Task updated successfully");
      } else if (isCreating && updatedTask.lead) {
        await addTask({
          leadId: updatedTask.lead.id,
          lead: updatedTask.lead,
          status: updatedTask.status || "in_progress",
          nextActionDate: updatedTask.nextActionDate,
          notes: updatedTask.notes || [],
          attachments: updatedTask.attachments || [],
          assignedTo: updatedTask.assignedTo || user?.id || "unknown",
          assignedProject: updatedTask.assignedProject,
        });
        toast.success("Task created successfully");
      }
      setIsFormOpen(false);
      setEditingTask(null);
      setIsCreating(false);
    } catch (error) {
      // Error already shown by DataContext
    }
  };

  const handleAddTask = () => {
    setIsCreating(true);
    setEditingTask(null);
    setIsFormOpen(true);
  };

  const handleImportTasks = async (importedTasks: Partial<Task>[]) => {
    for (const taskData of importedTasks) {
      if (!taskData.lead) continue;
      try {
        await addTask({
          leadId: taskData.lead.id,
          lead: taskData.lead as Lead,
          status: taskData.status || "in_progress",
          nextActionDate: taskData.nextActionDate,
          notes: taskData.notes || [],
          attachments: taskData.attachments || [],
          assignedTo: taskData.assignedTo || user?.id || "unknown",
          assignedProject: taskData.assignedProject,
        });
      } catch (error) {
        // Continue with next task
      }
    }
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return "-";
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : "-";
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
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
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="site_visit">Site Visit</SelectItem>
                <SelectItem value="family_visit">Family Visit</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
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
            <TaskExcelImportExport tasks={filteredTasks} onImport={handleImportTasks} getProjectName={getProjectName} />
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
            <Button onClick={handleAddTask} className="btn-accent shrink-0 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          )}
        </div>
      </div>

      {/* Customer Contact Info Notice - Only for Admin/Employee */}
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredTasks.map((task, index) => (
          <div
            key={task.id}
            className="glass-card rounded-xl p-4 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">{task.lead.name}</p>
                <p className="text-xs text-muted-foreground capitalize truncate">Task</p>
              </div>
              <TaskStatusChip status={task.status} />
            </div>
            {canViewPhone && (
              <div className="grid grid-cols-1 gap-2 text-sm mb-3">
                <div className="text-muted-foreground">
                  <span className="truncate font-medium">{task.lead.phone}</span>
                </div>
                <div className="text-muted-foreground">
                  <span className="truncate font-medium">{task.lead.email}</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 text-sm mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Project</p>
                <p className="font-medium truncate">{getProjectName(task.assignedProject)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Next Action</p>
                <p className="font-medium">{task.nextActionDate ? format(task.nextActionDate, "MMM dd") : "-"}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="flex-1 min-w-[70px]" onClick={() => setViewingTask(task)}>
                <Eye className="w-3.5 h-3.5 mr-1" />
                View
              </Button>
              {canEdit && (
                <Button variant="outline" size="sm" className="flex-1 min-w-[70px]" onClick={() => handleEditTask(task)}>
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  Edit
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
              <TableHead className="font-semibold">Lead Name</TableHead>
              {canViewPhone && <TableHead className="font-semibold">Phone</TableHead>}
              {canViewPhone && <TableHead className="font-semibold">Contact</TableHead>}
              {canViewPhone && <TableHead className="font-semibold">Requirement</TableHead>}
              <TableHead className="font-semibold">Project</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Assigned To</TableHead>
              {canViewPhone && <TableHead className="font-semibold">Next Action</TableHead>}
              <TableHead className="font-semibold">Created</TableHead>
              <TableHead className="font-semibold w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map((task, index) => (
              <TableRow
                key={task.id}
                className="table-row-hover animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.has(task.id)} 
                    onCheckedChange={() => toggleSelect(task.id)}
                    aria-label={`Select ${task.lead.name}`}
                  />
                </TableCell>
                <TableCell>
                  <p className="font-medium text-foreground">{task.lead.name}</p>
                </TableCell>
                {canViewPhone && (
                  <TableCell>
                    <p className="text-sm font-medium">{task.lead.phone || '-'}</p>
                  </TableCell>
                )}
                {canViewPhone && (
                  <TableCell>
                    <p className="text-sm font-medium">{task.lead.email || '-'}</p>
                  </TableCell>
                )}
                {canViewPhone && (
                  <TableCell>
                    <div>
                      <p className="text-sm capitalize">{task.lead.requirementType}</p>
                      <p className="text-xs text-muted-foreground">{task.lead.bhkRequirement} BHK</p>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <p className="text-sm font-medium">{getProjectName(task.assignedProject)}</p>
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <Select value={task.status} onValueChange={(value: TaskStatus) => handleStatusChange(task.id, value)}>
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <TaskStatusChip status={task.status} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="site_visit">Site Visit</SelectItem>
                        <SelectItem value="family_visit">Family Visit</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <TaskStatusChip status={task.status} />
                  )}
                </TableCell>
                <TableCell>
                  <StaffProfileChip userId={task.assignedTo} showDetails={canViewPhone} />
                </TableCell>
                {canViewPhone && (
                  <TableCell>
                    {task.nextActionDate ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(task.nextActionDate, "MMM dd, yyyy")}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <p className="text-sm text-muted-foreground">{format(task.createdAt, "MMM dd, yyyy")}</p>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewingTask(task)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {canEdit && (
                    <DropdownMenuItem onClick={() => handleEditTask(task)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Task
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

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tasks found</p>
        </div>
      )}

    <TaskFormModal
      open={isFormOpen}
      onClose={() => {
        setIsFormOpen(false);
        setEditingTask(null);
        setIsCreating(false);
      }}
      onSave={handleSaveTask}
      task={editingTask}
      isCreating={isCreating}
      availableLeads={leads}
      projects={projects}
    />

    <TaskDetailsModal
      open={!!viewingTask}
      onClose={() => setViewingTask(null)}
      task={viewingTask}
      canEdit={canEdit}
      onEdit={() => {
        if (viewingTask) {
          handleEditTask(viewingTask);
        setViewingTask(null);
        }
      }}
      getProjectName={getProjectName}
    />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Tasks</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} task(s)? This action cannot be undone.
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
