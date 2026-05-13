import { Badge } from '@/components/ui/badge';
import { Snowflake, Sun, Flame } from 'lucide-react';

const ENGAGEMENT_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  cold: { label: 'Cold', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Snowflake },
  warm: { label: 'Warm', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Sun },
  hot: { label: 'Hot', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: Flame },
  very_hot: { label: 'Very Hot', className: 'bg-red-500/10 text-red-500 border-red-500/20', icon: Flame },
};

interface EngagementIndicatorProps {
  level: string;
  showIcon?: boolean;
  className?: string;
}

export function EngagementIndicator({ level, showIcon = true, className = '' }: EngagementIndicatorProps) {
  const config = ENGAGEMENT_CONFIG[level] || ENGAGEMENT_CONFIG.cold;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} ${className}`}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
}
