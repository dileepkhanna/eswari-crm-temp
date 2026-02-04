import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { cn } from '@/lib/utils';
import {
  DashboardIcon,
  UsersIcon,
  LeadsIcon,
  TasksIcon,
  ProjectsIcon,
  CalendarIcon,
  ReportsIcon,
  SettingsIcon,
  ActivityIcon,
  LogoutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingIcon,
  BellIcon,
  PhoneIcon,
  MegaphoneIcon,
} from '@/components/icons';
import { UserCircle } from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles: ('admin' | 'manager' | 'employee')[];
}

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const { settings } = useAppSettings();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Navigation items
  const navItems: NavItem[] = [
    { label: 'Dashboard', icon: DashboardIcon, href: '', roles: ['admin', 'manager', 'employee'] },
    { label: 'Users', icon: UsersIcon, href: '/users', roles: ['admin'] },
    { label: 'Branding', icon: SettingsIcon, href: '/branding', roles: ['admin'] },
    { label: 'Announcements', icon: MegaphoneIcon, href: '/announcements', roles: ['admin', 'manager', 'employee'] },
    { label: 'Holidays', icon: CalendarIcon, href: '/holidays', roles: ['admin', 'manager', 'employee'] },
    { label: 'Customers', icon: PhoneIcon, href: '/customers', roles: ['admin', 'manager', 'employee'] },
    { label: 'Leads', icon: LeadsIcon, href: '/leads', roles: ['admin', 'manager', 'employee'] },
    { label: 'Tasks', icon: TasksIcon, href: '/tasks', roles: ['admin', 'manager', 'employee'] },
    { label: 'Projects', icon: ProjectsIcon, href: '/projects', roles: ['admin', 'manager', 'employee'] },
    { label: 'Leaves', icon: CalendarIcon, href: '/leaves', roles: ['admin', 'manager', 'employee'] },
    { label: 'Reports', icon: ReportsIcon, href: '/reports', roles: ['admin', 'manager'] },
    { label: 'Activity', icon: ActivityIcon, href: '/activity', roles: ['admin', 'manager'] },
  ];

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
            <img 
              src={`${settings.logo_url}?t=${Date.now()}`} 
              alt={settings.app_name} 
              className="w-10 h-10 object-contain rounded-xl shrink-0" 
              key={settings.logo_url} // Force re-render when URL changes
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
              <BuildingIcon className="w-5 h-5 text-sidebar-primary-foreground" />
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
              <item.icon className="w-5 h-5 shrink-0" />
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
            {collapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
          </button>
          
          {!collapsed && (
            <>
              <Link to={`${basePath}/settings`} className="nav-link flex-1 justify-center" onClick={handleNavClick}>
                <SettingsIcon className="w-5 h-5" />
              </Link>
              <button onClick={handleLogout} className="nav-link flex-1 justify-center hover:text-destructive">
                <LogoutIcon className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
