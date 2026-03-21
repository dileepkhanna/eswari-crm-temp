import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/dashboard/StatCard';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import { apiClient } from '@/lib/api';
import { Users, CalendarOff, CalendarDays, Megaphone, Clock, AlertCircle, RefreshCw } from 'lucide-react';

import { logger } from '@/lib/logger';
interface HRDashboardMetrics {
  total_employees: number;
  pending_leaves: number;
  upcoming_holidays: number;
  active_announcements: number;
}

interface ActivityLog {
  id: number;
  user_name: string;
  user_role: string;
  module: string;
  action: string;
  details: string;
  created_at: string;
}

export default function HRDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<HRDashboardMetrics | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getHRDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      logger.error('Error fetching HR dashboard metrics:', err);
      const errorMessage = err?.response?.data?.error || 
                         err?.response?.data?.detail || 
                         err?.message || 
                         'Failed to load dashboard metrics. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      setActivitiesLoading(true);
      setActivitiesError(null);
      // Fetch recent HR-related activities (limit to 10 most recent)
      const response = await apiClient.getActivityLogs({ 
        ordering: '-created_at',
        page_size: 10,
        module__in: 'users,leaves,holidays,announcements'
      });
      
      // Handle both paginated and non-paginated responses
      const activities = response.results || response;
      setRecentActivities(Array.isArray(activities) ? activities : []);
    } catch (err: any) {
      logger.error('Error fetching recent activities:', err);
      const errorMessage = err?.response?.data?.error || 
                         err?.response?.data?.detail || 
                         err?.message || 
                         'Failed to load recent activities.';
      setActivitiesError(errorMessage);
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (module: string): string => {
    const icons: Record<string, string> = {
      users: '👤',
      leaves: '📅',
      holidays: '🎉',
      announcements: '📢',
    };
    return icons[module] || '📝';
  };

  const getActivityColor = (action: string): string => {
    const colors: Record<string, string> = {
      create: 'text-success',
      created: 'text-success',
      update: 'text-info',
      updated: 'text-info',
      delete: 'text-destructive',
      deleted: 'text-destructive',
      approve: 'text-success',
      approved: 'text-success',
      reject: 'text-warning',
      rejected: 'text-warning',
    };
    return colors[action] || 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen">
      <TopBar title="HR Dashboard" subtitle="Welcome back! Here's your HR overview." />
      
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Announcements */}
        <AnnouncementBanner userRole="hr" maxDisplay={2} />

        {/* Error State */}
        {error && (
          <div className="glass-card rounded-2xl p-6 bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-destructive font-semibold mb-1">Failed to Load Dashboard</h3>
                <p className="text-destructive/80 text-sm mb-3">{error}</p>
                <button
                  onClick={fetchDashboardMetrics}
                  disabled={loading}
                  className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Retrying...' : 'Retry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="stat-card animate-pulse">
                <div className="h-20 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Grid */}
        {!loading && metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Employees"
              value={metrics.total_employees}
              change={`${metrics.total_employees} ${metrics.total_employees === 1 ? 'employee' : 'employees'} in system`}
              changeType="neutral"
              icon={Users}
              iconColor="gradient-primary"
              delay={0}
              href="/hr/employees"
            />
            <StatCard
              title="Pending Leaves"
              value={metrics.pending_leaves}
              change={metrics.pending_leaves > 0 ? "Requires attention" : "No pending requests"}
              changeType={metrics.pending_leaves > 0 ? 'negative' : 'neutral'}
              icon={CalendarOff}
              iconColor="bg-warning"
              delay={50}
              href="/hr/leaves"
            />
            <StatCard
              title="Upcoming Holidays"
              value={metrics.upcoming_holidays}
              change={metrics.upcoming_holidays > 0 ? "Scheduled ahead" : "No upcoming holidays"}
              changeType="neutral"
              icon={CalendarDays}
              iconColor="bg-info"
              delay={100}
              href="/hr/holidays"
            />
            <StatCard
              title="Active Announcements"
              value={metrics.active_announcements}
              change={metrics.active_announcements > 0 ? "Currently active" : "No active announcements"}
              changeType="neutral"
              icon={Megaphone}
              iconColor="gradient-accent"
              delay={150}
              href="/hr/announcements"
            />
          </div>
        )}

        {/* Quick Actions */}
        {!loading && metrics && (
          <div className="glass-card rounded-2xl p-4 md:p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
              <button
                onClick={() => navigate('/hr/employees')}
                className="btn-primary flex items-center justify-center gap-2 py-2.5 md:py-3 text-sm md:text-base rounded-lg"
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Manage Employees</span>
              </button>
              <button
                onClick={() => navigate('/hr/leaves')}
                className="btn-secondary flex items-center justify-center gap-2 py-2.5 md:py-3 text-sm md:text-base rounded-lg"
              >
                <CalendarOff className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Review Leaves</span>
              </button>
              <button
                onClick={() => navigate('/hr/holidays')}
                className="btn-secondary flex items-center justify-center gap-2 py-2.5 md:py-3 text-sm md:text-base rounded-lg"
              >
                <CalendarDays className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Add Holiday</span>
              </button>
              <button
                onClick={() => navigate('/hr/announcements')}
                className="btn-secondary flex items-center justify-center gap-2 py-2.5 md:py-3 text-sm md:text-base rounded-lg"
              >
                <Megaphone className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Create Announcement</span>
              </button>
            </div>
          </div>
        )}

        {/* Recent Activity Feed */}
        {!loading && (
          <div className="glass-card rounded-2xl p-4 md:p-6 animate-slide-up" style={{ animationDelay: '250ms' }}>
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                <span className="truncate">Recent Activity</span>
              </h3>
            </div>

            {activitiesLoading ? (
              <div className="space-y-2 md:space-y-3">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-muted/50 animate-pulse">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-muted flex-shrink-0"></div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="h-3 md:h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-2 md:h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activitiesError ? (
              <div className="text-center py-6 md:py-8">
                <AlertCircle className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 text-destructive opacity-50" />
                <p className="text-sm md:text-base text-destructive mb-3">{activitiesError}</p>
                <button
                  onClick={fetchRecentActivities}
                  disabled={activitiesLoading}
                  className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className={`w-4 h-4 ${activitiesLoading ? 'animate-spin' : ''}`} />
                  {activitiesLoading ? 'Retrying...' : 'Retry'}
                </button>
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-1 md:space-y-2">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center text-base md:text-lg">
                      {getActivityIcon(activity.module)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm text-foreground break-words">
                        <span className="font-medium">{activity.user_name}</span>
                        {' '}
                        <span className={getActivityColor(activity.action)}>
                          {activity.action}
                        </span>
                        {' '}
                        <span className="text-muted-foreground">{activity.details}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 md:mt-1">
                        {formatTimeAgo(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <Clock className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 opacity-50" />
                <p className="text-sm md:text-base">No recent activity to display</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
