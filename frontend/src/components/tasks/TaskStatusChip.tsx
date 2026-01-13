import { TaskStatus } from '@/types';
import { cn } from '@/lib/utils';

interface TaskStatusChipProps {
  status: TaskStatus;
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' },
  site_visit: { label: 'Site Visit', className: 'bg-purple-100 text-purple-700 ring-1 ring-purple-300' },
  family_visit: { label: 'Family Visit', className: 'bg-orange-100 text-orange-700 ring-1 ring-orange-300' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700 ring-1 ring-green-300' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 ring-1 ring-red-300' },
};

export default function TaskStatusChip({ status }: TaskStatusChipProps) {
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
