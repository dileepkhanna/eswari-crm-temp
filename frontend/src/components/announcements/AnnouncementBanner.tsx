import { useState, useEffect } from 'react';
import { Announcement } from '@/types';
import { X, Megaphone, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';

interface AnnouncementBannerProps {
  userRole: 'admin' | 'manager' | 'employee';
}

export default function AnnouncementBanner({ userRole }: AnnouncementBannerProps) {
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUnreadAnnouncements = async () => {
      try {
        const response = await apiClient.getUnreadAnnouncements();
        // Transform Django response to match frontend interface
        const transformedAnnouncements = response.map((announcement: any) => ({
          id: announcement.id.toString(),
          title: announcement.title,
          message: announcement.message,
          priority: announcement.priority,
          targetRoles: announcement.target_roles,
          isActive: announcement.is_active,
          expiresAt: announcement.expires_at ? new Date(announcement.expires_at) : undefined,
          createdBy: announcement.created_by.toString(),
          createdAt: new Date(announcement.created_at),
        }));
        setUnreadAnnouncements(transformedAnnouncements);
      } catch (error) {
        console.error('Error fetching unread announcements:', error);
        setUnreadAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadAnnouncements();
  }, []);

  const dismiss = async (id: string) => {
    try {
      // Mark the announcement as read in the backend
      await apiClient.markAnnouncementRead(parseInt(id));
      
      // Remove from local state
      setUnreadAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error marking announcement as read:', error);
      // Still remove from UI even if API call fails
      setUnreadAnnouncements(prev => prev.filter(a => a.id !== id));
    }
  };

  if (loading || unreadAnnouncements.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {unreadAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className={cn(
            "relative p-4 rounded-xl border animate-slide-up flex items-start gap-3",
            announcement.priority === 'high' 
              ? 'bg-destructive/10 border-destructive/30' 
              : announcement.priority === 'medium'
              ? 'bg-warning/10 border-warning/30'
              : 'bg-primary/10 border-primary/30'
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            announcement.priority === 'high' 
              ? 'bg-destructive/20' 
              : announcement.priority === 'medium'
              ? 'bg-warning/20'
              : 'bg-primary/20'
          )}>
            {announcement.priority === 'high' ? (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            ) : (
              <Megaphone className={cn(
                "w-4 h-4",
                announcement.priority === 'medium' ? 'text-warning' : 'text-primary'
              )} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className={cn(
              "font-semibold text-sm",
              announcement.priority === 'high' 
                ? 'text-destructive' 
                : announcement.priority === 'medium'
                ? 'text-warning'
                : 'text-primary'
            )}>
              {announcement.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              {announcement.message}
            </p>
          </div>

          <button
            onClick={() => dismiss(announcement.id)}
            className="p-1 rounded hover:bg-foreground/10 transition-colors shrink-0"
            title="Mark as read and dismiss"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
}
