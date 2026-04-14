import { useState, useEffect, useRef } from 'react';
import { Announcement } from '@/types';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useData } from '@/contexts/DataContextDjango';
import { apiClient } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Megaphone, Calendar, Loader2, Upload, File, X, Link, Image, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
interface Employee {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface Company {
  id: number;
  name: string;
  code: string;
}

interface AnnouncementFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (announcement: Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>) => void;
  announcement?: Announcement;
}

export default function AnnouncementFormModal({
  open,
  onOpenChange,
  onSubmit,
  announcement,
}: AnnouncementFormModalProps) {
  const { user } = useAuth();
  const { refreshData } = useData();
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    expiresAt: '',
  });
  const [targetRoles, setTargetRoles] = useState<('admin' | 'manager' | 'employee')[]>(['manager', 'employee']);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<number[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingDocument, setExistingDocument] = useState<{name: string, url: string} | null>(null);
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentName, setDocumentName] = useState('');
  const documentNameRef = useRef<HTMLInputElement>(null);
  
  // Debug documentName changes
  useEffect(() => {
    logger.log('documentName state changed to:', documentName);
  }, [documentName]);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  
  // Admin-specific state for company selection
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Load form data when editing
  useEffect(() => {
    logger.log('useEffect triggered with announcement:', announcement, 'modal open:', open);
    
    // Only reset when modal opens, not on every render
    if (!open) return;
    
    if (announcement) {
      setFormData({
        title: announcement.title,
        message: announcement.message,
        priority: announcement.priority,
        expiresAt: announcement.expiresAt 
          ? new Date(announcement.expiresAt).toISOString().split('T')[0] 
          : '',
      });
      setTargetRoles(announcement.targetRoles);
      setAssignedEmployeeIds(announcement.assignedEmployeeIds || []);
      
      // Set companies for editing
      if (announcement.companies_detail && announcement.companies_detail.length > 0) {
        setSelectedCompanyIds(announcement.companies_detail.map(c => c.id));
      } else if (announcement.company) {
        // Legacy single company support
        setSelectedCompanyIds([announcement.company]);
      }
      
      // Set existing document if available
      if (announcement.document_url && announcement.document_name) {
        setExistingDocument({
          name: announcement.document_name,
          url: announcement.document_url
        });
        setDocumentUrl(announcement.document_url);
        setDocumentName(announcement.document_name);
        // Update the uncontrolled input
        if (documentNameRef.current) {
          documentNameRef.current.value = announcement.document_name;
        }
        logger.log('Setting documentName from announcement:', announcement.document_name);
      } else {
        setExistingDocument(null);
        setDocumentUrl('');
        setDocumentName('');
        // Clear the uncontrolled input
        if (documentNameRef.current) {
          documentNameRef.current.value = '';
        }
        logger.log('Clearing documentName (no existing document)');
      }
      setSelectedFile(null);
      setUploadMode('file');
    } else {
      // Reset form for new announcement - but only when modal first opens
      logger.log('Resetting form for new announcement');
      setFormData({ title: '', message: '', priority: 'medium', expiresAt: '' });
      setTargetRoles(['manager', 'employee']);
      setAssignedEmployeeIds([]);
      setSelectedCompanyIds([]);
      setExistingDocument(null);
      setSelectedFile(null);
      setDocumentUrl('');
      setDocumentName('');
      // Clear the uncontrolled input
      if (documentNameRef.current) {
        documentNameRef.current.value = '';
      }
      setUploadMode('file');
    }
  }, [announcement, open]);

  // Load manager's employees when modal opens
  useEffect(() => {
    if (open && user?.role === 'manager') {
      loadManagerEmployees();
    }
  }, [open, user]);

  // Load companies for admin users when modal opens
  useEffect(() => {
    if (open && user?.role === 'admin') {
      loadCompanies();
    }
  }, [open, user]);

  const loadManagerEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const employeesList = await apiClient.getManagerEmployees();
      setEmployees(employeesList);
    } catch (error) {
      logger.error('Error loading employees:', error);
      toast.error('Could not load your employees list');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const response = await apiClient.getActiveCompanies();
      setCompanies(response);
    } catch (error) {
      logger.error('Error loading companies:', error);
      toast.error('Could not load companies list');
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    logger.log('handleFileSelect called');
    const file = e.target.files?.[0];
    logger.log('Selected file:', file);
    
    if (!file) {
      logger.log('No file selected');
      return;
    }

    // Validate file type - now includes images
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
      logger.log('Invalid file type:', file.type);
      toast.error('Invalid file type. Please upload documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT) or images (JPG, PNG, GIF, BMP, SVG, WEBP).');
      // Reset the input
      e.target.value = '';
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      logger.log('File too large:', file.size);
      toast.error('File size must be less than 10MB');
      // Reset the input
      e.target.value = '';
      return;
    }

    logger.log('File validation passed, setting selected file');
    setSelectedFile(file);
    setExistingDocument(null); // Clear existing document when new file is selected
    setDocumentUrl(''); // Clear URL when file is selected
    setDocumentName('');
    
    toast.success(`File "${file.name}" selected successfully`);
  };

  const removeFile = () => {
    setSelectedFile(null);
    // Reset the file input
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

    // Get the actual value from the input field
    const actualDocumentName = documentNameRef.current?.value || '';
    logger.log('handleUrlSubmit - documentName from state:', documentName, 'from ref:', actualDocumentName);

    if (!actualDocumentName.trim()) {
      toast.error('Please enter a name for the document/image');
      return;
    }

    // Update state with the actual value
    setDocumentName(actualDocumentName);

    // Basic URL validation
    try {
      new URL(documentUrl);
    } catch {
      toast.error('Please enter a valid URL (e.g., https://example.com/file.pdf)');
      return;
    }

    // Clear file selection when URL is set
    setSelectedFile(null);
    setExistingDocument(null);
    toast.success('URL added successfully');
  };

  const clearUrl = () => {
    setDocumentUrl('');
    setDocumentName('');
    // Clear the uncontrolled input
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Please fill in title and message');
      return;
    }

    if (targetRoles.length === 0) {
      toast.error('Please select at least one target role');
      return;
    }

    // Validate company selection for admin users
    if (user?.role === 'admin' && selectedCompanyIds.length === 0) {
      toast.error('Please select at least one company for the announcement');
      return;
    }

    // Create FormData for file upload
    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('message', formData.message);
    formDataToSend.append('priority', formData.priority);
    formDataToSend.append('target_roles', JSON.stringify(targetRoles));
    formDataToSend.append('is_active', 'true');
    
    // Add company IDs - for admin users use selected companies, for others use user's company
    if (user?.role === 'admin' && selectedCompanyIds.length > 0) {
      selectedCompanyIds.forEach(companyId => {
        formDataToSend.append('company_ids', companyId.toString());
      });
    } else if (user?.company?.id) {
      formDataToSend.append('company_ids', user.company.id.toString());
    }
    
    if (formData.expiresAt) {
      formDataToSend.append('expires_at', new Date(formData.expiresAt).toISOString());
    }

    // Add assigned employees if manager selected any
    if (user?.role === 'manager' && assignedEmployeeIds.length > 0) {
      assignedEmployeeIds.forEach(id => {
        formDataToSend.append('assigned_employee_ids', id.toString());
      });
    }

    // Add document if selected (file or URL)
    if (selectedFile) {
      formDataToSend.append('document', selectedFile);
    } else if (documentUrl) {
      // Get the actual document name from the input field
      const actualDocumentName = documentNameRef.current?.value || documentName;
      logger.log('Form submission - documentName from state:', documentName, 'from ref:', actualDocumentName);
      
      if (actualDocumentName.trim()) {
        formDataToSend.append('document_url', documentUrl);
        formDataToSend.append('document_name', actualDocumentName);
      }
    }

    try {
      if (announcement) {
        // Update existing announcement
        await apiClient.updateAnnouncement(announcement.id, formDataToSend);
        toast.success('Announcement updated successfully');
      } else {
        // Create new announcement
        await apiClient.createAnnouncement(formDataToSend);
        toast.success('Announcement created successfully');
      }

      // Reset form
      setFormData({ title: '', message: '', priority: 'medium', expiresAt: '' });
      setTargetRoles(['manager', 'employee']);
      setAssignedEmployeeIds([]);
      setSelectedCompanyIds([]);
      setSelectedFile(null);
      setExistingDocument(null);
      setDocumentUrl('');
      setDocumentName('');
      // Clear the uncontrolled input
      if (documentNameRef.current) {
        documentNameRef.current.value = '';
      }
      setUploadMode('file');
      onOpenChange(false);
      
      // Refresh the announcements list
      await refreshData();
    } catch (error) {
      logger.error('Error saving announcement:', error);
      toast.error('Failed to save announcement');
    }
  };

  const toggleRole = (role: 'admin' | 'manager' | 'employee') => {
    setTargetRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const toggleEmployee = (employeeId: number) => {
    setAssignedEmployeeIds(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const getEmployeeDisplayName = (employee: Employee) => {
    if (employee.first_name || employee.last_name) {
      return `${employee.first_name} ${employee.last_name}`.trim();
    }
    return employee.username;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Megaphone className="w-5 h-5 text-primary" />
            {announcement ? 'Edit Announcement' : 'New Announcement'}
          </DialogTitle>
          <DialogDescription>
            {announcement 
              ? 'Update the announcement details below.'
              : 'Create a new announcement to notify team members about important updates or information.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., New Policy Update"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Write your announcement message here..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              className="input-field resize-none"
            />
          </div>

          {/* Company Selection (Admin Only) */}
          {user?.role === 'admin' && (
            <div className="space-y-2">
              <Label>Companies *</Label>
              <p className="text-xs text-muted-foreground">
                Select which companies this announcement is for (you can select multiple)
              </p>
              {loadingCompanies ? (
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading companies...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    {companies.map((company) => (
                      <div key={company.id} className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded">
                        <Checkbox
                          id={`company-${company.id}`}
                          checked={selectedCompanyIds.includes(company.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCompanyIds(prev => [...prev, company.id]);
                            } else {
                              setSelectedCompanyIds(prev => prev.filter(id => id !== company.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`company-${company.id}`}
                          className="flex-1 cursor-pointer text-sm font-medium"
                        >
                          {company.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedCompanyIds.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Selected: {companies.filter(c => selectedCompanyIds.includes(c.id)).map(c => c.name).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires On (Optional)</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="expiresAt"
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="pl-10 input-field"
                />
              </div>
            </div>
          </div>

          {/* Document/Image Upload */}
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Document/Image Attachment (Optional)</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant={uploadMode === 'file' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUploadMode('file')}
                  className="flex-1 sm:flex-none min-w-0"
                >
                  <Upload className="w-4 h-4 mr-2 flex-shrink-0" />
                  Upload File
                </Button>
                <Button
                  type="button"
                  variant={uploadMode === 'url' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUploadMode('url')}
                  className="flex-1 sm:flex-none min-w-0"
                >
                  <Link className="w-4 h-4 mr-2 flex-shrink-0" />
                  Use URL
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg">
              {uploadMode === 'file' 
                ? 'Upload a file to share with the announcement. Supported: Documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT) and Images (JPG, PNG, GIF, BMP, SVG, WEBP). Max 10MB.'
                : 'Provide a URL to an online document or image to share with the announcement.'
              }
            </div>
            
            {/* Existing Document Display */}
            {existingDocument && !selectedFile && !documentUrl && (
              <div className="p-4 border rounded-lg bg-accent/50">
                <div className="flex items-start gap-3">
                  {isImageFile(existingDocument.name) ? (
                    <Image className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium break-words">{existingDocument.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Current {isImageFile(existingDocument.name) ? 'image' : 'document'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(existingDocument.url, '_blank')}
                    className="flex-1 sm:flex-none"
                  >
                    View
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeExistingDocument}
                    className="flex-1 sm:flex-none"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            )}

            {/* File Upload Mode */}
            {uploadMode === 'file' && !existingDocument && (
              <div className="space-y-4">
                {selectedFile ? (
                  <div className="p-4 border rounded-lg bg-accent/50">
                    <div className="flex items-start gap-3">
                      {isImageFile(selectedFile.name) ? (
                        <Image className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium break-words">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {isImageFile(selectedFile.name) ? 'Image' : 'Document'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                        className="flex-1 sm:flex-none"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove File
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Click to select a file or drag and drop
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
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supported: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG, GIF, BMP, SVG, WEBP
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* URL Input Mode */}
            {uploadMode === 'url' && !existingDocument && (
              <div className="space-y-4">
                {documentUrl && documentName ? (
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg bg-accent/50">
                      <div className="flex items-start gap-3">
                        {isImageUrl(documentUrl) ? (
                          <Image className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Link className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium break-words">{documentName}</p>
                          <p className="text-xs text-muted-foreground break-all">
                            {documentUrl}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isImageUrl(documentUrl) ? 'Image URL' : 'Document URL'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(documentUrl, '_blank')}
                          className="flex-1 sm:flex-none"
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearUrl}
                          className="flex-1 sm:flex-none"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                    <div className="grid gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="documentUrl">Document/Image URL</Label>
                        <Input
                          id="documentUrl"
                          type="url"
                          placeholder="https://example.com/document.pdf"
                          value={documentUrl}
                          onChange={(e) => setDocumentUrl(e.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="documentName">Display Name</Label>
                        <input
                          ref={documentNameRef}
                          id="documentName"
                          type="text"
                          placeholder="e.g., Policy Document, Company Logo"
                          defaultValue={documentName}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            logger.log('Uncontrolled input onChange:', newValue, 'length:', newValue.length);
                            setDocumentName(newValue);
                          }}
                          onKeyDown={(e) => {
                            logger.log('KeyDown event:', e.key, 'current value:', e.currentTarget.value);
                          }}
                          onInput={(e) => {
                            logger.log('Input event:', e.currentTarget.value);
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm input-field"
                          autoComplete="off"
                          spellCheck="false"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUrlSubmit}
                      disabled={!documentUrl.trim() || !documentName.trim()}
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
              <div className="space-y-3 p-3 border rounded-lg bg-accent/30">
                <p className="text-sm text-muted-foreground font-medium">Replace current attachment:</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadMode('file');
                      setExistingDocument(null);
                    }}
                    className="flex-1 sm:flex-none min-w-0"
                  >
                    <Upload className="w-4 h-4 mr-2 flex-shrink-0" />
                    Replace with File
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadMode('url');
                      setExistingDocument(null);
                    }}
                    className="flex-1 sm:flex-none min-w-0"
                  >
                    <Link className="w-4 h-4 mr-2 flex-shrink-0" />
                    Replace with URL
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Target Audience *</Label>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="role-admin"
                  checked={targetRoles.includes('admin')}
                  onCheckedChange={() => toggleRole('admin')}
                />
                <label htmlFor="role-admin" className="text-sm cursor-pointer">
                  Admins
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="role-manager"
                  checked={targetRoles.includes('manager')}
                  onCheckedChange={() => toggleRole('manager')}
                />
                <label htmlFor="role-manager" className="text-sm cursor-pointer">
                  Managers
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="role-employee"
                  checked={targetRoles.includes('employee')}
                  onCheckedChange={() => toggleRole('employee')}
                />
                <label htmlFor="role-employee" className="text-sm cursor-pointer">
                  Employees
                </label>
              </div>
            </div>
          </div>

          {/* Assign to Specific Employees (Managers Only) */}
          {user?.role === 'manager' && (
            <div className="space-y-3">
              <Label>Assign to Specific Employees (Optional)</Label>
              <p className="text-xs text-muted-foreground">
                Select specific employees to see this announcement. If none selected, all employees in target roles will see it.
              </p>
              {loadingEmployees ? (
                <div className="flex items-center gap-2 p-4 border rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading employees...</span>
                </div>
              ) : employees.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-start gap-2 p-2 hover:bg-accent/50 rounded">
                      <Checkbox
                        id={`employee-${employee.id}`}
                        checked={assignedEmployeeIds.includes(employee.id)}
                        onCheckedChange={() => toggleEmployee(employee.id)}
                      />
                      <label
                        htmlFor={`employee-${employee.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="text-sm font-medium">
                          {getEmployeeDisplayName(employee)}
                        </div>
                        {employee.email && (
                          <div className="text-xs text-muted-foreground">
                            {employee.email}
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">No employees assigned to you</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="btn-primary">
              {announcement ? 'Update Announcement' : 'Send Announcement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
