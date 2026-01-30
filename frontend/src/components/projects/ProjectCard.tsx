import { Project } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, MapPin, Calendar, IndianRupee, Eye, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  delay?: number;
  onView?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const statusColors: Record<string, string> = {
  planning: 'bg-info/15 text-info border-info/30',
  active: 'bg-success/15 text-success border-success/30',
  on_hold: 'bg-warning/15 text-warning border-warning/30',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function ProjectCard({ project, delay = 0, onView, onEdit, onDelete, canEdit = false, canDelete = false }: ProjectCardProps) {
  const formatPrice = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(0)} L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val}`;
  };

  return (
    <div 
      className="glass-card rounded-2xl overflow-hidden group animate-slide-up hover:shadow-xl transition-all duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={project.coverImage || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'}
          alt={project.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            // Fallback to default image if the image fails to load
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <Badge 
          className={cn(
            "absolute top-4 right-4 capitalize border",
            statusColors[project.status]
          )}
        >
          {project.status}
        </Badge>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white mb-1">{project.name}</h3>
          <div className="flex items-center gap-1 text-white/80 text-sm">
            <MapPin className="w-3.5 h-3.5" />
            {project.location || 'Location not specified'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Building className="w-4 h-4 text-muted-foreground" />
            <span className="capitalize">{project.type}</span>
          </div>
          <div className="flex items-center gap-1 font-semibold text-primary">
            <IndianRupee className="w-4 h-4" />
            {formatPrice(project.priceMin)} - {formatPrice(project.priceMax)}
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {project.description}
        </p>

        <div className="flex flex-wrap gap-2">
          {project.amenities.slice(0, 3).map((amenity) => (
            <Badge key={amenity} variant="secondary" className="text-xs">
              {amenity}
            </Badge>
          ))}
          {project.amenities.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{project.amenities.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 pt-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Launch: {project.launchDate && !isNaN(project.launchDate.getTime()) 
              ? format(project.launchDate, 'MMM yyyy') 
              : 'TBD'}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Possession: {project.possessionDate && !isNaN(project.possessionDate.getTime()) 
              ? format(project.possessionDate, 'MMM yyyy') 
              : 'TBD'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onView?.(project)}
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          {canEdit && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onEdit?.(project)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button 
              variant="outline" 
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => onDelete?.(project)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
