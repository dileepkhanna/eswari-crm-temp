import { CallStatus } from '@/types';
import { cn } from '@/lib/utils';

interface CustomerStatusChipProps {
  status: CallStatus;
  customStatus?: string;
}

const statusConfig: Record<CallStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-700 ring-1 ring-gray-300' },
  answered: { label: 'Answered', className: 'bg-green-100 text-green-700 ring-1 ring-green-300' },
  not_answered: { label: 'Not Answered', className: 'bg-red-100 text-red-700 ring-1 ring-red-300' },
  busy: { label: 'Busy', className: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300' },
  not_interested: { label: 'Not Interested', className: 'bg-orange-100 text-orange-700 ring-1 ring-orange-300' },
  custom: { label: 'Custom', className: 'bg-purple-100 text-purple-700 ring-1 ring-purple-300' },
};

export default function CustomerStatusChip({ status, customStatus }: CustomerStatusChipProps) {
  const config = statusConfig[status];
  const displayLabel = status === 'custom' && customStatus ? customStatus : config.label;
  
  return (
    <span className={cn('status-chip', config.className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {displayLabel}
    </span>
  );
}