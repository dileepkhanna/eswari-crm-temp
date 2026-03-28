import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextDjango';
import { Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileBottomBar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const roleRouteMap: Record<string, string> = {
    admin: '/admin',
    manager: '/manager',
    employee: '/staff',
    hr: '/hr',
  };
  const basePath = roleRouteMap[user.role] || '/login';
  const settingsPath = `${basePath}/settings`;
  const isSettingsActive = location.pathname === settingsPath;

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Settings */}
      <Link
        to={settingsPath}
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors',
          isSettingsActive
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Settings className="w-5 h-5" />
        <span>Settings</span>
      </Link>

      {/* Divider */}
      <div className="w-px bg-border my-2" />

      {/* Logout */}
      <button
        onClick={async () => { await logout(); }}
        className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </button>
    </div>
  );
}
