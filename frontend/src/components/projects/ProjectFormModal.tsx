import { useState, useRef, useEffect } from 'react';
import { Project, ProjectStatus } from '@/types';
import { apiClient, getMediaUrl } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { 
  XIcon, 
  PlusIcon, 
  UploadIcon, 
  BuildingIcon, 
  MapPinIcon, 
  CurrencyIcon, 
  CalendarIcon, 
  LoaderIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon 
} from '@/components/icons';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
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
  const lastProjectIdRef = useRef<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    type: 'apartment' as 'apartment' | 'villa' | 'plots',
    priceMin: '',
    priceMax: '',
    launchDate: '',
    possessionDate: '',
    description: '',
    towerDetails: '',
    status: 'pre_launch' as ProjectStatus,
  });

  const [amenities, setAmenities] = useState<string[]>(project?.amenities || []);
  const [newAmenity, setNewAmenity] = useState('');
  const [nearbyLandmarks, setNearbyLandmarks] = useState<string[]>(project?.nearbyLandmarks || []);
  const [newLandmark, setNewLandmark] = useState('');
  const [coverImage, setCoverImage] = useState(project?.coverImage || '');
  const [blueprintImage, setBlueprintImage] = useState(project?.blueprintImage || '');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [blueprintImageUrl, setBlueprintImageUrl] = useState('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingBlueprint, setIsUploadingBlueprint] = useState(false);
  const [availabilityText, setAvailabilityText] = useState(project?.availability || '');

  // Create images array for sliding gallery
  const images = [coverImage, blueprintImage].filter(Boolean);

  // Reset form when project changes or modal opens
  useEffect(() => {
    if (open) {
      const currentProjectId = project?.id || null;
      
      // Only reset form if project ID actually changed or modal just opened
      if (lastProjectIdRef.current !== currentProjectId) {
        lastProjectIdRef.current = currentProjectId;
        
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
            status: project.status || 'pre_launch',
          });
          setAmenities(project.amenities || []);
          setNearbyLandmarks(project.nearbyLandmarks || []);
          setCoverImage(getMediaUrl(project.coverImage || ''));
          setBlueprintImage(getMediaUrl(project.blueprintImage || ''));
          setCoverImageUrl('');
          setBlueprintImageUrl('');
          setAvailabilityText(project.availability || '');
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
            status: 'pre_launch',
          });
          setAmenities([]);
          setNearbyLandmarks([]);
          setCoverImage('');
          setBlueprintImage('');
          setCoverImageUrl('');
          setBlueprintImageUrl('');
          setAvailabilityText('');
        }
        setCurrentImageIndex(0);
      }
    } else {
      // Reset the ref when modal closes
      lastProjectIdRef.current = null;
    }
  }, [project, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.location || !formData.priceMin || !formData.priceMax || !formData.launchDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const projectToSubmit = {
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
      availability: availabilityText,
    };

    logger.log('🔍 Submitting project with availability:', availabilityText);
    logger.log('🔍 Full project data:', projectToSubmit);

    onSubmit(projectToSubmit);

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

  const handleCoverUrlSubmit = () => {
    if (coverImageUrl.trim()) {
      const fullImageUrl = getMediaUrl(coverImageUrl.trim());
      setCoverImage(fullImageUrl);
      setCoverImageUrl('');
      toast.success('Cover image URL added successfully');
    }
  };

  const handleBlueprintUrlSubmit = () => {
    if (blueprintImageUrl.trim()) {
      const fullImageUrl = getMediaUrl(blueprintImageUrl.trim());
      setBlueprintImage(fullImageUrl);
      setBlueprintImageUrl('');
      toast.success('Blueprint image URL added successfully');
    }
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
      // Use the existing apiClient instance instead of dynamic import
      const uploadResult = await apiClient.uploadCoverImage(file);
      
      logger.log('Cover upload successful:', uploadResult);
      // Apply getMediaUrl to ensure proper URL formatting
      const fullImageUrl = getMediaUrl(uploadResult.url);
      setCoverImage(fullImageUrl);
      toast.success('Cover image uploaded successfully');
    } catch (error: any) {
      logger.error('Error uploading cover image:', error);
      
      // Handle specific authentication errors
      if (error.message?.includes('401') || error.message?.includes('token')) {
        toast.error('Session expired. Please refresh the page and try again.');
      } else {
        toast.error('Failed to upload cover image. Please try again.');
      }
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
      // Use the existing apiClient instance instead of dynamic import
      const uploadResult = await apiClient.uploadBlueprintImage(file);
      
      logger.log('Blueprint upload successful:', uploadResult);
      // Apply getMediaUrl to ensure proper URL formatting
      const fullImageUrl = getMediaUrl(uploadResult.url);
      setBlueprintImage(fullImageUrl);
      toast.success('Blueprint image uploaded successfully');
    } catch (error: any) {
      logger.error('Error uploading blueprint image:', error);
      
      // Handle specific authentication errors
      if (error.message?.includes('401') || error.message?.includes('token')) {
        toast.error('Session expired. Please refresh the page and try again.');
      } else {
        toast.error('Failed to upload blueprint image. Please try again.');
      }
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col project-form-modal">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BuildingIcon className="w-5 h-5 text-primary" />
            {project ? 'Edit Project' : 'Add New Project'}
          </DialogTitle>
          <DialogDescription>
            {project ? 'Update project details and specifications' : 'Create a new real estate project'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <form onSubmit={handleSubmit} className="space-y-6 mt-4 pb-4" autoComplete="off">
          {/* Image Gallery Section */}
          {images.length > 0 && (
            <div className="space-y-3">
              <Label>Project Images</Label>
              <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                <img
                  src={images[currentImageIndex]}
                  alt={`Project image ${currentImageIndex + 1}`}
                  className="w-full h-full object-contain bg-gray-50"
                  onError={(e) => {
                    logger.error('Project image failed to load:', images[currentImageIndex]);
                    // Hide the broken image and show placeholder
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.image-placeholder')) {
                      const placeholder = document.createElement('div');
                      placeholder.className = 'image-placeholder absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-600';
                      const imageType = images[currentImageIndex] === coverImage ? 'Cover Image' : 'Blueprint Image';
                      const imageIcon = images[currentImageIndex] === coverImage ? '🏢' : '📋';
                      placeholder.innerHTML = `
                        <div class="text-center p-4">
                          <div class="text-3xl mb-2">${imageIcon}</div>
                          <div class="text-lg font-medium">${imageType}</div>
                          <div class="text-sm text-gray-500 mt-1">Failed to load</div>
                        </div>
                      `;
                      parent.appendChild(placeholder);
                    }
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
                      <ChevronLeftIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                      onClick={nextImage}
                    >
                      <ChevronRightIcon className="w-4 h-4" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cover Image Upload */}
            <div className="space-y-4">
              <Label>Cover/Project Image</Label>
              <p className="text-sm text-muted-foreground">Main project image for display</p>
              
              {/* File Upload */}
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Upload from Device</Label>
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
                      <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <UploadIcon className="w-4 h-4 mr-2" />
                    )}
                    {isUploadingCover ? 'Uploading...' : 'Upload File'}
                  </Button>
                </div>
              </div>

              {/* URL Input */}
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Or Enter Image URL</Label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCoverUrlSubmit())}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCoverUrlSubmit}
                    disabled={!coverImageUrl.trim()}
                  >
                    Add URL
                  </Button>
                </div>
              </div>

              {coverImage && (
                <div className="relative aspect-video rounded-lg overflow-hidden border max-w-xs bg-gray-100">
                  <img 
                    src={coverImage} 
                    alt="Cover" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      logger.error('Cover image failed to load:', coverImage);
                      // Hide the broken image and show placeholder
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.image-placeholder')) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'image-placeholder absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-600';
                        placeholder.innerHTML = `
                          <div class="text-center p-4">
                            <div class="text-2xl mb-2">🏢</div>
                            <div class="text-sm font-medium">Cover Image</div>
                            <div class="text-xs text-gray-500 mt-1">Failed to load</div>
                          </div>
                        `;
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                  <Badge className="absolute top-2 left-2 bg-primary text-xs">Cover</Badge>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => setCoverImage('')}
                  >
                    <XIcon className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Blueprint Image Upload */}
            <div className="space-y-4">
              <Label>Blueprint Image</Label>
              <p className="text-sm text-muted-foreground">Architectural plan or blueprint</p>
              
              {/* File Upload */}
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Upload from Device</Label>
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
                      <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <UploadIcon className="w-4 h-4 mr-2" />
                    )}
                    {isUploadingBlueprint ? 'Uploading...' : 'Upload File'}
                  </Button>
                </div>
              </div>

              {/* URL Input */}
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Or Enter Image URL</Label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/blueprint.jpg"
                    value={blueprintImageUrl}
                    onChange={(e) => setBlueprintImageUrl(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleBlueprintUrlSubmit())}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBlueprintUrlSubmit}
                    disabled={!blueprintImageUrl.trim()}
                  >
                    Add URL
                  </Button>
                </div>
              </div>

              {blueprintImage && (
                <div className="relative aspect-video rounded-lg overflow-hidden border max-w-xs bg-gray-100">
                  <img 
                    src={blueprintImage} 
                    alt="Blueprint" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      logger.error('Blueprint image failed to load:', blueprintImage);
                      // Hide the broken image and show placeholder
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.image-placeholder')) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'image-placeholder absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-600';
                        placeholder.innerHTML = `
                          <div class="text-center p-4">
                            <div class="text-2xl mb-2">📋</div>
                            <div class="text-sm font-medium">Blueprint Image</div>
                            <div class="text-xs text-gray-500 mt-1">Failed to load</div>
                          </div>
                        `;
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                  <Badge className="absolute top-2 left-2 bg-blue-500 text-xs">Blueprint</Badge>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => setBlueprintImage('')}
                  >
                    <XIcon className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project-name-field">Project Name *</Label>
              <input
                id="project-name-field"
                name="project-name"
                type="text"
                placeholder="e.g., Skyline Towers"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-location-field">Location *</Label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <input
                  id="project-location-field"
                  name="project-location-field"
                  type="text"
                  placeholder="e.g., Downtown Financial District"
                  value={formData.location || ''}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, location: e.target.value }));
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm pl-10"
                  autoComplete="off"
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
                  <SelectItem value="pre_launch">Pre Launch</SelectItem>
                  <SelectItem value="launch">Launch</SelectItem>
                  <SelectItem value="under_construction">Under Construction</SelectItem>
                  <SelectItem value="mid_stage">Mid Stage</SelectItem>
                  <SelectItem value="ready_to_go">Ready to Go</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="towerDetails">Tower/Building Details</Label>
              <input
                id="towerDetails"
                name="tower-details"
                type="text"
                placeholder="e.g., 3 Towers, 45 floors each"
                value={formData.towerDetails || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, towerDetails: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priceMin">Minimum Price (₹) *</Label>
              <div className="relative">
                <CurrencyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="priceMin"
                  name="price-min"
                  type="number"
                  placeholder="e.g., 4500000"
                  value={formData.priceMin}
                  onChange={(e) => setFormData(prev => ({ ...prev, priceMin: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm pl-10"
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceMax">Maximum Price (₹) *</Label>
              <div className="relative">
                <CurrencyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="priceMax"
                  name="price-max"
                  type="number"
                  placeholder="e.g., 12000000"
                  value={formData.priceMax}
                  onChange={(e) => setFormData(prev => ({ ...prev, priceMax: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm pl-10"
                  autoComplete="off"
                  required
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="launchDate">Launch Date *</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="launchDate"
                  name="launch-date"
                  type="date"
                  value={formData.launchDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, launchDate: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm pl-10"
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="possessionDate">Possession Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="possessionDate"
                  name="possession-date"
                  type="date"
                  value={formData.possessionDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, possessionDate: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm pl-10"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="project-description"
              placeholder="Describe the project features, highlights, and unique selling points..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm resize-none"
              autoComplete="off"
            />
          </div>

          {/* Amenities */}
          <div className="space-y-3">
            <Label>Amenities</Label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add amenity (e.g., Swimming Pool)"
                value={newAmenity || ''}
                onChange={(e) => setNewAmenity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm flex-1"
                autoComplete="off"
              />
              <Button type="button" variant="secondary" onClick={addAmenity}>
                <PlusIcon className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {amenities.map((amenity, index) => (
                <Badge key={`amenity-${index}`} variant="secondary" className="gap-1 px-3 py-1">
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
              <input
                type="text"
                placeholder="Add landmark (e.g., Central Mall)"
                value={newLandmark || ''}
                onChange={(e) => setNewLandmark(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLandmark())}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm flex-1"
                autoComplete="off"
              />
              <Button type="button" variant="secondary" onClick={addLandmark}>
                <PlusIcon className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {nearbyLandmarks.map((landmark, index) => (
                <Badge key={`landmark-${index}`} variant="secondary" className="gap-1 px-3 py-1">
                  {landmark}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors"
                    onClick={() => removeLandmark(landmark)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-2">
            <Label htmlFor="availability">Flat Availability</Label>
            <textarea
              id="availability"
              name="availability"
              placeholder="e.g., Floor 1: 101-East-2BHK-Available, 102-West-3BHK-Sold&#10;Floor 2: 201-North-2BHK-Available, 202-South-3BHK-Blocked"
              value={availabilityText}
              onChange={(e) => setAvailabilityText(e.target.value)}
              rows={4}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm resize-none"
              autoComplete="off"
            />
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
