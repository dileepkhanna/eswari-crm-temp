import { LeadStatus } from '@/types';
import { cn } from '@/lib/utils';

interface LeadStatusChipProps {
  status: LeadStatus;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' },
  contacted: { label: 'Contacted', className: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300' },
  qualified: { label: 'Qualified', className: 'bg-purple-100 text-purple-700 ring-1 ring-purple-300' },
  converted: { label: 'Converted', className: 'bg-green-100 text-green-700 ring-1 ring-green-300' },
  lost: { label: 'Lost', className: 'bg-red-100 text-red-700 ring-1 ring-red-300' },
};

export default function LeadStatusChip({ status }: LeadStatusChipProps) {
  const config = statusConfig[status];
  
  // Fallback for undefined status
  if (!config) {
    return (
      <span className={cn('status-chip', 'bg-gray-100 text-gray-700 ring-1 ring-gray-300')}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {status || 'Unknown'}
      </span>
    );
  }
  
  return (
    <span className={cn('status-chip', config.className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
