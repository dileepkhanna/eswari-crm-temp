import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { cn } from '@/lib/utils';
import {
  Building2,
  LayoutDashboard,
  Users,
  UserCircle,
  ClipboardList,
  CheckSquare,
  Building,
  CalendarOff,
  Calendar,
  BarChart3,
  Activity,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Bell,
  Palette,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { isAfter, isBefore, addDays, isToday } from 'date-fns';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles: ('admin' | 'manager' | 'employee')[];
  getBadge?: () => number;
}

const getRemindersCount = () => {
  // TODO: Replace with real API calls to get leads and tasks
  // For now, return 0 to avoid errors
  return 0;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '', roles: ['admin', 'manager', 'employee'] },
  { label: 'Users', icon: Users, href: '/users', roles: ['admin'] },
  { label: 'Branding', icon: Palette, href: '/branding', roles: ['admin'] },
  { label: 'Announcements', icon: Megaphone, href: '/announcements', roles: ['admin', 'manager', 'employee'] },
  { label: 'Holidays', icon: Calendar, href: '/holidays', roles: ['admin', 'manager', 'employee'] },
  { label: 'Leads', icon: ClipboardList, href: '/leads', roles: ['admin', 'manager', 'employee'] },
  { label: 'Tasks', icon: CheckSquare, href: '/tasks', roles: ['admin', 'manager', 'employee'] },
  { label: 'Projects', icon: Building, href: '/projects', roles: ['admin', 'manager', 'employee'] },
  { label: 'Leaves', icon: CalendarOff, href: '/leaves', roles: ['admin', 'manager', 'employee'] },
  { label: 'Reports', icon: BarChart3, href: '/reports', roles: ['admin'] },
  { label: 'Activity', icon: Activity, href: '/activity', roles: ['admin'] },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const { settings } = useAppSettings();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  useEffect(() => {
    const count = getRemindersCount();
    if (count > 0) {
      setHasNewNotifications(true);
    }
  }, []);

  if (!user) return null;

  // Map Django roles to frontend routes
  const roleRouteMap: Record<string, string> = {
    'admin': '/admin',
    'manager': '/manager',
    'employee': '/staff'  // Map employee role to staff route
  };
  
  const basePath = roleRouteMap[user.role] || '/login';
  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role as 'admin' | 'manager' | 'employee'));

  const handleNavClick = () => {
    onNavigate?.();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside 
      className={cn(
        "glass-sidebar h-screen flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 md:p-6 border-b border-sidebar-border">
        <Link to={basePath} className="flex items-center gap-3" onClick={handleNavClick}>
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt={settings.app_name} className="w-10 h-10 object-contain rounded-xl shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
          )}
          {!collapsed && (
            <span className="text-lg md:text-xl font-bold text-sidebar-foreground animate-fade-in">
              {settings?.app_name || 'PropertyCRM'}
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 md:p-4 space-y-1 md:space-y-2 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === `${basePath}${item.href}` || 
            (item.href === '' && location.pathname === basePath);
          const badge = item.getBadge?.();
          
          return (
            <Link
              key={item.label}
              to={`${basePath}${item.href}`}
              onClick={handleNavClick}
              className={cn(
                "nav-link relative",
                isActive && "nav-link-active",
                collapsed && "justify-center px-3"
              )}
            >
              <div className="relative">
                <item.icon className="w-5 h-5 shrink-0" />
                {badge && badge > 0 && (
                  <span className={cn(
                    "absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse",
                    hasNewNotifications && "ring-2 ring-destructive/30"
                  )}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 md:p-4 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent mb-3",
          collapsed && "justify-center"
        )}>
          <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center shrink-0">
            <UserCircle className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{user.role}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex flex-1 nav-link justify-center"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          
          {!collapsed && (
            <>
              <Link to={`${basePath}/settings`} className="nav-link flex-1 justify-center" onClick={handleNavClick}>
                <Settings className="w-5 h-5" />
              </Link>
              <button onClick={handleLogout} className="nav-link flex-1 justify-center hover:text-destructive">
                <LogOut className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
