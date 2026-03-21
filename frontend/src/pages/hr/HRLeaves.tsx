import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { Search, Loader2, CheckCircle, XCircle, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { logger } from '@/lib/logger';
interface Leave {
  id: number;
  user: number;
  user_name: string;
  leave_type: 'sick' | 'casual' | 'annual' | 'other';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  approved_by?: number;
  approved_by_name?: string;
  created_at: string;
  document?: string;
}

export default function HRLeaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Reject leave modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectingLeave, setRejectingLeave] = useState<Leave | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Delete leave modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingLeave, setDeletingLeave] = useState<Leave | null>(null);

  // View leave details modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingLeave, setViewingLeave] = useState<Leave | null>(null);

  // Fetch leaves from API
  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError(null);
      
      logger.log('🔄 Fetching leaves from backend...');
      const response = await apiClient.getLeaves();
      
      // Handle both paginated and non-paginated responses
      let leavesData: Leave[];
      if (Array.isArray(response)) {
        leavesData = response;
      } else if (response && typeof response === 'object' && 'results' in response) {
        leavesData = (response as any).results;
      } else {
        leavesData = [];
      }
      
      logger.log(`📊 Fetched ${leavesData.length} leaves from backend`);
      setLeaves(leavesData);
      
    } catch (error: any) {
      logger.error('❌ Error fetching leaves:', error);
      setError('Failed to load leaves. Please try again.');
      toast.error('Failed to fetch leaves');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Handle approve leave
  const handleApproveLeave = async (leave: Leave) => {
    try {
      logger.log(`🔄 Approving leave ${leave.id}...`);
      await apiClient.approveLeave(leave.id);
      
      toast.success('Leave approved successfully');
      
      // Refresh leave list
      fetchLeaves();
      
    } catch (error: any) {
      logger.error('❌ Error approving leave:', error);
      const errorMessage = error.message || 'Failed to approve leave';
      toast.error(errorMessage);
    }
  };

  // Handle open reject modal
  const handleOpenRejectModal = (leave: Leave) => {
    setRejectingLeave(leave);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  // Handle reject leave
  const handleRejectLeave = async () => {
    if (!rejectingLeave) return;

    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      setIsRejecting(true);
      
      logger.log(`🔄 Rejecting leave ${rejectingLeave.id}...`);
      await apiClient.rejectLeave(rejectingLeave.id, rejectionReason.trim());
      
      toast.success('Leave rejected successfully');
      setIsRejectModalOpen(false);
      setRejectingLeave(null);
      setRejectionReason('');
      
      // Refresh leave list
      fetchLeaves();
      
    } catch (error: any) {
      logger.error('❌ Error rejecting leave:', error);
      const errorMessage = error.message || 'Failed to reject leave';
      toast.error(errorMessage);
    } finally {
      setIsRejecting(false);
    }
  };

  // Handle open delete modal
  const handleOpenDeleteModal = (leave: Leave) => {
    setDeletingLeave(leave);
    setIsDeleteModalOpen(true);
  };

  // Handle delete leave
  const handleDeleteLeave = async () => {
    if (!deletingLeave) return;

    try {
      setIsDeleting(true);
      
      logger.log(`🔄 Deleting leave ${deletingLeave.id}...`);
      await apiClient.deleteLeave(deletingLeave.id);
      
      toast.success('Leave deleted successfully');
      setIsDeleteModalOpen(false);
      setDeletingLeave(null);
      
      // Refresh leave list
      fetchLeaves();
      
    } catch (error: any) {
      logger.error('❌ Error deleting leave:', error);
      const errorMessage = error.message || 'Failed to delete leave';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle view leave details
  const handleViewLeave = (leave: Leave) => {
    setViewingLeave(leave);
    setIsViewModalOpen(true);
  };

  // Filter leaves based on search query and filters
  const filteredLeaves = leaves.filter(leave => {
    const userName = leave.user_name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    
    // Search filter
    const matchesSearch = (
      userName.includes(query) ||
      leave.reason.toLowerCase().includes(query) ||
      leave.leave_type.toLowerCase().includes(query)
    );
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
    
    // Type filter
    const matchesType = typeFilter === 'all' || leave.leave_type === typeFilter;
    
    // Date range filter
    let matchesDateRange = true;
    if (startDateFilter || endDateFilter) {
      const leaveStart = new Date(leave.start_date);
      const leaveEnd = new Date(leave.end_date);
      
      if (startDateFilter) {
        const filterStart = new Date(startDateFilter);
        matchesDateRange = matchesDateRange && leaveEnd >= filterStart;
      }
      
      if (endDateFilter) {
        const filterEnd = new Date(endDateFilter);
        matchesDateRange = matchesDateRange && leaveStart <= filterEnd;
      }
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesDateRange;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeaves = filteredLeaves.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, startDateFilter, endDateFilter]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'sick':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'casual':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'annual':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'other':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar title="Leave Management" subtitle="Manage employee leave requests" />
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
        <TopBar title="Leave Management" subtitle="Manage employee leave requests" />
        <div className="p-6">
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchLeaves}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Leave Management" subtitle="Manage employee leave requests" />
      <div className="p-6">
        <div className="space-y-6">
          {/* Search Bar and Filters */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search leaves..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 input-field"
                />
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                {/* Type Filter */}
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="annual">Annual Leave</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 sm:max-w-xs">
                <Label htmlFor="start_date" className="text-sm text-muted-foreground mb-2 block">
                  Start Date (From)
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="input-field"
                />
              </div>
              
              <div className="flex-1 sm:max-w-xs">
                <Label htmlFor="end_date" className="text-sm text-muted-foreground mb-2 block">
                  End Date (To)
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="input-field"
                />
              </div>

              {(startDateFilter || endDateFilter) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDateFilter('');
                    setEndDateFilter('');
                  }}
                  className="self-end"
                >
                  Clear Dates
                </Button>
              )}
            </div>
          </div>

          {/* Leave Table */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Duration</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Dates</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeaves.map((leave, index) => (
                  <TableRow 
                    key={leave.id} 
                    className="table-row-hover animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-semibold shrink-0">
                          {leave.user_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {leave.user_name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(leave.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("capitalize", getTypeBadgeColor(leave.leave_type))}
                      >
                        {leave.leave_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm text-muted-foreground">
                        {calculateDuration(leave.start_date, leave.end_date)} day(s)
                      </p>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(leave.start_date), 'MMM dd')} - {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("capitalize", getStatusBadgeColor(leave.status))}
                      >
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewLeave(leave)}
                          className="h-8 w-8 p-0"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {leave.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveLeave(leave)}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Approve leave"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenRejectModal(leave)}
                              className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              title="Reject leave"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeleteModal(leave)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete leave"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredLeaves.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || startDateFilter || endDateFilter
                    ? 'No leaves found matching your filters' 
                    : 'No leave requests found'}
                </p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredLeaves.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredLeaves.length)} of {filteredLeaves.length} leaves
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-1">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Leave Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave request.
            </DialogDescription>
          </DialogHeader>
          
          {rejectingLeave && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-semibold shrink-0">
                  {rejectingLeave.user_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {rejectingLeave.user_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(rejectingLeave.start_date), 'MMM dd')} - {format(new Date(rejectingLeave.end_date), 'MMM dd, yyyy')}
                  </p>
                  <Badge 
                    variant="outline" 
                    className={cn("capitalize mt-1", getTypeBadgeColor(rejectingLeave.leave_type))}
                  >
                    {rejectingLeave.leave_type}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rejection_reason">
                  Rejection Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={4}
                  disabled={isRejecting}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectModalOpen(false);
                setRejectingLeave(null);
                setRejectionReason('');
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectLeave}
              disabled={isRejecting}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Leave
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Leave Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Leave Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this leave request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deletingLeave && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-semibold shrink-0">
                  {deletingLeave.user_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {deletingLeave.user_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(deletingLeave.start_date), 'MMM dd')} - {format(new Date(deletingLeave.end_date), 'MMM dd, yyyy')}
                  </p>
                  <Badge 
                    variant="outline" 
                    className={cn("capitalize mt-1", getTypeBadgeColor(deletingLeave.leave_type))}
                  >
                    {deletingLeave.leave_type}
                  </Badge>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> Deleting this leave request will permanently remove it from the system.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingLeave(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteLeave}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Leave
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Leave Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>
              Complete information about this leave request
            </DialogDescription>
          </DialogHeader>
          
          {viewingLeave && (
            <div className="space-y-4 py-4">
              {/* Employee Info */}
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-semibold shrink-0">
                  {viewingLeave.user_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {viewingLeave.user_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Requested on {format(new Date(viewingLeave.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {/* Leave Details */}
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Leave Type</Label>
                    <Badge 
                      variant="outline" 
                      className={cn("capitalize mt-1", getTypeBadgeColor(viewingLeave.leave_type))}
                    >
                      {viewingLeave.leave_type}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge 
                      variant="outline" 
                      className={cn("capitalize mt-1", getStatusBadgeColor(viewingLeave.status))}
                    >
                      {viewingLeave.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Start Date</Label>
                    <p className="text-sm font-medium mt-1">
                      {format(new Date(viewingLeave.start_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">End Date</Label>
                    <p className="text-sm font-medium mt-1">
                      {format(new Date(viewingLeave.end_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Duration</Label>
                  <p className="text-sm font-medium mt-1">
                    {calculateDuration(viewingLeave.start_date, viewingLeave.end_date)} day(s)
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Reason</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                    {viewingLeave.reason}
                  </p>
                </div>

                {viewingLeave.status === 'rejected' && viewingLeave.rejection_reason && (
                  <div>
                    <Label className="text-muted-foreground">Rejection Reason</Label>
                    <p className="text-sm mt-1 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                      {viewingLeave.rejection_reason}
                    </p>
                  </div>
                )}

                {viewingLeave.status === 'approved' && viewingLeave.approved_by_name && (
                  <div>
                    <Label className="text-muted-foreground">Approved By</Label>
                    <p className="text-sm font-medium mt-1">
                      {viewingLeave.approved_by_name}
                    </p>
                  </div>
                )}

                {viewingLeave.document && (
                  <div>
                    <Label className="text-muted-foreground">Supporting Document</Label>
                    <a 
                      href={viewingLeave.document} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline mt-1 block"
                    >
                      View Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsViewModalOpen(false);
                setViewingLeave(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
