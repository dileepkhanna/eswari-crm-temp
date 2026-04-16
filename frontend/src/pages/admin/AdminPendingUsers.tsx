import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useNotifications } from '@/contexts/NotificationContext';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, XIcon, UserIcon, MailIcon, PhoneIcon, BriefcaseIcon, CalendarIcon, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface PendingUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  company_info: {
    id: string;
    name: string;
  } | null;
  designation: string | null;
  joining_date: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminPendingUsers() {
  const { user } = useAuth();
  const { isSupported, isEnabled, enableNotifications } = useNotifications();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchPendingUsers = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const data = await apiClient.get('/auth/users/pending/');
      console.log('Pending users response:', data);
      setPendingUsers(data?.users || []);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      if (showLoader) toast.error('Failed to load pending users');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') return;

    fetchPendingUsers(true);

    // Poll every 10 seconds so new registrations appear without manual refresh
    const interval = setInterval(() => fetchPendingUsers(false), 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleApprove = async (userId: string) => {
    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      await apiClient.post(`/auth/users/${userId}/approve/`);
      toast.success('User approved successfully');
      fetchPendingUsers(false);
      window.dispatchEvent(new Event('pendingUsersUpdated'));
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast.error(error.response?.data?.error || 'Failed to approve user');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this user? This will permanently delete their account.')) {
      return;
    }

    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      await apiClient.post(`/auth/users/${userId}/reject/`);
      toast.success('User rejected and removed');
      fetchPendingUsers(false);
      window.dispatchEvent(new Event('pendingUsersUpdated'));
    } catch (error: any) {
      console.error('Error rejecting user:', error);
      toast.error(error.response?.data?.error || 'Failed to reject user');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'manager': return 'bg-primary/15 text-primary border-primary/30';
      case 'hr': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'employee': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Pending Users" />
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Only administrators can access this page</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Pending User Approvals" />
      
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">

        {/* Push notification prompt — only show if supported and not yet enabled */}
        {isSupported && !isEnabled && (
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Enable push notifications</p>
                <p className="text-xs text-amber-700">Get notified instantly when a new user registers via invite link.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100"
              onClick={async () => {
                try {
                  await enableNotifications();
                  toast.success('Push notifications enabled!');
                } catch {
                  toast.error('Could not enable notifications. Please allow them in browser settings.');
                }
              }}>
              Enable
            </Button>
          </div>
        )}

        {isEnabled && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
            <Bell className="w-4 h-4" />
            Push notifications active — you'll be notified when new users register.
          </div>
        )}
        <div className="glass-card p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">Users Pending Approval</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Review and approve users created by HR
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {pendingUsers.length} Pending
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-muted-foreground">Loading pending users...</span>
              </div>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                <CheckIcon className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">No users pending approval at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((pendingUser) => (
                <div
                  key={pendingUser.id}
                  className="glass-card p-4 rounded-lg border border-yellow-200 bg-yellow-50/50"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold">
                              {pendingUser.first_name} {pendingUser.last_name}
                            </h3>
                            <Badge className={`${getRoleBadgeColor(pendingUser.role)} border`}>
                              {pendingUser.role}
                            </Badge>
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                              Pending Approval
                            </Badge>
                            {!pendingUser.is_active && (
                              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">@{pendingUser.username}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-0 md:pl-15">
                        {pendingUser.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <MailIcon className="w-4 h-4 text-muted-foreground" />
                            <span>{pendingUser.email}</span>
                          </div>
                        )}
                        {pendingUser.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <PhoneIcon className="w-4 h-4 text-muted-foreground" />
                            <span>{pendingUser.phone}</span>
                          </div>
                        )}
                        {pendingUser.designation && (
                          <div className="flex items-center gap-2 text-sm">
                            <BriefcaseIcon className="w-4 h-4 text-muted-foreground" />
                            <span>{pendingUser.designation}</span>
                          </div>
                        )}
                        {pendingUser.joining_date && (
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                            <span>Joining: {new Date(pendingUser.joining_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {pendingUser.company_info && (
                          <div className="flex items-center gap-2 text-sm">
                            <BriefcaseIcon className="w-4 h-4 text-muted-foreground" />
                            <span>Company: {pendingUser.company_info.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarIcon className="w-4 h-4" />
                          <span>Created: {new Date(pendingUser.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 md:flex-col md:w-32">
                      <Button
                        onClick={() => handleApprove(pendingUser.id)}
                        disabled={processingIds.has(pendingUser.id)}
                        className="btn-primary flex-1 md:flex-none"
                      >
                        <CheckIcon className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(pendingUser.id)}
                        disabled={processingIds.has(pendingUser.id)}
                        variant="outline"
                        className="flex-1 md:flex-none text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <XIcon className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
