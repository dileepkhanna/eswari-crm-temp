import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import { useData } from "@/contexts/DataContextDjango";
import { Megaphone, AlertTriangle, Calendar, Plus, User, Trash2, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import AnnouncementFormModal from "@/components/announcements/AnnouncementFormModal";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { Announcement } from "@/types";
import { useAuth } from "@/contexts/AuthContextDjango";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ManagerAnnouncements() {
  const { announcements, refreshData, deleteAnnouncement, toggleAnnouncementActive } = useData();
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Backend already filters announcements by user role, so we just need to filter by active and expiry
  const visibleAnnouncements = announcements.filter(
    (a) => {
      if (!a.isActive) return false;
      
      // If no expiry date, show the announcement
      if (!a.expiresAt) return true;
      
      // Compare dates only (ignore time) - announcement is valid until end of expiry date
      const expiryDate = new Date(a.expiresAt);
      const today = new Date();
      
      // Set both dates to start of day for comparison
      expiryDate.setHours(23, 59, 59, 999); // End of expiry date
      today.setHours(0, 0, 0, 0); // Start of today
      
      return expiryDate >= today;
    }
  );

  const handleCreateAnnouncement = async (announcementData: Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      await apiClient.createAnnouncement(announcementData);
      toast.success('Announcement created successfully!');
      refreshData();
    } catch (error: any) {
      console.error('Error creating announcement:', error);
      toast.error(error.message || 'Failed to create announcement');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await toggleAnnouncementActive(id);
      toast.success('Announcement updated successfully!');
    } catch (error: any) {
      console.error('Error toggling announcement:', error);
      toast.error(error.message || 'Failed to update announcement');
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteAnnouncement(deleteId);
        toast.success('Announcement deleted successfully!');
        setDeleteId(null);
      } catch (error: any) {
        console.error('Error deleting announcement:', error);
        toast.error(error.message || 'Failed to delete announcement');
      }
    }
  };

  // Check if the current user created the announcement
  const canManageAnnouncement = (announcement: Announcement) => {
    return announcement.createdBy === user?.id;
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Announcements" subtitle="Create and view announcements">
        <Button onClick={() => setIsCreateModalOpen(true)} className="btn-accent">
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </TopBar>
      <div className="p-4 md:p-6 space-y-4">
        {visibleAnnouncements.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No announcements at this time</p>
          </div>
        ) : (
          visibleAnnouncements.map((announcement, index) => (
            <div
              key={announcement.id}
              className={cn(
                "glass-card rounded-2xl p-4 md:p-6 animate-slide-up",
                announcement.priority === "high"
                  ? "border-l-4 border-l-destructive"
                  : announcement.priority === "medium"
                    ? "border-l-4 border-l-warning"
                    : "border-l-4 border-l-primary"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0",
                    announcement.priority === "high"
                      ? "bg-destructive/20"
                      : announcement.priority === "medium"
                        ? "bg-warning/20"
                        : "bg-primary/20"
                  )}
                >
                  {announcement.priority === "high" ? (
                    <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-destructive" />
                  ) : (
                    <Megaphone
                      className={cn(
                        "w-5 h-5 md:w-6 md:h-6",
                        announcement.priority === "medium" ? "text-warning" : "text-primary"
                      )}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <h3
                      className={cn(
                        "font-semibold text-base md:text-lg",
                        announcement.priority === "high"
                          ? "text-destructive"
                          : announcement.priority === "medium"
                            ? "text-warning"
                            : "text-primary"
                      )}
                    >
                      {announcement.title}
                    </h3>
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-full w-fit",
                        announcement.priority === "high"
                          ? "bg-destructive/10 text-destructive"
                          : announcement.priority === "medium"
                            ? "bg-warning/10 text-warning"
                            : "bg-primary/10 text-primary"
                      )}
                    >
                      {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)} Priority
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground mb-3">{announcement.message}</p>
                  
                  {/* Action buttons for manager's own announcements */}
                  {canManageAnnouncement(announcement) && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                      <Button
                        variant={announcement.isActive ? "secondary" : "default"}
                        size="sm"
                        onClick={() => handleToggleActive(announcement.id)}
                      >
                        <Power className="w-3.5 h-3.5 mr-1.5" />
                        {announcement.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(announcement.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {announcement.createdByName && (
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        By: {announcement.createdByName}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Posted: {format(announcement.createdAt, "MMM dd, yyyy")}
                    </div>
                    {announcement.expiresAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Expires: {format(announcement.expiresAt, "MMM dd, yyyy")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AnnouncementFormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateAnnouncement}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone and the announcement will be removed for all users.
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
