import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import { useData } from "@/contexts/DataContextDjango";
import { useCompany } from "@/contexts/CompanyContext";
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Loader2, Eye, Download, FileText, Image, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Announcement } from '@/types';
import DocumentViewerModal from "@/components/ui/DocumentViewerModal";
import AnnouncementDetailModal from "@/components/announcements/AnnouncementDetailModal";
import AnnouncementList from "@/components/announcements/AnnouncementList";

import { logger } from '@/lib/logger';
export default function StaffAnnouncements() {
  const { announcements } = useData();
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    name: string;
    title: string;
  } | null>(null);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);

  // Fetch announcements from API
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      logger.log('🔄 [StaffAnnouncements] Fetching announcements...');
      const response = await apiClient.getAnnouncements();
      
      logger.log(`📊 [StaffAnnouncements] Fetched announcements from backend`);
      
    } catch (error: any) {
      logger.error('❌ [StaffAnnouncements] Error fetching announcements:', error);
      setError('Failed to load announcements. Please try again.');
      toast.error('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Backend already filters announcements by user role, so we just need to filter by active and expiry
  const visibleAnnouncements = announcements.filter(
    (a) => {
      if (!a.isActive && statusFilter === 'active') return false;
      if (a.isActive && statusFilter === 'inactive') return false;
      
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

  // Filter announcements based on search query and filters
  const filteredAnnouncements = visibleAnnouncements.filter(announcement => {
    const query = searchQuery.toLowerCase();
    
    // Search filter
    const matchesSearch = (
      announcement.title.toLowerCase().includes(query) ||
      announcement.message.toLowerCase().includes(query) ||
      (announcement.createdByName?.toLowerCase().includes(query) ?? false)
    );
    
    // Priority filter
    const matchesPriority = priorityFilter === 'all' || announcement.priority === priorityFilter;
    
    return matchesSearch && matchesPriority;
  });

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

  const handleViewAnnouncement = (announcement: Announcement) => {
    setViewingAnnouncement(announcement);
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar title="Announcements" subtitle={`Company announcements • ${selectedCompany?.name || 'Loading...'}`} />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading announcements...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <TopBar title="Announcements" subtitle={`Company announcements • ${selectedCompany?.name || 'Error'}`} />
        <div className="p-6">
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchAnnouncements} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Announcements" subtitle={`Company announcements • ${selectedCompany?.name || 'All Companies'}`} />
      <div className="p-3 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Search Bar and Filters */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 input-field"
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                {filteredAnnouncements.length} of {visibleAnnouncements.length} announcements
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              {/* Priority Filter */}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Announcement List - responsive cards on mobile, table on desktop */}
          <AnnouncementList
            announcements={filteredAnnouncements}
            onView={handleViewAnnouncement}
            onViewDocument={handleViewDocument}
            onDownloadDocument={handleDownloadDocument}
            emptyMessage={
              searchQuery || priorityFilter !== 'all' || statusFilter !== 'active'
                ? 'No announcements found matching your filters'
                : 'No announcements available'
            }
          />
        </div>
      </div>
      
      {/* Announcement Detail Modal */}
      <AnnouncementDetailModal
        announcement={viewingAnnouncement}
        open={!!viewingAnnouncement}
        onOpenChange={() => setViewingAnnouncement(null)}
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
    </div>
  );
}
