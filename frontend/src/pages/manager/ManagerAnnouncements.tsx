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
import { Search, Loader2, Plus, Edit, Trash2, Power, Eye, Download, FileText, Image, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Announcement } from '@/types';
import { useAuth } from "@/contexts/AuthContextDjango";
import AnnouncementFormModal from "@/components/announcements/AnnouncementFormModal";
import DocumentViewerModal from "@/components/ui/DocumentViewerModal";
import AnnouncementDetailModal from "@/components/announcements/AnnouncementDetailModal";
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

import { logger } from '@/lib/logger';
export default function ManagerAnnouncements() {
  const { announcements, refreshData, addAnnouncement, updateAnnouncement, deleteAnnouncement, toggleAnnouncementActive } = useData();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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
      
      logger.log('🔄 [ManagerAnnouncements] Fetching announcements...');
      const response = await apiClient.getAnnouncements();
      
      logger.log(`📊 [ManagerAnnouncements] Fetched announcements from backend`);
      
    } catch (error: any) {
      logger.error('❌ [ManagerAnnouncements] Error fetching announcements:', error);
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

  // Check if the current user created the announcement
  const canManageAnnouncement = (announcement: Announcement) => {
    return announcement.createdBy === user?.id;
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

  const handleCreateClick = () => {
    setEditingAnnouncement(null);
    setIsCreateModalOpen(true);
  };

  const handleEditClick = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsCreateModalOpen(true);
  };

  const handleDeleteClick = (announcement: Announcement) => {
    setDeleteId(announcement.id);
  };

  const handleCreateAnnouncement = async (announcementData: Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      if (editingAnnouncement) {
        // Update existing announcement
        await updateAnnouncement(editingAnnouncement.id, announcementData);
        toast.success('Announcement updated successfully!');
        setEditingAnnouncement(null);
      } else {
        // Create new announcement
        await addAnnouncement(announcementData);
        toast.success('Announcement created successfully!');
      }
      setIsCreateModalOpen(false);
      refreshData();
    } catch (error: any) {
      logger.error('Error saving announcement:', error);
      toast.error(error.message || 'Failed to save announcement');
    }
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setEditingAnnouncement(null);
  };

  const handleToggleActive = async (id: string) => {
    try {
      await toggleAnnouncementActive(id);
      toast.success('Announcement updated successfully!');
    } catch (error: any) {
      logger.error('Error toggling announcement:', error);
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
        logger.error('Error deleting announcement:', error);
        toast.error(error.message || 'Failed to delete announcement');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar title="Announcements" subtitle={`Company announcements • ${selectedCompany?.name || 'Loading...'}`}>
          <Button onClick={handleCreateClick} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Create Announcement
          </Button>
        </TopBar>
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
        <TopBar title="Announcements" subtitle={`Company announcements • ${selectedCompany?.name || 'Error'}`}>
          <Button onClick={handleCreateClick} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Create Announcement
          </Button>
        </TopBar>
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
      <TopBar title="Announcements" subtitle={`Company announcements • ${selectedCompany?.name || 'All Companies'}`}>
        <Button onClick={handleCreateClick} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Create Announcement
        </Button>
      </TopBar>
      <div className="p-6">
        <div className="space-y-6">
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

          {/* Announcement Table */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Title</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Message</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Document</TableHead>
                  <TableHead className="font-semibold hidden xl:table-cell">Created</TableHead>
                  <TableHead className="font-semibold hidden xl:table-cell">Expires</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnnouncements.map((announcement, index) => (
                  <TableRow 
                    key={announcement.id} 
                    className="table-row-hover animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {announcement.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          By {announcement.createdByName || 'Unknown'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm text-muted-foreground line-clamp-3 max-w-lg">
                        {announcement.message}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("capitalize", getPriorityBadgeColor(announcement.priority))}
                      >
                        {announcement.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {announcement.document_url && announcement.document_name ? (
                        <div className="flex items-center gap-2">
                          {isImageFile(announcement.document_name) ? (
                            <Image className="w-4 h-4 text-blue-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-primary" />
                          )}
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocument(announcement)}
                              className="h-6 px-2 text-xs"
                              title="View document"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadDocument(announcement)}
                              className="h-6 px-2 text-xs"
                              title="Download document"
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <p className="text-sm text-muted-foreground">
                        {format(announcement.createdAt, 'MMM dd, yyyy')}
                      </p>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <p className="text-sm text-muted-foreground">
                        {announcement.expiresAt 
                          ? format(announcement.expiresAt, 'MMM dd, yyyy')
                          : 'No expiration'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn(getStatusBadgeColor(announcement.isActive))}
                      >
                        {announcement.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAnnouncement(announcement)}
                          className="h-8 w-8 p-0"
                          title="View full announcement"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        {canManageAnnouncement(announcement) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(announcement)}
                              className="h-8 w-8 p-0"
                              title="Edit announcement"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(announcement.id)}
                              className="h-8 w-8 p-0"
                              title={announcement.isActive ? 'Deactivate' : 'Activate'}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(announcement)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete announcement"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredAnnouncements.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery || priorityFilter !== 'all' || statusFilter !== 'active'
                    ? 'No announcements found matching your filters' 
                    : 'No announcements available'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnnouncementFormModal
        open={isCreateModalOpen}
        onOpenChange={handleModalClose}
        onSubmit={handleCreateAnnouncement}
        announcement={editingAnnouncement || undefined}
      />

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
