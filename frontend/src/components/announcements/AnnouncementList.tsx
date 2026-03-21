import { useState } from 'react';
import { Announcement } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import { Plus, Megaphone, Trash2, Users, Clock, AlertTriangle, User, FileText, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import AnnouncementFormModal from './AnnouncementFormModal';
import DocumentViewerModal from '@/components/ui/DocumentViewerModal';

import { logger } from '@/lib/logger';
interface AnnouncementListProps {
  announcements: Announcement[];
  onAdd: (announcement: Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>) => void;
  onUpdate?: (id: string, data: Partial<Announcement>) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
}

const priorityStyles = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-warning/15 text-warning border-warning/30',
  high: 'bg-destructive/15 text-destructive border-destructive/30',
};

const priorityIcons = {
  low: null,
  medium: <AlertTriangle className="w-4 h-4" />,
  high: <AlertTriangle className="w-4 h-4" />,
};

export default function AnnouncementList({
  announcements,
  onAdd,
  onUpdate,
  onDelete,
  onToggleActive,
}: AnnouncementListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    name: string;
    title: string;
  } | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
      toast.success('Announcement deleted');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingAnnouncement(null);
  };

  const handleSubmit = (data: Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>) => {
    if (editingAnnouncement && onUpdate) {
      onUpdate(editingAnnouncement.id, data);
    } else {
      onAdd(data);
    }
    handleFormClose();
  };

  const handleViewDocument = (announcement: Announcement) => {
    if (announcement.document_url && announcement.document_name) {
      setViewingDocument({
        url: announcement.document_url,
        name: announcement.document_name,
        title: `Document: ${announcement.title}`
      });
    }
  };

  const handleDownloadDocument = (announcement: Announcement) => {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">All Announcements</h2>
          <p className="text-sm text-muted-foreground">
            {announcements.filter(a => a.isActive).length} active announcements
          </p>
        </div>
        <Button className="btn-accent w-full sm:w-auto" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Announcements Grid */}
      <div className="grid gap-4">
        {announcements.map((announcement, index) => (
          <Card
            key={announcement.id}
            className={cn(
              "p-5 animate-slide-up transition-all duration-300",
              !announcement.isActive && "opacity-60"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                announcement.priority === 'high' ? 'bg-destructive/15' :
                announcement.priority === 'medium' ? 'bg-warning/15' : 'bg-primary/15'
              )}>
                <Megaphone className={cn(
                  "w-6 h-6",
                  announcement.priority === 'high' ? 'text-destructive' :
                  announcement.priority === 'medium' ? 'text-warning' : 'text-primary'
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold break-words">{announcement.title}</h3>
                        <Badge
                          variant="outline"
                          className={cn("capitalize text-xs border", priorityStyles[announcement.priority])}
                        >
                          {priorityIcons[announcement.priority]}
                          {announcement.priority}
                        </Badge>
                        {!announcement.isActive && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {announcement.message}
                      </p>
                      
                      {/* Document Attachment */}
                      {announcement.document_url && announcement.document_name && (
                        <div className="flex items-center gap-2 mt-2 p-3 bg-accent/30 rounded-lg border">
                          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm font-medium flex-1 truncate">
                            {announcement.document_name}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleViewDocument(announcement)}
                              title="View document"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleDownloadDocument(announcement)}
                              title="Download document"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {onUpdate && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => handleEdit(announcement)}
                        >
                          Edit
                        </Button>
                      )}
                      <Button
                        variant={announcement.isActive ? "secondary" : "default"}
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => onToggleActive(announcement.id)}
                      >
                        {announcement.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(announcement.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {announcement.createdByName && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>By: {announcement.createdByName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>
                          {announcement.targetRoles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{format(announcement.createdAt, 'MMM dd, yyyy h:mm a')}</span>
                      </div>
                      {announcement.expiresAt && (
                        <div className="flex items-center gap-1.5 text-warning">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Expires: {format(announcement.expiresAt, 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-12">
            <Megaphone className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">No announcements yet</p>
            <p className="text-sm text-muted-foreground/70">
              Create your first announcement to notify staff and managers
            </p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <AnnouncementFormModal
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleSubmit}
        announcement={editingAnnouncement || undefined}
      />

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewerModal
          open={!!viewingDocument}
          onOpenChange={() => setViewingDocument(null)}
          documentUrl={viewingDocument.url}
          documentName={viewingDocument.name}
          title={viewingDocument.title}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
