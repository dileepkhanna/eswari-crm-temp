import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextDjango';
import Sidebar from './Sidebar';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { MobileNavProvider } from '@/contexts/MobileNavContext';

interface DashboardLayoutProps {
  requiredRole: UserRole;
}

export default function DashboardLayout({ requiredRole }: DashboardLayoutProps) {
  const { user, isAuthenticated, isLoading, session } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Show loading while auth is being determined
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Only redirect if not loading AND definitely not authenticated
  if (!isLoading && !isAuthenticated && !session) {
    // After logout or if no admin, redirect to /login (which handles signup mode)
    return <Navigate to="/login" replace />;
  }

  // Wait for user data if we have a session but no user yet
  if (session && !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.role !== requiredRole) {
    // Map Django roles to frontend routes
    const roleRouteMap: Record<UserRole, string> = {
      'admin': '/admin',
      'manager': '/manager',
      'employee': '/staff'  // Map employee role to staff route
    };
    
    const redirectPath = roleRouteMap[user?.role] || '/login';
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <MobileNavProvider value={{ mobileMenuOpen, setMobileMenuOpen }}>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar - Hidden on mobile, shown on lg+ */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto transition-transform duration-300 ease-in-out",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
        </div>

        <main className="flex-1 overflow-y-auto w-full">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </MobileNavProvider>
  );
}
