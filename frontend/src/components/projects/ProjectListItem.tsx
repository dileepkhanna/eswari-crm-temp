import { Project } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, MapPin, Calendar, IndianRupee, Eye, Edit, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjectListItemProps {
  project: Project;
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

export default function ProjectListItem({ 
  project, 
  onView, 
  onEdit, 
  onDelete, 
  canEdit = false, 
  canDelete = false 
}: ProjectListItemProps) {
  const formatPrice = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(0)} L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val}`;
  };

  return (
    <div className="glass-card rounded-lg p-4 hover:shadow-md transition-all duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Project Image */}
        <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
          <img
            src={project.coverImage || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'}
            alt={project.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800';
            }}
          />
          <Badge 
            className={cn(
              "absolute -top-1 -right-1 text-xs capitalize border",
              statusColors[project.status]
            )}
          >
            {project.status}
          </Badge>
        </div>

        {/* Project Info */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{project.name}</h3>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{project.location || 'Location not specified'}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  <span className="capitalize">{project.type}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-2 text-sm">
                <div className="flex items-center gap-1 font-medium text-primary">
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>{formatPrice(project.priceMin)} - {formatPrice(project.priceMax)}</span>
                </div>
                
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Launch: {project.launchDate && !isNaN(project.launchDate.getTime()) 
                      ? format(project.launchDate, 'MMM yyyy') 
                      : 'TBD'}
                  </span>
                </div>
              </div>

              {/* Amenities */}
              {project.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
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
              )}

              {/* Description */}
              {project.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => onView?.(project)}
              >
                <Eye className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">View</span>
              </Button>
              
              {canEdit && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => onEdit?.(project)}
                >
                  <Edit className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
              
              {canDelete && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete?.(project)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}