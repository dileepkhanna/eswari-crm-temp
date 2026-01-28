import { useState, useRef, useEffect } from 'react';
import { Project, ProjectStatus } from '@/types';
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
import { Badge } from '@/components/ui/badge';
import { X, Plus, Upload, Building, MapPin, IndianRupee, Calendar, Image, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  project?: Project | null;
}

export default function ProjectFormModal({
  open,
  onOpenChange,
  onSubmit,
  project,
}: ProjectFormModalProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const blueprintInputRef = useRef<HTMLInputElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [formData, setFormData] = useState({
    name: project?.name || '',
    location: project?.location || '',
    type: project?.type || 'apartment',
    priceMin: project?.priceMin?.toString() || '',
    priceMax: project?.priceMax?.toString() || '',
    launchDate: project?.launchDate ? new Date(project.launchDate).toISOString().split('T')[0] : '',
    possessionDate: project?.possessionDate ? new Date(project.possessionDate).toISOString().split('T')[0] : '',
    description: project?.description || '',
    towerDetails: project?.towerDetails || '',
    status: project?.status || 'planning',
  });

  const [amenities, setAmenities] = useState<string[]>(project?.amenities || []);
  const [newAmenity, setNewAmenity] = useState('');
  const [nearbyLandmarks, setNearbyLandmarks] = useState<string[]>(project?.nearbyLandmarks || []);
  const [newLandmark, setNewLandmark] = useState('');
  const [coverImage, setCoverImage] = useState(project?.coverImage || '');
  const [blueprintImage, setBlueprintImage] = useState(project?.blueprintImage || '');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingBlueprint, setIsUploadingBlueprint] = useState(false);

  // Create images array for sliding gallery
  const images = [coverImage, blueprintImage].filter(Boolean);

  // Reset form when project changes or modal opens
  useEffect(() => {
    if (open) {
      if (project) {
        setFormData({
          name: project.name || '',
          location: project.location || '',
          type: project.type || 'apartment',
          priceMin: project.priceMin?.toString() || '',
          priceMax: project.priceMax?.toString() || '',
          launchDate: project.launchDate ? new Date(project.launchDate).toISOString().split('T')[0] : '',
          possessionDate: project.possessionDate ? new Date(project.possessionDate).toISOString().split('T')[0] : '',
          description: project.description || '',
          towerDetails: project.towerDetails || '',
          status: project.status || 'planning',
        });
        setAmenities(project.amenities || []);
        setNearbyLandmarks(project.nearbyLandmarks || []);
        setCoverImage(project.coverImage || '');
        setBlueprintImage(project.blueprintImage || '');
        setCurrentImageIndex(0);
      } else {
        setFormData({
          name: '',
          location: '',
          type: 'apartment',
          priceMin: '',
          priceMax: '',
          launchDate: '',
          possessionDate: '',
          description: '',
          towerDetails: '',
          status: 'planning',
        });
        setAmenities([]);
        setNearbyLandmarks([]);
        setCoverImage('');
        setBlueprintImage('');
        setCurrentImageIndex(0);
      }
    }
  }, [project, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.location || !formData.priceMin || !formData.priceMax || !formData.launchDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    onSubmit({
      name: formData.name,
      location: formData.location,
      type: formData.type as 'villa' | 'apartment' | 'plots',
      priceMin: parseFloat(formData.priceMin),
      priceMax: parseFloat(formData.priceMax),
      launchDate: new Date(formData.launchDate),
      possessionDate: formData.possessionDate ? new Date(formData.possessionDate) : undefined,
      amenities,
      description: formData.description,
      towerDetails: formData.towerDetails,
      nearbyLandmarks,
      coverImage,
      blueprintImage,
      status: formData.status as ProjectStatus,
    });

    onOpenChange(false);
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !amenities.includes(newAmenity.trim())) {
      setAmenities([...amenities, newAmenity.trim()]);
      setNewAmenity('');
    }
  };

  const removeAmenity = (amenity: string) => {
    setAmenities(amenities.filter(a => a !== amenity));
  };

  const addLandmark = () => {
    if (newLandmark.trim() && !nearbyLandmarks.includes(newLandmark.trim())) {
      setNearbyLandmarks([...nearbyLandmarks, newLandmark.trim()]);
      setNewLandmark('');
    }
  };

  const removeLandmark = (landmark: string) => {
    setNearbyLandmarks(nearbyLandmarks.filter(l => l !== landmark));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    setIsUploadingCover(true);
    try {
      const { apiClient } = await import('@/lib/api');
      const uploadResult = await apiClient.uploadCoverImage(file);
      
      setCoverImage(uploadResult.url);
      toast.success('Cover image uploaded successfully');
    } catch (error) {
      console.error('Error uploading cover image:', error);
      toast.error('Failed to upload cover image');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleBlueprintUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    setIsUploadingBlueprint(true);
    try {
      const { apiClient } = await import('@/lib/api');
      const uploadResult = await apiClient.uploadBlueprintImage(file);
      
      setBlueprintImage(uploadResult.url);
      toast.success('Blueprint image uploaded successfully');
    } catch (error) {
      console.error('Error uploading blueprint image:', error);
      toast.error('Failed to upload blueprint image');
    } finally {
      setIsUploadingBlueprint(false);
      if (blueprintInputRef.current) blueprintInputRef.current.value = '';
    }
  };

  const nextImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building className="w-5 h-5 text-primary" />
            {project ? 'Edit Project' : 'Add New Project'}
          </DialogTitle>
          <DialogDescription>
            {project ? 'Update project details and specifications' : 'Create a new real estate project'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <form onSubmit={handleSubmit} className="space-y-6 mt-4 pb-4">
          {/* Image Gallery Section */}
          {images.length > 0 && (
            <div className="space-y-3">
              <Label>Project Images</Label>
              <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                <img
                  src={images[currentImageIndex]}
                  alt={`Project image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800';
                  }}
                />
                
                {/* Navigation arrows */}
                {images.length > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                      onClick={nextImage}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </>
                )}

                {/* Image indicators */}
                {images.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                )}

                {/* Image type badges */}
                <div className="absolute top-2 left-2 flex gap-2">
                  {images[currentImageIndex] === coverImage && (
                    <Badge className="bg-primary text-xs">Cover Image</Badge>
                  )}
                  {images[currentImageIndex] === blueprintImage && (
                    <Badge className="bg-blue-500 text-xs">Blueprint</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Image Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cover Image Upload */}
            <div className="space-y-3">
              <Label>Cover/Project Image</Label>
              <p className="text-sm text-muted-foreground">Main project image for display</p>
              <div className="flex gap-2">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="flex-1"
                >
                  {isUploadingCover ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isUploadingCover ? 'Uploading...' : 'Upload Cover Image'}
                </Button>
              </div>
              {coverImage && (
                <div className="relative aspect-video rounded-lg overflow-hidden border max-w-xs">
                  <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                  <Badge className="absolute top-2 left-2 bg-primary text-xs">Cover</Badge>
                </div>
              )}
            </div>

            {/* Blueprint Image Upload */}
            <div className="space-y-3">
              <Label>Blueprint Image</Label>
              <p className="text-sm text-muted-foreground">Architectural plan or blueprint</p>
              <div className="flex gap-2">
                <input
                  ref={blueprintInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBlueprintUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => blueprintInputRef.current?.click()}
                  disabled={isUploadingBlueprint}
                  className="flex-1"
                >
                  {isUploadingBlueprint ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isUploadingBlueprint ? 'Uploading...' : 'Upload Blueprint'}
                </Button>
              </div>
              {blueprintImage && (
                <div className="relative aspect-video rounded-lg overflow-hidden border max-w-xs">
                  <img src={blueprintImage} alt="Blueprint" className="w-full h-full object-cover" />
                  <Badge className="absolute top-2 left-2 bg-blue-500 text-xs">Blueprint</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Skyline Towers"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="e.g., Downtown Financial District"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="pl-10 input-field"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Property Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'apartment' | 'villa' | 'plots') => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="plots">Plots</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: ProjectStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="towerDetails">Tower/Building Details</Label>
              <Input
                id="towerDetails"
                placeholder="e.g., 3 Towers, 45 floors each"
                value={formData.towerDetails}
                onChange={(e) => setFormData({ ...formData, towerDetails: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priceMin">Minimum Price (₹) *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="priceMin"
                  type="number"
                  placeholder="e.g., 4500000"
                  value={formData.priceMin}
                  onChange={(e) => setFormData({ ...formData, priceMin: e.target.value })}
                  className="pl-10 input-field"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceMax">Maximum Price (₹) *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="priceMax"
                  type="number"
                  placeholder="e.g., 12000000"
                  value={formData.priceMax}
                  onChange={(e) => setFormData({ ...formData, priceMax: e.target.value })}
                  className="pl-10 input-field"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="launchDate">Launch Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="launchDate"
                  type="date"
                  required
                  value={formData.launchDate}
                  onChange={(e) => setFormData({ ...formData, launchDate: e.target.value })}
                  className="pl-10 input-field"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="possessionDate">Possession Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="possessionDate"
                  type="date"
                  value={formData.possessionDate}
                  onChange={(e) => setFormData({ ...formData, possessionDate: e.target.value })}
                  className="pl-10 input-field"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the project features, highlights, and unique selling points..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="input-field resize-none"
            />
          </div>

          {/* Amenities */}
          <div className="space-y-3">
            <Label>Amenities</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add amenity (e.g., Swimming Pool)"
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                className="input-field flex-1"
              />
              <Button type="button" variant="secondary" onClick={addAmenity}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {amenities.map((amenity) => (
                <Badge key={amenity} variant="secondary" className="gap-1 px-3 py-1">
                  {amenity}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors"
                    onClick={() => removeAmenity(amenity)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Nearby Landmarks */}
          <div className="space-y-3">
            <Label>Nearby Landmarks</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add landmark (e.g., Central Mall)"
                value={newLandmark}
                onChange={(e) => setNewLandmark(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLandmark())}
                className="input-field flex-1"
              />
              <Button type="button" variant="secondary" onClick={addLandmark}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {nearbyLandmarks.map((landmark) => (
                <Badge key={landmark} variant="secondary" className="gap-1 px-3 py-1">
                  {landmark}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors"
                    onClick={() => removeLandmark(landmark)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="btn-primary">
              {project ? 'Update Project' : 'Add Project'}
            </Button>
          </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
