import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DataFreshnessIndicatorProps {
  lastUpdated?: Date;
  className?: string;
}

export default function DataFreshnessIndicator({ lastUpdated, className = '' }: DataFreshnessIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!lastUpdated) return;

    const updateTimeAgo = () => {
      setTimeAgo(formatDistanceToNow(lastUpdated, { addSuffix: true }));
    };

    // Update immediately
    updateTimeAgo();

    // Update every minute
    const interval = setInterval(updateTimeAgo, 60000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  if (!lastUpdated) return null;

  return (
    <div className={`flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
      <Clock className="h-3 w-3" />
      <span>Updated {timeAgo}</span>
    </div>
  );
}