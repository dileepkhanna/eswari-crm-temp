import { useState, useRef, useEffect } from 'react';
import { Leave } from '@/types';
import { useAuth } from '@/contexts/AuthContextDjango';
// import { supabase } from '@/integrations/supabase/client'; // Removed - using Django backend
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, FileText, X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LeaveFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (leaveData: Partial<Leave> & { documentUrl?: string }) => void;
  previousLeaveCount?: number;
}

export default function LeaveFormModal({ open, onClose, onSave, previousLeaveCount = 0 }: LeaveFormModalProps) {
  const { user } = useAuth();
  const [leaveType, setLeaveType] = useState<string>('casual');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document is required for 2nd leave onwards in the current month
  const isDocumentRequired = previousLeaveCount >= 1;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF, JPG, and PNG files are allowed');
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadDocument = async (): Promise<string | null> => {
    if (!selectedFile || !user) return null;

    // TODO: Implement file upload API in Django backend
    // const fileExt = selectedFile.name.split('.').pop();
    // const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    // const { data, error } = await supabase.storage
    //   .from('leave-documents')
    //   .upload(fileName, selectedFile);

    // if (error) {
    //   console.error('Upload error:', error);
    //   throw new Error('Failed to upload document');
    // }

    // const { data: urlData } = supabase.storage
    //   .from('leave-documents')
    //   .getPublicUrl(fileName);

    // return urlData.publicUrl;
    
    // Mock return for now
    return 'mock-document-url';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate || !reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isDocumentRequired && !selectedFile) {
      toast.error('Document is required for your 2nd leave onwards in the current month');
      return;
    }

    setUploading(true);
    try {
      let documentUrl: string | undefined;
      
      if (selectedFile) {
        documentUrl = (await uploadDocument()) || undefined;
      }

      onSave({
        userId: user?.id || '',
        userName: user?.name || '',
        userRole: user?.role || 'employee',
        type: leaveType as Leave['type'],
        startDate,
        endDate,
        reason: reason.trim(),
        status: 'pending',
        documentUrl,
      });

      // Reset form
      setLeaveType('casual');
      setStartDate(undefined);
      setEndDate(undefined);
      setReason('');
      setSelectedFile(null);
      onClose();
    } catch (error) {
      toast.error('Failed to submit leave request');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[min(92vw,40rem)] sm:max-w-none p-5 sm:p-7">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="leaveType">Leave Type</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual Leave</SelectItem>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="annual">Annual Leave</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM dd, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM dd, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for your leave..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Document Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Supporting Document
              {isDocumentRequired ? (
                <span className="text-destructive text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Required
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">(Optional)</span>
              )}
            </Label>
            
            {isDocumentRequired && (
              <p className="text-xs text-muted-foreground">
                Document is required from your 2nd leave request onwards in the current month. Leave count resets monthly.
              </p>
            )}

            {selectedFile ? (
              <div className="w-full max-w-full overflow-hidden flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                <FileText className="w-8 h-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload document
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, PNG (max 10MB)
                </p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!startDate || !endDate || !reason.trim() || (isDocumentRequired && !selectedFile) || uploading}
            >
              {uploading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
