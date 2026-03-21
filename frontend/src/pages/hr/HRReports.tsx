import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { apiClient } from '@/lib/api';
import { Users, UserCheck, UserX, BarChart3, AlertCircle, RefreshCw, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

import { logger } from '@/lib/logger';
interface EmployeeStatistics {
  total_employees: number;
  by_role: Array<{ role: string; count: number }>;
  with_manager: number;
  without_manager: number;
}

interface LeaveStatistics {
  total_leaves: number;
  by_status: Array<{ status: string; count: number }>;
  by_type: Array<{ leave_type: string; count: number }>;
  pending_count: number;
}

export default function HRReports() {
  const [employeeStats, setEmployeeStats] = useState<EmployeeStatistics | null>(null);
  const [leaveStats, setLeaveStats] = useState<LeaveStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployeeStatistics = async () => {
    try {
      const isRefresh = !loading;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await apiClient.getEmployeeStatistics();
      setEmployeeStats(data);
    } catch (err: any) {
      logger.error('Error fetching employee statistics:', err);
      const errorMessage = err?.response?.data?.error || 
                         err?.response?.data?.detail || 
                         err?.message || 
                         'Failed to load employee statistics. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchLeaveStatistics = async () => {
    try {
      const data = await apiClient.getLeaveStatistics();
      setLeaveStats(data);
    } catch (err: any) {
      logger.error('Error fetching leave statistics:', err);
      // Don't set error state for leave stats, just log it
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      fetchEmployeeStatistics(),
      fetchLeaveStatistics()
    ]);
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchEmployeeStatistics(),
        fetchLeaveStatistics()
      ]);
    };
    fetchData();
  }, []);

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      manager: 'Manager',
      employee: 'Employee',
      hr: 'HR',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string): string => {
    const colors: Record<string, string> = {
      admin: 'bg-destructive/10 text-destructive border-destructive/20',
      manager: 'bg-info/10 text-info border-info/20',
      employee: 'bg-success/10 text-success border-success/20',
      hr: 'bg-warning/10 text-warning border-warning/20',
    };
    return colors[role] || 'bg-muted/10 text-muted-foreground border-muted/20';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: 'bg-warning/10 text-warning border-warning/20',
      approved: 'bg-success/10 text-success border-success/20',
      rejected: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return colors[status] || 'bg-muted/10 text-muted-foreground border-muted/20';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
    };
    return icons[status] || Clock;
  };

  const getLeaveTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      sick: 'Sick Leave',
      casual: 'Casual Leave',
      annual: 'Annual Leave',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const getLeaveTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      sick: 'bg-destructive/10 text-destructive border-destructive/20',
      casual: 'bg-info/10 text-info border-info/20',
      annual: 'bg-success/10 text-success border-success/20',
      other: 'bg-warning/10 text-warning border-warning/20',
    };
    return colors[type] || 'bg-muted/10 text-muted-foreground border-muted/20';
  };

  return (
    <div className="min-h-screen">
      <TopBar title="HR Reports" subtitle="View employee statistics and analytics" />
      
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Refresh Button */}
        {!loading && (
          <div className="flex justify-end">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="glass-card rounded-2xl p-6 bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-destructive font-semibold mb-1">Failed to Load Statistics</h3>
                <p className="text-destructive/80 text-sm mb-3">{error}</p>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Retrying...' : 'Retry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6 animate-pulse">
              <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-24 bg-muted rounded"></div>
                ))}
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6 animate-pulse">
              <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Employee Statistics */}
        {!loading && employeeStats && (
          <>
            {/* Overview Cards */}
            <div className="glass-card rounded-2xl p-4 md:p-6 animate-slide-up">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Employee Overview</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Employees */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Employees</p>
                      <p className="text-2xl font-bold text-foreground">{employeeStats.total_employees}</p>
                    </div>
                  </div>
                </div>

                {/* With Manager */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/20">
                      <UserCheck className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">With Manager</p>
                      <p className="text-2xl font-bold text-foreground">{employeeStats.with_manager}</p>
                    </div>
                  </div>
                </div>

                {/* Without Manager */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/20">
                      <UserX className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Without Manager</p>
                      <p className="text-2xl font-bold text-foreground">{employeeStats.without_manager}</p>
                    </div>
                  </div>
                </div>

                {/* Manager Percentage */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-info/20">
                      <BarChart3 className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Manager Coverage</p>
                      <p className="text-2xl font-bold text-foreground">
                        {employeeStats.total_employees > 0 
                          ? Math.round((employeeStats.with_manager / employeeStats.total_employees) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Employees by Role */}
            <div className="glass-card rounded-2xl p-4 md:p-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Employees by Role</h3>
              </div>
              
              <div className="space-y-3">
                {employeeStats.by_role.map((roleData) => {
                  const percentage = employeeStats.total_employees > 0 
                    ? (roleData.count / employeeStats.total_employees) * 100 
                    : 0;
                  
                  return (
                    <div key={roleData.role} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(roleData.role)}`}>
                            {getRoleLabel(roleData.role)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {roleData.count} {roleData.count === 1 ? 'employee' : 'employees'}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            roleData.role === 'admin' ? 'bg-destructive' :
                            roleData.role === 'manager' ? 'bg-info' :
                            roleData.role === 'employee' ? 'bg-success' :
                            roleData.role === 'hr' ? 'bg-warning' :
                            'bg-muted-foreground'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leave Statistics */}
            {leaveStats && (
              <>
                {/* Leave Overview Cards */}
                <div className="glass-card rounded-2xl p-4 md:p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Leave Overview</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Leaves */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Leaves</p>
                          <p className="text-2xl font-bold text-foreground">{leaveStats.total_leaves}</p>
                        </div>
                      </div>
                    </div>

                    {/* Pending Leaves */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-warning/20">
                          <Clock className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Pending</p>
                          <p className="text-2xl font-bold text-foreground">{leaveStats.pending_count}</p>
                        </div>
                      </div>
                    </div>

                    {/* Approved Leaves */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-success/20">
                          <CheckCircle className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Approved</p>
                          <p className="text-2xl font-bold text-foreground">
                            {leaveStats.by_status.find(s => s.status === 'approved')?.count || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Rejected Leaves */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-destructive/20">
                          <XCircle className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Rejected</p>
                          <p className="text-2xl font-bold text-foreground">
                            {leaveStats.by_status.find(s => s.status === 'rejected')?.count || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Leaves by Status */}
                <div className="glass-card rounded-2xl p-4 md:p-6 animate-slide-up" style={{ animationDelay: '150ms' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Leaves by Status</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {leaveStats.by_status.map((statusData) => {
                      const percentage = leaveStats.total_leaves > 0 
                        ? (statusData.count / leaveStats.total_leaves) * 100 
                        : 0;
                      const StatusIcon = getStatusIcon(statusData.status);
                      
                      return (
                        <div key={statusData.status} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1.5 ${getStatusColor(statusData.status)}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {getStatusLabel(statusData.status)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {statusData.count} {statusData.count === 1 ? 'leave' : 'leaves'}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                statusData.status === 'pending' ? 'bg-warning' :
                                statusData.status === 'approved' ? 'bg-success' :
                                statusData.status === 'rejected' ? 'bg-destructive' :
                                'bg-muted-foreground'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Leaves by Type */}
                <div className="glass-card rounded-2xl p-4 md:p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Leaves by Type</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {leaveStats.by_type.map((typeData) => {
                      const percentage = leaveStats.total_leaves > 0 
                        ? (typeData.count / leaveStats.total_leaves) * 100 
                        : 0;
                      
                      return (
                        <div key={typeData.leave_type} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getLeaveTypeColor(typeData.leave_type)}`}>
                                {getLeaveTypeLabel(typeData.leave_type)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {typeData.count} {typeData.count === 1 ? 'leave' : 'leaves'}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                typeData.leave_type === 'sick' ? 'bg-destructive' :
                                typeData.leave_type === 'casual' ? 'bg-info' :
                                typeData.leave_type === 'annual' ? 'bg-success' :
                                typeData.leave_type === 'other' ? 'bg-warning' :
                                'bg-muted-foreground'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
