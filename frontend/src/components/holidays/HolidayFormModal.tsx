import { useState, useEffect, useRef } from 'react';
import { Holiday } from '@/types';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Save, X, Upload, Image as ImageIcon } from 'lucide-react';

interface HolidayFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (holiday: Omit<Holiday, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => void;
  holiday?: Holiday | null;
}

export default function HolidayFormModal({
  open,
  onClose,
  onSubmit,
  holiday,
}: HolidayFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    holiday_type: 'company' as Holiday['holiday_type'],
    description: '',
    is_recurring: false,
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (holiday) {
        setFormData({
          name: holiday.name,
          start_date: holiday.start_date?.toISOString().split('T')[0] || holiday.date.toISOString().split('T')[0],
          end_date: holiday.end_date?.toISOString().split('T')[0] || '',
          holiday_type: holiday.holiday_type,
          description: holiday.description,
          is_recurring: holiday.is_recurring,
        });
        if (holiday.image && typeof holiday.image === 'string') {
          setImagePreview(holiday.image);
        }
      } else {
        setFormData({
          name: '',
          start_date: '',
          end_date: '',
          holiday_type: 'company',
          description: '',
          is_recurring: false,
        });
        setSelectedImage(null);
        setImagePreview(null);
      }
    }
  }, [open, holiday]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.start_date) {
      return;
    }

    // Validate end date is after start date
    if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) {
      alert('End date must be after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      const holidayData: any = {
        name: formData.name,
        start_date: new Date(formData.start_date),
        end_date: formData.end_date ? new Date(formData.end_date) : undefined,
        date: new Date(formData.start_date), // Backward compatibility
        holiday_type: formData.holiday_type,
        description: formData.description,
        is_recurring: formData.is_recurring,
        created_by: '',
        created_at: new Date(),
        updated_at: new Date(),
      };

      if (selectedImage) {
        holidayData.image = selectedImage;
      }

      await onSubmit(holidayData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getHolidayTypeLabel = (type: string) => {
    switch (type) {
      case 'national': return 'National Holiday';
      case 'religious': return 'Religious Holiday';
      case 'company': return 'Company Holiday';
      case 'optional': return 'Optional Holiday';
      default: return 'Company Holiday';
    }
  };

  const getHolidayTypeColor = (type: string) => {
    switch (type) {
      case 'national': return 'text-red-600 bg-red-50 border-red-200';
      case 'religious': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'company': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'optional': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {holiday ? 'Edit Holiday' : 'Add New Holiday'}
          </DialogTitle>
          <DialogDescription>
            {holiday ? 'Update holiday details' : 'Create a new holiday entry'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Holiday Name *</Label>
            <Input
              id="name"
              placeholder="e.g., New Year's Day"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="input-field"
                min={formData.start_date}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Holiday Type</Label>
            <Select
              value={formData.holiday_type}
              onValueChange={(value: Holiday['holiday_type']) => 
                setFormData({ ...formData, holiday_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="national">National Holiday</SelectItem>
                <SelectItem value="religious">Religious Holiday</SelectItem>
                <SelectItem value="company">Company Holiday</SelectItem>
                <SelectItem value="optional">Optional Holiday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description or notes"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="input-field resize-none"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Holiday Image (Optional)</Label>
            <div className="space-y-3">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Holiday preview"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">Upload holiday image</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Image
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="recurring" className="font-medium">Recurring Holiday</Label>
              <p className="text-xs text-muted-foreground">Repeats every year on the same date</p>
            </div>
            <Switch
              id="recurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="btn-primary" disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : (holiday ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}