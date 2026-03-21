import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, User, Crown, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
interface PromotionModalProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    user_id: string;
    role: string;
    company?: {
      name: string;
      code: string;
    };
  } | null;
  onPromote: (userId: string) => Promise<{ success: boolean; message?: string; newUsername?: string }>;
}

export default function PromotionModal({ open, onClose, user, onPromote }: PromotionModalProps) {
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionComplete, setPromotionComplete] = useState(false);
  const [promotionResult, setPromotionResult] = useState<{
    message: string;
    newUsername: string;
  } | null>(null);

  const handlePromote = async () => {
    if (!user) return;

    try {
      setIsPromoting(true);
      const result = await onPromote(user.id);
      
      if (result.success) {
        setPromotionResult({
          message: result.message || 'Promotion successful!',
          newUsername: result.newUsername || `${user.name.toLowerCase().replace(/\s+/g, '_')}_manager_XX`
        });
        setPromotionComplete(true);
        toast.success(result.message || 'Employee promoted successfully!');
      } else {
        toast.error(result.message || 'Failed to promote employee');
        onClose();
      }
    } catch (error: any) {
      logger.error('Error promoting employee:', error);
      toast.error('Failed to promote employee: ' + error.message);
      onClose();
    } finally {
      setIsPromoting(false);
    }
  };

  const handleClose = () => {
    setPromotionComplete(false);
    setPromotionResult(null);
    onClose();
  };

  if (!user) return null;

  // Show success screen after promotion
  if (promotionComplete && promotionResult) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600 flex items-center justify-center gap-2">
              <CheckCircle className="w-6 h-6" />
              Promotion Successful!
            </DialogTitle>
            <DialogDescription className="text-center">
              {user.name} has been successfully promoted to Manager.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <Crown className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-muted-foreground mb-4">
                Congratulations! The promotion has been completed.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Employee Name</label>
                <p className="text-sm mt-1 font-semibold">{user.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Previous Role</label>
                  <div className="mt-1">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Employee
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">New Role</label>
                  <div className="mt-1">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Manager
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">New User ID</label>
                <code className="block text-sm mt-1 p-2 bg-background rounded border font-mono">
                  {promotionResult.newUsername}
                </code>
              </div>

              {user.company && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p className="text-sm mt-1">{user.company.name}</p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> A promotion announcement has been created and will be visible to all company members. The employee's login credentials remain the same, but they now have manager-level access.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show promotion confirmation dialog
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Promote Employee to Manager
          </DialogTitle>
          <DialogDescription>
            Confirm the promotion of this employee to manager role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-4 rounded-lg bg-muted space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-semibold">
                {user.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-muted-foreground">ID: {user.user_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Role</label>
                <div className="mt-1">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <User className="w-3 h-3 mr-1" />
                    Employee
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">New Role</label>
                <div className="mt-1">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Crown className="w-3 h-3 mr-1" />
                    Manager
                  </Badge>
                </div>
              </div>
            </div>

            {user.company && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company</label>
                <p className="text-sm mt-1">{user.company.name}</p>
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">What will happen:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Role will change from Employee to Manager</li>
              <li>• Username will be updated to reflect manager role</li>
              <li>• Manager assignment will be removed</li>
              <li>• Promotion announcement will be created</li>
              <li>• All historical data will be preserved</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              disabled={isPromoting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePromote} 
              className="btn-accent" 
              disabled={isPromoting}
            >
              {isPromoting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Promoting...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Confirm Promotion
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}