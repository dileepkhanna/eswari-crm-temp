import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Announcement } from '@/types';
import { Calendar, User, FileText, Download, Eye, Image } from 'lucide-react';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
interface AnnouncementDetailModalProps {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AnnouncementDetailModal({
  announcement,
  open,
  onOpenChange,
}: AnnouncementDetailModalProps) {
  if (!announcement) return null;

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-700 border-green-300'
      : 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const isImageFile = (filename: string) => {
    return /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(filename);
  };

  const handleViewDocument = () => {
    if (announcement.document_url) {
      window.open(announcement.document_url, '_blank');
    }
  };

  const handleDownloadDocument = () => {
    if (announcement.document_url && announcement.document_name) {
      try {
        const link = document.createElement('a');
        link.href = announcement.document_url;
        link.download = announcement.document_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`Downloaded ${announcement.document_name}`);
      } catch (error) {
        logger.error('Download failed:', error);
        toast.error('Failed to download document');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <span className={cn(
              "font-semibold",
              announcement.priority === 'high'
                ? 'text-red-700'
                : announcement.priority === 'medium'
                ? 'text-yellow-700'
                : 'text-green-700'
            )}>
              {announcement.title}
            </span>
            <Badge 
              variant="outline" 
              className={cn("capitalize", getPriorityBadgeColor(announcement.priority))}
            >
              {announcement.priority}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Full announcement details
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Full Message */}
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Message</h4>
            <div className="p-4 bg-muted/30 rounded-lg border">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {announcement.message}
              </p>
            </div>
          </div>

          {/* Document Attachment */}
          {announcement.document_url && announcement.document_name && (
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Attachment</h4>
              <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg border">
                {isImageFile(announcement.document_name) ? (
                  <Image className="w-5 h-5 text-blue-500" />
                ) : (
                  <FileText className="w-5 h-5 text-primary" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{announcement.document_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isImageFile(announcement.document_name) ? 'Image file' : 'Document file'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewDocument}
                    className="h-8 px-3"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadDocument}
                    className="h-8 px-3"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Companies */}
          {announcement.companies_detail && announcement.companies_detail.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Companies</h4>
              <div className="flex flex-wrap gap-2">
                {announcement.companies_detail.map((company: any, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {company.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Target Roles */}
          {announcement.targetRoles && announcement.targetRoles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Target Roles</h4>
              <div className="flex flex-wrap gap-2">
                {announcement.targetRoles.map((role, idx) => (
                  <Badge key={idx} variant="outline" className="capitalize text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created by:</span>
                <span className="font-medium">{announcement.createdByName || 'Unknown'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">{format(announcement.createdAt, 'MMM dd, yyyy')}</span>
              </div>
              
              {announcement.expiresAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Expires:</span>
                  <span className="font-medium">{format(announcement.expiresAt, 'MMM dd, yyyy')}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getStatusBadgeColor(announcement.isActive))}
                >
                  {announcement.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}