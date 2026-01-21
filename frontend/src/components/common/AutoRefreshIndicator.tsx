import { useEffect, useState } from 'react';
import { RefreshCw, Wifi, WifiOff, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AutoRefreshIndicatorProps {
  interval?: number; // in seconds
  enabled?: boolean;
  onRefresh?: () => void;
  onToggle?: (enabled: boolean) => void;
  isRefreshing?: boolean;
}

export default function AutoRefreshIndicator({ 
  interval = 30, 
  enabled = true, 
  onRefresh,
  onToggle,
  isRefreshing = false
}: AutoRefreshIndicatorProps) {
  const [timeLeft, setTimeLeft] = useState(interval);

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onRefresh?.();
          return interval; // Reset to interval seconds
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [enabled, interval, onRefresh]);

  // Reset timer when interval changes or when manually refreshed
  useEffect(() => {
    setTimeLeft(interval);
  }, [interval]);

  const handleToggle = () => {
    const newEnabled = !enabled;
    onToggle?.(newEnabled);
    if (newEnabled) {
      setTimeLeft(interval);
    }
  };

  const handleManualRefresh = () => {
    onRefresh?.();
    setTimeLeft(interval);
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1">
        {enabled ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-red-500" />
        )}
        <span className="text-muted-foreground">
          {enabled ? `Auto-refresh in ${timeLeft}s` : 'Auto-refresh paused'}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleToggle}
        >
          {enabled ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}