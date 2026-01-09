import { useAuth } from "@/contexts/AuthContextDjango";
import { useData } from "@/contexts/DataContextDjango";
import { toast } from "sonner";
import AnnouncementList from "@/components/announcements/AnnouncementList";
import TopBar from "@/components/layout/TopBar";
import { Announcement } from "@/types";

export default function AdminAnnouncements() {
  const { user } = useAuth();
  const { announcements, addAnnouncement, deleteAnnouncement, toggleAnnouncementActive } = useData();

  const handleAdd = async (data: Omit<Announcement, "id" | "createdAt" | "createdBy">) => {
    try {
      await addAnnouncement(data);
      toast.success("Announcement created");
    } catch (error) {
      // Error already shown by DataContext
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      toast.success("Announcement deleted");
    } catch (error) {
      // Error already shown by DataContext
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleAnnouncementActive(id);
      toast.success("Announcement updated");
    } catch (error) {
      // Error already shown by DataContext
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Announcements" subtitle="Broadcast messages to staff and managers" />
      <div className="p-4 md:p-6">
        <AnnouncementList
          announcements={announcements}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onToggleActive={handleToggle}
        />
      </div>
    </div>
  );
}
