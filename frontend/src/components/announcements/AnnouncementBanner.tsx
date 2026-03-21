import { useState, useEffect } from 'react';
import { Announcement } from '@/types';
import { X, Megaphone, AlertTriangle, FileText, Download, Eye, Bell, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import DocumentViewerModal from '@/components/ui/DocumentViewerModal';
import { Link } from 'react-router-dom';

import { logger } from '@/lib/logger';
interface AnnouncementBannerProps {
  userRole: 'admin' | 'manager' | 'employee' | 'hr';
  maxDisplay?: number; // Maximum number of announcements to display
}

export default function AnnouncementBanner({ userRole, maxDisplay = 3 }: AnnouncementBannerProps) {
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    name: string;
    title: string;
  } | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchUnreadAnnouncements = async () => {
      try {
        logger.log('🔍 [AnnouncementBanner] Fetching unread announcements...');
        const response = await apiClient.getUnreadAnnouncements();
        logger.log('🔍 [AnnouncementBanner] Raw API response:', response);
        
        // Transform Django response to match frontend interface
        const transformedAnnouncements = response.map((announcement: any) => ({
          id: announcement.id.toString(),
          title: announcement.title,
          message: announcement.message,
          priority: announcement.priority,
          targetRoles: announcement.target_roles,
          document_url: announcement.document_url,
          document_name: announcement.document_name,
          isActive: announcement.is_active,
          expiresAt: announcement.expires_at ? new Date(announcement.expires_at) : undefined,
          createdBy: announcement.created_by.toString(),
          createdAt: new Date(announcement.created_at),
        }));
        
        logger.log('🔍 [AnnouncementBanner] Transformed announcements:', transformedAnnouncements);
        logger.log('🔍 [AnnouncementBanner] Announcements with documents:', 
          transformedAnnouncements.filter(a => a.document_url || a.document_name)
        );
        
        setUnreadAnnouncements(transformedAnnouncements);
      } catch (error) {
        logger.error('❌ [AnnouncementBanner] Error fetching unread announcements:', error);
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
      logger.error('Error marking announcement as read:', error);
      // Still remove from UI even if API call fails
      setUnreadAnnouncements(prev => prev.filter(a => a.id !== id));
    }
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

  if (loading || unreadAnnouncements.length === 0) return null;

  // Determine which announcements to show
  const displayedAnnouncements = showAll 
    ? unreadAnnouncements 
    : unreadAnnouncements.slice(0, maxDisplay);
  
  const hiddenCount = unreadAnnouncements.length - maxDisplay;
  const hasHiddenAnnouncements = hiddenCount > 0 && !showAll;

  // Get the highest priority for the notification style
  const highestPriority = unreadAnnouncements.reduce((highest, announcement) => {
    if (announcement.priority === 'high') return 'high';
    if (announcement.priority === 'medium' && highest !== 'high') return 'medium';
    return highest;
  }, 'low' as 'high' | 'medium' | 'low');

  // Get role-based announcement page URL
  const getAnnouncementPageUrl = () => {
    switch (userRole) {
      case 'admin': return '/admin/announcements';
      case 'manager': return '/manager/announcements';
      case 'hr': return '/hr/announcements';
      default: return '/staff/announcements';
    }
  };

  return (
    <div className="mb-6">
      {/* Compact Notification Alert */}
      {unreadAnnouncements.length > 0 && (
        <div className={cn(
          "relative p-4 rounded-xl border animate-slide-up",
          highestPriority === 'high' 
            ? 'bg-destructive/10 border-destructive/30' 
            : highestPriority === 'medium'
            ? 'bg-warning/10 border-warning/30'
            : 'bg-primary/10 border-primary/30'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                highestPriority === 'high' 
                  ? 'bg-destructive/20' 
                  : highestPriority === 'medium'
                  ? 'bg-warning/20'
                  : 'bg-primary/20'
              )}>
                {highestPriority === 'high' ? (
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                ) : (
                  <Bell className={cn(
                    "w-4 h-4",
                    highestPriority === 'medium' ? 'text-warning' : 'text-primary'
                  )} />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={cn(
                    "font-semibold text-sm",
                    highestPriority === 'high' 
                      ? 'text-destructive' 
                      : highestPriority === 'medium'
                      ? 'text-warning'
                      : 'text-primary'
                  )}>
                    {unreadAnnouncements.length === 1 
                      ? 'New Announcement' 
                      : `${unreadAnnouncements.length} New Announcements`}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {unreadAnnouncements.length}
                  </Badge>
                </div>
                
                {/* Show preview of the most recent/important announcement */}
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                  {unreadAnnouncements[0]?.title}
                  {unreadAnnouncements.length > 1 && ` and ${unreadAnnouncements.length - 1} more...`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View All Button */}
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-xs"
              >
                <Link to={getAnnouncementPageUrl()}>
                  View All
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>

              {/* Expand/Collapse Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="text-xs"
              >
                {showAll ? 'Show Less' : 'Show More'}
              </Button>

              {/* Dismiss All */}
              <button
                onClick={() => {
                  unreadAnnouncements.forEach(announcement => dismiss(announcement.id));
                }}
                className="p-1 rounded hover:bg-foreground/10 transition-colors shrink-0"
                title="Mark all as read"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Expanded View */}
          {showAll && (
            <div className="mt-4 space-y-3 border-t pt-4">
              {displayedAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background/50"
                >
                  <div className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                    announcement.priority === 'high' 
                      ? 'bg-destructive/20' 
                      : announcement.priority === 'medium'
                      ? 'bg-warning/20'
                      : 'bg-primary/20'
                  )}>
                    {announcement.priority === 'high' ? (
                      <AlertTriangle className="w-3 h-3 text-destructive" />
                    ) : (
                      <Megaphone className={cn(
                        "w-3 h-3",
                        announcement.priority === 'medium' ? 'text-warning' : 'text-primary'
                      )} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h5 className={cn(
                      "font-medium text-sm",
                      announcement.priority === 'high' 
                        ? 'text-destructive' 
                        : announcement.priority === 'medium'
                        ? 'text-warning'
                        : 'text-primary'
                    )}>
                      {announcement.title}
                    </h5>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {announcement.message}
                    </p>
                    
                    {/* Document Attachment */}
                    {announcement.document_url && announcement.document_name && (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-accent/30 rounded-md border">
                        <FileText className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="text-xs font-medium flex-1 truncate">
                          {announcement.document_name}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1 text-xs"
                            onClick={() => handleViewDocument(announcement)}
                            title="View document"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1 text-xs"
                            onClick={() => handleDownloadDocument(announcement)}
                            title="Download document"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => dismiss(announcement.id)}
                    className="p-1 rounded hover:bg-foreground/10 transition-colors shrink-0"
                    title="Mark as read"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
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
    </div>
  );
}
