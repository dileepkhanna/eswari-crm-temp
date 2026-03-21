import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Loader2, Plus, Edit, Trash2, Upload, File, X, Link, Image, FileText, Eye, Download, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Announcement } from '@/types';
import AnnouncementDetailModal from '@/components/announcements/AnnouncementDetailModal';

import { logger } from '@/lib/logger';
export default function HRAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Create/Edit announcement dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    target_roles: [] as string[],
    expires_at: '',
  });

  // Document upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingDocument, setExistingDocument] = useState<{name: string, url: string} | null>(null);
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentName, setDocumentName] = useState('');
  const documentNameRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);

  // Fetch announcements from API
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      logger.log('🔄 Fetching announcements from backend...');
      const response = await apiClient.getAnnouncements();
      
      // Handle both paginated and non-paginated responses
      let announcementsData: any[];
      if (Array.isArray(response)) {
        announcementsData = response;
      } else if (response && typeof response === 'object' && 'results' in response) {
        announcementsData = (response as any).results;
      } else {
        announcementsData = [];
      }
      
      // Transform the data to match our Announcement interface
      const transformedAnnouncements: Announcement[] = announcementsData.map((item: any) => ({
        id: item.id?.toString() || '',
        title: item.title || '',
        message: item.message || '',
        priority: item.priority || 'low',
        targetRoles: item.target_roles || [],
        assignedEmployeeIds: item.assigned_employee_ids || [],
        assignedEmployeeDetails: item.assigned_employee_details || [],
        document_url: item.document_url,
        document_name: item.document_name,
        createdBy: item.created_by?.toString() || '',
        createdByName: item.created_by_name || '',
        createdAt: item.created_at ? new Date(item.created_at) : new Date(),
        expiresAt: item.expires_at ? new Date(item.expires_at) : undefined,
        isActive: item.is_active ?? true,
      }));
      
      logger.log(`📊 Fetched ${transformedAnnouncements.length} announcements from backend`);
      setAnnouncements(transformedAnnouncements);
      
    } catch (error: any) {
      logger.error('❌ Error fetching announcements:', error);
      setError('Failed to load announcements. Please try again.');
      toast.error('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Reset form when dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      setFormData({
        title: '',
        message: '',
        priority: 'medium',
        target_roles: [],
        expires_at: '',
      });
      setEditingId(null);
      // Reset document upload state
      setSelectedFile(null);
      setExistingDocument(null);
      setDocumentUrl('');
      setDocumentName('');
      if (documentNameRef.current) {
        documentNameRef.current.value = '';
      }
      setUploadMode('file');
    }
  }, [dialogOpen]);

  // Open dialog for creating new announcement
  const handleCreateClick = () => {
    setEditingId(null);
    setFormData({
      title: '',
      message: '',
      priority: 'medium',
      target_roles: [],
      expires_at: '',
    });
    // Reset document upload state
    setSelectedFile(null);
    setExistingDocument(null);
    setDocumentUrl('');
    setDocumentName('');
    if (documentNameRef.current) {
      documentNameRef.current.value = '';
    }
    setUploadMode('file');
    setDialogOpen(true);
  };

  const handleViewAnnouncement = (announcement: Announcement) => {
    setViewingAnnouncement(announcement);
  };

  // Open dialog for editing existing announcement
  const handleEditClick = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      priority: announcement.priority,
      target_roles: announcement.targetRoles,
      expires_at: announcement.expiresAt 
        ? format(announcement.expiresAt, 'yyyy-MM-dd')
        : '',
    });
    
    // Set existing document if available
    if (announcement.document_url && announcement.document_name) {
      setExistingDocument({
        name: announcement.document_name,
        url: announcement.document_url
      });
      setDocumentUrl(announcement.document_url);
      setDocumentName(announcement.document_name);
      if (documentNameRef.current) {
        documentNameRef.current.value = announcement.document_name;
      }
    } else {
      setExistingDocument(null);
      setDocumentUrl('');
      setDocumentName('');
      if (documentNameRef.current) {
        documentNameRef.current.value = '';
      }
    }
    setSelectedFile(null);
    setUploadMode('file');
    setDialogOpen(true);
  };

  // Handle create/update announcement
  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter an announcement title');
      return;
    }
    
    if (!formData.message.trim()) {
      toast.error('Please enter an announcement message');
      return;
    }

    setSubmitting(true);
    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('message', formData.message);
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('target_roles', JSON.stringify(formData.target_roles.length > 0 ? formData.target_roles : []));
      formDataToSend.append('is_active', 'true');
      
      // HR users: automatically use all active companies (like admin)
      // This ensures HR announcements appear in all company panels
      try {
        const companiesResponse = await apiClient.getActiveCompanies();
        const activeCompanies = Array.isArray(companiesResponse) ? companiesResponse : companiesResponse.results || [];
        
        // Add all active company IDs for HR announcements
        activeCompanies.forEach((company: any) => {
          if (company.is_active !== false) { // Include companies that are active or don't have is_active field
            formDataToSend.append('company_ids', company.id.toString());
          }
        });
        
        logger.log('🏢 HR announcement will be sent to all active companies:', activeCompanies.length);
      } catch (error) {
        logger.error('❌ Error fetching companies for HR announcement:', error);
        toast.error('Failed to fetch companies. Please try again.');
        setSubmitting(false);
        return;
      }
      
      if (formData.expires_at) {
        formDataToSend.append('expires_at', new Date(formData.expires_at).toISOString());
      }

      // Add document if selected (file or URL)
      if (selectedFile) {
        formDataToSend.append('document', selectedFile);
      } else if (documentUrl) {
        // Get the actual document name from the input field
        const actualDocumentName = documentNameRef.current?.value || documentName;
        
        if (actualDocumentName.trim()) {
          formDataToSend.append('document_url', documentUrl);
          formDataToSend.append('document_name', actualDocumentName);
        }
      }
      
      if (editingId) {
        // Update existing announcement
        logger.log('🔄 Updating announcement:', editingId);
        await apiClient.updateAnnouncement(parseInt(editingId), formDataToSend);
        toast.success('Announcement updated successfully');
      } else {
        // Create new announcement
        logger.log('🔄 Creating announcement');
        await apiClient.createAnnouncement(formDataToSend);
        toast.success('Announcement created successfully');
      }
      
      setDialogOpen(false);
      
      // Refresh announcements list
      await fetchAnnouncements();
    } catch (error: any) {
      logger.error('❌ Error saving announcement:', error);
      toast.error(editingId ? 'Failed to update announcement' : 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle role selection
  const handleRoleToggle = (role: string) => {
    setFormData(prev => {
      const currentRoles = prev.target_roles;
      if (currentRoles.includes(role)) {
        return { ...prev, target_roles: currentRoles.filter(r => r !== role) };
      } else {
        return { ...prev, target_roles: [...currentRoles, role] };
      }
    });
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (announcement: Announcement) => {
    setDeletingId(announcement.id);
    setDeleteDialogOpen(true);
  };

  // Handle delete announcement
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    setDeleting(true);
    try {
      logger.log('🗑️ Deleting announcement:', deletingId);
      await apiClient.deleteAnnouncement(parseInt(deletingId));
      toast.success('Announcement deleted successfully');
      
      setDeleteDialogOpen(false);
      setDeletingId(null);
      
      // Refresh announcements list
      await fetchAnnouncements();
    } catch (error: any) {
      logger.error('❌ Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    } finally {
      setDeleting(false);
    }
  };

  // Filter announcements based on search query and filters
  const filteredAnnouncements = announcements.filter(announcement => {
    const query = searchQuery.toLowerCase();
    
    // Search filter
    const matchesSearch = (
      announcement.title.toLowerCase().includes(query) ||
      announcement.message.toLowerCase().includes(query) ||
      (announcement.createdByName?.toLowerCase().includes(query) ?? false)
    );
    
    // Priority filter
    const matchesPriority = priorityFilter === 'all' || announcement.priority === priorityFilter;
    
    // Role filter
    const matchesRole = roleFilter === 'all' || announcement.targetRoles.includes(roleFilter as any);
    
    // Status filter (active/inactive)
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && announcement.isActive) ||
      (statusFilter === 'inactive' && !announcement.isActive);
    
    return matchesSearch && matchesPriority && matchesRole && matchesStatus;
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

  // Document upload helper functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      return;
    }

    // Validate file type - includes documents and images
    const allowedTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/svg+xml',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT) or images (JPG, PNG, GIF, BMP, SVG, WEBP).');
      e.target.value = '';
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setExistingDocument(null);
    setDocumentUrl('');
    setDocumentName('');
    
    toast.success(`File "${file.name}" selected successfully`);
  };

  const removeFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    toast.success('File removed');
  };

  const removeExistingDocument = () => {
    setExistingDocument(null);
    setDocumentUrl('');
    setDocumentName('');
  };

  const handleUrlSubmit = () => {
    if (!documentUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    const actualDocumentName = documentNameRef.current?.value || '';

    if (!actualDocumentName.trim()) {
      toast.error('Please enter a name for the document/image');
      return;
    }

    // Basic URL validation
    try {
      new URL(documentUrl);
    } catch {
      toast.error('Please enter a valid URL (e.g., https://example.com/file.pdf)');
      return;
    }

    setDocumentName(actualDocumentName);
    setSelectedFile(null);
    setExistingDocument(null);
    toast.success('URL added successfully');
  };

  const clearUrl = () => {
    setDocumentUrl('');
    setDocumentName('');
    if (documentNameRef.current) {
      documentNameRef.current.value = '';
    }
  };

  const isImageFile = (filename: string) => {
    return /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(filename);
  };

  const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|gif|bmp|svg|webp)(\?.*)?$/i.test(url);
  };

  const handleViewDocument = (announcement: Announcement) => {
    if (announcement.document_url) {
      window.open(announcement.document_url, '_blank');
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
        <TopBar title="Announcement Management" subtitle="Manage company announcements" />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <TopBar title="Announcement Management" subtitle="Manage company announcements" />
        <div className="p-6">
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchAnnouncements}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Announcement Management" subtitle="Manage company announcements" />
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
              
              <Button onClick={handleCreateClick} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Announcement
              </Button>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              {/* Priority Filter */}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>

              {/* Role Filter */}
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
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
                  <TableHead className="font-semibold hidden lg:table-cell">Target Roles</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Document</TableHead>
                  <TableHead className="font-semibold hidden xl:table-cell">Expiration</TableHead>
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
                      <div className="flex flex-wrap gap-1">
                        {announcement.targetRoles.length > 0 ? (
                          announcement.targetRoles.map((role, idx) => (
                            <Badge 
                              key={idx}
                              variant="outline" 
                              className="capitalize text-xs"
                            >
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">All</span>
                        )}
                      </div>
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
                          onClick={() => handleDeleteClick(announcement)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete announcement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredAnnouncements.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery || priorityFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all'
                    ? 'No announcements found matching your filters' 
                    : 'No announcements found'}
                </p>
              </div>
            )}
          </div>

          {/* Create/Edit Announcement Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>{editingId ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
                <DialogDescription>
                  {editingId 
                    ? 'Update the announcement details below.' 
                    : 'Create a new company announcement. Fill in the details below.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter announcement title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-field"
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter announcement message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="input-field min-h-[100px]"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value: 'low' | 'medium' | 'high') => 
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Roles */}
                <div className="space-y-2">
                  <Label>Target Roles (leave empty for all roles)</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-admin"
                        checked={formData.target_roles.includes('admin')}
                        onCheckedChange={() => handleRoleToggle('admin')}
                      />
                      <label
                        htmlFor="role-admin"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Admin
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-hr"
                        checked={formData.target_roles.includes('hr')}
                        onCheckedChange={() => handleRoleToggle('hr')}
                      />
                      <label
                        htmlFor="role-hr"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        HR
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-manager"
                        checked={formData.target_roles.includes('manager')}
                        onCheckedChange={() => handleRoleToggle('manager')}
                      />
                      <label
                        htmlFor="role-manager"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Manager
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-employee"
                        checked={formData.target_roles.includes('employee')}
                        onCheckedChange={() => handleRoleToggle('employee')}
                      />
                      <label
                        htmlFor="role-employee"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Employee
                      </label>
                    </div>
                  </div>
                </div>

                {/* Expiration Date */}
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Expiration Date (optional)</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="input-field"
                  />
                </div>

                {/* Document/Image Upload */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Document/Image Attachment (Optional)</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={uploadMode === 'file' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUploadMode('file')}
                        className="flex-1"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload File
                      </Button>
                      <Button
                        type="button"
                        variant={uploadMode === 'url' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUploadMode('url')}
                        className="flex-1"
                      >
                        <Link className="w-4 h-4 mr-2" />
                        Use URL
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                    {uploadMode === 'file' 
                      ? 'Upload documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT) or images (JPG, PNG, GIF, BMP, SVG, WEBP). Max 10MB.'
                      : 'Provide a URL to an online document or image.'
                    }
                  </div>
                  
                  {/* Existing Document Display */}
                  {existingDocument && !selectedFile && !documentUrl && (
                    <div className="p-3 border rounded bg-accent/50">
                      <div className="flex items-center gap-2">
                        {isImageFile(existingDocument.name) ? (
                          <Image className="w-4 h-4 text-blue-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-primary" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{existingDocument.name}</p>
                          <p className="text-xs text-muted-foreground">Current attachment</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(existingDocument.url, '_blank')}
                            className="h-7 px-2"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeExistingDocument}
                            className="h-7 px-2"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* File Upload Mode */}
                  {uploadMode === 'file' && !existingDocument && (
                    <div>
                      {selectedFile ? (
                        <div className="p-3 border rounded bg-accent/50">
                          <div className="flex items-center gap-2">
                            {isImageFile(selectedFile.name) ? (
                              <Image className="w-4 h-4 text-blue-500" />
                            ) : (
                              <FileText className="w-4 h-4 text-primary" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeFile}
                              className="h-7 px-2"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-border rounded p-4 text-center hover:border-primary/50 transition-colors">
                          <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Click to select a file
                          </p>
                          <div className="relative">
                            <input
                              type="file"
                              id="file-upload-input"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.svg,.webp,image/*"
                              onChange={handleFileSelect}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="pointer-events-none"
                            >
                              Choose File
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* URL Input Mode */}
                  {uploadMode === 'url' && !existingDocument && (
                    <div>
                      {documentUrl && documentName ? (
                        <div className="p-3 border rounded bg-accent/50">
                          <div className="flex items-center gap-2">
                            {isImageUrl(documentUrl) ? (
                              <Image className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Link className="w-4 h-4 text-primary" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{documentName}</p>
                              <p className="text-xs text-muted-foreground truncate">{documentUrl}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(documentUrl, '_blank')}
                                className="h-7 px-2"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearUrl}
                                className="h-7 px-2"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 border rounded p-3 bg-muted/20">
                          <div className="space-y-2">
                            <Label htmlFor="documentUrl" className="text-sm">Document/Image URL</Label>
                            <Input
                              id="documentUrl"
                              type="url"
                              placeholder="https://example.com/document.pdf"
                              value={documentUrl}
                              onChange={(e) => setDocumentUrl(e.target.value)}
                              className="input-field h-9"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="documentName" className="text-sm">Display Name</Label>
                            <input
                              ref={documentNameRef}
                              id="documentName"
                              type="text"
                              placeholder="e.g., Policy Document"
                              defaultValue={documentName}
                              onChange={(e) => setDocumentName(e.target.value)}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 input-field"
                              autoComplete="off"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleUrlSubmit}
                            disabled={!documentUrl.trim() || !documentName.trim()}
                            size="sm"
                            className="w-full"
                          >
                            <Link className="w-4 h-4 mr-2" />
                            Add URL
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Replace existing document options */}
                  {existingDocument && (
                    <div className="p-2 border rounded bg-accent/30">
                      <p className="text-xs text-muted-foreground mb-2">Replace current attachment:</p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUploadMode('file');
                            setExistingDocument(null);
                          }}
                          className="flex-1 h-8"
                        >
                          <Upload className="w-3 h-3 mr-1" />
                          File
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUploadMode('url');
                            setExistingDocument(null);
                          }}
                          className="flex-1 h-8"
                        >
                          <Link className="w-3 h-3 mr-1" />
                          URL
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex-shrink-0 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingId ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingId ? 'Update Announcement' : 'Create Announcement'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Announcement Detail Modal */}
          <AnnouncementDetailModal
            announcement={viewingAnnouncement}
            open={!!viewingAnnouncement}
            onOpenChange={() => setViewingAnnouncement(null)}
          />

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Delete Announcement</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this announcement? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setDeletingId(null);
                  }}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
