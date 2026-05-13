import { Badge } from '@/components/ui/badge';

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  medium: { label: 'Medium', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  high: { label: 'High', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  urgent: { label: 'Urgent', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className = '' }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;

  return (
    <Badge variant="outline" className={`${config.className} ${className}`}>
      {config.label}
    </Badge>
  );
}
