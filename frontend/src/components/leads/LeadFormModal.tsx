import { useState, useEffect } from 'react';
import { Lead, LeadStatus, RequirementType, LeadSource, Project } from '@/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LeadFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (lead: Partial<Lead>) => void;
  lead?: Lead | null;
  projects: Project[];
}

export default function LeadFormModal({ open, onClose, onSave, lead, projects }: LeadFormModalProps) {
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
    source: 'website' as LeadSource,
    status: 'new' as LeadStatus,
    followUpDate: null as Date | null,
    assignedProject: 'none' as string,
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (lead) {
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
        source: lead.source || 'website',
        status: lead.status,
        followUpDate: lead.followUpDate || null,
        assignedProject: lead.assignedProject || 'none',
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
        status: 'new',
        followUpDate: null,
        assignedProject: 'none',
      });
    }
  }, [lead, open]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate reminder status requires follow-up date
    if (formData.status === 'reminder' && !formData.followUpDate) {
      toast.error('Please select a reminder date');
      setIsDatePickerOpen(true);
      return;
    }

    onSave({
      ...formData,
      assignedProject: formData.assignedProject === 'none' ? undefined : formData.assignedProject,
      followUpDate: formData.followUpDate || undefined,
    });
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
                onValueChange={(value: LeadSource) => setFormData({ ...formData, source: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned Project</Label>
            <Select
              value={formData.assignedProject}
              onValueChange={(value) => setFormData({ ...formData, assignedProject: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} - {project.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" className="btn-primary">
              {lead ? 'Update Lead' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
