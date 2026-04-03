import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { useCompany } from '@/contexts/CompanyContext';
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
  PhoneIcon,
  MegaphoneIcon,
} from '@/components/icons';
import { UserCircle, BarChart, Share2, FileText, Mail, TrendingUp, Target, Users2, ChevronDown, ChevronRight, Gift } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ASECustomerService } from '@/services/ase-customer.service';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles: ('admin' | 'manager' | 'employee' | 'hr')[];
}

interface MenuGroup {
  label: string;
  items: NavItem[];
  collapsible: boolean;
  defaultOpen?: boolean;
}

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const { settings } = useAppSettings();
  const { selectedCompany } = useCompany();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'System Management': true,
    'Common': true,
    'ASE Technologies': true,
    'Eswari Group': true,
  });
  const [overdueCount, setOverdueCount] = useState(0);

  // Fetch overdue follow-up count for ASE users
  useEffect(() => {
    if (!user || user.role === 'hr') return;
    const isASE = (user?.company?.code === 'ASE_TECH' || user?.company?.code === 'ASE') ||
      (user.role === 'admin');
    if (!isASE) return;
    ASECustomerService.getOverdueCount()
      .then(count => setOverdueCount(count))
      .catch(() => {});
    // Refresh every 5 minutes
    const interval = setInterval(() => {
      ASECustomerService.getOverdueCount()
        .then(count => setOverdueCount(count))
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Get user's company code to determine which menu to show
  const userCompanyCode = user?.company?.code || selectedCompany?.code || '';
  const isASETechnologies = userCompanyCode === 'ASE_TECH' || userCompanyCode === 'ASE';
  const isEswariGroup = userCompanyCode === 'ESWARI' || userCompanyCode === 'ESWARI_GROUP';

  // Admin-only items (shown for all companies at the top)
  const adminOnlyItems: NavItem[] = [
    { label: 'Users', icon: UsersIcon, href: '/users', roles: ['admin'] },
    { label: 'Companies', icon: BuildingIcon, href: '/companies', roles: ['admin'] },
    { label: 'Branding', icon: SettingsIcon, href: '/branding', roles: ['admin'] },
  ];

  // Common sections (appear in both ASE and Eswari)
  const commonNavItems: NavItem[] = [
    { label: 'Announcements', icon: MegaphoneIcon, href: '/announcements', roles: ['admin', 'manager', 'employee'] },
    { label: 'Birthday Calendar', icon: Gift, href: '/birthdays', roles: ['admin', 'hr'] },
    { label: 'Holidays', icon: CalendarIcon, href: '/holidays', roles: ['admin', 'manager', 'employee'] },
    { label: 'Leaves', icon: CalendarIcon, href: '/leaves', roles: ['admin', 'manager', 'employee'] },
  ];

  // ASE Technologies specific sections
  const aseSpecificItems: NavItem[] = [
    { label: 'Customers', icon: PhoneIcon, href: '/ase-customers', roles: ['admin', 'manager', 'employee'] },
    { label: 'Leads', icon: LeadsIcon, href: '/ase-leads', roles: ['admin', 'manager', 'employee'] },
    { label: 'Reports', icon: ReportsIcon, href: '/ase-reports', roles: ['admin', 'manager'] },
    { label: 'Activity', icon: ActivityIcon, href: '/ase-activity', roles: ['admin', 'manager'] },
  ];

  // Eswari Group specific sections (CRM + Reports + Activity)
  const eswariSpecificItems: NavItem[] = [
    { label: 'Customers', icon: PhoneIcon, href: '/customers', roles: ['admin', 'manager', 'employee'] },
    { label: 'Leads', icon: LeadsIcon, href: '/leads', roles: ['admin', 'manager', 'employee'] },
    { label: 'Conversion Analytics', icon: TrendingUp, href: '/conversion-analytics', roles: ['admin', 'manager', 'employee'] },
    { label: 'Tasks', icon: TasksIcon, href: '/tasks', roles: ['admin', 'manager', 'employee'] },
    { label: 'Projects', icon: ProjectsIcon, href: '/projects', roles: ['admin', 'manager', 'employee'] },
    { label: 'Reports', icon: ReportsIcon, href: '/reports', roles: ['admin', 'manager'] },
    { label: 'Activity', icon: ActivityIcon, href: '/activity', roles: ['admin', 'manager'] },
  ];

  // HR-specific navigation items
  const hrNavItems: NavItem[] = [
    { label: 'Dashboard', icon: DashboardIcon, href: '', roles: ['hr'] },
    { label: 'Announcements', icon: MegaphoneIcon, href: '/announcements', roles: ['hr'] },
    { label: 'Employees', icon: UsersIcon, href: '/employees', roles: ['hr'] },
    { label: 'Birthday Calendar', icon: Gift, href: '/birthdays', roles: ['hr'] },
    { label: 'Leaves', icon: CalendarIcon, href: '/leaves', roles: ['hr'] },
    { label: 'Holidays', icon: CalendarIcon, href: '/holidays', roles: ['hr'] },
    { label: 'Reports', icon: BarChart, href: '/reports', roles: ['hr'] },
  ];

  // Settings nav item — shown for all roles
  const settingsNavItem: NavItem = {
    label: 'Settings',
    icon: SettingsIcon,
    href: '/settings',
    roles: ['admin', 'manager', 'employee', 'hr'],
  };

  if (!user) return null;

  // Map Django roles to frontend routes
  const roleRouteMap: Record<string, string> = {
    'admin': '/admin',
    'manager': '/manager',
    'employee': '/staff',  // Map employee role to staff route
    'hr': '/hr'
  };
  
  const basePath = roleRouteMap[user.role] || '/login';
  
  // Determine which menu groups to show based on role and company
  let menuGroups: MenuGroup[];
  
  if (user.role === 'hr') {
    menuGroups = [
      { label: '', items: [...hrNavItems, settingsNavItem], collapsible: false }
    ];
  } else if (user.role === 'admin') {
    const dashboardItem: NavItem = { label: 'Dashboard', icon: DashboardIcon, href: '', roles: ['admin'] };
    
    menuGroups = [
      { label: '', items: [dashboardItem], collapsible: false },
      { label: 'Common', items: commonNavItems, collapsible: true, defaultOpen: true },
      { label: 'ASE Technologies', items: aseSpecificItems, collapsible: true, defaultOpen: true },
      { label: 'Eswari Group', items: eswariSpecificItems, collapsible: true, defaultOpen: true },
      { label: 'System Management', items: adminOnlyItems, collapsible: true, defaultOpen: true },
      { label: '', items: [settingsNavItem], collapsible: false },
    ];
  } else {
    const dashboardItem: NavItem = { label: 'Dashboard', icon: DashboardIcon, href: '', roles: ['manager', 'employee'] };
    
    let companySpecific: NavItem[];
    let companyLabel: string;
    
    if (isASETechnologies) {
      companySpecific = aseSpecificItems;
      companyLabel = 'ASE Technologies';
    } else if (isEswariGroup) {
      companySpecific = eswariSpecificItems;
      companyLabel = 'Eswari Group';
    } else {
      companySpecific = eswariSpecificItems;
      companyLabel = 'Eswari Group';
    }
    
    menuGroups = [
      { label: '', items: [dashboardItem, ...commonNavItems, ...companySpecific, settingsNavItem], collapsible: false }
    ];
  }

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  const handleNavClick = () => {
    onNavigate?.();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside 
      className={cn(
        "glass-sidebar flex flex-col transition-all duration-300 ease-in-out",
        "h-full",
        collapsed ? "w-20" : "w-72 lg:w-64"
      )}
    >
      {/* Logo */}
      <div className="p-3 md:p-4 border-b border-sidebar-border">
        <Link to={basePath} className="flex items-center gap-3" onClick={handleNavClick}>
          {/* For employees/managers: Show company logo, for admin/hr: show global logo */}
          {user.role !== 'admin' && user.role !== 'hr' ? (
            // Employee/Manager: Show company branding
            selectedCompany?.logo_url ? (
              <img 
                src={`${selectedCompany.logo_url}?t=${Date.now()}`} 
                alt={selectedCompany.name} 
                className="w-10 h-10 object-contain rounded-xl shrink-0" 
                style={{ padding: 0 }}
                key={selectedCompany.logo_url}
              />
            ) : user.company?.logo_url ? (
              <img 
                src={`${user.company.logo_url}?t=${Date.now()}`} 
                alt={user.company.name} 
                className="w-10 h-10 object-contain rounded-xl shrink-0" 
                style={{ padding: 0 }}
                key={user.company.logo_url}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
                <BuildingIcon className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
            )
          ) : (
            // Admin/HR: Show global logo
            settings?.logo_url ? (
              <img 
                src={`${settings.logo_url}?t=${Date.now()}`} 
                alt={settings.app_name} 
                className="w-10 h-10 object-contain rounded-xl shrink-0" 
                style={{ padding: 0 }}
                key={settings.logo_url}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
                <BuildingIcon className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
            )
          )}
          {!collapsed && (
            <span className="text-lg md:text-xl font-bold text-sidebar-foreground animate-fade-in">
              {/* Show company name for employees/managers, global app name for admin/hr */}
              {user.role !== 'admin' && user.role !== 'hr'
                ? (selectedCompany?.name || user.company?.name || 'CRM')
                : (settings?.app_name || 'PropertyCRM')}
            </span>
          )}
        </Link>
        

      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 md:p-3 space-y-0.5 overflow-y-auto">
        {menuGroups.map((group, groupIndex) => {
          const filteredItems = group.items.filter(item => 
            item.roles.includes(user.role as 'admin' | 'manager' | 'employee' | 'hr')
          );
          
          if (filteredItems.length === 0) return null;
          
          const isExpanded = expandedGroups[group.label] !== false;
          
          return (
            <div key={group.label || `group-${groupIndex}`} className="space-y-1">
              {/* Group Header */}
              {group.collapsible && !collapsed && (
                <>
                  {groupIndex > 0 && (
                    <div className="my-3 border-t border-sidebar-border/30" />
                  )}
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 shrink-0" style={{ color: '#d4d4d8' }} />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#d4d4d8' }} />
                    )}
                    <span className="uppercase tracking-wider">{group.label}</span>
                  </button>
                </>
              )}
              
              {/* Group Items */}
              {(!group.collapsible || isExpanded) && filteredItems.map((item) => {
                const isActive = location.pathname === `${basePath}${item.href}` || 
                  (item.href === '' && location.pathname === basePath);
                const showOverdueBadge = item.href === '/ase-customers' && overdueCount > 0;
                
                return (
                  <Link
                    key={item.label}
                    to={`${basePath}${item.href}`}
                    onClick={handleNavClick}
                    className={cn(
                      "nav-link relative",
                      isActive && "nav-link-active",
                      collapsed && "justify-center px-3",
                      group.collapsible && !collapsed && "ml-2"
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" style={{ padding: 0 }} color="#d4d4d8" />
                    {!collapsed && <span className="text-sidebar-foreground/80">{item.label}</span>}
                    {showOverdueBadge && (
                      <span className={cn(
                        "ml-auto flex items-center justify-center rounded-full bg-red-500 text-white font-bold leading-none",
                        collapsed ? "absolute -top-1 -right-1 w-4 h-4 text-[9px]" : "min-w-[18px] h-[18px] px-1 text-[10px]"
                      )}>
                        {overdueCount > 99 ? '99+' : overdueCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User Section — shrink-0 ensures it's never clipped on mobile */}
      <div className="shrink-0 p-3 border-t border-sidebar-border">
        {/* User info row */}
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

        {/* Action icons row — collapse · settings · logout */}
        <div className={cn(
          "flex items-center mt-1",
          collapsed ? "flex-col gap-1" : "justify-around"
        )}>
          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex nav-link flex-1 justify-center"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRightIcon className="w-5 h-5" style={{ padding: 0 }} color="#d4d4d8" /> : <ChevronLeftIcon className="w-5 h-5" style={{ padding: 0 }} color="#d4d4d8" />}
          </button>

          {/* Settings */}
          <Link
            to={`${basePath}/settings`}
            onClick={handleNavClick}
            className={cn(
              "nav-link justify-center",
              collapsed ? "w-full" : "flex-1",
              location.pathname === `${basePath}/settings` && "nav-link-active"
            )}
            aria-label="Settings"
          >
            <SettingsIcon className="w-6 h-6" style={{ padding: 0 }} color="#d4d4d8" />
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={cn("nav-link justify-center", collapsed ? "w-full" : "flex-1")}
            aria-label="Logout"
          >
            <LogoutIcon className="w-6 h-6" style={{ padding: 0 }} color="#d4d4d8" />
          </button>
        </div>
      </div>
    </aside>
  );
}
