import { Project } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Calendar, DollarSign, Home, Landmark, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProjectDetailsModalProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  planning: 'bg-info/15 text-info border-info/30',
  active: 'bg-success/15 text-success border-success/30',
  on_hold: 'bg-warning/15 text-warning border-warning/30',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function ProjectDetailsModal({ project, open, onClose }: ProjectDetailsModalProps) {
  if (!project) return null;

  const formatPrice = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          {/* Hero Image */}
          <div className="relative h-48 md:h-64 overflow-hidden">
            <img
              src={project.coverImage || project.photos?.[0] || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'}
              alt={project.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to default image if the image fails to load
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <Badge 
              className={cn(
                "absolute top-4 right-4 capitalize border",
                statusColors[project.status]
              )}
            >
              {project.status}
            </Badge>
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-2xl font-bold text-white mb-1">{project.name}</h2>
              <div className="flex items-center gap-1 text-white/80 text-sm">
                <MapPin className="w-4 h-4" />
                {project.location || 'Location not specified'}
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-6">
            {/* Price & Type */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-muted-foreground" />
                <span className="capitalize font-medium">{project.type}</span>
              </div>
              <div className="flex items-center gap-1 text-xl font-bold text-primary">
                <DollarSign className="w-5 h-5" />
                {formatPrice(project.priceMin)} - {formatPrice(project.priceMax)}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{project.description}</p>
            </div>

            {/* Tower Details */}
            {project.towerDetails && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Tower Details
                </h3>
                <p className="text-muted-foreground">{project.towerDetails}</p>
              </div>
            )}

            {/* Amenities */}
            <div>
              <h3 className="font-semibold mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {project.amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Nearby Landmarks */}
            {project.nearbyLandmarks && project.nearbyLandmarks.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Landmark className="w-4 h-4" />
                  Nearby Landmarks
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.nearbyLandmarks.map((landmark) => (
                    <Badge key={landmark} variant="outline">
                      {landmark}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="flex flex-wrap gap-6 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Launch:</span>
                <span className="font-medium">{format(project.launchDate, 'MMM yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Possession:</span>
                <span className="font-medium">{format(project.possessionDate, 'MMM yyyy')}</span>
              </div>
            </div>

            {/* Photos Gallery */}
            {project.photos && project.photos.length > 1 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Gallery
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {project.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`${project.name} ${index + 1}`}
                      className="w-full h-24 md:h-32 object-cover rounded-lg"
                      onError={(e) => {
                        // Hide broken images
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
