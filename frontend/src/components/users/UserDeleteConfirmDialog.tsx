import { useState, useEffect } from 'react';
// import { supabase } from '@/integrations/supabase/client'; // Removed - using Django backend
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, UserX, Trash2, FileText, FolderKanban, ClipboardList, Calendar, Megaphone, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserDeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onDeactivate: () => Promise<void>;
  onDelete: () => Promise<void>;
  userName: string;
  userId: string;
}

interface DataCounts {
  leads: number;
  projects: number;
  tasks: number;
  leaves: number;
  announcements: number;
  activityLogs: number;
}

export default function UserDeleteConfirmDialog({
  open,
  onClose,
  onDeactivate,
  onDelete,
  userName,
  userId,
}: UserDeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(true);
  const [dataCounts, setDataCounts] = useState<DataCounts | null>(null);
  const [action, setAction] = useState<'deactivate' | 'delete' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchDataCounts();
    }
  }, [open, userId]);

  const fetchDataCounts = async () => {
    setLoading(true);
    try {
      // TODO: Implement data count APIs in Django backend
      // const [leadsRes, projectsRes, tasksRes, leavesRes, announcementsRes, activityRes] = await Promise.all([
      //   supabase.from('leads').select('id', { count: 'exact', head: true }).eq('created_by', userId),
      //   supabase.from('projects').select('id', { count: 'exact', head: true }).eq('created_by', userId),
      //   supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', userId),
      //   supabase.from('leaves').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      //   supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('created_by', userId),
      //   supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      // ]);

      // Placeholder data counts
      setDataCounts({
        leads: 0,
        projects: 0,
        tasks: 0,
        leaves: 0,
        announcements: 0,
        activityLogs: activityRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching data counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!action) return;
    
    setIsProcessing(true);
    try {
      if (action === 'deactivate') {
        await onDeactivate();
      } else {
        await onDelete();
      }
      onClose();
    } finally {
      setIsProcessing(false);
      setAction(null);
    }
  };

  const totalDataCount = dataCounts 
    ? dataCounts.leads + dataCounts.projects + dataCounts.tasks + dataCounts.leaves + dataCounts.announcements + dataCounts.activityLogs
    : 0;

  const dataItems = dataCounts ? [
    { label: 'Leads', count: dataCounts.leads, icon: FileText },
    { label: 'Projects', count: dataCounts.projects, icon: FolderKanban },
    { label: 'Tasks', count: dataCounts.tasks, icon: ClipboardList },
    { label: 'Leaves', count: dataCounts.leaves, icon: Calendar },
    { label: 'Announcements', count: dataCounts.announcements, icon: Megaphone },
    { label: 'Activity Logs', count: dataCounts.activityLogs, icon: Activity },
  ] : [];

  return (
    <AlertDialog open={open} onOpenChange={() => { if (!isProcessing) onClose(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Remove User: {userName}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>Choose how you want to handle this user account:</p>
              
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading user data...</span>
                </div>
              ) : (
                <>
                  {totalDataCount > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <p className="text-sm font-medium text-foreground">Data associated with this user:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {dataItems.filter(item => item.count > 0).map(item => (
                          <div key={item.label} className="flex items-center gap-2 text-sm">
                            <item.icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{item.label}:</span>
                            <span className="font-medium text-foreground">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <button
                      onClick={() => setAction('deactivate')}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all",
                        action === 'deactivate' 
                          ? "border-warning bg-warning/10" 
                          : "border-border hover:border-warning/50 hover:bg-warning/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-warning/15">
                          <UserX className="w-4 h-4 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Deactivate Account</p>
                          <p className="text-xs text-muted-foreground">User can't login, but all data is preserved</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setAction('delete')}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all",
                        action === 'delete' 
                          ? "border-destructive bg-destructive/10" 
                          : "border-border hover:border-destructive/50 hover:bg-destructive/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-destructive/15">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Delete Permanently</p>
                          <p className="text-xs text-muted-foreground">
                            {totalDataCount > 0 
                              ? `Removes user and all ${totalDataCount} associated records`
                              : "Removes user account completely"
                            }
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <Button
            onClick={handleAction}
            disabled={!action || isProcessing}
            variant={action === 'delete' ? 'destructive' : 'default'}
            className={cn(
              action === 'deactivate' && "bg-warning text-warning-foreground hover:bg-warning/90"
            )}
          >
            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {action === 'deactivate' ? 'Deactivate' : action === 'delete' ? 'Delete' : 'Select an option'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
