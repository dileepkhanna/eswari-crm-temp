import * as React from 'react';
import { LeaveStatus } from '@/types';
import { cn } from '@/lib/utils';

interface LeaveStatusChipProps {
  status: LeaveStatus;
}

const statusConfig: Record<LeaveStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'status-pending' },
  approved: { label: 'Approved', className: 'status-approved' },
  rejected: { label: 'Rejected', className: 'status-rejected' },
};

const LeaveStatusChip = React.forwardRef<HTMLSpanElement, LeaveStatusChipProps>(
  ({ status }, ref) => {
    const config = statusConfig[status];
    
    return (
      <span ref={ref} className={cn('status-chip', config.className)}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {config.label}
      </span>
    );
  }
);

LeaveStatusChip.displayName = 'LeaveStatusChip';

export default LeaveStatusChip;
