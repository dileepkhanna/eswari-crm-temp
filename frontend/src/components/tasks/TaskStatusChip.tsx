import { TaskStatus } from '@/types';
import { cn } from '@/lib/utils';

interface TaskStatusChipProps {
  status: TaskStatus;
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: 'To Do', className: 'bg-gray-100 text-gray-700 ring-1 ring-gray-300' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' },
  review: { label: 'Review', className: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700 ring-1 ring-green-300' },
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
