import { Bell, Search, ArrowLeft, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useNotifications } from '@/contexts/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMobileNav } from '@/contexts/MobileNavContext';

interface TopBarProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
}

export default function TopBar({ title, subtitle, showBackButton = true }: TopBarProps) {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const mobileNav = useMobileNav();

  // Determine if we're on a dashboard (root page for each role)
  const isDashboard = ['/', '/admin', '/manager', '/staff'].includes(location.pathname);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <header className="h-14 md:h-16 bg-card border-b border-border px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        {/* Mobile Hamburger - Always show on mobile */}
        {mobileNav && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-10 md:w-10 lg:hidden shrink-0"
            onClick={() => mobileNav.setMobileMenuOpen(!mobileNav.mobileMenuOpen)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {/* Back Button - show on non-dashboard pages on desktop only */}
        {showBackButton && !isDashboard && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="hover:bg-muted h-8 w-8 md:h-10 md:w-10 hidden lg:flex"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        )}
        
        <div className="min-w-0">
          <h1 className="text-base md:text-xl font-bold text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground hidden sm:block truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search..." 
            className="w-48 lg:w-64 pl-10 h-10 input-field"
          />
        </div>

        {/* Bell Icon with Notifications Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 md:h-10 md:w-10">
              <Bell className="w-4 h-4 md:w-5 md:h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 md:top-0 md:right-0 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                  Mark all read
                </Button>
              )}
            </div>
            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No notifications
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                        !notification.read && "bg-primary/5"
                      )}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm",
                            !notification.read && "font-medium"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(notification.createdAt, 'MMM dd, h:mm a')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <div className="hidden sm:flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-border">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-sm md:text-base shrink-0">
            {user?.name.charAt(0)}
          </div>
          <div className="hidden lg:block min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
