import { useEffect, useRef, useCallback } from 'react';

interface UseAutoRefreshOptions {
  interval?: number; // in seconds
  enabled?: boolean;
  onRefresh: () => void | Promise<void>;
}

export function useAutoRefresh({ 
  interval = 30, 
  enabled = true, 
  onRefresh 
}: UseAutoRefreshOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoRefresh = useCallback(() => {
    if (!enabled) return;

    // Clear existing intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      onRefresh();
    }, interval * 1000);
  }, [interval, enabled, onRefresh]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [enabled, startAutoRefresh, stopAutoRefresh]);

  // Return nothing since we want it to be completely invisible
  return {};
}