import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContextDjango';
import { useState } from 'react';

interface RefreshButtonProps {
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showText?: boolean;
}

export default function RefreshButton({ 
  size = 'sm', 
  variant = 'outline', 
  showText = false 
}: RefreshButtonProps) {
  const { refreshData } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData(true); // Show loading for manual refresh
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={isRefreshing}
      size={size}
      variant={variant}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {showText && (isRefreshing ? 'Refreshing...' : 'Refresh')}
    </Button>
  );
}