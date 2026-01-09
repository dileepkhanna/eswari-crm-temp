import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface LeaveRejectDialogProps {
  open: boolean;
  onClose: () => void;
  onReject: (reason?: string) => void;
  employeeName: string;
}

export default function LeaveRejectDialog({ open, onClose, onReject, employeeName }: LeaveRejectDialogProps) {
  const [reason, setReason] = useState('');

  const handleReject = () => {
    onReject(reason.trim() || undefined);
    setReason('');
    onClose();
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Leave Request</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            You are about to reject the leave request from <span className="font-medium text-foreground">{employeeName}</span>.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="reason">
              Rejection Reason <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for rejection..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject}>
            Reject Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
