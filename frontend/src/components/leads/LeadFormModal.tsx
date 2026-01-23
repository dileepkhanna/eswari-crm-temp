import { useState, useEffect } from 'react';
import { Lead, LeadStatus, RequirementType, LeadSource, Project, User } from '@/types';
import { useAuth } from '@/contexts/AuthContextDjango';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface LeadFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (lead: Partial<Lead>) => void;
  lead?: Lead | null;
  projects: Project[];
  employees?: User[]; // Add employees prop for assignment
  showAssignment?: boolean; // Control whether to show assignment section
}

export default function LeadFormModal({ open, onClose, onSave, lead, projects, employees = [], showAssignment = true }: LeadFormModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    requirementType: 'apartment' as RequirementType,
    bhkRequirement: '2' as '1' | '2' | '3' | '4' | '5+',
    budgetMin: 0,
    budgetMax: 0,
    description: '',
    preferredLocation: '',
    source: 'website' as LeadSource | 'custom',
    customSource: '', // Add custom source field
    status: 'new' as LeadStatus,
    followUpDate: null as Date | null,
    assignedTo: '', // Add employee assignment
    assignedProjects: [] as string[], // Changed to array for multiple projects
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper functions for project selection
  const handleProjectToggle = (projectId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedProjects: prev.assignedProjects.includes(projectId)
        ? prev.assignedProjects.filter(id => id !== projectId)
        : [...prev.assignedProjects, projectId]
    }));
  };

  const removeProject = (projectId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedProjects: prev.assignedProjects.filter(id => id !== projectId)
    }));
  };

  const clearAllProjects = () => {
    setFormData(prev => ({
      ...prev,
      assignedProjects: []
    }));
  };

  useEffect(() => {
    if (lead) {
      // Check if the lead source is one of the predefined values
      const isStandardSource = ['call', 'walk_in', 'website', 'referral', 'customer_conversion'].includes(lead.source || '');
      
      // Handle both old single project and new multiple projects format
      let assignedProjects: string[] = [];
      if (lead.assignedProjects && Array.isArray(lead.assignedProjects)) {
        assignedProjects = lead.assignedProjects;
      } else if (lead.assignedProject && lead.assignedProject !== 'none') {
        assignedProjects = [lead.assignedProject];
      }
      
      setFormData({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        requirementType: lead.requirementType,
        bhkRequirement: lead.bhkRequirement,
        budgetMin: lead.budgetMin,
        budgetMax: lead.budgetMax,
        description: lead.description,
        preferredLocation: lead.preferredLocation || '',
        source: isStandardSource ? (lead.source as LeadSource) : 'custom',
        customSource: isStandardSource ? '' : (lead.source || ''),
        status: lead.status,
        followUpDate: lead.followUpDate || null,
        assignedTo: lead.assignedTo || undefined,
        assignedProjects: assignedProjects,
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        requirementType: 'apartment',
        bhkRequirement: '2',
        budgetMin: 0,
        budgetMax: 0,
        description: '',
        preferredLocation: '',
        source: 'website',
        customSource: '',
        status: 'new',
        followUpDate: null,
        assignedTo: user?.role === 'employee' ? user.id : undefined, // Auto-assign to employee when they create leads
        assignedProjects: [],
      });
    }
  }, [lead, open, user]);

  const handleStatusChange = (value: LeadStatus) => {
    setFormData({ ...formData, status: value });
    // Auto-open date picker for follow-up when reminder is selected
    if (value === 'reminder') {
      setTimeout(() => setIsDatePickerOpen(true), 100);
    }
    // Clear follow-up date if not reminder status
    if (value !== 'reminder') {
      setFormData(prev => ({ ...prev, status: value, followUpDate: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return; // Prevent multiple submissions

    // Validate reminder status requires follow-up date
    if (formData.status === 'reminder' && !formData.followUpDate) {
      toast.error('Please select a reminder date');
      setIsDatePickerOpen(true);
      return;
    }

    // Validate custom source if selected
    if (formData.source === 'custom' && !formData.customSource.trim()) {
      toast.error('Please enter a custom lead source');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare the final source value
      const finalSource = formData.source === 'custom' ? formData.customSource.trim() : formData.source;

      await onSave({
        ...formData,
        source: finalSource as LeadSource,
        assignedProjects: formData.assignedProjects.length > 0 ? formData.assignedProjects : undefined,
        // Keep backward compatibility
        assignedProject: formData.assignedProjects.length > 0 ? formData.assignedProjects[0] : undefined,
        followUpDate: formData.followUpDate || undefined,
      });
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {lead ? 'Edit Lead' : 'Create New Lead'}
          </DialogTitle>
          <DialogDescription>
            {lead ? 'Update lead information and requirements' : 'Add a new potential customer to your pipeline'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                maxLength={15}
                required
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Lead Source</Label>
              <Select
                value={formData.source}
                onValueChange={(value: LeadSource | 'custom') => {
                  setFormData({ ...formData, source: value });
                  // Clear custom source when switching away from custom
                  if (value !== 'custom') {
                    setFormData(prev => ({ ...prev, source: value, customSource: '' }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="customer_conversion">Customer Conversion</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Custom source input field */}
              {formData.source === 'custom' && (
                <div className="mt-2">
                  <Input
                    placeholder="Enter custom lead source"
                    value={formData.customSource}
                    onChange={(e) => setFormData({ ...formData, customSource: e.target.value })}
                    className="input-field"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Examples: "Facebook Ad", "Trade Show", "Partner Company", "LinkedIn", "Google Ads"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Employee Assignment Section - Only for Managers when showAssignment is true */}
          {showAssignment && user?.role === 'manager' && (
            <div className="space-y-2">
              <Label>Assign to Employee</Label>
              <Select 
                value={formData.assignedTo || "unassigned"} 
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value === "unassigned" ? undefined : value })}
              >
                <SelectTrigger className="input-field">
                  <SelectValue placeholder="Select employee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">No Assignment</SelectItem>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} ({employee.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign this lead to a specific employee. If assigned, only the assigned employee, managers, and admins can see this lead.
              </p>
            </div>
          )}

          {/* Employee Assignment Info - Only for Employees when showAssignment is true */}
          {showAssignment && user?.role === 'employee' && (
            <div className="space-y-2">
              <Label>Lead Assignment</Label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  This lead will be assigned to you: <span className="font-medium text-foreground">{user.name}</span>
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Assigned Projects</Label>
            <div className="space-y-3">
              {/* Selected Projects Display */}
              {formData.assignedProjects.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Selected Projects ({formData.assignedProjects.length})</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAllProjects}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.assignedProjects.map(projectId => {
                      const project = projects.find(p => p.id === projectId);
                      return project ? (
                        <Badge key={projectId} variant="secondary" className="flex items-center gap-1">
                          <span className="text-xs">{project.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProject(projectId)}
                            className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              
              {/* Project Selection */}
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Available Projects ({projects.length})
                  </div>
                  {projects.length > 0 ? (
                    projects.map((project) => (
                      <div key={project.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`project-${project.id}`}
                          checked={formData.assignedProjects.includes(project.id)}
                          onCheckedChange={() => handleProjectToggle(project.id)}
                        />
                        <Label
                          htmlFor={`project-${project.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          <div>
                            <div className="font-medium">{project.name}</div>
                            <div className="text-xs text-muted-foreground">{project.location}</div>
                          </div>
                        </Label>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No projects available
                    </div>
                  )}
                </div>
              </div>
              
              {formData.assignedProjects.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Select one or more projects to assign to this lead (optional)
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Requirement Type</Label>
              <Select
                value={formData.requirementType}
                onValueChange={(value: RequirementType) => setFormData({ ...formData, requirementType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="plot">Plot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>BHK Requirement</Label>
              <Select
                value={formData.bhkRequirement}
                onValueChange={(value: '1' | '2' | '3' | '4' | '5+') => setFormData({ ...formData, bhkRequirement: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 BHK</SelectItem>
                  <SelectItem value="2">2 BHK</SelectItem>
                  <SelectItem value="3">3 BHK</SelectItem>
                  <SelectItem value="4">4 BHK</SelectItem>
                  <SelectItem value="5+">5+ BHK</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue />
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
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgetMin">Minimum Budget ($)</Label>
              <Input
                id="budgetMin"
                type="number"
                value={formData.budgetMin}
                onChange={(e) => setFormData({ ...formData, budgetMin: parseInt(e.target.value) || 0 })}
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetMax">Maximum Budget ($)</Label>
              <Input
                id="budgetMax"
                type="number"
                value={formData.budgetMax}
                onChange={(e) => setFormData({ ...formData, budgetMax: parseInt(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preferredLocation">Preferred Location</Label>
              <Input
                id="preferredLocation"
                value={formData.preferredLocation}
                onChange={(e) => setFormData({ ...formData, preferredLocation: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label>Follow-up Date {formData.status === 'reminder' && <span className="text-destructive">*</span>}</Label>
              <div className="flex gap-2">
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !formData.followUpDate && "text-muted-foreground"
                      )}
                      disabled={formData.status !== 'reminder'}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.followUpDate ? format(formData.followUpDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.followUpDate || undefined}
                      onSelect={(date) => {
                        setFormData({ ...formData, followUpDate: date || null });
                        setIsDatePickerOpen(false);
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {formData.followUpDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, followUpDate: null })}
                    className="px-3"
                  >
                    Remove
                  </Button>
                )}
              </div>
              {formData.status === 'reminder' && !formData.followUpDate && (
                <p className="text-xs text-destructive">
                  Please select a reminder date
                </p>
              )}
              {formData.followUpDate && (
                <p className="text-xs text-muted-foreground">
                  Reminder will appear in your dashboard on {format(formData.followUpDate, "MMMM d, yyyy")}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description / Notes</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {lead ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                lead ? 'Update Lead' : 'Create Lead'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
