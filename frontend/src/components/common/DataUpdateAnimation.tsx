import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface DataUpdateAnimationProps {
  trigger: any; // Any value that changes when data updates
  message?: string;
}

export default function DataUpdateAnimation({ trigger, message = 'Data updated' }: DataUpdateAnimationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  if (!show) return null;

  return (
    <div className="fixed top-16 right-4 z-50 animate-fade-in">
      <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 shadow-lg">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="text-sm text-green-700 dark:text-green-300">{message}</span>
      </div>
    </div>
  );
}