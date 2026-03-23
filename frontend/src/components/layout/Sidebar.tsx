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
    // HR always sees HR-specific menu (no groups, flat list)
    menuGroups = [
      { label: '', items: hrNavItems, collapsible: false }
    ];
  } else if (user.role === 'admin') {
    // Admin sees Dashboard at top, then grouped menu with all features
    const dashboardItem: NavItem = { label: 'Dashboard', icon: DashboardIcon, href: '', roles: ['admin'] };
    
    menuGroups = [
      { label: '', items: [dashboardItem], collapsible: false },
      { label: 'Common', items: commonNavItems, collapsible: true, defaultOpen: true },
      { label: 'ASE Technologies', items: aseSpecificItems, collapsible: true, defaultOpen: true },
      { label: 'Eswari Group', items: eswariSpecificItems, collapsible: true, defaultOpen: true },
      { label: 'System Management', items: adminOnlyItems, collapsible: true, defaultOpen: true },
    ];
  } else {
    // Manager and Employee see: Dashboard + Common items + Company-specific items
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
    
    // No groups for non-admin users, just flat list
    menuGroups = [
      { label: '', items: [dashboardItem, ...commonNavItems, ...companySpecific], collapsible: false }
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
        "glass-sidebar h-screen flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 md:p-6 border-b border-sidebar-border">
        <Link to={basePath} className="flex items-center gap-3" onClick={handleNavClick}>
          {/* For employees/managers: Show company logo, for admin/hr: show global logo */}
          {user.role !== 'admin' && user.role !== 'hr' ? (
            // Employee/Manager: Show company branding
            selectedCompany?.logo_url ? (
              <img 
                src={`${selectedCompany.logo_url}?t=${Date.now()}`} 
                alt={selectedCompany.name} 
                className="w-10 h-10 object-contain rounded-xl shrink-0" 
                key={selectedCompany.logo_url}
              />
            ) : user.company?.logo_url ? (
              <img 
                src={`${user.company.logo_url}?t=${Date.now()}`} 
                alt={user.company.name} 
                className="w-10 h-10 object-contain rounded-xl shrink-0" 
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
        
        {/* Company Display - Only show for admin/hr who can switch companies */}
        {selectedCompany && !collapsed && (user.role === 'admin' || user.role === 'hr') && (
          <div className="mt-3 pt-3 border-t border-sidebar-border/50">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/50">
              <div className="w-6 h-6 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-xs font-semibold text-sidebar-primary">
                {selectedCompany.code.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{selectedCompany.name}</p>
                <p className="text-[10px] text-sidebar-foreground/60">{selectedCompany.code}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 md:p-4 space-y-1 md:space-y-2 overflow-y-auto">
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
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0" />
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
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
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
