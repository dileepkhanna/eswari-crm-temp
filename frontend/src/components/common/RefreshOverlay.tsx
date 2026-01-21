import { RefreshCw } from 'lucide-react';

interface RefreshOverlayProps {
  isRefreshing: boolean;
  message?: string;
}

export default function RefreshOverlay({ isRefreshing, message = 'Refreshing data...' }: RefreshOverlayProps) {
  if (!isRefreshing) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg">
        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}