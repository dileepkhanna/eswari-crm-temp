import { useState } from 'react';
import { Project } from '@/types';
import ProjectCard from './ProjectCard';
import ProjectListItem from './ProjectListItem';
import ProjectFormModal from './ProjectFormModal';
import ProjectDetailsModal from './ProjectDetailsModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Plus, LayoutGrid, List, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/contexts/DataContextDjango';
import { useAuth } from '@/contexts/AuthContextDjango';

interface ProjectListProps {
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const locations = ['Vizag', 'Gajuwaka', 'Kakinada', 'Rajamundry', 'Vijayawada'];

export default function ProjectList({ canCreate = false, canEdit = false, canDelete = false }: ProjectListProps) {
  const { user } = useAuth();
  const { projects, loading, addProject, updateProject, deleteProject } = useData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('projects-view-mode');
    return (saved as 'grid' | 'list') || 'grid';
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesType = typeFilter === 'all' || project.type === typeFilter;
    const matchesLocation = locationFilter === 'all' || 
      project.location.toLowerCase().includes(locationFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesType && matchesLocation;
  });

  const allSelected = filteredProjects.length > 0 && filteredProjects.every(p => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map(p => p.id)));
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
        await deleteProject(id);
      }
      toast.success(`${selectedIds.size} project(s) deleted successfully`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error('Failed to delete some projects');
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectId) return;
    try {
      await deleteProject(deleteProjectId);
      toast.success('Project deleted successfully');
      setDeleteProjectId(null);
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const handleAddProject = async (projectData: Omit<Project, 'id' | 'createdAt'>) => {
    try {
      await addProject({
        ...projectData,
        createdBy: user?.id || 'system',
      } as any);
      toast.success('Project added successfully!');
    } catch (error) {
      // Error already shown by DataContext
    }
  };

  const handleEditProject = async (projectData: Omit<Project, 'id' | 'createdAt'>) => {
    if (editingProject) {
      try {
        await updateProject(editingProject.id, projectData);
        toast.success('Project updated successfully!');
        setEditingProject(null);
      } catch (error) {
        // Error already shown by DataContext
      }
    }
  };

  const handleViewProject = (project: Project) => {
    setViewingProject(project);
  };

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (project: Project) => {
    setDeleteProjectId(project.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-field w-full"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="plots">Plots</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden bg-background shadow-sm">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-none h-8 px-3 text-xs hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setViewMode('grid');
                  localStorage.setItem('projects-view-mode', 'grid');
                }}
              >
                <LayoutGrid className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-none h-8 px-3 text-xs hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setViewMode('list');
                  localStorage.setItem('projects-view-mode', 'list');
                }}
              >
                <List className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">List</span>
              </Button>
            </div>

            {/* Select All Checkbox */}
            {canDelete && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Select All
                </span>
              </div>
            )}

            {/* Bulk Delete Button */}
            {someSelected && canDelete && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Delete </span>
                ({selectedIds.size})
              </Button>
            )}
          </div>

          {/* Add Project Button */}
          {canCreate && (
            <Button 
              className="btn-accent" 
              size="sm"
              onClick={() => { setEditingProject(null); setIsFormOpen(true); }}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Project</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
        </div>
      </div>

      {/* Projects Display */}
      <div className="transition-all duration-300 ease-in-out">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in-0 duration-300">
            {filteredProjects.map((project, index) => (
              <div key={project.id} className="relative">
                {canDelete && (
                  <div className="absolute top-3 left-3 z-10">
                    <Checkbox
                      checked={selectedIds.has(project.id)}
                      onCheckedChange={() => toggleSelect(project.id)}
                      className="bg-background/80 backdrop-blur-sm"
                    />
                  </div>
                )}
                <ProjectCard 
                  project={project} 
                  delay={index * 100}
                  onView={handleViewProject}
                  onEdit={handleEditClick}
                  onDelete={canDelete ? handleDeleteClick : undefined}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in-0 duration-300">
            {filteredProjects.map((project, index) => (
              <div key={project.id} className="relative">
                {canDelete && (
                  <div className="absolute top-4 left-4 z-10">
                    <Checkbox
                      checked={selectedIds.has(project.id)}
                      onCheckedChange={() => toggleSelect(project.id)}
                      className="bg-background/80 backdrop-blur-sm"
                    />
                  </div>
                )}
                <div className={canDelete ? "ml-8" : ""}>
                  <ProjectListItem
                    project={project}
                    onView={handleViewProject}
                    onEdit={handleEditClick}
                    onDelete={canDelete ? handleDeleteClick : undefined}
                    canEdit={canEdit}
                    canDelete={canDelete}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No projects found</p>
        </div>
      )}

      {/* Add/Edit Project Modal */}
      <ProjectFormModal
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            // Delay clearing editingProject to prevent race condition
            setTimeout(() => setEditingProject(null), 200);
          }
        }}
        onSubmit={editingProject ? handleEditProject : handleAddProject}
        project={editingProject}
      />

      {/* Project Details Modal */}
      <ProjectDetailsModal
        project={viewingProject}
        open={!!viewingProject}
        onClose={() => setViewingProject(null)}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Projects</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} project(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Delete Confirmation */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}